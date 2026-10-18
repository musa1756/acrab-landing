/**
 * Движения главной (стили — home-polish.css):
 *  1. Золотой блик бежит по рамке карточки Premium, пока карточка на экране.
 *  2. Видео серии грузится и играет, только когда до него докрутили, и встаёт
 *     вне экрана. До этого и без скрипта виден постер (`preload="none"`).
 * При `prefers-reduced-motion: reduce` не происходит ничего из этого.
 */
export {};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ── 1. Луч по рамке Premium ───────────────────────────────────────────── */
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

/* ── 2. Видео серии ───────────────────────────────────────────────────── */
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

watchPremiumBeam();
watchStreakVideo();
