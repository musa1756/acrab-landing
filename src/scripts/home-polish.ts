/**
 * Движения главной (стили — home-polish.css):
 *  1. Цифры героя набегают от 0 до значения, пока загружается первый экран.
 *     Итоговое число уже в разметке: без скрипта оно просто видно, а скринридер
 *     читает его всегда — набегающие цифры спрятаны от чтения.
 *  2. Золотой блик бежит по рамке карточки Premium, пока карточка на экране.
 *  3. Видео серии грузится и играет, только когда до него докрутили, и встаёт
 *     вне экрана. До этого и без скрипта виден постер (`preload="none"`).
 * При `prefers-reduced-motion: reduce` не происходит ничего из этого.
 */
export {};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ── 1. Бегущие цифры ──────────────────────────────────────────────────── */
const COUNT_MS = 1100;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function runCounter(dd: HTMLElement, target: number): void {
  const finalText = dd.textContent ?? String(target);

  // Итог остаётся в тексте для чтения, набегающее число — отдельный спан.
  const reader = document.createElement("span");
  reader.className = "hp-sr";
  reader.textContent = finalText;
  const live = document.createElement("span");
  live.setAttribute("aria-hidden", "true");
  live.textContent = "0";
  dd.replaceChildren(reader, live);

  let startedAt = 0;
  const step = (now: number) => {
    if (startedAt === 0) startedAt = now;
    const t = Math.min((now - startedAt) / COUNT_MS, 1);
    live.textContent = String(Math.round(target * easeOutCubic(t)));
    if (t < 1) {
      window.requestAnimationFrame(step);
    } else {
      // Движение закончено: возвращаем обычный текст без обёрток.
      dd.textContent = finalText;
    }
  };
  window.requestAnimationFrame(step);
}

function startCounters(): void {
  if (reducedMotion.matches) return;
  const items = document.querySelectorAll<HTMLElement>(".about-stat dd[data-count]");
  for (const dd of items) {
    const target = Number(dd.dataset.count);
    if (!Number.isFinite(target) || target <= 0) continue;
    runCounter(dd, target);
  }
}

/* ── 2. Луч по рамке Premium ───────────────────────────────────────────── */
function watchPremiumBeam(): void {
  const card = document.querySelector<HTMLElement>(".about-plan-premium");
  if (!card || !("IntersectionObserver" in window)) return;
  // Без @property угол не крутится: блик застыл бы в одном месте.
  if (!("registerProperty" in CSS)) return;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      card.classList.toggle("hp-beam-live", entry.isIntersecting && !reducedMotion.matches);
    }
  });
  observer.observe(card);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) card.classList.remove("hp-beam-live");
  });
}

/* ── 3. Видео серии ───────────────────────────────────────────────────── */
function watchStreakVideo(): void {
  const video = document.querySelector<HTMLVideoElement>(".streak-video video");
  if (!video || !("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !reducedMotion.matches) void video.play().catch(() => undefined);
        else video.pause();
      }
    },
    // Начать загрузку чуть раньше, чем видео покажется.
    { rootMargin: "200px 0px" },
  );
  observer.observe(video);
}

startCounters();
watchPremiumBeam();
watchStreakVideo();
