/**
 * «Дождь» из арабских букв за клавиатурой `/arabic-keyboard/`, как в «Матрице»:
 * столбцы букв стекают вниз, голова столбца темнее, хвост гаснет. Рисуется на
 * прозрачном canvas золотом бренда поверх фона страницы. Кадры идут, только пока
 * первый экран виден; при уменьшении движения остаётся один неподвижный кадр.
 */

// 28 букв, формы хамзы и восточные цифры. Одиночный символ canvas рисует изолированной формой.
const GLYPHS = [..."ابتثجحخدذرزسشصضطظعغفقكلمنهوي", ..."ءأإآؤئةى", ..."٠١٢٣٤٥٦٧٨٩"];
const FRAME_MS = 1000 / 30;
const MAX_DPR = 2;
const HEAD_ALPHA = 0.85;
const TRAIL_ALPHA = 0.5;
// Доля клеток, у которых за кадр меняется буква: столбцы «мерцают», как в фильме.
const FLICKER = 0.004;

interface Column {
  /** Строка головы, дробная: столбец движется плавно, а буквы стоят в клетках. */
  head: number;
  /** Строк в секунду. */
  speed: number;
  /** Длина хвоста в строках. */
  length: number;
  /** Буква в каждой строке столбца — индекс в GLYPHS. */
  glyphs: number[];
}

const random = (min: number, max: number) => min + Math.random() * (max - min);
const randomGlyph = () => Math.floor(Math.random() * GLYPHS.length);

function init(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ctx = context;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let columns: Column[] = [];
  let rows = 0;
  let dpr = 1;
  let fontPx = 0;
  let cellW = 0;
  let cellH = 0;
  // Спрайт букв: верхний ряд — цвет хвоста, нижний — цвет головы. drawImage быстрее fillText.
  let sprite: HTMLCanvasElement | null = null;
  let visible = false;
  let raf = 0;
  let last = 0;

  function resetColumn(column: Column, initial: boolean): void {
    column.speed = random(5, 13);
    column.length = Math.round(random(6, Math.max(8, Math.min(24, rows * 0.8))));
    // Отрицательная голова — пауза перед следующим проходом; при первом кадре дождь уже идёт.
    column.head = initial ? random(-rows, rows) : -random(0, rows * 0.7);
  }

  function buildSprite(): void {
    const style = getComputedStyle(canvas);
    const family = style.getPropertyValue("--font-arabic").trim() || "serif";
    const trail = style.getPropertyValue("--c-brand").trim() || "#d4a854";
    const head = style.getPropertyValue("--c-brand-text").trim() || "#86691f";
    const w = Math.ceil(cellW * dpr);
    const h = Math.ceil(cellH * dpr);
    sprite = document.createElement("canvas");
    sprite.width = w * GLYPHS.length;
    sprite.height = h * 2;
    const s = sprite.getContext("2d");
    if (!s) return;
    s.font = `${Math.round(fontPx * dpr)}px ${family}`;
    s.textAlign = "center";
    s.textBaseline = "middle";
    GLYPHS.forEach((glyph, index) => {
      s.fillStyle = trail;
      s.fillText(glyph, index * w + w / 2, h / 2);
      s.fillStyle = head;
      s.fillText(glyph, index * w + w / 2, h + h / 2);
    });
  }

  // Размер берётся из CSS; уже идущие столбцы сохраняются, чтобы дождь не начинался заново.
  function layout(): boolean {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return false;
    const nextDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const nextFont = width < 640 ? 16 : 20;
    const rebuild = nextDpr !== dpr || nextFont !== fontPx || !sprite;
    dpr = nextDpr;
    fontPx = nextFont;
    cellW = Math.round(fontPx * 1.2);
    cellH = Math.round(fontPx * 1.35);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    rows = Math.ceil(height / cellH);
    const count = Math.ceil(width / cellW);
    columns.length = Math.min(columns.length, count);
    for (const column of columns) {
      while (column.glyphs.length < rows) column.glyphs.push(randomGlyph());
    }
    while (columns.length < count) {
      const column: Column = { head: 0, speed: 0, length: 0, glyphs: Array.from({ length: rows }, randomGlyph) };
      resetColumn(column, true);
      columns.push(column);
    }
    if (rebuild) buildSprite();
    return true;
  }

  function step(seconds: number): void {
    for (const column of columns) {
      column.head += column.speed * seconds;
      if (column.head - column.length > rows) resetColumn(column, false);
    }
    const flicks = Math.ceil(columns.length * rows * FLICKER);
    for (let i = 0; i < flicks; i += 1) {
      const column = columns[Math.floor(Math.random() * columns.length)];
      if (column) column.glyphs[Math.floor(Math.random() * rows)] = randomGlyph();
    }
  }

  function draw(): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!sprite) return;
    const w = Math.ceil(cellW * dpr);
    const h = Math.ceil(cellH * dpr);
    columns.forEach((column, index) => {
      const top = Math.floor(column.head);
      for (let i = 0; i < column.length; i += 1) {
        const row = top - i;
        if (row < 0 || row >= rows) continue;
        const isHead = i === 0;
        ctx.globalAlpha = isHead ? HEAD_ALPHA : TRAIL_ALPHA * (1 - i / column.length) ** 1.4;
        const glyph = column.glyphs[row] ?? 0;
        ctx.drawImage(sprite!, glyph * w, isHead ? h : 0, w, h, Math.round(index * cellW * dpr), Math.round(row * cellH * dpr), w, h);
      }
    });
    ctx.globalAlpha = 1;
  }

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    if (now - last < FRAME_MS) return;
    // После паузы (вкладка в фоне, экран прокручен) столбцы не перескакивают.
    const seconds = Math.min((now - last) / 1000, 0.1);
    last = now;
    step(seconds);
    draw();
  }

  function stop(): void {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function update(): void {
    if (!visible || reducedMotion.matches) {
      stop();
      return;
    }
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  new ResizeObserver(() => {
    if (layout()) draw();
  }).observe(canvas);

  new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    update();
  }).observe(canvas);

  reducedMotion.addEventListener("change", update);

  // Арабский шрифт может догрузиться позже первого кадра — тогда буквы перерисовываются им.
  document.fonts?.ready.then(() => {
    if (!cellW) return;
    buildSprite();
    draw();
  });
}

const canvas = document.querySelector<HTMLCanvasElement>("[data-arabic-rain]");
if (canvas) init(canvas);

export {};
