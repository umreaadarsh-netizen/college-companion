import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { File, Directory, Paths } from 'expo-file-system';
import { profile as defaults } from '../constants/profile';

export type Profile = { name: string; college: string; rollNo: string; branch: string; photo: string | null };
export const defaultProfile: Profile = { ...defaults, photo: null };

const KEY = 'profile_v1';

export async function loadProfile(): Promise<Profile> {
  try {
    const d = await AsyncStorage.getItem(KEY);
    return d ? { ...defaultProfile, ...JSON.parse(d) } : defaultProfile;
  } catch { return defaultProfile; }
}

export const saveProfile = (p: Profile) => AsyncStorage.setItem(KEY, JSON.stringify(p)).catch(() => {});

// lets the user pick a square photo and copies it into the app's private storage
export async function pickPhoto(): Promise<string | null> {
  try {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (r.canceled || !r.assets || !r.assets.length) return null;
    const dir = new Directory(Paths.document, 'profile');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const dest = new File(dir, 'photo_' + Date.now() + '.jpg');
    await new File(r.assets[0].uri).copy(dest);
    return dest.uri;
  } catch { return null; }
}

export function removePhoto(uri: string | null) {
  if (!uri) return;
  try { const f = new File(uri); if (f.exists) f.delete(); } catch {}
}

export const initialsOf = (name: string) =>
  name.split(' ').filter((w) => w.length > 0).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
