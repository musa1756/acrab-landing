#!/usr/bin/env python3
"""Pre-deploy gate for the Acrab landing site.

Timeweb Cloud deploys this repo on every push to main with no build step, so a
broken link ships straight to production. These checks encode the invariants
that make the site work and that are easy to violate by accident.
"""

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent

# Every URL Apple has been given plus the site's own nav targets, mapped to the
# file that must serve it. `/about` is not an Apple URL, but it is one of the
# three header buttons — a 404 there is just as visible.
REQUIRED_ROUTES = {
    "/": "index.html",
    "/about": "about/index.html",
    "/learn-arabic": "learn-arabic/index.html",
    "/arabic-alphabet": "arabic-alphabet/index.html",
    "/fusha": "fusha/index.html",
    "/arabic-app": "arabic-app/index.html",
    "/buy": "buy/index.html",
    "/support": "support/index.html",
    "/privacy": "privacy/index.html",
    "/offer": "offer/index.html",
    "/consent": "consent/index.html",
    "/get": "get/index.html",
}

NOINDEX_ROUTES = {"/buy", "/offer", "/consent", "/get"}
INDEXABLE_ROUTES = {route: rel for route, rel in REQUIRED_ROUTES.items() if route not in NOINDEX_ROUTES}

REQUIRED_ASSETS = [
    "styles.css",
    "assets/acrab-app-icon.png",
    "robots.txt",
    "sitemap.xml",
    "404.html",
]

# Link targets that are legitimately not local files.
EXTERNAL_PREFIXES = ("http://", "https://", "mailto:", "tel:", "#", "acrab://", "data:")

# The old GitHub Pages home of the privacy policy. Section 14 of the policy
# names acrab.ru/privacy as canonical, so links must not drift back.
RETIRED_URLS = ["musa1756.github.io/Acrab-privacy"]

LINK_RE = re.compile(r'(?:href|src)="([^"]+)"')
TITLE_RE = re.compile(r"<title>([^<]+)</title>", re.IGNORECASE)
DESCRIPTION_RE = re.compile(r'<meta\s+name="description"\s+content="([^"]+)"', re.IGNORECASE)
CANONICAL_RE = re.compile(r'<link\s+rel="canonical"\s+href="([^"]+)"', re.IGNORECASE)

failures = []


def fail(msg):
    failures.append(msg)


def html_files():
    return sorted(p for p in ROOT.rglob("*.html") if ".git" not in p.parts)


def check_required_files():
    for route, rel in REQUIRED_ROUTES.items():
        if not (ROOT / rel).is_file():
            fail(f"маршрут {route} не обслуживается: нет файла {rel}")
    for rel in REQUIRED_ASSETS:
        if not (ROOT / rel).is_file():
            fail(f"отсутствует обязательный ассет {rel}")


def check_links():
    """Internal links must be absolute and must resolve to a real file.

    Relative paths are the trap: they work at the repo root and silently 404
    one level deep, which is exactly where /buy and /support live.
    """
    for path in html_files():
        rel_page = path.relative_to(ROOT)
        for target in LINK_RE.findall(path.read_text(encoding="utf-8")):
            if target.startswith(EXTERNAL_PREFIXES):
                continue
            if not target.startswith("/"):
                fail(f"{rel_page}: относительная ссылка \"{target}\" — нужен абсолютный путь")
                continue
            target_path = urlsplit(target).path
            resolved = ROOT / target_path.lstrip("/")
            if resolved.is_dir() or target_path in REQUIRED_ROUTES:
                candidate = ROOT / REQUIRED_ROUTES.get(target_path, target_path.lstrip("/") + "/index.html")
                if not candidate.is_file():
                    fail(f"{rel_page}: ссылка \"{target}\" ведёт в директорию без index.html")
            elif not resolved.is_file():
                fail(f"{rel_page}: ссылка \"{target}\" не резолвится в файл")


def check_retired_urls():
    for path in html_files():
        text = path.read_text(encoding="utf-8")
        for url in RETIRED_URLS:
            if url in text:
                fail(f"{path.relative_to(ROOT)}: ссылка на выведенный из обращения адрес {url}")


