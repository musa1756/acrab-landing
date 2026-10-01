/**
 * Появление блоков при прокрутке — `Appear` приложения
 * (mobile/src/components/acrab/Appear.tsx): прозрачность, сдвиг и масштаб
 * пружиной с задержкой index × 60 мс. Сам вид — классы `.appear-*` в kit.css.
 *
 * `data-appear` — блок появляется сам; `data-appear-group` — его прямые
 * потомки появляются лесенкой. Прячется только то, что в момент загрузки
 * ниже первого экрана: без скрипта и на первом экране ничего не мигает.
 */
const PENDING = "appear-pending";
const IN = "appear-in";

function targets(): HTMLElement[] {
  const items: HTMLElement[] = [];
  for (const node of document.querySelectorAll<HTMLElement>("[data-appear], [data-appear-group] > *")) {
    items.push(node);
  }
  return items;
}

function reveal(entries: HTMLElement[]): void {
  entries.forEach((node, index) => {
    node.style.setProperty("--appear-index", String(index));
    node.classList.add(IN);
    node.classList.remove(PENDING);
    // Пока висит `.appear-in`, его переходы заменяют собственные переходы
    // плитки (нажатие), поэтому класс снимается сразу после появления. Событие
    // всплывает и от потомков — им отвечать не нужно.
    // Скрытый (`hidden`) блок перехода не получит и события не пришлёт —
    // тогда класс снимает таймер: пружина 500 мс плюс задержка лесенки.
    let timer = 0;
    const finish = () => {
      window.clearTimeout(timer);
      node.removeEventListener("transitionend", done);
      node.classList.remove(IN);
      node.style.removeProperty("--appear-index");
    };
    const done = (event: TransitionEvent) => {
      if (event.target === node) finish();
    };
    node.addEventListener("transitionend", done);
    timer = window.setTimeout(finish, 600 + index * 60);
  });
}

function start(): void {
  if (!("IntersectionObserver" in window)) return;
  const below = targets().filter((node) => node.getBoundingClientRect().top > window.innerHeight);
  if (below.length === 0) return;
  for (const node of below) node.classList.add(PENDING);
  const observer = new IntersectionObserver((entries) => {
    const shown = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target as HTMLElement);
    for (const node of shown) observer.unobserve(node);
    reveal(shown);
  }, { rootMargin: "0px 0px -8% 0px" });
  for (const node of below) observer.observe(node);
}

start();
