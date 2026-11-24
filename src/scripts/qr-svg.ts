/**
 * Компактный чистый TypeScript-генератор QR-кодов (ISO/IEC 18004, Byte mode,
 * ECC Level M, версии 1–10 — до 213 байт UTF-8). Без зависимостей, без inline
 * `style=""` (совместим со строгим CSP).
 */

interface VersionSpec {
  version: number;
  size: number;
  maxBytes: number;
  ecPerBlock: number;
  /** [количество блоков, байт данных в блоке] */
  groups: ReadonlyArray<readonly [blocks: number, dataWords: number]>;
  align: readonly number[];
}

const VERSIONS: readonly VersionSpec[] = [
  { version: 1, size: 21, maxBytes: 14, ecPerBlock: 10, groups: [[1, 16]], align: [] },
  { version: 2, size: 25, maxBytes: 26, ecPerBlock: 16, groups: [[1, 28]], align: [6, 18] },
  { version: 3, size: 29, maxBytes: 42, ecPerBlock: 26, groups: [[1, 44]], align: [6, 22] },
  { version: 4, size: 33, maxBytes: 62, ecPerBlock: 18, groups: [[2, 32]], align: [6, 26] },
  { version: 5, size: 37, maxBytes: 84, ecPerBlock: 24, groups: [[2, 43]], align: [6, 30] },
  { version: 6, size: 41, maxBytes: 106, ecPerBlock: 16, groups: [[4, 27]], align: [6, 34] },
  { version: 7, size: 45, maxBytes: 122, ecPerBlock: 18, groups: [[4, 31]], align: [6, 22, 38] },
  { version: 8, size: 49, maxBytes: 152, ecPerBlock: 22, groups: [[2, 38], [2, 39]], align: [6, 24, 42] },
  { version: 9, size: 53, maxBytes: 180, ecPerBlock: 22, groups: [[3, 36], [2, 37]], align: [6, 26, 46] },
  { version: 10, size: 57, maxBytes: 213, ecPerBlock: 26, groups: [[4, 43], [1, 44]], align: [6, 28, 50] },
];

// Таблицы поля Галуа GF(256) с примитивным многочленом 0x11d.
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]!;
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!;
}

function rsGenerator(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i]!;
    for (let j = 0; j < poly.length; j++) {
      next[j] = (next[j] ?? 0) ^ poly[j]!;
      next[j + 1] = (next[j + 1] ?? 0) ^ gfMul(poly[j]!, factor);
    }
    poly = next;
  }
  return poly;
}

export function rsEncode(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGenerator(ecCount);
  const rem = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i]! ^ rem[0]!;
    rem.copyWithin(0, 1);
    rem[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j++) {
        rem[j] = (rem[j] ?? 0) ^ gfMul(gen[j + 1]!, factor);
      }
    }
  }
  return rem;
}