def canonical_url(route):
    if route == "/":
        return "https://acrab.ru/"
    return f"https://acrab.ru{route}/"


def check_search_metadata():
    """Every indexable route needs a unique search snippet and final canonical URL."""
    seen_titles = {}
    seen_descriptions = {}

    for route, rel in INDEXABLE_ROUTES.items():
        text = (ROOT / rel).read_text(encoding="utf-8")
        title = TITLE_RE.search(text)
        description = DESCRIPTION_RE.search(text)
        canonical = CANONICAL_RE.search(text)

        if not title:
            fail(f"{rel}: нет title")
        elif title.group(1) in seen_titles:
            fail(f"{rel}: title совпадает с {seen_titles[title.group(1)]}")
        else:
            seen_titles[title.group(1)] = rel

        if not description:
            fail(f"{rel}: нет meta description")
        elif description.group(1) in seen_descriptions:
            fail(f"{rel}: description совпадает с {seen_descriptions[description.group(1)]}")
        else:
            seen_descriptions[description.group(1)] = rel

        expected = canonical_url(route)
        if not canonical:
            fail(f"{rel}: нет canonical")
        elif canonical.group(1) != expected:
            fail(f"{rel}: canonical должен быть {expected}")

        if re.search(r'<meta\s+name="robots"\s+content="[^"]*noindex', text, re.IGNORECASE):
            fail(f"{rel}: индексируемая страница содержит noindex")

    for route in NOINDEX_ROUTES:
        text = (ROOT / REQUIRED_ROUTES[route]).read_text(encoding="utf-8")
        if not re.search(r'<meta\s+name="robots"\s+content="[^"]*noindex', text, re.IGNORECASE):
            fail(f"{REQUIRED_ROUTES[route]}: служебная страница должна оставаться noindex")

    home = (ROOT / "index.html").read_text(encoding="utf-8")
    if "Арабский язык" not in (TITLE_RE.search(home).group(1) if TITLE_RE.search(home) else ""):
        fail("index.html: основной запрос отсутствует в title")
    if 'type="application/ld+json"' not in home or '"@type":"MobileApplication"' not in home:
        fail("index.html: нет структурированных данных MobileApplication")


def check_crawling_files():
    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    if "User-agent: *" not in robots or "Sitemap: https://acrab.ru/sitemap.xml" not in robots:
        fail("robots.txt: должны быть общий User-agent и ссылка на Sitemap")

    try:
        tree = ET.parse(ROOT / "sitemap.xml")
    except ET.ParseError as error:
        fail(f"sitemap.xml: невалидный XML ({error})")
        return

    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    sitemap_urls = {node.text for node in tree.findall("sm:url/sm:loc", namespace)}
    expected_urls = {canonical_url(route) for route in INDEXABLE_ROUTES}
    missing = expected_urls - sitemap_urls
    extra = sitemap_urls - expected_urls
    for url in sorted(missing):
        fail(f"sitemap.xml: отсутствует {url}")
    for url in sorted(extra):
        fail(f"sitemap.xml: лишний или noindex URL {url}")

    not_found = (ROOT / "404.html").read_text(encoding="utf-8")
    if not re.search(r'<meta\s+name="robots"\s+content="[^"]*noindex', not_found, re.IGNORECASE):
        fail("404.html: страница ошибки должна содержать noindex")


def check_junk():
    for path in ROOT.rglob(".DS_Store"):
        if ".git" not in path.parts:
            fail(f"в репозитории лежит {path.relative_to(ROOT)}")


def main():
    check_required_files()
    check_links()
    check_retired_urls()
    check_search_metadata()
    check_crawling_files()
    check_junk()

    if failures:
        print(f"Проверка не пройдена — {len(failures)} проблем:\n", file=sys.stderr)
        for msg in failures:
            print(f"  ✗ {msg}", file=sys.stderr)
        return 1

    routes = ", ".join(REQUIRED_ROUTES)
    print(f"Проверка пройдена: {routes} обслуживаются, все ссылки резолвятся.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
