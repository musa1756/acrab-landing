/**
 * Карта арабского мира на главной (components/home/ArabicWorldMap.astro).
 *
 * Что делает скрипт:
 * - превращает чипы-подписи в кнопки: наведение или клавиатурный фокус показывает
 *   страну, нажатие закрепляет её (повторное нажатие или Escape снимает);
 * - то же при наведении мыши на страну на самой карте и при касании её на телефоне;
 * - подсвечивает точки страны (класс `is-active`), включает кольцо-пульс `halo` и
 *   ставит плашку с названием у страны, не выпуская её за край карты;
 * - при первом появлении карты на экране проявляет сушу волной с запада на восток,
 *   а страны Лиги зажигает последними (если ниже первого экрана и не включено
 *   «уменьшение движения»; иначе карта просто статична).
 *
 * Только классы и CSS-переменные через `style.setProperty`: у собранного сайта
 * строгая CSP без `unsafe-inline` для стилей. Без скрипта карта и список видны.
 */
export {};

interface Entry {
  id: string;
  chip: HTMLElement;
  country: Element | null;
  ru: string;
  ar: string;
  ax: number;
  ay: number;
  ty: number;
  by: number;
  tiny: boolean;
}

const root = document.querySelector<HTMLElement>("[data-wm]");
if (root) init(root);

