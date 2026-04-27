import type { Board } from "./board";

/**
 * IDA* solver using Manhattan distance heuristic.
 * Returns array of board indices to click (in order), or null on timeout.
 */
export function solve(board: Board, timeLimitMs = 3000): number[] | null {
  const size = board.size;
  const n = size * size;
  const blankVal = n - 1;
  const state = [...board.tiles];
  let blankPos = board.blankIdx;
  const path: number[] = [];
  let solved = false;
  const startTime = performance.now();

  function manhattan(): number {
    let d = 0;
    for (let i = 0; i < n; i++) {
      if (state[i] === blankVal) continue;
      d +=
        Math.abs((state[i] % size) - (i % size)) +
        Math.abs(Math.floor(state[i] / size) - Math.floor(i / size));
    }
    return d;
  }

  function getNeighbors(idx: number): number[] {
    const r = Math.floor(idx / size);
    const c = idx % size;
    const ns: number[] = [];
    if (r > 0) ns.push(idx - size);
    if (r < size - 1) ns.push(idx + size);
    if (c > 0) ns.push(idx - 1);
    if (c < size - 1) ns.push(idx + 1);
    return ns;
  }

  function dfs(g: number, bound: number, prevBlankPos: number): number {
    if (performance.now() - startTime > timeLimitMs) return -1;
    const h = manhattan();
    if (h === 0) {
      solved = true;
      return g;
    }
    const f = g + h;
    if (f > bound) return f;

    let min = Infinity;
    for (const nb of getNeighbors(blankPos)) {
      if (nb === prevBlankPos) continue;

      const oldBlank = blankPos;
      const tileVal = state[nb];
      state[oldBlank] = tileVal;
      state[nb] = blankVal;
      blankPos = nb;
      path.push(nb);

      const t = dfs(g + 1, bound, oldBlank);
      if (t === -1) return -1;
      if (solved) return t;
      if (t < min) min = t;

      path.pop();
      state[nb] = tileVal;
      state[oldBlank] = blankVal;
      blankPos = oldBlank;
    }
    return min;
  }

  let bound = manhattan();
  if (bound === 0) return [];

  while (!solved) {
    const t = dfs(0, bound, -1);
    if (t === -1) return null;
    if (solved) break;
    bound = t;
  }

  return [...path];
}
