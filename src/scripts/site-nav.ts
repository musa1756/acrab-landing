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

export {};
