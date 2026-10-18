/**
 * Шапка: на телефоне разделы не помещаются в строку, и она прокручивается.
 * Текущий раздел («Помощь», «Оплата») прокручивается в видимую часть строки,
 * чтобы человек видел, где находится.
 */
const nav = document.querySelector<HTMLElement>(".site-nav");
const current = nav?.querySelector<HTMLElement>("[aria-current='page']");

if (nav && current && nav.scrollWidth > nav.clientWidth) {
  const box = current.getBoundingClientRect();
  const view = nav.getBoundingClientRect();
  if (box.right > view.right) nav.scrollLeft += box.right - view.right;
  else if (box.left < view.left) nav.scrollLeft -= view.left - box.left;
}

// Плавающая шапка главной уезжает вверх, пока страницу листают вниз, и
// возвращается при первом движении вверх. У самого верха она видна всегда.
const floating = document.querySelector<HTMLElement>(".site-header-floating");
if (floating) {
  let lastY = window.scrollY;
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    if (Math.abs(y - lastY) < 6) return;
    floating.classList.toggle("is-hidden", y > lastY && y > 80);
    lastY = y;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) requestAnimationFrame(update);
      ticking = true;
    },
    { passive: true },
  );
}

export {};
