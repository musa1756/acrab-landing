/**
 * Арабский мир на шаре под первым экраном главной (components/home/ArabicGlobe.astro).
 *
 * Ортографическая проекция d3-geo, крупно и неподвижно: шар много больше рисунка,
 * поэтому виден приближенный кусок — арабский мир от Мавритании до Омана во всю
 * ширину, с выпуклыми линиями сетки. Края растворяются в фон овалом (маска в CSS).
 * Рисунок — SVG в viewBox 1300×820, на телефоне 760×700.
 *
 * Страна залита своим флагом: узор `ag-f-<код>` на рамку страны, флаг ставится по
 * правилам FLAG_FIT — надписи (шахада, такбир) и гербы не режутся границей и не
 * поворачиваются. Мелким островам ставится точка с флагом. Моря подписываются по
 * координатам из разметки. Отмечены Мекка и Медина. При первом появлении карты
 * флаги проявляются с запада на восток.
 *
 * Названий стран на карте нет: наведение (или нажатие на телефоне) на страну или
 * город показывает плашку с названием. Появление выключено при prefers-reduced-motion.
 */
import { geoArea, geoCentroid, geoGraticule10, geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { GLOBE_COUNTRIES, GLOBE_LAND } from "../data/arabic-globe";

/** Центр вида: 21,5° в. д., 18° с. ш. */
const ROTATE: [number, number, number] = [-21.5, -18, 0];
/**
 * Широкий кадр: радиус 900 — арабский мир от Мавритании до Омана во всю ширину
 * и целиком внутри овала маски, лишняя суша и море срезаны; изгиб шара виден по
 * линиям сетки. Коморы южнее рамки и в кадр не попадают. На телефоне — свой кадр
 * (760×700, радиус 520).
 */
const VIEWS = {
  wide: { width: 1300, height: 820, radius: 900 },
  narrow: { width: 760, height: 700, radius: 520 },
} as const;
type View = (typeof VIEWS)[keyof typeof VIEWS];
/**
 * Точка с флагом вместо контура — только островам, которых иначе не видно
 * (Бахрейн, Коморы). Ливан, Палестина, Катар и Кувейт рисуются своими границами.
 */
const SMALL = 0.0001;
/** Все флаги flag-icons — 4:3. */
const FLAG_RATIO = 4 / 3;

/**
 * Как флаг ложится на страну.
 * - cover (по умолчанию): флаг закрывает всю рамку страны, точка флага `focus`
 *   (доли ширины и высоты) ставится как можно ближе к центру страны — так у
 *   Палестины и Иордании виден треугольник у древка, у Омана — герб.
 * - contain: флаг целиком, `scale` от размера «вписан в рамку», в центре страны
 *   (или в `at` — долгота и широта); остальная страна залита полем флага: `bg`
 *   одним цветом или `stripes` — продолжением его горизонтальных полос. Так
 *   шахада Саудовской Аравии и такбир Ирака видны целиком. Точки `at` — самое
 *   просторное место внутри страны (дальше всего от границ).
 */
type FlagFit =
  | { mode?: "cover"; focus?: [number, number] }
  | { mode: "contain"; scale: number; at?: [number, number]; bg?: string; stripes?: { colors: string[]; stops: number[] } };
const RED_WHITE_BLACK = { colors: ["#ce1126", "#ffffff", "#000001"], stops: [1 / 3, 2 / 3] };
const FLAG_FIT: Record<string, FlagFit> = {
  sa: { mode: "contain", scale: 0.6, bg: "#165d31" },
  iq: { mode: "contain", scale: 0.78, at: [43.1, 33.1], stripes: RED_WHITE_BLACK },
  sy: { mode: "contain", scale: 0.8, at: [38.4, 35.1], stripes: RED_WHITE_BLACK },
  lb: { mode: "contain", scale: 0.95, stripes: { colors: ["#ee161f", "#ffffff", "#ee161f"], stops: [0.25, 0.75] } },
  ma: { mode: "contain", scale: 0.5, at: [-6.7, 31.8], bg: "#c1272d" },
  so: { mode: "contain", scale: 0.45, at: [48.7, 9.5], bg: "#40a6ff" },
  tn: { mode: "contain", scale: 0.75, bg: "#e70013" },
  ps: { focus: [0.18, 0.5] },
  jo: { focus: [0.2, 0.5] },
  sd: { focus: [0.25, 0.5] },
  kw: { focus: [0.15, 0.5] },
  ae: { focus: [0.12, 0.5] },
  om: { focus: [0.12, 0.22] },
};

const SVG_NS = "http://www.w3.org/2000/svg";

const root = document.querySelector<HTMLElement>("[data-ag]");
if (root) init(root);

function init(root: HTMLElement): void {
  const stage = root.querySelector<HTMLElement>("[data-ag-stage]")!;
  const svg = stage.querySelector<SVGSVGElement>("svg")!;
  const defs = svg.querySelector("defs")!;
  const grat = svg.querySelector<SVGPathElement>("[data-ag-grat]")!;
  const landPath = svg.querySelector<SVGPathElement>("[data-ag-land]")!;
  const seasGroup = svg.querySelector<SVGGElement>(".ag-seas")!;
  const tip = stage.querySelector<HTMLElement>("[data-ag-tip]")!;
  const tipFlag = tip.querySelector<HTMLImageElement>("[data-ag-flag]")!;
  const tipRu = tip.querySelector<HTMLElement>("[data-ag-ru]")!;
  const tipAr = tip.querySelector<HTMLElement>("[data-ag-ar]")!;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const sphere = svg.querySelector<SVGCircleElement>(".ag-sphere")!;
  const projection = geoOrthographic().rotate(ROTATE).clipAngle(90).precision(0.3);
  const path = geoPath(projection);
  const land: GeoPermissibleObjects = { type: "MultiPolygon", coordinates: GLOBE_LAND };
  const graticule = geoGraticule10();

  const countries = GLOBE_COUNTRIES.map(({ id, coordinates }) => {
    const shape: GeoJSON.MultiPolygon = { type: "MultiPolygon", coordinates };
    const name = root.querySelector<HTMLElement>(`[data-ag-name="${id}"]`)!;
    const pattern = svg.querySelector<SVGPatternElement>(`[data-ag-pattern="${id}"]`)!;
    const fit = FLAG_FIT[id] ?? {};
    return {
      id,
      shape,
      fit,
      // Центр крупнейшей части: у Омана с эксклавом и т. п. центр всего контура
      // уезжает с суши. Где задана точка FLAG_FIT.at — она: у Марокко центр в
      // Сахаре, у Сомали — за границей.
      center: (fit.mode === "contain" && fit.at) || geoCentroid({ type: "Polygon", coordinates: largest(coordinates) }),
      point: [0, 0] as [number, number],
      area: geoArea(shape),
      ru: name.dataset.ru!,
      ar: name.dataset.ar!,
      el: svg.querySelector<SVGPathElement>(`[data-ag-id="${id}"]`)!,
      pattern,
      bg: pattern.querySelector<SVGRectElement>(".ag-flag-bg")!,
      image: pattern.querySelector("image")!,
      dot: svg.querySelector<SVGCircleElement>(`[data-ag-dot="${id}"]`)!,
    };
  });
  const byId = new Map(countries.map((country) => [country.id, country]));
  const seas = Array.from(svg.querySelectorAll<SVGTextElement>(".ag-sea"), (el) => ({
    el,
    lonLat: [Number(el.dataset.lon), Number(el.dataset.lat)] as [number, number],
    angle: Number(el.dataset.angle),
    point: [0, 0] as [number, number],
  }));
  const cities = Array.from(svg.querySelectorAll<SVGGElement>("[data-ag-city]"), (el) => ({
    id: `city:${el.dataset.agCity}`,
    el,
    lonLat: [Number(el.dataset.lon), Number(el.dataset.lat)] as [number, number],
    ru: el.dataset.ru!,
    ar: el.dataset.ar!,
    point: [0, 0] as [number, number],
  }));

  const narrowQuery = window.matchMedia("(max-width: 640px)");
  let view: View | null = null;
  let active: string | null = null;

  /** Ставит флаг страны в её узор по правилу FLAG_FIT. */
  function placeFlag(country: (typeof countries)[number], x0: number, y0: number, w: number, h: number): void {
    const { fit, pattern, bg, image } = country;
    pattern.setAttribute("x", x0.toFixed(1));
    pattern.setAttribute("y", y0.toFixed(1));
    pattern.setAttribute("width", w.toFixed(1));
    pattern.setAttribute("height", h.toFixed(1));
    // Содержимое узора отсчитывается от его угла.
    const tx = country.point[0] - x0;
    const ty = country.point[1] - y0;
    let iw: number;
    let ix: number;
    let iy: number;
    if (fit.mode === "contain") {
      iw = Math.min(w, h * FLAG_RATIO) * fit.scale;
      const ih = iw / FLAG_RATIO;
      ix = clamp(tx - iw / 2, 0, w - iw);
      iy = clamp(ty - ih / 2, 0, h - ih);
      bg.setAttribute("width", w.toFixed(1));
      bg.setAttribute("height", h.toFixed(1));
      if (fit.stripes) {
        bg.setAttribute("fill", `url(#${stripes(country.id, fit.stripes, iy, ih)})`);
      } else {
        bg.setAttribute("fill", fit.bg ?? "none");
      }
    } else {
      iw = Math.max(w, h * FLAG_RATIO);
      const ih = iw / FLAG_RATIO;
      const [fx, fy] = fit.focus ?? [0.5, 0.5];
      ix = clamp(tx - iw * fx, w - iw, 0);
      iy = clamp(ty - ih * fy, h - ih, 0);
    }
    image.setAttribute("x", ix.toFixed(1));
    image.setAttribute("y", iy.toFixed(1));
    image.setAttribute("width", iw.toFixed(1));
    image.setAttribute("height", (iw / FLAG_RATIO).toFixed(1));
  }

  /** Вертикальный градиент с жёсткими краями: полосы флага продолжаются на всю страну. */
  function stripes(id: string, spec: { colors: string[]; stops: number[] }, iy: number, ih: number): string {
    const gradientId = `ag-s-${id}`;
    let gradient = defs.querySelector<SVGLinearGradientElement>(`#${gradientId}`);
    if (!gradient) {
      gradient = document.createElementNS(SVG_NS, "linearGradient");
      gradient.id = gradientId;
      gradient.setAttribute("gradientUnits", "userSpaceOnUse");
      gradient.setAttribute("x1", "0");
      gradient.setAttribute("x2", "0");
      const edges = [0, ...spec.stops, 1];
      spec.colors.forEach((color, i) => {
        for (const offset of [edges[i]!, edges[i + 1]!]) {
          const stop = document.createElementNS(SVG_NS, "stop");
          stop.setAttribute("offset", String(offset));
          stop.setAttribute("stop-color", color);
          gradient!.append(stop);
        }
      });
      defs.append(gradient);
    }
    // Вектор градиента — по высоте флага: поля выше и ниже берут крайние полосы.
    gradient.setAttribute("y1", iy.toFixed(1));
    gradient.setAttribute("y2", (iy + ih).toFixed(1));
    return gradientId;
  }

  /** Вся геометрия под кадр: шар, сетка, суша, страны с флагами, точки, моря, города. */
  function draw(next: View): void {
    view = next;
    const { width, height, radius } = next;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    sphere.setAttribute("cx", String(width / 2));
    sphere.setAttribute("cy", String(height / 2));
    sphere.setAttribute("r", String(radius));
    projection.scale(radius).translate([width / 2, height / 2]);
    grat.setAttribute("d", path(graticule) ?? "");
    landPath.setAttribute("d", path(land) ?? "");
    for (const country of countries) {
      country.el.setAttribute("d", path(country.shape) ?? "");
      country.point = projection(country.center)!;
      const [[x0, y0], [x1, y1]] = path.bounds(country.shape);
      placeFlag(country, x0, y0, x1 - x0, y1 - y0);
      const small = country.area < SMALL;
      country.dot.toggleAttribute("hidden", !small);
      if (small) {
        country.dot.setAttribute("cx", country.point[0].toFixed(1));
        country.dot.setAttribute("cy", country.point[1].toFixed(1));
      }
    }
    for (const sea of seas) {
      sea.point = projection(sea.lonLat)!;
      const [x, y] = sea.point.map((v) => v.toFixed(1));
      sea.el.setAttribute("x", x!);
      sea.el.setAttribute("y", y!);
      if (sea.angle) sea.el.setAttribute("transform", `rotate(${sea.angle} ${x} ${y})`);
    }
    for (const city of cities) {
      city.point = projection(city.lonLat)!;
      city.el.setAttribute("transform", `translate(${city.point[0].toFixed(1)} ${city.point[1].toFixed(1)})`);
    }
  }

  /** Сколько пикселей экрана в единице рисунка. */
  function screenScale(): number {
    return svg.getScreenCTM()?.a || svg.clientWidth / view!.width;
  }

  /** Подписи морей держат 12 px на экране при любой ширине рисунка. */
  function sizeSeas(): void {
    const font = 12 / screenScale();
    seasGroup.setAttribute("font-size", font.toFixed(1));
  }

  function showTip(id: string): void {
    if (active === id) return;
    hideTip();
    const country = byId.get(id);
    const city = cities.find((c) => c.id === id);
    if (!country && !city) return;
    active = id;
    let point: [number, number];
    if (country) {
      // Наверх группы: тёмная обводка не прячется под соседями.
      country.el.parentNode?.appendChild(country.el);
      country.el.classList.add("is-active");
      country.dot.classList.add("is-active");
      tipFlag.src = `/assets/flags/${country.id}.svg`;
      tipFlag.hidden = false;
      tipRu.textContent = country.ru;
      tipAr.textContent = country.ar;
      point = country.point;
    } else {
      city!.el.classList.add("is-active");
      tipFlag.hidden = true;
      tipRu.textContent = city!.ru;
      tipAr.textContent = city!.ar;
      point = city!.point;
    }
    // Рисунок обрезан по высоте (preserveAspectRatio slice): точка переводится в
    // пиксели сцены через матрицу экрана, а не простым масштабом.
    const m = svg.getScreenCTM();
    const box = stage.getBoundingClientRect();
    if (m) {
      tip.style.left = `${m.a * point[0] + m.e - box.left}px`;
      tip.style.top = `${m.d * point[1] + m.f - box.top}px`;
    }
    tip.hidden = false;
  }

  function hideTip(): void {
    if (!active) return;
    byId.get(active)?.el.classList.remove("is-active");
    byId.get(active)?.dot.classList.remove("is-active");
    cities.find((c) => c.id === active)?.el.classList.remove("is-active");
    active = null;
    tip.hidden = true;
  }

  // Флаги для плашки подгружаются, как только курсор или палец попал на карту,
  // — иначе первая плашка показывается без флага.
  svg.addEventListener(
    "pointerenter",
    () => {
      for (const { id } of countries) new Image().src = `/assets/flags/${id}.svg`;
    },
    { once: true },
  );

  const idOf = (target: EventTarget | null): string | null => {
    if (!(target instanceof SVGElement)) return null;
    const city = target.closest<SVGGElement>("[data-ag-city]");
    if (city) return `city:${city.dataset.agCity}`;
    return target.dataset.agId ?? target.dataset.agDot ?? null;
  };
  // Мышь: страна под курсором определяется на каждом движении, поэтому плашка
  // исчезает, как только курсор ушёл на море или чужую сушу, и не залипает после
  // того, как наведённая страна переставлена наверх группы.
  svg.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    const id = idOf(event.target);
    if (!id) hideTip();
    else showTip(id);
  });
  svg.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") hideTip();
  });
  // Телефон: нажатие на страну — плашка, на пустое место — убрать её.
  svg.addEventListener("click", (event) => {
    const id = idOf(event.target);
    if (id) showTip(id);
    else hideTip();
  });

  new ResizeObserver(() => {
    const next = narrowQuery.matches ? VIEWS.narrow : VIEWS.wide;
    if (next !== view) draw(next);
    sizeSeas();
    if (active) {
      const id = active;
      hideTip();
      showTip(id);
    }
  }).observe(svg);

  if (reduceMotion) return;

  // ── Появление: флаги проявляются с запада на восток ──
  root.dataset.agReveal = "";
  const order = [...countries].sort((a, b) => a.center[0] - b.center[0]);
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      order.forEach((country, i) => {
        country.el.style.transitionDelay = `${i * 60}ms`;
        country.dot.style.transitionDelay = `${i * 60}ms`;
      });
      root.classList.add("is-revealed");
      // После появления задержки снимаются: иначе наведение отвечает с опозданием.
      window.setTimeout(() => {
        for (const country of countries) {
          country.el.style.transitionDelay = "";
          country.dot.style.transitionDelay = "";
        }
      }, order.length * 60 + 500);
    },
    { threshold: 0.25 },
  );
  observer.observe(stage);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function largest(polygons: [number, number][][][]): [number, number][][] {
  let best = polygons[0]!;
  let bestArea = -1;
  for (const polygon of polygons) {
    const area = geoArea({ type: "Polygon", coordinates: polygon });
    if (area > bestArea) {
      bestArea = area;
      best = polygon;
    }
  }
  return best;
}
