/**
 * Страница `/arabic-keyboard/`: экранные клавиши, ввод с клавиатуры компьютера
 * по физическим клавишам (`event.code`), копирование, очистка и транслитерация.
 * Раскладка и правки текста — в `arabic-keyboard-model.ts`. Текст остаётся в
 * поле страницы: ничего не отправляется и не сохраняется.
 */
import { ARABIC_KEYS_BY_CODE, backspaceRange, charForCode, keyCaption, transliterate } from "./arabic-keyboard-model";

const NEW_LINE = String.fromCharCode(10);
const STATUS_MS = 2600;

// execCommand помечен устаревшим, но только он сохраняет отмену по Ctrl+Z и копирует без разрешений.
function exec(command: string, value?: string): boolean {
  try {
    return document.execCommand(command, false, value);
  } catch {
    return false;
  }
}

function init(root: HTMLElement): void {
  const textarea = root.querySelector<HTMLTextAreaElement>("[data-kbd-text]");
  const board = root.querySelector<HTMLElement>("[data-kbd-board]");
  const physicalToggle = root.querySelector<HTMLInputElement>("[data-kbd-physical]");
  const translitToggle = root.querySelector<HTMLInputElement>("[data-kbd-translit-toggle]");
  const translitBox = root.querySelector<HTMLElement>("[data-kbd-translit]");
  const translitOut = root.querySelector<HTMLElement>("[data-kbd-translit-out]");
  const status = root.querySelector<HTMLElement>("[data-kbd-status]");
  const copyButton = root.querySelector<HTMLButtonElement>("[data-kbd-copy]");
  const clearButton = root.querySelector<HTMLButtonElement>("[data-kbd-clear]");
  if (!textarea || !board || !physicalToggle) return;

  const finePointer = window.matchMedia("(pointer: fine)");
  let latchedShift = false;
  let physicalShift = false;
  let statusTimer = 0;

  // Включено по умолчанию там, где есть мышь и клавиатура; на телефоне ввод идёт касаниями.
  physicalToggle.checked = finePointer.matches;

  function setStatus(message: string): void {
    if (!status) return;
    window.clearTimeout(statusTimer);
    status.textContent = message;
    if (message) statusTimer = window.setTimeout(() => (status.textContent = ""), STATUS_MS);
  }

  function renderLayer(): void {
    const shift = latchedShift || physicalShift;
    board!.dataset.layer = shift ? "shift" : "base";
    for (const button of board!.querySelectorAll<HTMLButtonElement>("button[data-code]")) {
      const key = ARABIC_KEYS_BY_CODE[button.dataset.code ?? ""];
      if (!key) continue;
      const main = button.querySelector(".kbd-main");
      const alt = button.querySelector(".kbd-alt");
      if (main) main.textContent = keyCaption(shift ? key.shift : key.base);
      if (alt) alt.textContent = keyCaption(shift ? key.base : key.shift);
      button.setAttribute("aria-label", shift ? key.shiftName : key.baseName);
    }
    for (const button of board!.querySelectorAll<HTMLButtonElement>("button[data-action='shift']")) {
      button.setAttribute("aria-pressed", String(latchedShift));
    }
  }

  function renderTranslit(): void {
    if (!translitToggle || !translitBox || !translitOut) return;
    translitBox.hidden = !translitToggle.checked;
    if (!translitToggle.checked) return;
    const text = textarea!.value.trim();
    translitOut.textContent = text ? transliterate(textarea!.value) : "Введите текст, и здесь появится транслитерация.";
    translitOut.classList.toggle("kbd-translit-empty", !text);
  }

  // Правка идёт через execCommand, пока поле в фокусе: так работает отмена по Ctrl+Z.
  // Без фокуса (касание экранной клавиши на телефоне) текст меняется напрямую.
  function replaceRange(from: number, to: number, replacement: string): void {
    if (document.activeElement === textarea) {
      textarea!.setSelectionRange(from, to);
      if (exec(replacement === "" ? "delete" : "insertText", replacement)) return;
    }
    textarea!.setRangeText(replacement, from, to, "end");
    textarea!.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function insert(text: string): void {
    replaceRange(textarea!.selectionStart, textarea!.selectionEnd, text);
  }

  function backspace(): void {
    const [from, to] = backspaceRange(textarea!.value, textarea!.selectionStart, textarea!.selectionEnd);
    if (from !== to) replaceRange(from, to, "");
  }

  board.addEventListener("mousedown", (event) => {
    // С мышью поле остаётся в фокусе, чтобы курсор не пропадал; на телефоне фокус уходит,
    // и системная клавиатура не закрывает экранную.
    if (finePointer.matches && (event.target as Element).closest("button")) event.preventDefault();
  });

  board.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("button");
    if (!button || !board.contains(button)) return;
    const { code, action, char } = button.dataset;
    if (action === "shift") {
      latchedShift = !latchedShift;
      renderLayer();
    } else if (action === "backspace") {
      backspace();
    } else if (action === "enter") {
      insert(NEW_LINE);
    } else if (action === "space") {
      insert(" ");
    } else if (char) {
      insert(char);
    } else if (code) {
      const value = charForCode(code, latchedShift || physicalShift);
      if (value === null) return;
      insert(value);
      if (latchedShift) {
        latchedShift = false;
        renderLayer();
      }
    }
  });

  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Shift" && physicalToggle.checked && !physicalShift) {
      physicalShift = true;
      renderLayer();
    }
    if (!physicalToggle.checked || event.isComposing) return;
    // Сочетания с Ctrl, Cmd и Alt (копирование, вставка, AltGr) работают как обычно.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const value = charForCode(event.code, event.shiftKey);
    if (value === null) return;
    event.preventDefault();
    insert(value);
  });

  textarea.addEventListener("keyup", (event) => {
    if (event.key === "Shift" && physicalShift) {
      physicalShift = false;
      renderLayer();
    }
  });

  textarea.addEventListener("blur", () => {
    if (!physicalShift) return;
    physicalShift = false;
    renderLayer();
  });

  physicalToggle.addEventListener("change", () => {
    physicalShift = false;
    renderLayer();
  });

  textarea.addEventListener("input", renderTranslit);
  translitToggle?.addEventListener("change", renderTranslit);

  copyButton?.addEventListener("click", async () => {
    const text = textarea.value;
    if (!text) {
      setStatus("Нечего копировать: поле пустое.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Текст скопирован.");
      return;
    } catch {
      // Нет доступа к буферу обмена: пробуем старый способ ниже.
    }
    const { selectionStart, selectionEnd } = textarea;
    textarea.select();
    const copied = exec("copy");
    textarea.setSelectionRange(selectionStart, selectionEnd);
    setStatus(copied ? "Текст скопирован." : "Не удалось скопировать. Выделите текст и скопируйте его вручную.");
  });

  clearButton?.addEventListener("click", () => {
    if (!textarea.value) {
      setStatus("Поле уже пустое.");
      return;
    }
    replaceRange(0, textarea.value.length, "");
    setStatus("Текст очищен.");
  });

  renderLayer();
  renderTranslit();
}

const root = document.querySelector<HTMLElement>("[data-arabic-keyboard]");
if (root) init(root);

export {};
