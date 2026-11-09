import AsyncStorage from '@react-native-async-storage/async-storage';

export type SectionId = 'next' | 'cp9' | 'quick' | 'due' | 'later' | 'dates';
export type Item = { id: SectionId; on: boolean };

export const SECTIONS: { id: SectionId; title: string; sub: string; icon: string; color: string }[] = [
  { id: 'next', title: 'Next class', sub: 'Big card with the countdown', icon: 'time', color: '#2979FF' },
  { id: 'cp9', title: 'CP9 assistant', sub: 'Your AI study assistant card', icon: 'sparkles', color: '#6C4CF0' },
  { id: 'quick', title: 'Quick buttons', sub: 'Calculator, assignments, timer, expenses', icon: 'apps', color: '#AB47BC' },
  { id: 'due', title: 'Assignments due', sub: 'Your next pending assignments', icon: 'document-attach', color: '#FF9100' },
  { id: 'later', title: 'Later today', sub: 'The rest of today\'s classes', icon: 'list', color: '#00E676' },
  { id: 'dates', title: 'Upcoming dates', sub: 'Exams, tests and college dates', icon: 'calendar', color: '#FF5252' },
];

export const defaultLayout: Item[] = SECTIONS.map((x) => ({ id: x.id, on: true }));

const KEY = 'home_layout_v1';

export async function loadLayout(): Promise<Item[]> {
  try {
    const d = await AsyncStorage.getItem(KEY);
    if (!d) return defaultLayout;
    const saved: Item[] = JSON.parse(d);
    const valid = SECTIONS.map((x) => x.id as string);
    const out: Item[] = [];
    saved.forEach((it) => {
      if (valid.indexOf(it.id) >= 0 && !out.some((o) => o.id === it.id)) out.push({ id: it.id, on: !!it.on });
    });
    // sections added in a later version appear at the end, switched on
    defaultLayout.forEach((it) => { if (!out.some((o) => o.id === it.id)) out.push(it); });
    return out;
  } catch { return defaultLayout; }
}

export const saveLayout = (l: Item[]) => AsyncStorage.setItem(KEY, JSON.stringify(l)).catch(() => {});
