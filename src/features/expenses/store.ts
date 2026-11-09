import AsyncStorage from '@react-native-async-storage/async-storage';

export type Entry = { id: string; type: 'out' | 'in'; amount: number; cat: string; note: string; date: string };

const EK = 'expenses_v1';
const BK = 'expense_budget_v1';

export const OUT_CATS = [
  { n: 'Food', icon: 'fast-food', c: '#FF9100' },
  { n: 'Travel', icon: 'bus', c: '#2979FF' },
  { n: 'Books', icon: 'book', c: '#AB47BC' },
  { n: 'Fees', icon: 'school', c: '#FFC400' },
  { n: 'Recharge', icon: 'phone-portrait', c: '#26C6DA' },
  { n: 'Fun', icon: 'game-controller', c: '#EC407A' },
  { n: 'Shopping', icon: 'bag-handle', c: '#00E676' },
  { n: 'Other', icon: 'ellipsis-horizontal-circle', c: '#8E8E9A' },
];
export const IN_CATS = [
  { n: 'Pocket money', icon: 'cash', c: '#00E676' },
  { n: 'Scholarship', icon: 'ribbon', c: '#FFC400' },
  { n: 'Other', icon: 'add-circle', c: '#8E8E9A' },
];

export const uid = () => Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

export async function loadEntries(): Promise<Entry[]> {
  try {
    const d = await AsyncStorage.getItem(EK);
    return d ? JSON.parse(d) : [];
  } catch { return []; }
}
export const saveEntries = (e: Entry[]) => AsyncStorage.setItem(EK, JSON.stringify(e)).catch(() => {});

export async function loadBudget(): Promise<number> {
  try {
    const d = await AsyncStorage.getItem(BK);
    return d ? parseFloat(d) || 0 : 0;
  } catch { return 0; }
}
export const saveBudget = (b: number) => AsyncStorage.setItem(BK, String(b)).catch(() => {});

export function money(n: number) {
  const neg = n < 0;
  const v = Math.abs(n);
  const whole = Math.floor(v);
  const frac = Math.round((v - whole) * 100);
  const w = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + '\u20B9' + w + (frac > 0 ? '.' + (frac < 10 ? '0' : '') + frac : '');
}

export const catOf = (type: 'out' | 'in', name: string) => {
  const list = type === 'out' ? OUT_CATS : IN_CATS;
  return list.find((x) => x.n === name) || list[list.length - 1];
};
