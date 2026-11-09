import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Batch } from '../constants/timetable';
import { events } from '../constants/calendar';
import { classesFor, startMin, endMin, titleOf, fmt } from './schedule';

export type Settings = { cls: boolean; lead: number; events: boolean; att: boolean };
export const defaultSettings: Settings = { cls: false, lead: 10, events: false, att: false };

const KEY = 'reminders_v1';
const CHANNEL = 'reminders';

export async function loadSettings(): Promise<Settings> {
  try {
    const d = await AsyncStorage.getItem(KEY);
    return d ? { ...defaultSettings, ...JSON.parse(d) } : defaultSettings;
  } catch { return defaultSettings; }
}

export const saveSettings = (s: Settings) => AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});

export function setupNotifications() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {});
  } catch {}
}

export async function ensurePermission(): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const r = await Notifications.requestPermissionsAsync();
    return !!r.granted;
  } catch { return false; }
}

const T = Notifications.SchedulableTriggerInputTypes;

async function add(title: string, body: string, trigger: any) {
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger });
    return 1;
  } catch { return 0; }
}

const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// cancels everything and schedules again from the saved settings; returns how many were scheduled
export async function rescheduleAll(): Promise<number> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const s = await loadSettings();
    if (!s.cls && !s.events && !s.att) return 0;
    const p = await Notifications.getPermissionsAsync();
    if (!p.granted) return 0;

    let n = 0;

    // ----- class reminders (repeat every week) -----
    if (s.cls) {
      let b: Batch = 'A';
      const saved = await AsyncStorage.getItem('batch_v1');
      if (saved === 'A' || saved === 'B') b = saved;
      for (let day = 1; day <= 6; day++) {
        const list = classesFor(day, b);
        for (let i = 0; i < list.length; i++) {
          const c = list[i];
          const prev = list[i - 1];
          // two periods in a row of the same subject count as one reminder
          if (prev && endMin(prev) === startMin(c) && prev.subject === c.subject && titleOf(prev) === titleOf(c)) continue;
          const mins = startMin(c) - s.lead;
          n += await add(
            titleOf(c) + ' in ' + s.lead + ' min',
            fmt(startMin(c)) + '  |  Room ' + c.room + '  |  ' + c.teacher,
            { type: T.WEEKLY, weekday: day + 1, hour: Math.floor(mins / 60), minute: mins % 60, channelId: CHANNEL }
          );
        }
      }
    }

    // ----- exam, assignment and form reminders -----
    if (s.events) {
      const now = Date.now();
      for (const e of events) {
        const start = parse(e.start);
        const end = parse(e.end);
        const when = (d: Date, h: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0);
        const isForm = e.title.indexOf('Form Submission') >= 0;

        if (e.type === 'exam' || e.type === 'assign') {
          const eve = when(new Date(start.getTime() - 86400000), 20);
          const day = when(start, 8);
          if (eve.getTime() > now) n += await add('Tomorrow: ' + e.title, 'Get ready. Starts tomorrow.', { type: T.DATE, date: eve, channelId: CHANNEL });
          if (day.getTime() > now) n += await add('Today: ' + e.title, 'It starts today. All the best!', { type: T.DATE, date: day, channelId: CHANNEL });
        } else if (isForm) {
          const day = when(start, 8);
          const last = when(end, 8);
          if (day.getTime() > now) n += await add(e.title + ' opens', 'Submission starts today.', { type: T.DATE, date: day, channelId: CHANNEL });
          if (last.getTime() > now && end.getTime() !== start.getTime()) n += await add('Last day: ' + e.title, 'Submit it today.', { type: T.DATE, date: last, channelId: CHANNEL });
        }
      }
    }

    // ----- daily attendance nudge, Monday to Saturday at 5:30 PM -----
    if (s.att) {
      for (let wd = 2; wd <= 7; wd++) {
        n += await add('Mark your attendance', "Take a minute to mark today's classes.", { type: T.WEEKLY, weekday: wd, hour: 17, minute: 30, channelId: CHANNEL });
      }
    }
    return n;
  } catch {
    return 0;
  }
}

export async function sendTest(): Promise<boolean> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Test reminder', body: 'Reminders are working.' },
      trigger: { type: T.TIME_INTERVAL, seconds: 5, channelId: CHANNEL } as any,
    });
    return true;
  } catch { return false; }
}

export async function countScheduled(): Promise<number> {
  try { return (await Notifications.getAllScheduledNotificationsAsync()).length; } catch { return 0; }
}
