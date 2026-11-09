import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Directory, Paths } from 'expo-file-system';

export type Attach = { id: string; name: string; uri: string; kind: 'image' | 'pdf' | 'file'; mime: string };

export type Assignment = {
  id: string;
  title: string;
  subject: string;
  kind: string;
  due: string; // YYYY-MM-DD
  note: string;
  done: boolean;
  attachments?: Attach[];
};

const KEY = 'assignments_v1';
export const KINDS = ['Assignment', 'Lab file', 'Project', 'Test', 'Other'];
export const uid = () => Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

export async function loadAssignments(): Promise<Assignment[]> {
  try {
    const d = await AsyncStorage.getItem(KEY);
    return d ? JSON.parse(d) : [];
  } catch { return []; }
}
export const saveAssignments = (a: Assignment[]) => AsyncStorage.setItem(KEY, JSON.stringify(a)).catch(() => {});

export function dueLabel(days: number) {
  if (days < -1) return Math.abs(days) + ' days overdue';
  if (days === -1) return '1 day overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return 'In ' + days + ' days';
}

export function dueColor(days: number) {
  if (days < 0) return '#FF5252';
  if (days <= 2) return '#FF9100';
  if (days <= 7) return '#FFC400';
  return '#00E676';
}

export function kindOf(mime: string, name: string): Attach['kind'] {
  const m = (mime || '').toLowerCase();
  const n = name.toLowerCase();
  if (m.indexOf('image/') === 0 || /\.(jpg|jpeg|png|webp|heic)$/.test(n)) return 'image';
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  return 'file';
}

// copies a picked file into the app's private storage so it never disappears
export async function saveAttachment(srcUri: string, name: string, mime: string): Promise<Attach> {
  const dir = new Directory(Paths.document, 'assignments');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const raw = name.indexOf('.') >= 0 ? (name.split('.').pop() as string) : 'bin';
  const ext = raw.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
  const id = uid();
  const dest = new File(dir, id + '.' + ext);
  await new File(srcUri).copy(dest);
  return { id, name, uri: dest.uri, kind: kindOf(mime, name), mime };
}

export function deleteAttachment(a: Attach) {
  try {
    const f = new File(a.uri);
    if (f.exists) f.delete();
  } catch {}
}
