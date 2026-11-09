import { subjects } from '../constants/subjects';
import { events } from '../constants/calendar';
import { Batch } from '../constants/timetable';
import { classesFor, startMin } from './schedule';
import { parseYmd, startOfDay } from './dates';

// last day of regular teaching in the academic calendar
export const SEM_END = '2027-01-05';

// how many classes of each subject are still left (approximate: ignores holidays and cancelled classes)
export function remainingByClass(batch: Batch, now: Date = new Date()): Record<string, number> {
  const names: string[] = subjects.map((x) => x.name);
  const windows = events.filter((e) => e.type === 'exam').map((e) => [parseYmd(e.start).getTime(), parseYmd(e.end).getTime()]);
  const end = parseYmd(SEM_END).getTime();
  const today = startOfDay(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const out: Record<string, number> = {};
  names.forEach((n) => { out[n] = 0; });

  for (let d = today; d.getTime() <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const t = d.getTime();
    if (windows.some((w) => t >= w[0] && t <= w[1])) continue; // no regular classes during exams
    const isToday = t === today.getTime();
    for (const c of classesFor(d.getDay(), batch)) {
      if (names.indexOf(c.subject) < 0) continue;
      if (isToday && startMin(c) <= nowMin) continue; // already started
      out[c.subject] += 1;
    }
  }
  return out;
}

export function projection(a: number, t: number, rem: number, target = 75) {
  const total = t + rem;
  const needFuture = Math.max(0, Math.ceil((target / 100) * total - a - 1e-9));
  const best = total > 0 ? ((a + rem) / total) * 100 : 0;
  if (needFuture > rem) return { possible: false, skip: 0, need: needFuture, best };
  return { possible: true, skip: rem - needFuture, need: needFuture, best };
}
