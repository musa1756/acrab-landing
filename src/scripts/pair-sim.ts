/**
 * Симуляция урока вдвоём на главной (components/home/SocialTrust.astro, стили — trust.css).
 *
 * Два «пальца» — Вы и Друг — по очереди нажимают плитки: сначала разные, потом
 * оба «Привет», и плитка становится верной, как в задании с общим выбором
 * парного урока. Сцена идёт, только пока её видно; при prefers-reduced-motion
 * и без скрипта остаётся итоговое состояние (`.is-static`).
 */
export {};

type Who = "you" | "friend";
type Step = { at: number; who?: Who; move?: number; tap?: boolean; verdict?: boolean; reset?: boolean };

const MOVE = 380;
/** Ход сцены, мс от начала круга: подлёт к плитке, через MOVE — нажатие. */
const SCRIPT: Step[] = [
  { at: 0, reset: true },
  { at: 500, who: "you", move: 2 },
  { at: 800, who: "friend", move: 0 },
  { at: 1500, who: "friend", move: 1 },
  { at: 2300, who: "you", move: 1 },
  { at: 2300 + MOVE + 260, verdict: true },
];
const LOOP = 6400;

const sim = document.querySelector<HTMLElement>(".tr-sim");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

/* Телефон нарисован в размере iPhone 414 × 868 (с корпусом) и уменьшается
   целиком, чтобы экран «вместе» помещался в окно: на компьютере — по высоте окна,
   на телефоне — по остатку под заголовком. */
const PHONE_W = 414, PHONE_H = 868;
const screen = document.querySelector<HTMLElement>(".tr-screen");
const slot = document.querySelector<HTMLElement>(".tr-phone-slot");
let phoneScale = 0.7;
const fitPhone = () => {
  if (!screen || !slot) return;
  const narrow = window.matchMedia("(max-width: 760px)").matches;
  const pad = parseFloat(getComputedStyle(screen).paddingBottom) || 0;
  const top = narrow ? slot.getBoundingClientRect().top - screen.getBoundingClientRect().top : pad;
  const height = window.innerHeight - top - pad;
  const width = narrow ? screen.clientWidth : Math.min(460, screen.clientWidth * 0.45);
  phoneScale = Math.max(0.42, Math.min(1, height / PHONE_H, width / PHONE_W));
  slot.style.setProperty("--phone-scale", phoneScale.toFixed(3));
};
fitPhone();
window.addEventListener("resize", fitPhone);

if (sim && !reduced.matches) {
  const options = Array.from(sim.querySelectorAll<HTMLElement>(".tr-opt"));
  const fingers: Record<Who, HTMLElement | null> = {
    you: sim.querySelector(".tr-finger.is-you"),
    friend: sim.querySelector(".tr-finger.is-friend"),
  };
  const picks: Record<Who, number | null> = { you: null, friend: null };
  let timers: number[] = [];
  let running = false;

  /** Точка пальца у плитки: нижний угол своей половины (Вы — левый, Друг — правый), текст открыт. */
  const spot = (who: Who, index: number) => {
    const tile = options[index];
    if (!tile) return { x: 0, y: 0 };
    // Координаты внутри уменьшенного телефона: экранные пиксели делятся на масштаб.
    const box = sim.getBoundingClientRect(), r = tile.getBoundingClientRect();
    return {
      x: (r.left - box.left + r.width * (who === "you" ? 0.14 : 0.86)) / phoneScale,
      y: (r.top - box.top + r.height * 0.8) / phoneScale,
    };
  };
  const home = (who: Who) => {
    return { x: sim.offsetWidth * (who === "you" ? 0.18 : 0.82), y: sim.offsetHeight + 30 };
  };
  const place = (who: Who, point: { x: number; y: number }) => {
    fingers[who]?.style.setProperty("translate", `${point.x}px ${point.y}px`);
  };
  const paint = () => {
    options.forEach((tile, i) => {
      tile.classList.toggle("by-you", picks.you === i);
      tile.classList.toggle("by-friend", picks.friend === i);
    });
  };

  const reset = () => {
    picks.you = picks.friend = null;
    sim.classList.remove("is-verdict");
    options.forEach((tile) => tile.classList.remove("is-pressed"));
    paint();
    for (const who of ["you", "friend"] as const) {
      fingers[who]?.classList.remove("is-down");
      place(who, home(who));
    }
  };

  const run = (step: Step) => {
    if (step.reset) return reset();
    if (step.verdict) {
      sim.classList.add("is-verdict");
      // Пальцы уходят вниз, чтобы зелёную плитку было видно целиком.
      timers.push(window.setTimeout(() => (["you", "friend"] as const).forEach((who) => place(who, home(who))), 500));
      return;
    }
    const who = step.who, index = step.move;
    if (!who || index === undefined) return;
    const finger = fingers[who];
    place(who, spot(who, index));
    timers.push(window.setTimeout(() => {
      finger?.classList.add("is-down");
      options[index]?.classList.add("is-pressed");
      picks[who] = index;
      paint();
      timers.push(window.setTimeout(() => {
        finger?.classList.remove("is-down");
        options[index]?.classList.remove("is-pressed");
      }, 160));
    }, MOVE));
  };

  const cycle = () => {
    for (const step of SCRIPT) timers.push(window.setTimeout(() => run(step), step.at));
    timers.push(window.setTimeout(cycle, LOOP));
  };
  const start = () => {
    if (running) return;
    running = true;
    sim.classList.remove("is-static");
    sim.classList.add("is-live");
    // Пальцы встают на места без перелёта, потом сцена идёт кругами.
    sim.classList.add("is-jump");
    reset();
    requestAnimationFrame(() => requestAnimationFrame(() => sim.classList.remove("is-jump")));
    cycle();
  };
  const stop = () => {
    running = false;
    timers.forEach(clearTimeout);
    timers = [];
  };

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      for (const entry of entries) (entry.isIntersecting ? start : stop)();
    }, { threshold: 0.35 }).observe(sim);
  } else {
    start();
  }
}
