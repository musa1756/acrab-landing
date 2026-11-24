/**
 * Интерактивный предпросмотр пословного перевода для статьи «аль-Кироату ар-Рашида».
 * Нажатие на слово выделяет кнопку (`aria-pressed="true"`) и показывает его
 * перевод в контексте предложения. Без скрипта вся таблица переводов видна ниже.
 */
const containers = Array.from(document.querySelectorAll<HTMLElement>("[data-tap-preview]"));

for (const container of containers) {
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button[data-tap-word]"));
  const output = container.querySelector<HTMLElement>("[data-tap-output]");
  if (!buttons.length || !output) continue;

  const select = (target: HTMLButtonElement): void => {
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button === target));
    }
    const word = target.dataset.tapWord ?? "";
    const gloss = target.dataset.tapGloss ?? "";
    const sentence = target.dataset.tapSentence ?? "";

    output.textContent = "";

    const wordSpan = document.createElement("span");
    wordSpan.className = "arabic-inline";
    wordSpan.lang = "ar";
    wordSpan.dir = "rtl";
    wordSpan.textContent = word;

    const strong = document.createElement("strong");
    strong.textContent = ` — ${gloss}. `;

    const context = document.createElement("span");
    context.textContent = `Предложение целиком: «${sentence}».`;

    output.append(wordSpan, strong, context);
  };

  for (const button of buttons) {
    button.addEventListener("click", () => select(button));
  }
}
