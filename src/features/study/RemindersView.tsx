import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import {
  Settings, defaultSettings, loadSettings, saveSettings, ensurePermission,
  rescheduleAll, sendTest, countScheduled,
} from '../../utils/reminders';

const LEADS = [5, 10, 15, 30];

export default function RemindersView() {
  const [s, setS] = useState<Settings>(defaultSettings);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadSettings().then(setS);
    countScheduled().then(setCount);
  }, []);

  async function apply(next: Settings) {
    setBusy(true);
    setS(next);
    await saveSettings(next);
    await rescheduleAll();
    setCount(await countScheduled());
    setBusy(false);
  }

  async function toggle(key: 'cls' | 'events' | 'att', on: boolean) {
    if (on) {
      const ok = await ensurePermission();
      if (!ok) {
        Alert.alert('Notifications are blocked', 'Allow notifications for this app in your phone settings, then try again.');
        return;
      }
    }
    apply({ ...s, [key]: on });
  }

  async function test() {
    const ok = await ensurePermission();
    if (!ok) { Alert.alert('Notifications are blocked', 'Allow notifications for this app in your phone settings first.'); return; }
    const sent = await sendTest();
    Alert.alert(sent ? 'Test sent' : 'Could not send', sent ? 'You should get a notification in about 5 seconds. You can lock the screen or leave the app.' : 'Scheduling failed on this device.');
  }

  const row = (icon: string, color: string, title: string, sub: string, key: 'cls' | 'events' | 'att') => (
    <View style={st.card}>
      <View style={[st.icon, { backgroundColor: color + '26' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={st.title}>{title}</Text>
        <Text style={st.sub}>{sub}</Text>
      </View>
      <Switch
        value={s[key]}
        onValueChange={(v) => toggle(key, v)}
        disabled={busy}
        trackColor={{ false: '#2A2A38', true: colors.accent + '99' }}
        thumbColor={s[key] ? colors.accent : '#8E8E9A'}
      />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
      {row('alarm', '#2979FF', 'Class reminders', 'A notification before each class, every week', 'cls')}
      {s.cls && (
        <View style={st.leadBox}>
          <Text style={st.leadLabel}>REMIND ME BEFORE CLASS</Text>
          <View style={{ flexDirection: 'row' }}>
            {LEADS.map((m) => (
              <TouchableOpacity key={m} disabled={busy} onPress={() => apply({ ...s, lead: m })} style={[st.chip, s.lead === m && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                <Text style={{ color: s.lead === m ? '#fff' : colors.text, fontWeight: '800' }}>{m} min</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {row('ribbon', '#FF5252', 'Exams, tests and forms', 'The evening before (8 PM) and the morning of (8 AM)', 'events')}
      {row('checkmark-done-circle', '#00E676', 'Attendance nudge', 'Mon to Sat at 5:30 PM, to mark the day', 'att')}

      <View style={st.status}>
        <Ionicons name="notifications-outline" size={20} color={colors.textDim} />
        <Text style={st.statusText}>{count} reminder{count === 1 ? '' : 's'} scheduled</Text>
      </View>

      <TouchableOpacity style={st.testBtn} onPress={test}>
        <Ionicons name="paper-plane-outline" size={18} color={colors.accent} />
        <Text style={{ color: colors.accent, fontWeight: '800', marginLeft: 8 }}>Send a test notification</Text>
      </TouchableOpacity>

      <Text style={st.tip}>
        Class reminders use the batch you picked in the Timetable. They are refreshed every time you open the app or change your batch.
        If you do not get notifications, check that the app is allowed to send them and is not battery-restricted in your phone settings.
      </Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  sub: { color: colors.textDim, fontSize: 12, marginTop: 3, lineHeight: 17 },
  leadBox: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: -4, marginBottom: 12 },
  leadLabel: { color: colors.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  chip: { minWidth: 62, height: 40, paddingHorizontal: 10, marginRight: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#1E1E2A', alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 12 },
  statusText: { color: colors.textDim, fontSize: 14, marginLeft: 8, fontWeight: '600' },
  testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.accent },
  tip: { color: colors.textDim, fontSize: 12, lineHeight: 18, marginTop: 18, textAlign: 'center' },
});
