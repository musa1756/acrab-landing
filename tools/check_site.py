#!/usr/bin/env python3
"""Pre-deploy gate for the Acrab landing site.

Timeweb Cloud deploys this repo on every push to main with no build step, so a
broken link ships straight to production. These checks encode the invariants
that make the site work and that are easy to violate by accident.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Every URL Apple has been given plus the site's own nav targets, mapped to the
# file that must serve it. `/about` is not an Apple URL, but it is one of the
# three header buttons — a 404 there is just as visible.
REQUIRED_ROUTES = {
    "/": "index.html",
    "/about": "about/index.html",
    "/buy": "buy/index.html",
    "/support": "support/index.html",
    "/privacy": "privacy/index.html",
}

REQUIRED_ASSETS = ["styles.css", "assets/acrab-app-icon.png"]

# Link targets that are legitimately not local files.
EXTERNAL_PREFIXES = ("http://", "https://", "mailto:", "tel:", "#", "acrab://", "data:")

# The old GitHub Pages home of the privacy policy. Section 14 of the policy
# names acrab.ru/privacy as canonical, so links must not drift back.
RETIRED_URLS = ["musa1756.github.io/Acrab-privacy"]

LINK_RE = re.compile(r'(?:href|src)="([^"]+)"')

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
            resolved = ROOT / target.lstrip("/")
            if resolved.is_dir() or target in REQUIRED_ROUTES:
                candidate = ROOT / REQUIRED_ROUTES.get(target, target.lstrip("/") + "/index.html")
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


def check_junk():
    for path in ROOT.rglob(".DS_Store"):
        if ".git" not in path.parts:
            fail(f"в репозитории лежит {path.relative_to(ROOT)}")


def main():
    check_required_files()
    check_links()
    check_retired_urls()
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