function bchFormatBits(mask: number): number {
  // ECC Level M = 00
  const data = (0b00 << 3) | (mask & 0b111);
  let rem = data << 10;
  for (let bit = 14; bit >= 10; bit--) {
    if ((rem >> bit) & 1) rem ^= 0x537 << (bit - 10);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function bchVersionBits(version: number): number {
  let rem = version << 12;
  for (let bit = 17; bit >= 12; bit--) {
    if ((rem >> bit) & 1) rem ^= 0x1f25 << (bit - 12);
  }
  return (version << 12) | rem;
}

function encodeCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
  const totalData = spec.groups.reduce((sum, [blocks, words]) => sum + blocks * words, 0);
  const bits: number[] = [];
  const pushBits = (value: number, width: number) => {
    for (let i = width - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };

  // Mode indicator: Byte = 0100
  pushBits(0b0100, 4);
  // Character count indicator: 8 bits for V1-V9, 16 bits for V10+
  pushBits(bytes.length, spec.version <= 9 ? 8 : 16);
  for (const byte of bytes) pushBits(byte, 8);

  const capacityBits = totalData * 8;
  const terminator = Math.min(4, capacityBits - bits.length);
  for (let i = 0; i < terminator; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataWords = new Uint8Array(totalData);
  const byteLen = bits.length / 8;
  for (let i = 0; i < byteLen; i++) {
    let val = 0;
    for (let b = 0; b < 8; b++) val = (val << 1) | bits[i * 8 + b]!;
    dataWords[i] = val;
  }
  for (let i = byteLen, pad = 0; i < totalData; i++, pad ^= 1) {
    dataWords[i] = pad === 0 ? 0xec : 0x11;
  }

  // Split into RS blocks & interleave
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (const [blocks, words] of spec.groups) {
    for (let b = 0; b < blocks; b++) {
      const slice = dataWords.subarray(offset, offset + words);
      offset += words;
      dataBlocks.push(slice);
      ecBlocks.push(rsEncode(slice, spec.ecPerBlock));
    }
  }

  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  const out = new Uint8Array(totalData + dataBlocks.length * spec.ecPerBlock);
  let pos = 0;
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) out[pos++] = block[i]!;
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (const ec of ecBlocks) {
      out[pos++] = ec[i]!;
    }
  }
  return out;
}

function maskCondition(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
}

function penaltyScore(grid: Uint8Array, size: number): number {
  const at = (r: number, c: number) => grid[r * size + c]!;
  let penalty = 0;

  // Rule 1: adjacent modules in row/column
  for (let r = 0; r < size; r++) {
    let runColor = at(r, 0);
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      const v = at(r, c);
      if (v === runColor) {
        runLen += 1;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = v;
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }
  for (let c = 0; c < size; c++) {
    let runColor = at(0, c);
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      const v = at(r, c);
      if (v === runColor) {
        runLen += 1;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = v;
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // Rule 2: 2x2 blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = at(r, c);
      if (v === at(r, c + 1) && v === at(r + 1, c) && v === at(r + 1, c + 1)) {
        penalty += 3;
      }
    }
  }

  // Rule 3: finder-like 1:1:3:1:1 patterns
  const matchFinder = (arr: number[]): boolean =>
    (arr[0] === 1 && arr[1] === 0 && arr[2] === 1 && arr[3] === 1 && arr[4] === 1 && arr[5] === 0 && arr[6] === 1 && arr[7] === 0 && arr[8] === 0 && arr[9] === 0 && arr[10] === 0) ||
    (arr[0] === 0 && arr[1] === 0 && arr[2] === 0 && arr[3] === 0 && arr[4] === 1 && arr[5] === 0 && arr[6] === 1 && arr[7] === 1 && arr[8] === 1 && arr[9] === 0 && arr[10] === 1);
  const windowBuf = new Array<number>(11);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      for (let k = 0; k < 11; k++) windowBuf[k] = at(r, c + k);
      if (matchFinder(windowBuf)) penalty += 40;
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      for (let k = 0; k < 11; k++) windowBuf[k] = at(r + k, c);
      if (matchFinder(windowBuf)) penalty += 40;
    }
  }

  // Rule 4: dark ratio balance
  let dark = 0;
  for (let i = 0; i < grid.length; i++) dark += grid[i]!;
  const ratio = (dark * 100) / grid.length;
  const k = Math.floor(Math.abs(ratio - 50) / 5);
  penalty += k * 10;

  return penalty;
}

export interface QrMatrix {
  version: number;
  size: number;
  modules: Uint8Array;
}

