/**
 * Путь «от букв до книг» на главной (components/home/LearningPath.astro).
 * Шаг посередине окна становится активным, и телефон справа показывает его скрин.
 */
export {};

const steps = Array.from(document.querySelectorAll<HTMLElement>(".lp-step"));
const shots = Array.from(document.querySelectorAll<HTMLElement>(".lp-shot"));

const activate = (index: number) => {
  steps.forEach((el, i) => el.classList.toggle("is-active", i === index));
  shots.forEach((el, i) => el.classList.toggle("is-active", i === index));
};

/* Активен шаг, чья середина ближе всех к середине окна: так и на входе в блок,
   и при быстрой прокрутке назад подсвечен тот шаг, что перед глазами. */
let frame = 0;
const update = () => {
  frame = 0;
  const middle = window.innerHeight / 2;
  let best = 0, bestDistance = Infinity;
  steps.forEach((el, i) => {
    const rect = el.getBoundingClientRect();
    const distance = Math.abs(rect.top + rect.height / 2 - middle);
    if (distance < bestDistance) { best = i; bestDistance = distance; }
  });
  activate(best);
};
const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };

if (steps.length) {
  update();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
}
