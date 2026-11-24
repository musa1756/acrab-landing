/**
 * Нижняя мобильная плашка «Скачать Acrab» на статьях и клавиатуре:
 * появляется после ~25% прокрутки на узких экранах (<= 860 px),
 * скрывается на текущую сессию по кнопке закрытия. Без inline style="".
 */
const DISMISS_KEY = "acrab.sticky_cta.dismissed.v1";

function isDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  } catch { /* storage unavailable */ }
}

const bar = document.querySelector<HTMLElement>("[data-mobile-sticky-cta]");
if (bar && !isDismissed()) {
  const closeBtn = bar.querySelector<HTMLButtonElement>("[data-sticky-cta-close]");
  const mobileQuery = window.matchMedia("(max-width: 860px)");
  let dismissed = false;
  let ticking = false;

  const update = () => {
    ticking = false;
    if (dismissed || !mobileQuery.matches) {
      bar.classList.remove("is-visible");
      bar.hidden = true;
      return;
    }
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = window.scrollY / scrollable;
    const shouldShow = ratio >= 0.25 || window.scrollY >= 360;
    if (shouldShow) {
      bar.hidden = false;
      requestAnimationFrame(() => bar.classList.add("is-visible"));
    } else {
      bar.classList.remove("is-visible");
    }
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  closeBtn?.addEventListener("click", () => {
    dismissed = true;
    markDismissed();
    bar.classList.remove("is-visible");
    bar.hidden = true;
    window.removeEventListener("scroll", onScroll);
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  mobileQuery.addEventListener("change", update);
  update();
}

export {};
