/**
 * Кнопки «Слушать» в статьях с фразами. Каждая играет один файл из
 * /assets/audio/ — озвучку из приложения. Одновременно звучит одна дорожка:
 * повторное нажатие останавливает её, нажатие на другую кнопку переключает.
 * Без скрипта кнопки остаются скрытыми (атрибут hidden), страница читается как есть.
 */
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button.audio-btn[data-audio]"));

let active: { button: HTMLButtonElement; audio: HTMLAudioElement } | null = null;

function release(button: HTMLButtonElement): void {
  button.classList.remove("is-playing");
  button.setAttribute("aria-pressed", "false");
}

function stop(): void {
  if (!active) return;
  active.audio.pause();
  release(active.button);
  active = null;
}

function play(button: HTMLButtonElement): void {
  const src = button.dataset.audio;
  if (!src) return;
  stop();
  const audio = new Audio(src);
  active = { button, audio };
  button.classList.add("is-playing");
  button.setAttribute("aria-pressed", "true");
  const finish = () => {
    if (active?.audio !== audio) return;
    release(button);
    active = null;
  };
  audio.addEventListener("ended", finish);
  audio.addEventListener("error", finish);
  audio.play().catch(finish);
}

for (const button of buttons) {
  button.hidden = false;
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => {
    if (active?.button === button) stop();
    else play(button);
  });
}