function init(root: HTMLElement): void {
  const canvas = root.querySelector<HTMLElement>("[data-wm-canvas]");
  const svg = root.querySelector<SVGSVGElement>(".wm-svg");
  const plate = root.querySelector<HTMLElement>("[data-wm-plate]");
  const plateRu = root.querySelector<HTMLElement>("[data-wm-plate-ru]");
  const plateAr = root.querySelector<HTMLElement>("[data-wm-plate-ar]");
  const halo = root.querySelector<SVGUseElement>("[data-wm-halo]");
  if (!canvas || !svg || !plate || !plateRu || !plateAr || !halo) return;

  // Чипы: span → button (без скрипта это просто список названий).
  for (const span of Array.from(root.querySelectorAll<HTMLElement>("span.wm-chip"))) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = span.className;
    for (const { name, value } of Array.from(span.attributes)) {
      if (name.startsWith("data-")) button.setAttribute(name, value);
    }
    button.setAttribute("aria-pressed", "false");
    button.append(...Array.from(span.childNodes));
    span.replaceWith(button);
  }

  const entries = new Map<string, Entry>();
  for (const chip of Array.from(root.querySelectorAll<HTMLElement>(".wm-chip"))) {
    const id = chip.dataset["wmId"];
    if (!id) continue;
    const country = svg.querySelector(`.wm-country[data-wm-id="${id}"]`);
    entries.set(id, {
      id,
      chip,
      country,
      ru: chip.dataset["ru"] ?? "",
      ar: chip.dataset["ar"] ?? "",
      ax: Number(chip.dataset["ax"]),
      ay: Number(chip.dataset["ay"]),
      ty: Number(chip.dataset["ty"]),
      by: Number(chip.dataset["by"]),
      tiny: country?.classList.contains("is-tiny") ?? false,
    });
  }
  root.classList.add("wm-live");

  let hover: string | null = null;
  let pinned: string | null = null;

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

  function placePlate(entry: Entry): void {
    if (!canvas || !svg || !plate) return;
    const box = svg.viewBox.baseVal;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (box.width === 0 || width === 0) return;
    const pitch = width / box.width;
    const plateW = plate.offsetWidth;
    const plateH = plate.offsetHeight;
    const gap = 9 + pitch * 0.5;
    const x = (entry.ax - box.x) * pitch;
    const above = (entry.ty - box.y) * pitch - plateH - gap;
    const below = (entry.by - box.y) * pitch + gap;
    // Сверху, а если не помещается над страной — снизу.
    const useBelow = above < 2 && below + plateH <= height - 2;
    const y = useBelow ? below : Math.max(2, above);
    const left = clamp(x - plateW / 2, 2, width - plateW - 2);
    plate.classList.toggle("is-below", useBelow);
    plate.style.setProperty("--wm-x", `${Math.round(left)}px`);
    plate.style.setProperty("--wm-y", `${Math.round(clamp(y, 2, height - plateH - 2))}px`);
    plate.style.setProperty("--wm-tail", `${Math.round(clamp(x - left, 18, plateW - 18))}px`);
  }

  let shown: string | null = null;
  function render(): void {
    if (!plate || !plateRu || !plateAr || !halo) return;
    const id = hover ?? pinned;
    for (const entry of entries.values()) {
      entry.chip.classList.toggle("is-active", entry.id === id);
      entry.chip.setAttribute("aria-pressed", String(entry.id === pinned));
      entry.country?.classList.toggle("is-active", entry.id === id);
    }
    root!.classList.toggle("has-active", id !== null);
    const entry = id === null ? undefined : entries.get(id);
    if (!entry) {
      plate.classList.remove("is-on");
      shown = null;
      return;
    }
    root!.classList.toggle("is-tiny-active", entry.tiny);
    if (shown !== entry.id) {
      halo.setAttribute("href", `#wm-d-${entry.id}`);
      plateRu.textContent = entry.ru;
      plateAr.textContent = entry.ar;
      shown = entry.id;
    }
    // Плашку нужно мерить, пока она показана; первый раз — без скольжения издалека.
    const first = !plate.classList.contains("is-on");
    if (first) plate.classList.add("is-snap");
    placePlate(entry);
    plate.classList.add("is-on");
    if (first) {
      void plate.offsetWidth;
      plate.classList.remove("is-snap");
    }
  }

  const setHover = (id: string | null) => {
    if (hover === id) return;
    hover = id;
    render();
  };
  const togglePin = (id: string) => {
    pinned = pinned === id ? null : id;
    render();
  };

  // Чипы.
  for (const entry of entries.values()) {
    const { chip, id } = entry;
    chip.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse" || event.pointerType === "pen") setHover(id);
    });
    chip.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse" || event.pointerType === "pen") setHover(null);
    });
    chip.addEventListener("focus", () => {
      if (chip.matches(":focus-visible")) setHover(id);
    });
    chip.addEventListener("blur", () => {
      if (hover === id) setHover(null);
    });
    chip.addEventListener("click", () => togglePin(id));
  }

  // Сама карта: мишени — широкие невидимые линии поверх точек стран Лиги.
  const hitId = (target: EventTarget | null): string | null => {
    if (!(target instanceof Element)) return null;
    const hit = target.closest(".wm-hit");
    return hit?.getAttribute("data-wm-id") ?? null;
  };
  svg.addEventListener("pointerover", (event) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    setHover(hitId(event.target));
  });
  svg.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse" || event.pointerType === "pen") setHover(null);
  });
  svg.addEventListener("click", (event) => {
    const id = hitId(event.target);
    if (id) togglePin(id);
    else if (pinned !== null) togglePin(pinned);
  });
  document.addEventListener("click", (event) => {
    if (pinned !== null && event.target instanceof Node && !root.contains(event.target)) {
      pinned = null;
      render();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || (pinned === null && hover === null)) return;
    pinned = null;
    hover = null;
    render();
  });
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      const id = hover ?? pinned;
      const entry = id === null ? undefined : entries.get(id);
      if (entry) placePlate(entry);
    }).observe(canvas);
  }

  if (!("IntersectionObserver" in window)) return;

  // Вне экрана пульс кольца стоит.
  new IntersectionObserver((records) => {
    for (const record of records) root.classList.toggle("is-offscreen", !record.isIntersecting);
  }).observe(canvas);

  // Волна появления: суша с запада на восток, страны Лиги — последними.
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || canvas.getBoundingClientRect().top <= window.innerHeight) return;

  const bands = Array.from(svg.querySelectorAll<SVGElement>(".wm-band"));
  bands.forEach((band, index) => band.style.setProperty("--wm-d", String(index)));
  const league = Array.from(entries.values())
    .filter((entry) => entry.country)
    .sort((a, b) => a.ax - b.ax || a.ay - b.ay);
  league.forEach((entry, index) => (entry.country as SVGElement).style.setProperty("--wm-d", String(index)));
  root.classList.add("wm-armed");

  const waves = new IntersectionObserver(
    (records) => {
      if (!records.some((record) => record.isIntersecting)) return;
      waves.disconnect();
      root.classList.add("wm-in");
      // 1300 мс до первой страны + 22 × 50 мс лесенки + 520 мс самого проявления.
      window.setTimeout(() => {
        root.classList.remove("wm-armed", "wm-in");
        for (const node of bands) node.style.removeProperty("--wm-d");
        for (const entry of league) (entry.country as SVGElement).style.removeProperty("--wm-d");
      }, 3200);
    },
    { threshold: 0.3 },
  );
  waves.observe(canvas);
}
