/**
 * Лента отзывов на главной (components/home/Reviews.astro, стили — reviews.css).
 *
 * Само движение — CSS-анимация, она работает и без скрипта. Скрипт добавляет
 * две вещи:
 *  - лента идёт, только пока её видно (`.is-live`), вне экрана стоит;
 *  - кнопка паузы (WCAG 2.2.2): без скрипта она скрыта, потому что ей нечего делать.
 * Пауза при наведении и фокусе — чистый CSS.
 */
export {};

const root = document.querySelector<HTMLElement>(".rv");
const marquee = root?.querySelector<HTMLElement>(".rv-marquee");

if (root && marquee) {
  root.classList.add("rv-js");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) root.classList.toggle("is-live", entry.isIntersecting);
    });
    observer.observe(marquee);
  } else {
    root.classList.add("is-live");
  }

  const toggle = root.querySelector<HTMLButtonElement>(".rv-toggle");
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      const paused = root.classList.toggle("is-paused");
      const label = paused ? toggle.dataset.labelPlay : toggle.dataset.labelStop;
      if (label) toggle.setAttribute("aria-label", label);
    });
  }
}
