#!/usr/bin/env python3
"""Validate the generated Astro site before it is deployed.

The checker deliberately accepts the build output as its input. Running it
against source files would miss missing generated routes, rewritten links and
assets emitted by Astro/Vite.

Usage::

    python3 tools/check_site.py dist

The default keeps local use convenient, while CI passes ``dist`` explicitly.
"""

from __future__ import annotations

import html
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SITE_ROOT = ROOT / "dist"

# Every public route that must be emitted by the static build. The keys are
# extensionless URLs registered with Apple and used by the site's navigation.
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
INDEXABLE_ROUTES = {
    route: relative_path
    for route, relative_path in REQUIRED_ROUTES.items()
    if route not in NOINDEX_ROUTES
}

REQUIRED_FILES = (
    "robots.txt",
    "sitemap.xml",
    "404.html",
    "assets/acrab-app-icon.png",
)

# These are links that do not identify a file in the generated site.
EXTERNAL_PREFIXES = (
    "http://",
    "https://",
    "mailto:",
    "tel:",
    "#",
    "acrab:",
    "data:",
    "javascript:",
)

RETIRED_URLS = ("musa1756.github.io/Acrab-privacy",)
HTML_ATTRIBUTE_RE = re.compile(r"(?:href|src)\s*=\s*([\"'])(.*?)\1", re.IGNORECASE)
SRCSET_ATTRIBUTE_RE = re.compile(r"srcset\s*=\s*([\"'])(.*?)\1", re.IGNORECASE)
CSS_URL_RE = re.compile(r"url\(\s*([\"']?)(.*?)\1\s*\)", re.IGNORECASE)
TITLE_RE = re.compile(r"<title\b[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
DESCRIPTION_RE = re.compile(
    r'<meta\b[^>]*\bname\s*=\s*[\"\']description[\"\'][^>]*\bcontent\s*=\s*[\"\'](.*?)[\"\']',
    re.IGNORECASE | re.DOTALL,
)
ROBOTS_RE = re.compile(
    r'<meta\b[^>]*\bname\s*=\s*[\"\']robots[\"\'][^>]*\bcontent\s*=\s*[\"\'](.*?)[\"\']',
    re.IGNORECASE | re.DOTALL,
)
CANONICAL_RE = re.compile(
    r'<link\b[^>]*\brel\s*=\s*[\"\']canonical[\"\'][^>]*\bhref\s*=\s*[\"\'](.*?)[\"\']',
    re.IGNORECASE | re.DOTALL,
)
SCRIPT_JSONLD_RE = re.compile(
    r'<script\b[^>]*\btype\s*=\s*[\"\']application/ld\+json[\"\'][^>]*>(.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)


class SiteChecker:
    """Stateful checker kept small so individual checks remain easy to test."""

    def __init__(self, site_root: Path):
        self.site_root = site_root.resolve()
        self.failures: list[str] = []

    def fail(self, message: str) -> None:
        self.failures.append(message)

    def html_files(self) -> list[Path]:
        return sorted(self.site_root.rglob("*.html"))

    def read(self, relative_path: str) -> str:
        return (self.site_root / relative_path).read_text(encoding="utf-8")

    def check_required_files(self) -> None:
        for route, relative_path in REQUIRED_ROUTES.items():
            path = self.site_root / relative_path
            if not path.is_file():
                self.fail(f"маршрут {route} не сгенерирован: нет файла {relative_path}")

        for relative_path in REQUIRED_FILES:
            if not (self.site_root / relative_path).is_file():
                self.fail(f"отсутствует обязательный файл dist/{relative_path}")

        # Astro emits versioned assets; checking for a hard-coded styles.css
        # would reject a valid build. Every page must still load a stylesheet.
        css_files = list(self.site_root.rglob("*.css"))
        if not css_files:
            self.fail("dist: сборка не содержит CSS-файла")

    def resolve_internal_path(self, target: str) -> Path | None:
        """Map an absolute site URL to the file it must serve, if any."""

        parsed = urlsplit(html.unescape(target))
        path = unquote(parsed.path)
        if not path.startswith("/"):
            return None

        if path == "/":
            return self.site_root / "index.html"

        without_slash = path.rstrip("/")
        if without_slash in REQUIRED_ROUTES:
            return self.site_root / REQUIRED_ROUTES[without_slash]

        relative = path.lstrip("/")
        if path.endswith("/"):
            return self.site_root / relative / "index.html"

        candidate = self.site_root / relative
        if candidate.is_dir():
            return candidate / "index.html"
        return candidate

    def check_target(self, source: Path, target: str) -> None:
        target = html.unescape(target.strip())
        if not target or target.startswith(EXTERNAL_PREFIXES):
            return
        if not target.startswith("/"):
            self.fail(
                f"{source.relative_to(self.site_root)}: относительная ссылка "
                f"{target!r} — нужен абсолютный путь"
            )
            return

        resolved = self.resolve_internal_path(target)
        if resolved is None:
            self.fail(
                f"{source.relative_to(self.site_root)}: ссылка/ассет {target!r} "
                "не резолвится в файл dist"
            )
            return
        try:
            resolved.relative_to(self.site_root)
        except ValueError:
            self.fail(
                f"{source.relative_to(self.site_root)}: ссылка/ассет {target!r} "
                "выходит за пределы dist"
            )
            return
        if not resolved.is_file():
            self.fail(
                f"{source.relative_to(self.site_root)}: ссылка/ассет {target!r} "
                "не резолвится в файл dist"
            )

    def check_links_and_assets(self) -> None:
        """Check HTML href/src attributes and local URLs in generated CSS."""

        for path in self.html_files():
            text = path.read_text(encoding="utf-8")
            for _, target in HTML_ATTRIBUTE_RE.findall(text):
                self.check_target(path, target)
            for _, srcset in SRCSET_ATTRIBUTE_RE.findall(text):
                for candidate in srcset.split(","):
                    # A srcset item is a URL optionally followed by a width or
                    # pixel-density descriptor.
                    target = candidate.strip().split(maxsplit=1)[0]
                    self.check_target(path, target)

        for path in sorted(self.site_root.rglob("*.css")):
            text = path.read_text(encoding="utf-8")
            for _, target in CSS_URL_RE.findall(text):
                self.check_target(path, target)

    def check_retired_urls(self) -> None:
        for path in self.html_files():
            text = path.read_text(encoding="utf-8")
            for retired_url in RETIRED_URLS:
                if retired_url in text:
                    self.fail(
                        f"{path.relative_to(self.site_root)}: ссылка на выведенный "
                        f"из обращения адрес {retired_url}"
                    )

    @staticmethod
    def canonical_url(route: str) -> str:
        return "https://acrab.ru/" if route == "/" else f"https://acrab.ru{route}/"

    @staticmethod
    def first_match(pattern: re.Pattern[str], text: str) -> str | None:
        match = pattern.search(text)
        return match.group(1).strip() if match else None

    def check_search_metadata(self) -> None:
        """Require unique title/description and final canonical URLs."""

        titles: dict[str, str] = {}
        descriptions: dict[str, str] = {}

        for route, relative_path in INDEXABLE_ROUTES.items():
            path = self.site_root / relative_path
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8")
            title = self.first_match(TITLE_RE, text)
            description = self.first_match(DESCRIPTION_RE, text)
            canonical = self.first_match(CANONICAL_RE, text)

            if not title:
                self.fail(f"{relative_path}: нет title")
            elif title in titles:
                self.fail(f"{relative_path}: title совпадает с {titles[title]}")
            else:
                titles[title] = relative_path

            if not description:
                self.fail(f"{relative_path}: нет meta description")
            elif description in descriptions:
                self.fail(
                    f"{relative_path}: description совпадает с {descriptions[description]}"
                )
            else:
                descriptions[description] = relative_path

            expected_canonical = self.canonical_url(route)
            if canonical != expected_canonical:
                self.fail(
                    f"{relative_path}: canonical должен быть {expected_canonical}"
                )

            robots = self.first_match(ROBOTS_RE, text) or ""
            if re.search(r"\bnoindex\b", robots, re.IGNORECASE):
                self.fail(f"{relative_path}: индексируемая страница содержит noindex")

        for route in NOINDEX_ROUTES:
            relative_path = REQUIRED_ROUTES[route]
            path = self.site_root / relative_path
            if not path.is_file():
                continue
            robots = self.first_match(ROBOTS_RE, path.read_text(encoding="utf-8")) or ""
            if not re.search(r"\bnoindex\b", robots, re.IGNORECASE):
                self.fail(f"{relative_path}: служебная страница должна оставаться noindex")

    def check_home_structured_data(self) -> None:
        home_path = self.site_root / REQUIRED_ROUTES["/"]
        if not home_path.is_file():
            return
        home = home_path.read_text(encoding="utf-8")
        title = self.first_match(TITLE_RE, home) or ""
        if "Арабский язык" not in title:
            self.fail("index.html: основной запрос отсутствует в title")

        scripts = SCRIPT_JSONLD_RE.findall(home)
        if not scripts:
            self.fail("index.html: нет JSON-LD")
            return
        if not any('"@type":"MobileApplication"' in script.replace(" ", "") for script in scripts):
            self.fail("index.html: нет структурированных данных MobileApplication")

    def check_crawling_files(self) -> None:
        robots_path = self.site_root / "robots.txt"
        sitemap_path = self.site_root / "sitemap.xml"
        if not robots_path.is_file() or not sitemap_path.is_file():
            return

        robots = robots_path.read_text(encoding="utf-8")
        if "User-agent: *" not in robots:
            self.fail("robots.txt: должна быть директива User-agent: *")
        if "Sitemap: https://acrab.ru/sitemap.xml" not in robots:
            self.fail("robots.txt: должна быть ссылка на Sitemap")

        try:
            tree = ET.parse(sitemap_path)
        except ET.ParseError as error:
            self.fail(f"sitemap.xml: невалидный XML ({error})")
            return

        namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        sitemap_urls = {
            node.text.strip()
            for node in tree.findall("sm:url/sm:loc", namespace)
            if node.text and node.text.strip()
        }
        expected_urls = {
            self.canonical_url(route) for route in INDEXABLE_ROUTES
        }
        for missing in sorted(expected_urls - sitemap_urls):
            self.fail(f"sitemap.xml: отсутствует {missing}")
        for extra in sorted(sitemap_urls - expected_urls):
            self.fail(f"sitemap.xml: лишний или noindex URL {extra}")

        not_found_path = self.site_root / "404.html"
        if not_found_path.is_file():
            not_found = not_found_path.read_text(encoding="utf-8")
            robots = self.first_match(ROBOTS_RE, not_found) or ""
            if not re.search(r"\bnoindex\b", robots, re.IGNORECASE):
                self.fail("404.html: страница ошибки должна содержать noindex")

    def check_buy_smoke(self) -> None:
        """Perform a build-level smoke check for the payment island shell.

        This intentionally does not call the payment API. It catches the
        common migration failure where `/buy` builds as a page but loses the
        controls or its module script. Network/API behaviour remains covered
        by payment unit tests and the production webhook.
        """

        path = self.site_root / REQUIRED_ROUTES["/buy"]
        if not path.is_file():
            return
        text = path.read_text(encoding="utf-8")
        required_ids = (
            "step-email",
            "email-input",
            "personal-data-consent",
            "send-code-btn",
            "step-code",
            "code-input",
            "verify-code-btn",
            "step-plan",
            "offer-consent",
            "pay-btn",
            "step-redirect",
        )
        for element_id in required_ids:
            if f'id="{element_id}"' not in text:
                self.fail(f"buy/index.html: отсутствует элемент #{element_id}")

        has_module_script = re.search(
            r'<script\b[^>]*\btype\s*=\s*[\"\']module[\"\'][^>]*\bsrc\s*=\s*[\"\']/[^\"\']+\.js[\"\'][^>]*>',
            text,
            re.IGNORECASE,
        ) or re.search(
            # React `client:load` pages expose the built module through the
            # Astro island attribute instead of a literal script src tag.
            r'<astro-island\b[^>]*\bcomponent-url\s*=\s*[\"\']/[^\"\']+\.js[\"\']',
            text,
            re.IGNORECASE,
        )
        if not has_module_script:
            self.fail("buy/index.html: отсутствует собранный module script")

        # The page must not fall back to unsafe inline script execution while
        # it handles the payment flow.
        csp = re.search(
            # Astro emits a double-quoted HTML attribute whose policy itself
            # contains single-quoted source tokens such as 'self'. Capture the
            # whole attribute instead of stopping at the first token quote.
            r'<meta\b[^>]*http-equiv\s*=\s*[\"\']Content-Security-Policy[\"\'][^>]*content\s*=\s*"([^"]*)"',
            text,
            re.IGNORECASE | re.DOTALL,
        )
        if not csp:
            self.fail("buy/index.html: отсутствует CSP")
        else:
            policy = csp.group(1)
            if "unsafe-inline" in policy:
                self.fail("buy/index.html: CSP не должна разрешать unsafe-inline")
            if not re.search(r"connect-src\s+[^;]*https://api\.acrab\.ru(?:\s|;|$)", policy):
                self.fail("buy/index.html: CSP должна разрешать connect-src https://api.acrab.ru")

    def check_junk(self) -> None:
        for path in self.site_root.rglob(".DS_Store"):
            self.fail(f"в dist лежит {path.relative_to(self.site_root)}")

    def run(self) -> int:
        if not self.site_root.is_dir():
            self.fail(f"каталог сборки не найден: {self.site_root}")
        else:
            self.check_required_files()
            self.check_links_and_assets()
            self.check_retired_urls()
            self.check_search_metadata()
            self.check_home_structured_data()
            self.check_crawling_files()
            self.check_buy_smoke()
            self.check_junk()

        if self.failures:
            print(f"Проверка не пройдена — {len(self.failures)} проблем:\n", file=sys.stderr)
            for message in self.failures:
                print(f"  ✗ {message}", file=sys.stderr)
            return 1

        print(
            "Проверка dist пройдена: "
            f"{len(REQUIRED_ROUTES)} маршрутов, metadata, sitemap, ссылки и /buy OK."
        )
        return 0


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    site_root = Path(args[0]) if args else DEFAULT_SITE_ROOT
    if not site_root.is_absolute():
        site_root = ROOT / site_root
    return SiteChecker(site_root).run()


if __name__ == "__main__":
    sys.exit(main())
