/**
 * Фраза листа на главной (components/home/Statement.astro): слова по очереди
 * переходят из серого в тёмный по мере того, как фраза проходит окно снизу
 * вверх. Без скрипта и при prefers-reduced-motion все слова тёмные.
 */
export {};

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const blocks = Array.from(document.querySelectorAll<HTMLElement>("[data-statement]"));

if (blocks.length && !reduced.matches) {
  const update = () => {
    for (const block of blocks) {
      const rect = block.getBoundingClientRect();
      // 0 — фраза только вошла снизу, 1 — дошла до 35 % высоты окна.
      const start = window.innerHeight * 0.9;
      const end = window.innerHeight * 0.35;
      const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
      const words = block.querySelectorAll<HTMLElement>(".sh-word");
      const lit = Math.round(progress * words.length);
      words.forEach((word, i) => word.classList.toggle("is-lit", i < lit));
    }
  };
  for (const block of blocks) block.classList.add("is-scripted");
  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}
