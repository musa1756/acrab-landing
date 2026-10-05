/**
 * Строит карту арабского мира из точек для главной (`src/data/arabic-world-dots.ts`).
 *
 * Источник — Natural Earth, admin-0 «countries», масштаб 1:50m, в виде TopoJSON из
 * пакета world-atlas@2 (общественное достояние, https://www.naturalearthdata.com):
 *
 *   https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json
 *
 * Файл скачивается при запуске в память, в репозиторий и в зависимости ничего не
 * попадает. Можно указать готовый файл вторым аргументом.
 *
 * Запуск из папки website:
 *
 *   bun run tools/build-arabic-world-dots.ts [путь/к/countries-50m.json]
 *
 * Как устроено:
 * 1. TopoJSON разбирается вручную: дуги хранятся дельтами в квантованных целых,
 *    поэтому координата дуги — накопленная сумма, умноженная на `transform.scale`
 *    плюс `transform.translate`.
 * 2. Проекция равнопромежуточная с поправкой cos(25°) по долготе. Область:
 *    долгота −20…65, широта −15…42. Точки стоят на ровной квадратной сетке с шагом
 *    `STEP` градусов широты; в клетке точка есть, если страна покрывает не меньше
 *    `MIN_COVER` её площади (сетка 4×4 выборок), владелец клетки — страна с
 *    наибольшим покрытием.
 * 3. Страны Лиги арабских государств получают по одному SVG-пути на страну,
 *    остальная суша — один путь `land`. Путь — отрезки по строкам сетки: соседние
 *    точки строки сливаются в подпуть `M x y h len` (дальше в строке —
 *    относительные `m dx 0h len`). Страница рисует его пунктиром `0 1` с круглым
 *    окончанием: каждый штрих нулевой длины — точка в своей клетке. Отрезок
 *    длиннее на `TAIL`, иначе браузер теряет штрих на самом конце, то есть
 *    последнюю точку строки. Так путь в десять раз короче, чем «точка — подпуть».
 *    Западная Сахара засчитана Марокко, Сомалиленд — Сомали (так же красятся на
 *    карте).
 * 4. Страна, которой сетка не досталась (Бахрейн, Коморы и т. п.), получает точку
 *    в клетке, ближайшей к её центру; клетка у соседа отбирается.
 * 5. Координаты — в единицах сетки: шаг 1, точка (i, j) стоит в (i, j), viewBox
 *    начинается с −0,5. Для каждой страны сохраняется «якорь» (`ax`, `ay`) — точка
 *    страны, ближайшая к центру её крупнейшей части, и верхняя/нижняя точка страны
 *    в соседних столбцах (`ty`, `by`): плашка с названием висит над или под ними.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../src/data/arabic-world-dots.ts");

const LON0 = -20;
const LON1 = 65;
const LAT0 = -15; // юг
const LAT1 = 42; // север
const COS = Math.cos((25 * Math.PI) / 180);
const STEP = 0.85; // шаг сетки в градусах широты
const SAMPLES = 4; // выборок на сторону клетки
const MIN_COVER = 0.34;
const TAIL = ".001"; // удлинение отрезка: штрих на конце пути иначе не рисуется

/** Страны Лиги: имя в Natural Earth → код. Зависимые территории — коду соседа. */
const LEAGUE: Record<string, string> = {
  Morocco: "ma",
  "W. Sahara": "ma",
  Algeria: "dz",
  Tunisia: "tn",
  Libya: "ly",
  Egypt: "eg",
  Sudan: "sd",
  Mauritania: "mr",
  Somalia: "so",
  Somaliland: "so",
  Djibouti: "dj",
  Comoros: "km",
  "Saudi Arabia": "sa",
  Yemen: "ye",
  Oman: "om",
  "United Arab Emirates": "ae",
  Qatar: "qa",
  Bahrain: "bh",
  Kuwait: "kw",
  Iraq: "iq",
  Syria: "sy",
  Lebanon: "lb",
  Jordan: "jo",
  Palestine: "ps",
};
/** Порядок кодов — порядок чипов на странице. */
const ORDER = ["ma", "dz", "tn", "ly", "eg", "sd", "mr", "so", "dj", "km", "sa", "ye", "om", "ae", "qa", "bh", "kw", "iq", "sy", "lb", "jo", "ps"];
/** Основная часть страны: по ней считается якорь (иначе Марокко потянет Западная Сахара). */
const MAIN: Record<string, string> = { ma: "Morocco", so: "Somalia" };

type Topology = {
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: number[][][];
  objects: { countries: { geometries: Geometry[] } };
};
type Geometry = { type: "Polygon" | "MultiPolygon"; arcs: number[][] | number[][][]; properties: { name: string } };

async function loadTopology(): Promise<Topology> {
  const file = process.argv[2];
  if (file) return JSON.parse(await Bun.file(file).text()) as Topology;
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`${SOURCE_URL}: ${response.status}`);
  return (await response.json()) as Topology;
}