export function encodeQrMatrix(text: string): QrMatrix {
  const bytes = new TextEncoder().encode(text);
  const spec = VERSIONS.find((v) => bytes.length <= v.maxBytes);
  if (!spec) {
    throw new RangeError(`QR payload too long (${bytes.length} bytes, max ${VERSIONS[VERSIONS.length - 1]!.maxBytes})`);
  }

  const { size, version } = spec;
  const base = new Uint8Array(size * size);
  const reserved = new Uint8Array(size * size);

  const setFn = (r: number, c: number, dark: boolean) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    const idx = r * size + c;
    base[idx] = dark ? 1 : 0;
    reserved[idx] = 1;
  };

  // Finder patterns + separators
  const placeFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || c < 0 || r >= size || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFn(r, c, inOuter && (onBorder || inCore));
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Alignment patterns
  for (const r of spec.align) {
    for (const c of spec.align) {
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFn(r + dr, c + dc, dark);
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFn(6, i, i % 2 === 0);
    setFn(i, 6, i % 2 === 0);
  }

  // Dark module & reserve format areas
  setFn(size - 8, 8, true);
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      reserved[8 * size + i] = 1;
      reserved[i * size + 8] = 1;
    }
  }
  for (let i = 0; i < 8; i++) {
    reserved[8 * size + (size - 1 - i)] = 1;
    reserved[(size - 1 - i) * size + 8] = 1;
  }

  // Version info (V7+)
  if (version >= 7) {
    const vBits = bchVersionBits(version);
    for (let i = 0; i < 18; i++) {
      const dark = ((vBits >> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = size - 11 + (i % 3);
      setFn(a, b, dark);
      setFn(b, a, dark);
    }
  }

  // Place data codewords in standard zigzag order
  const codewords = encodeCodewords(bytes, spec);
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = (((size - 1 - right) / 2) | 0) % 2 === 0;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx++) {
        const c = right - dx;
        const idx = r * size + c;
        if (reserved[idx]) continue;
        let bit = 0;
        if (bitIdx < totalBits) {
          bit = (codewords[bitIdx >> 3]! >> (7 - (bitIdx & 7))) & 1;
          bitIdx += 1;
        }
        base[idx] = bit;
      }
    }
  }

  const placeFormat = (grid: Uint8Array, mask: number) => {
    const fmt = bchFormatBits(mask);
    const bit = (i: number) => (fmt >> i) & 1;
    // Top-left around finder
    const tlCoords: ReadonlyArray<readonly [number, number]> = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    ];
    for (let i = 0; i < 15; i++) {
      const [r, c] = tlCoords[i]!;
      grid[r * size + c] = bit(14 - i);
    }
    // Bottom-left & top-right
    for (let i = 0; i < 7; i++) grid[(size - 1 - i) * size + 8] = bit(14 - i);
    for (let i = 0; i < 8; i++) grid[8 * size + (size - 8 + i)] = bit(7 - i);
  };

  let bestGrid: Uint8Array | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const candidate = new Uint8Array(base);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const idx = r * size + c;
        if (!reserved[idx] && maskCondition(mask, r, c)) {
          candidate[idx] = (candidate[idx] ?? 0) ^ 1;
        }
      }
    }
    placeFormat(candidate, mask);
    const score = penaltyScore(candidate, size);
    if (score < bestScore) {
      bestScore = score;
      bestGrid = candidate;
    }
  }

  return { version, size, modules: bestGrid! };
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Рендерит QR-код в компактный SVG без inline-стилей.
 * `quietZone = 4` соответствует стандарту ISO/IEC 18004.
 */
export function renderQrSvg(
  text: string,
  options: { quietZone?: number; ariaLabel?: string; className?: string } = {},
): string {
  const quiet = options.quietZone ?? 4;
  const label = options.ariaLabel ?? "QR-код для скачивания Acrab";
  const className = options.className ?? "get-qr-svg";
  const { size, modules } = encodeQrMatrix(text);
  const full = size + quiet * 2;
  const parts: string[] = [];

  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (!modules[r * size + c]) {
        c += 1;
        continue;
      }
      const start = c;
      while (c < size && modules[r * size + c]) c += 1;
      const run = c - start;
      parts.push(`M${start + quiet} ${r + quiet}h${run}v1h-${run}z`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" class="${escapeAttr(className)}" role="img" aria-label="${escapeAttr(label)}" shape-rendering="crispEdges"><rect width="${full}" height="${full}" fill="#ffffff"/><path fill="#242b38" d="${parts.join("")}"/></svg>`;
}
