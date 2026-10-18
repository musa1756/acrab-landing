/**
 * Строит данные глобуса арабского мира для главной (`src/data/arabic-globe.ts`).
 *
 * Источник — Natural Earth admin-0 «countries» в виде TopoJSON из пакета
 * world-atlas@2 (общественное достояние, https://www.naturalearthdata.com):
 * страны Лиги — из масштаба 1:50m (в 1:110m нет Бахрейна и Коморов), остальная
 * суша — из 1:110m, на глобусе в полэкрана разница в деталях не видна.
 *
 * Файлы скачиваются при запуске в память, в репозиторий попадает только итог.
 * Можно указать готовые файлы аргументами.
 *
 * Запуск из папки website:
 *
 *   bun run tools/build-arabic-globe.ts [countries-110m.json countries-50m.json]
 *
 * Координаты — [долгота, широта] с точностью 0,1°; подряд идущие совпавшие точки
 * выкинуты. После округления крошечный остров может «вывернуться» (d3-geo тогда
 * заливает всю сферу, кроме него), поэтому многоугольник с площадью больше
 * полусферы переворачивается, а острова мельче MIN_AREA выкидываются — кроме
 * самого крупного куска страны, чтобы Бахрейн и Коморы остались на глобусе.
 * Западная Сахара засчитана Марокко, Сомалиленд — Сомали, вся историческая
 * Палестина — Палестине.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { geoArea } from "d3-geo";
import { feature, merge } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

const SOURCE = "https://cdn.jsdelivr.net/npm/world-atlas@2";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../src/data/arabic-globe.ts");
const GRID = 10; // 1 / 0,1°
const MIN_AREA = 2e-6; // стерадиан, ≈ 80 км²

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
  // Вся историческая Палестина красится флагом Палестины (решение владельца:
  // сайт для мусульман), поэтому эта территория в Natural Earth засчитана ps.
  Israel: "ps",
};

type Ring = [number, number][];
type Multi = Ring[][];

async function load(arg: string | undefined, name: string): Promise<Topology> {
  if (arg) return JSON.parse(readFileSync(arg, "utf8"));
  const res = await fetch(`${SOURCE}/${name}`);
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  return (await res.json()) as Topology;
}

function polygons(geometry: GeoJSON.Geometry | null): Multi {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates as Ring[]];
  if (geometry.type === "MultiPolygon") return geometry.coordinates as Ring[][];
  return [];
}

function round(rings: Multi): Multi {
  const polygons = rings
    .map((polygon) =>
      polygon
        .map((ring) => {
          const out: Ring = [];
          for (const [lon, lat] of ring) {
            const point: [number, number] = [Math.round(lon * GRID) / GRID, Math.round(lat * GRID) / GRID];
            const last = out[out.length - 1];
            if (!last || last[0] !== point[0] || last[1] !== point[1]) out.push(point);
          }
          return out;
        })
        .filter((ring) => ring.length >= 4),
    )
    .filter((polygon) => polygon.length > 0)
    .map((polygon) => {
      let area = geoArea({ type: "Polygon", coordinates: polygon });
      if (area > 2 * Math.PI) {
        polygon = polygon.map((ring) => [...ring].reverse());
        area = geoArea({ type: "Polygon", coordinates: polygon });
      }
      return { polygon, area };
    });
  const biggest = Math.max(...polygons.map(({ area }) => area));
  return polygons.filter(({ area }) => area >= MIN_AREA || area === biggest).map(({ polygon }) => polygon);
}

function features(topology: Topology): GeoJSON.Feature[] {
  const countries = topology.objects.countries as GeometryCollection;
  const collection = feature(topology, countries) as GeoJSON.FeatureCollection;
  return collection.features;
}

const [arg110, arg50] = process.argv.slice(2);
const world110 = features(await load(arg110, "countries-110m.json"));
const topology50 = await load(arg50, "countries-50m.json");

const land: Multi = [];
for (const country of world110) {
  if (LEAGUE[country.properties?.name]) continue;
  land.push(...round(polygons(country.geometry)));
}

// Части одной страны (Марокко и Западная Сахара, Сомали и Сомалиленд) сливаются
// по общим дугам: иначе на карте между ними видна граница.
const parts = new Map<string, GeometryCollection["geometries"]>();
for (const geometry of (topology50.objects.countries as GeometryCollection).geometries) {
  const id = LEAGUE[(geometry.properties as { name?: string } | undefined)?.name ?? ""];
  if (id) parts.set(id, [...(parts.get(id) ?? []), geometry]);
}
const league = new Map<string, Multi>();
for (const [id, geometries] of parts) {
  league.set(id, round(polygons(merge(topology50, geometries as Parameters<typeof merge>[1]))));
}
const missing = [...new Set(Object.values(LEAGUE))].filter((id) => !league.has(id));
if (missing.length) throw new Error(`Нет геометрии: ${missing.join(", ")}`);

const countries = [...league].map(([id, coordinates]) => ({ id, coordinates }));
const body = `// Создано tools/build-arabic-globe.ts — не править вручную.
// Natural Earth admin-0 (общественное достояние) через world-atlas@2.

export type GlobeMulti = [number, number][][][];

export const GLOBE_LAND: GlobeMulti = ${JSON.stringify(land)};

export const GLOBE_COUNTRIES: { id: string; coordinates: GlobeMulti }[] = ${JSON.stringify(countries)};
`;
writeFileSync(OUT, body);
console.log(`${OUT}: ${(body.length / 1024).toFixed(0)} КБ, стран Лиги ${countries.length}`);