const topology = await loadTopology();
const { scale, translate } = topology.transform;

// Дуги: накопленная сумма дельт.
const arcs: Array<Array<[number, number]>> = topology.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx!;
    y += dy!;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]] as [number, number];
  });
});

function ringPoints(refs: number[]): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (const ref of refs) {
    const arc = ref >= 0 ? arcs[ref]! : [...arcs[~ref]!].reverse();
    points.push(...(points.length > 0 ? arc.slice(1) : arc));
  }
  return points;
}

type Part = { rings: Array<Array<[number, number]>>; box: [number, number, number, number]; area: number; cx: number; cy: number };
type Feature = { name: string; code: string; parts: Part[] };

function polygonPart(rings: number[][]): Part {
  const decoded = rings.map(ringPoints);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of decoded[0]!) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  // Площадь и центр внешнего кольца (формула Гаусса).
  let a = 0, cx = 0, cy = 0;
  const outer = decoded[0]!;
  for (let i = 0; i < outer.length - 1; i++) {
    const [x0, y0] = outer[i]!;
    const [x1, y1] = outer[i + 1]!;
    const cross = x0 * y1 - x1 * y0;
    a += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  a /= 2;
  if (Math.abs(a) > 1e-9) { cx /= 6 * a; cy /= 6 * a; } else { cx = (minX + maxX) / 2; cy = (minY + maxY) / 2; }
  return { rings: decoded, box: [minX, minY, maxX, maxY], area: Math.abs(a), cx, cy };
}

const features: Feature[] = topology.objects.countries.geometries.map((g) => {
  const polygons = g.type === "Polygon" ? [g.arcs as number[][]] : (g.arcs as number[][][]);
  return { name: g.properties.name, code: LEAGUE[g.properties.name] ?? "x", parts: polygons.map(polygonPart) };
});

// Оставляем только то, что задевает область.
const regionFeatures = features
  .map((f) => ({ ...f, parts: f.parts.filter((p) => p.box[2] >= LON0 && p.box[0] <= LON1 && p.box[3] >= LAT0 && p.box[1] <= LAT1) }))
  .filter((f) => f.parts.length > 0);

