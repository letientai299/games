import { WIN_LENGTH, DIRECTIONS, encodeCell, type Player } from "../constants";
import type { ThreatType } from "./types";
import { THREAT_SCORE } from "./types";

/**
 * Evaluate a candidate cell: compute total threat score + fork bonus
 * in a single pass without array allocation.
 */
export function evaluateCell(
  cells: Map<number, Player>,
  row: number,
  col: number,
  player: Player,
  detectForks: boolean,
): number {
  let total = 0;
  let halfFourPlus = 0;
  let openThreePlus = 0;

  for (const [dr, dc] of DIRECTIONS) {
    const t = scanLine(cells, row, col, player, dr, dc);
    total += THREAT_SCORE[t];

    if (detectForks) {
      if (t === "HALF_FOUR" || t === "BROKEN_FOUR" || t === "OPEN_FOUR")
        halfFourPlus++;
      if (t === "OPEN_THREE" || t === "BROKEN_THREE") openThreePlus++;
    }
  }

  if (detectForks) {
    if (halfFourPlus >= 2) total += 100_000;
    else if (halfFourPlus >= 1 && openThreePlus >= 1) total += 80_000;
    if (openThreePlus >= 2) total += 50_000;
  }

  return total;
}

/**
 * Scan a line through (row, col) in a given direction for `player`.
 * Reads up to 5 cells each way. Detects broken patterns like X_XX.
 */
function scanLine(
  cells: Map<number, Player>,
  row: number,
  col: number,
  player: Player,
  dr: number,
  dc: number,
): ThreatType {
  const fwd = readRay(cells, row, col, dr, dc, player);
  const bwd = readRay(cells, row, col, -dr, -dc, player);

  const contFwd = fwd.contiguous;
  const contBwd = bwd.contiguous;
  const totalCont = contFwd + contBwd;

  if (totalCont + 1 >= WIN_LENGTH) return "FIVE";

  const totalWithGapFwd =
    contFwd + contBwd + 1 + (fwd.gapCount > 0 ? fwd.afterGap : 0);
  const totalWithGapBwd =
    contFwd + contBwd + 1 + (bwd.gapCount > 0 ? bwd.afterGap : 0);

  const openEnds = (fwd.openEnd ? 1 : 0) + (bwd.openEnd ? 1 : 0);

  if (totalCont + 1 === 4) {
    if (openEnds === 2) return "OPEN_FOUR";
    if (openEnds === 1) return "HALF_FOUR";
    return "NONE";
  }

  if (totalWithGapFwd >= WIN_LENGTH || totalWithGapBwd >= WIN_LENGTH) {
    if (totalCont + 1 >= 4) {
      return openEnds >= 2 ? "OPEN_FOUR" : "HALF_FOUR";
    }
    return "BROKEN_FOUR";
  }

  if (totalCont + 1 === 3) {
    if (openEnds === 2) return "OPEN_THREE";
    if (openEnds === 1) return "HALF_THREE";
    return "NONE";
  }

  const brokenFwd = contBwd + 1 + (fwd.gapCount > 0 ? fwd.afterGap : 0);
  const brokenBwd = contFwd + 1 + (bwd.gapCount > 0 ? bwd.afterGap : 0);
  if (brokenFwd === 3 || brokenBwd === 3) {
    if (openEnds >= 1) return "BROKEN_THREE";
  }

  if (totalCont + 1 === 2) {
    if (openEnds === 2) return "OPEN_TWO";
    if (openEnds === 1) return "HALF_TWO";
    return "NONE";
  }

  return "NONE";
}

interface RayResult {
  contiguous: number;
  openEnd: boolean;
  gapCount: number;
  afterGap: number;
}

function readRay(
  cells: Map<number, Player>,
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: Player,
): RayResult {
  let contiguous = 0;
  let openEnd = false;
  let gapCount = 0;
  let afterGap = 0;

  let r = row + dr;
  let c = col + dc;

  for (let i = 0; i < WIN_LENGTH - 1; i++) {
    const cell = cells.get(encodeCell(r, c));
    if (cell === player) {
      contiguous++;
      r += dr;
      c += dc;
    } else {
      if (cell === undefined) openEnd = true;
      break;
    }
  }

  if (openEnd && contiguous < WIN_LENGTH - 1) {
    r = row + dr * (contiguous + 2);
    c = col + dc * (contiguous + 2);
    const maxLook = WIN_LENGTH - contiguous - 2;
    for (let i = 0; i < maxLook; i++) {
      const cell = cells.get(encodeCell(r, c));
      if (cell === player) {
        if (gapCount === 0) gapCount = 1;
        afterGap++;
        r += dr;
        c += dc;
      } else {
        break;
      }
    }
  }

  return { contiguous, openEnd, gapCount, afterGap };
}
