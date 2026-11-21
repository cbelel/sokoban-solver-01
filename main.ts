import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

type Step = [number, number];
type State = { p: number; boxes: number[]; g: number; prev?: State; step: Step; key: string };

function solve(level: string): string {
  const rows = level.trimEnd().split(/\r?\n/);
  const w = Math.max(...rows.map(r => r.length)) + 2;
  const d = [-1, -w, 1, w], letters = 'lurd';
  const floor = new Uint8Array(w * (rows.length + 2)), goal = floor.slice();
  const boxes = new Set<number>();
  let player = 0;
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === '#') return;
    const p = (y + 1) * w + x + 1;
    floor[p] = 1;
    if ('.*+'.includes(c)) goal[p] = 1;
    if ('$*'.includes(c)) boxes.add(p);
    if ('@+'.includes(c)) player = p;
  }));

  function flood(p: number, open: Uint8Array, blocked: Set<number>, path?: Int8Array, end?: number) {
    const seen = new Set([p]), q = [p];
    for (const a of q) {
      if (a === end) break;
      for (let k = 0; k < 4; k++) {
        const b = a + d[k];
        if (!open[b] || blocked.has(b) || seen.has(b)) continue;
        seen.add(b);
        q.push(b);
        if (path) path[b] = k;
      }
    }
    return seen;
  }

  function room(cells: Set<number>, hall: number): Step[] | undefined {
    const open = new Uint8Array(floor.length);
    for (const p of cells) open[p] = 1;
    open[hall] = 1;
    const start = [...cells].filter(p => boxes.has(p));
    const goals = [...cells].filter(p => goal[p]);
    // Reverse pushes rule out dead corners and wall lines without a goal.
    const distances = goals.map(g => {
      const dist = new Float64Array(floor.length).fill(Infinity), q = [g];
      dist[g] = 0;
      for (const p of q) for (const delta of d) {
        const b = p - delta;
        if (cells.has(b) && open[b - delta] && dist[b] === Infinity) {
          dist[b] = dist[p] + 1;
          q.push(b);
        }
      }
      return dist;
    });
    function match(bs: number[], i = 0, used = 0): number {
      if (i === bs.length) return 0;
      let best = Infinity;
      for (let j = 0; j < goals.length; j++) if (!(used & (1 << j))) {
        const cost = distances[j][bs[i]];
        if (cost < best) best = Math.min(best, cost + match(bs, i + 1, used | (1 << j)));
      }
      return best;
    }

    function search(weight: number, budget: number, walks = false): Step[] | undefined {
      const visited = new Map<string, number>(), estimate = new Map<string, number>();
      const queue: State[][] = [];
      let low = Infinity;
      function add(p: number, bs: number[], step: Step, prev?: State) {
        const g = prev ? prev.g + 1 : 0;
        const region = walks ? p : Math.min(...flood(p, open, new Set(bs)));
        const k = String.fromCharCode(region, ...bs);
        if ((visited.get(k) ?? Infinity) <= g) return;
        const bk = k.slice(1);
        let h = estimate.get(bk);
        if (h === undefined) {
          h = match(bs);
          estimate.set(bk, h);
        }
        if (!Number.isFinite(h)) return;
        visited.set(k, g);
        const f = g + weight * h;
        (queue[f] ??= []).push({ p, boxes: bs, g, prev, step, key: k });
        low = Math.min(low, f);
      }

      add(hall, start.sort((a, b) => a - b), [hall, 0]);
      while (low < queue.length && budget > 0) {
        const s = queue[low]?.pop();
        if (!s) { low++; continue; }
        if (s.g !== visited.get(s.key)) continue;
        if (s.boxes.every(b => goal[b])) {
          const steps: Step[] = [];
          for (let t = s; t.prev; t = t.prev) steps.push(t.step);
          return steps.reverse();
        }
        budget--;
        const occupied = new Set(s.boxes);
        const reached = walks ? [s.p] : flood(s.p, open, occupied);
        for (const p of reached) for (let k = 0; k < 4; k++) {
          const b = p + d[k];
          if (!occupied.has(b)) {
            if (walks && open[b]) add(b, s.boxes, [p, k], s);
            continue;
          }
          const c = b + d[k];
          if (!cells.has(c) || occupied.has(c)) continue;
          if (!walks && distances.every(dist => dist[c] === Infinity)) continue;
          occupied.delete(b);
          occupied.add(c);
          // A filled 2x2 is immobile, including when some squares are walls.
          const frozen = !walks && [-w - 1, -w, -1, 0].some(o => {
            const square = [c + o, c + o + 1, c + o + w, c + o + w + 1];
            return square.every(a => !open[a] || occupied.has(a)) &&
              square.some(a => occupied.has(a) && !goal[a]);
          });
          if (!frozen) add(b, [...occupied].sort((a, b) => a - b), [p, k], s);
          occupied.delete(c);
          occupied.add(b);
        }
      }
    }
    return search(1, 250000) ?? search(4, 100000) ?? search(1, 200000, true);
  }

  // Removing the hallway cuts the floor at each room's single attachment.
  // Keep the door inside the component: a box can occupy it temporarily.
  const hallRow = Math.floor(player / w) * w;
  const inner = floor.slice();
  inner.fill(0, hallRow, hallRow + w);
  let moves = '';
  for (let hall = hallRow + 1; hall < hallRow + w - 1; hall++) {
    const door = inner[hall - w] ? hall - w : hall + w;
    if (!inner[door]) continue;
    const cells = flood(door, inner, new Set());
    const steps = room(cells, hall);
    if (!steps) continue;
    for (const [p, k] of steps) {
      const path = new Int8Array(floor.length);
      if (!flood(player, floor, boxes, path, p).has(p)) throw Error('unreachable step');
      let walk = '';
      for (let a = p; a !== player;) {
        const j = path[a];
        walk = letters[j] + walk;
        a -= d[j];
      }
      moves += walk + letters[k];
      player = p + d[k];
      if (boxes.delete(player)) boxes.add(player + d[k]);
    }
  }
  return moves;
}

const input = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (let i = 1; i <= 5; i++) {
  const id = 'i00' + i, dir = output + '/' + id;
  const moves = solve(readFileSync(input + '/' + id + '/level.txt', 'utf8'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir + '/solution.txt', moves);
}
