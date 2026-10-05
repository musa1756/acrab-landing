/**
 * Раздел «Инструменты» на главной: на широком экране окно листает экраны
 * инструментов вместе с прокруткой.
 *
 * Разметка (ToolsScroll.astro): девять плиток-кнопок и лента `.shot-row` с девятью
 * снимками в том же порядке. Скрипт берёт снимки и подписи из ленты и собирает из
 * них телефон и подписи сцены, поэтому тексты и alt живут в одном месте.
 *
 * Закреплённая сцена включается, только если одновременно: окно не уже 861 px и не
 * ниже 700 px и нет prefers-reduced-motion. Иначе — плитки сеткой и лента, как
 * раньше; на узком экране нажатие на плитку листает ленту к своему снимку.
 * Режимы переключаются через matchMedia без перезагрузки.
 *
 * Какой инструмент активен, определяют девять невидимых меток-полос на длине
 * закреплённой прокрутки (`.ts-steps`): IntersectionObserver следит за тонкой
 * линией под шапкой и сообщает только о смене полосы. Ни обработчика scroll, ни
 * измерений раскладки на каждом кадре нет; вне раздела ничего не считается.
 * Страница под CSP без 'unsafe-inline': стили только классами и
 * `style.setProperty("--x", …)`.
 */

const PINNED_QUERY = "(min-width: 861px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)";

