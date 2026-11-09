import AsyncStorage from '@react-native-async-storage/async-storage';

export const TARGET = 75;
export type Rec = { a: number; t: number; log: ('P' | 'A')[] };
export type Data = Record<string, Rec>;
export type Marks = Record<string, Record<string, 'P' | 'A'>>;

const AK = 'attendance_v1';
const MK = 'att_marks_v1';

export async function loadAtt(): Promise<Data> {
  try {
    const d = await AsyncStorage.getItem(AK);
    return d ? JSON.parse(d) : {};
  } catch { return {}; }
}
export const saveAtt = (d: Data) => AsyncStorage.setItem(AK, JSON.stringify(d)).catch(() => {});

export async function loadMarks(): Promise<Marks> {
  try {
    const d = await AsyncStorage.getItem(MK);
    return d ? JSON.parse(d) : {};
  } catch { return {}; }
}
export const saveMarks = (m: Marks) => AsyncStorage.setItem(MK, JSON.stringify(m)).catch(() => {});

export const dateKey = (d: Date) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();

export function info(r: Rec | undefined) {
  if (!r || r.t === 0) return { state: 'none' as const, pct: null as number | null, skip: 0, need: 0 };
  const pct = (r.a / r.t) * 100;
  if (pct >= TARGET) {
    const skip = Math.floor((r.a * 100) / TARGET - r.t + 1e-9);
    return { state: skip > 0 ? ('safe' as const) : ('edge' as const), pct, skip, need: 0 };
  }
  const need = Math.ceil((TARGET * r.t - 100 * r.a) / (100 - TARGET) - 1e-9);
  return { state: 'low' as const, pct, skip: 0, need };
}

// ---------- dated history (for the calendar) ----------
export type Entry = { k: string; s: string; t: 'P' | 'A' };
export type Hist = Record<string, Entry[]>;
const HK = 'att_hist_v1';

export async function loadHist(): Promise<Hist> {
  try {
    const d = await AsyncStorage.getItem(HK);
    return d ? JSON.parse(d) : {};
  } catch { return {}; }
}
export const saveHist = (h: Hist) => AsyncStorage.setItem(HK, JSON.stringify(h)).catch(() => {});

// removes the most recent entry of this subject and type
export function removeLast(h: Hist, subject: string, type: 'P' | 'A'): Hist {
  const keys = Object.keys(h).sort((a, b) => {
    const pa = a.split('-').map(Number);
    const pb = b.split('-').map(Number);
    return new Date(pb[0], pb[1] - 1, pb[2]).getTime() - new Date(pa[0], pa[1] - 1, pa[2]).getTime();
  });
  for (const key of keys) {
    const arr = h[key];
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].s === subject && arr[i].t === type) {
        const next = Object.assign({}, h);
        const copy = arr.slice();
        copy.splice(i, 1);
        if (copy.length) next[key] = copy; else delete next[key];
        return next;
      }
    }
  }
  return h;
}