function inRing(x: number, y: number, ring: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inPart(x: number, y: number, part: Part): boolean {
  const [x0, y0, x1, y1] = part.box;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  let inside = false; // чёт-нечет по всем кольцам: внешнее плюс дыры
  for (const ring of part.rings) if (inRing(x, y, ring)) inside = !inside;
  return inside;
}

// Сетка. Единица = STEP градусов широты; по долготе шаг STEP / COS градусов.
const cols = Math.ceil(((LON1 - LON0) * COS) / STEP);
const rows = Math.ceil((LAT1 - LAT0) / STEP);
const lonAt = (u: number) => LON0 + (u * STEP) / COS;
const latAt = (v: number) => LAT1 - v * STEP;
const toU = (lon: number) => ((lon - LON0) * COS) / STEP;
const toV = (lat: number) => (LAT1 - lat) / STEP;

const owner = new Map<string, string>(); // "i,j" → код ('x' = прочая суша)
for (let j = 0; j < rows; j++) {
  for (let i = 0; i < cols; i++) {
    const counts = new Map<string, number>();
    let land = 0;
    for (let sy = 0; sy < SAMPLES; sy++) {
      for (let sx = 0; sx < SAMPLES; sx++) {
        const lon = lonAt(i - 0.5 + (sx + 0.5) / SAMPLES);
        const lat = latAt(j - 0.5 + (sy + 0.5) / SAMPLES);
        for (const f of regionFeatures) {
          if (f.parts.some((p) => inPart(lon, lat, p))) {
            counts.set(f.code, (counts.get(f.code) ?? 0) + 1);
            land++;
            break;
          }
        }
      }
    }
    if (land / (SAMPLES * SAMPLES) < MIN_COVER) continue;
    let best = "x";
    let bestCount = -1;
    for (const [code, n] of counts) {
      // Страна Лиги выигрывает у соседа при равенстве: граница не должна съедать мелкие страны.
      const weight = n + (code !== "x" ? 0.5 : 0);
      if (weight > bestCount) { best = code; bestCount = weight; }
    }
    owner.set(`${i},${j}`, best);
  }
}

// Центр крупнейшей части страны (в клетках сетки).
function mainCentre(code: string): [number, number] {
  const wanted = MAIN[code];
  const parts = regionFeatures
    .filter((f) => (wanted ? f.name === wanted : f.code === code))
    .flatMap((f) => f.parts);
  const part = parts.reduce((a, b) => (b.area > a.area ? b : a));
  return [toU(part.cx), toV(part.cy)];
}

// Мелкие страны без точек: клетка, ближайшая к центру, у соседа отбирается.
for (const code of ORDER) {
  const has = [...owner.values()].includes(code);
  if (has) continue;
  const parts = regionFeatures.filter((f) => f.code === code).flatMap((f) => f.parts);
  const total = parts.reduce((s, p) => s + p.area, 0);
  const u = parts.reduce((s, p) => s + toU(p.cx) * p.area, 0) / total;
  const v = parts.reduce((s, p) => s + toV(p.cy) * p.area, 0) / total;
  let pick: { key: string; d: number } | null = null;
  for (let j = Math.floor(v) - 2; j <= Math.ceil(v) + 2; j++) {
    for (let i = Math.floor(u) - 2; i <= Math.ceil(u) + 2; i++) {
      const key = `${i},${j}`;
      const current = owner.get(key);
      if (current && current !== "x") continue; // чужая страна Лиги
      const d = Math.hypot(i - u, j - v) + (current === "x" ? 0.15 : 0);
      if (!pick || d < pick.d) pick = { key, d };
    }
  }
  if (!pick) throw new Error(`нет места для точки: ${code}`);
  owner.set(pick.key, code);
  console.log(`точка в центре: ${code} → ${pick.key}`);
}

// Путь: подряд идущие точки строки — один отрезок, шаги внутри строки относительные.
function pathOf(code: string): { d: string; n: number; cells: Array<[number, number]> } {
  const cells: Array<[number, number]> = [];
  for (const [key, who] of owner) {
    if (who !== code) continue;
    cells.push(key.split(",").map(Number) as [number, number]);
  }
  cells.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const runs: Array<{ i: number; j: number; len: number }> = [];
  for (const [i, j] of cells) {
    const last = runs.at(-1);
    if (last && last.j === j && last.i + last.len + 1 === i) last.len++;
    else runs.push({ i, j, len: 0 });
  }
  let d = "";
  let px = 0;
  let py = -1;
  for (const { i, j, len } of runs) {
    d += j === py ? `m${i - px} 0h${len}${TAIL}` : `M${i} ${j}h${len}${TAIL}`;
    px = i + len;
    py = j;
  }
  return { d, n: cells.length, cells };
}

const otherLand = pathOf("x");
const countries = ORDER.map((code) => {
  const { d, n, cells } = pathOf(code);
  const [u, v] = mainCentre(code);
  let anchor = cells[0]!;
  let bestD = Infinity;
  for (const cell of cells) {
    const dist = Math.hypot(cell[0] - u, cell[1] - v);
    if (dist < bestD) { bestD = dist; anchor = cell; }
  }
  // Верх и низ страны в столбцах у якоря.
  const near = cells.filter((cell) => Math.abs(cell[0] - anchor[0]) <= 2).map((cell) => cell[1]);
  return { id: code, n, ax: anchor[0], ay: anchor[1], ty: Math.min(...near), by: Math.max(...near), d };
});

const body = `// Сгенерировано tools/build-arabic-world-dots.ts — руками не править.
// Источник: Natural Earth admin-0 (world-atlas@2, countries-50m), общественное достояние.
// Сетка ${cols}×${rows}, шаг ${STEP}° широты, поправка cos 25° по долготе, область
// долгота ${LON0}…${LON1}, широта ${LAT0}…${LAT1}.
// Единицы пути — клетки сетки: точка (i, j) стоит в (i, j), \`viewBox\` начинается с −0,5.
// Подряд идущие точки строки — отрезок \`M x y h len\` (дальше в строке — \`m dx 0h len\`),
// длиннее на ${TAIL}. Рисуется пунктиром \`0 1\` со скруглёнными концами: каждый штрих —
// точка, толщина линии = диаметр точки.

export interface WorldDotsCountry {
  /** Код страны, как в ArabicWorldMap.astro. */
  id: string;
  /** Число точек. */
  n: number;
  /** Якорь плашки с названием: точка страны у центра её основной части. */
  ax: number;
  ay: number;
  /** Самая северная и самая южная точка страны в столбцах у якоря. */
  ty: number;
  by: number;
  d: string;
}

export const WORLD_DOTS = {
  cols: ${cols},
  rows: ${rows},
  /** Прочая суша, ${otherLand.n} точек. */
  land: ${JSON.stringify(otherLand.d)},
  countries: ${JSON.stringify(countries, null, 2).replace(/\n/g, "\n  ")} satisfies WorldDotsCountry[],
} as const;
`;
writeFileSync(OUT, body);
const bytes = Buffer.byteLength(body);
console.log(`сетка ${cols}×${rows}; суши ${otherLand.n} точек; файл ${bytes} Б (${(bytes / 1024).toFixed(1)} КБ)`);
for (const c of countries) console.log(c.id.padEnd(3), String(c.n).padStart(4), `anchor ${c.ax},${c.ay}`);