function init(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>(".ts-track");
  const scene = root.querySelector<HTMLElement>(".ts-scene");
  const stepsHost = root.querySelector<HTMLElement>(".ts-steps");
  const phone = root.querySelector<HTMLElement>(".ts-phone");
  const captionsHost = root.querySelector<HTMLElement>(".ts-captions");
  const row = root.querySelector<HTMLElement>(".ts-row");
  if (!track || !scene || !stepsHost || !phone || !captionsHost || !row) return;

  const tiles = Array.from(root.querySelectorAll<HTMLButtonElement>("button.tool"));
  const figures = Array.from(row.querySelectorAll<HTMLElement>(":scope > figure"));
  const count = figures.length;
  if (count === 0 || tiles.length !== count) return;

  const mq = window.matchMedia(PINNED_QUERY);
  const slides: HTMLElement[] = [];
  const captions: HTMLElement[] = [];
  const steps: HTMLElement[] = [];
  const visibleSteps = new Set<number>();
  let built = false;
  let pinned = false;
  let active = -1;
  let observer: IntersectionObserver | null = null;
  let locked = false;
  let lockTimer = 0;
  let resizeFrame = 0;

  /* ── Сборка телефона, подписей и меток из ленты ────────────────────────── */
  function build(): void {
    if (built) return;
    built = true;
    figures.forEach((figure, index) => {
      const source = figure.querySelector<HTMLImageElement>("img");
      const caption = figure.querySelector("figcaption");

      const slide = document.createElement("div");
      slide.className = "shot ts-slide";
      const img = document.createElement("img");
      img.alt = source?.alt ?? "";
      const width = Number(source?.getAttribute("width")) || 620;
      const height = Number(source?.getAttribute("height")) || 1252;
      img.width = width;
      img.height = height;
      img.decoding = "async";
      // Сцена далеко от первого экрана: снимок качается, когда до неё докрутили.
      img.loading = "lazy";
      img.draggable = false;
      img.dataset.src = source?.getAttribute("src") ?? "";
      slide.style.setProperty("--ts-ar", `${width} / ${height}`);
      slide.append(img);
      phone!.append(slide);
      slides.push(slide);

      const cap = document.createElement("div");
      cap.className = "ts-cap";
      if (caption) for (const node of Array.from(caption.childNodes)) cap.append(node.cloneNode(true));
      captionsHost!.append(cap);
      captions.push(cap);

      const step = document.createElement("div");
      step.className = "ts-step";
      step.dataset.index = String(index);
      stepsHost!.append(step);
      steps.push(step);
    });
  }

  /** Снимок подгружается, когда он активен или соседний: следующий уже готов. */
  function load(index: number): void {
    const img = slides[index]?.querySelector("img");
    if (img && !img.getAttribute("src") && img.dataset.src) img.src = img.dataset.src;
  }

  /* ── Показ активного инструмента ───────────────────────────────────────── */
  function show(index: number, force = false): void {
    if (index === active && !force) return;
    active = index;
    tiles.forEach((tile, i) => tile.setAttribute("aria-pressed", String(i === index)));
    const mark = (list: HTMLElement[]) =>
      list.forEach((item, i) => {
        item.classList.toggle("is-active", i === index);
        item.classList.toggle("is-before", i < index);
        if (i === index) item.removeAttribute("aria-hidden");
        else item.setAttribute("aria-hidden", "true");
      });
    mark(slides);
    mark(captions);
    load(index);
    load(index + 1);
    load(index - 1);
  }

  /* ── Метки шагов: IntersectionObserver вместо обработчика scroll ───────── */
  function stickyTop(): number {
    return parseFloat(getComputedStyle(scene!).top) || 0;
  }

  function currentStep(): number {
    let best = -1;
    for (const index of visibleSteps) if (index > best) best = index;
    return best;
  }

  function observe(): void {
    observer?.disconnect();
    visibleSteps.clear();
    // Область наблюдения — полоса в 1 px на уровне закреплённой сцены: полоса, которая
    // её пересекает, и есть текущий шаг. До сцены (линия выше блока) и после
    // неё остаётся последний показанный инструмент.
    const top = Math.round(stickyTop());
    const bottom = Math.max(0, document.documentElement.clientHeight - top - 1);
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (entry.isIntersecting) visibleSteps.add(index);
          else visibleSteps.delete(index);
        }
        if (locked) return;
        const step = currentStep();
        if (step >= 0) show(step);
      },
      { rootMargin: `-${top}px 0px -${bottom}px 0px`, threshold: 0 },
    );
    for (const step of steps) observer.observe(step);
  }

  function onResize(): void {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      if (pinned) observe();
    });
  }

  /* ── Нажатие на плитку ─────────────────────────────────────────────────── */
  function releaseLock(): void {
    window.clearTimeout(lockTimer);
    window.removeEventListener("scrollend", releaseLock);
    locked = false;
    const step = currentStep();
    if (pinned && step >= 0) show(step);
  }

  function go(index: number): void {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!pinned) {
      // Узкий режим: лента листается к снимку, а сама лента попадает в экран.
      figures[index]?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "nearest", inline: "start" });
      return;
    }
    // Середина полосы этого шага: там инструмент активен, пока окно стоит на месте.
    const rect = track!.getBoundingClientRect();
    const distance = rect.height - scene!.offsetHeight;
    const target = Math.round(window.scrollY + rect.top - stickyTop() + (distance * (index + 0.5)) / count);
    locked = true;
    window.clearTimeout(lockTimer);
    window.addEventListener("scrollend", releaseLock, { once: true });
    lockTimer = window.setTimeout(releaseLock, 1500);
    show(index);
    window.scrollTo({ top: target, behavior: "smooth" });
  }

  tiles.forEach((tile, index) => tile.addEventListener("click", () => go(index)));

  /* ── Режимы ────────────────────────────────────────────────────────────── */
  function enable(): void {
    pinned = true;
    build();
    root.classList.add("is-pinned");
    for (const tile of tiles) tile.setAttribute("aria-controls", phone!.id);
    window.addEventListener("resize", onResize, { passive: true });
    show(Math.max(active, 0), true);
    observe();
  }

  function disable(): void {
    pinned = false;
    observer?.disconnect();
    observer = null;
    visibleSteps.clear();
    releaseLockQuiet();
    window.removeEventListener("resize", onResize);
    root.classList.remove("is-pinned");
    for (const tile of tiles) {
      tile.removeAttribute("aria-pressed");
      tile.setAttribute("aria-controls", row!.id);
    }
  }

  function releaseLockQuiet(): void {
    window.clearTimeout(lockTimer);
    window.removeEventListener("scrollend", releaseLock);
    locked = false;
  }

  function sync(): void {
    if (mq.matches) enable();
    else disable();
  }

  // Без скрипта кнопки отключены (ничего не делали бы); здесь они оживают.
  for (const tile of tiles) tile.disabled = false;
  sync();
  mq.addEventListener("change", sync);
}

const root = document.querySelector<HTMLElement>("[data-ts]");
if (root) init(root);

export {};
