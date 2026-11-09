import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';
import { dateKey } from '../../utils/attendance';

type Stats = Record<string, { s: number; m: number }>;
const KEY = 'pomo_v1';
const FOCUS = [15, 25, 45, 50];
const BREAK = [5, 10, 15];

function streakOf(stats: Stats) {
  let n = 0;
  const d = new Date();
  if (!stats[dateKey(d)]) d.setDate(d.getDate() - 1);
  while (stats[dateKey(d)] && stats[dateKey(d)].s > 0) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

const two = (n: number) => (n < 10 ? '0' + n : String(n));

export default function PomodoroView() {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<Stats>({});
  const endRef = useRef(0);
  const statsRef = useRef<Stats>({});
  statsRef.current = stats;

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((d) => d && setStats(JSON.parse(d))).catch(() => {});
  }, []);

  function finish() {
    setRunning(false);
    Vibration.vibrate([0, 600, 250, 600]);
    if (mode === 'focus') {
      const k = dateKey(new Date());
      const cur = statsRef.current[k] || { s: 0, m: 0 };
      const next = { ...statsRef.current, [k]: { s: cur.s + 1, m: cur.m + focusMin } };
      setStats(next);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      setMode('break');
      setLeft(breakMin * 60);
    } else {
      setMode('focus');
      setLeft(focusMin * 60);
    }
  }
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const r = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setLeft(r);
      if (r <= 0) finishRef.current();
    }, 500);
    return () => clearInterval(id);
  }, [running]);

  const total = (mode === 'focus' ? focusMin : breakMin) * 60;
  const progress = total > 0 ? 1 - left / total : 0;
  const col = mode === 'focus' ? colors.accent : '#00E676';

  function toggle() {
    if (running) { setRunning(false); return; }
    endRef.current = Date.now() + left * 1000;
    setRunning(true);
  }
  function reset() { setRunning(false); setLeft(total); }
  function skip() {
    setRunning(false);
    const next = mode === 'focus' ? 'break' : 'focus';
    setMode(next);
    setLeft((next === 'focus' ? focusMin : breakMin) * 60);
  }
  function pickFocus(m: number) { setFocusMin(m); if (mode === 'focus') setLeft(m * 60); }
  function pickBreak(m: number) { setBreakMin(m); if (mode === 'break') setLeft(m * 60); }

  const today = stats[dateKey(new Date())] || { s: 0, m: 0 };
  const streak = streakOf(stats);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={[s.timerCard, { borderColor: col + '66' }]}>
        <View style={[s.modePill, { backgroundColor: col + '26' }]}>
          <Text style={{ color: col, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>{mode === 'focus' ? 'FOCUS' : 'BREAK'}</Text>
        </View>
        <Text style={s.time}>{two(Math.floor(left / 60))}:{two(left % 60)}</Text>
        <View style={s.barBg}>
          <View style={[s.barFill, { width: Math.min(100, Math.max(0, progress * 100)) + '%', backgroundColor: col }]} />
        </View>

        <View style={s.btnRow}>
          <TouchableOpacity style={s.side} onPress={reset}>
            <Ionicons name="refresh" size={22} color={colors.textDim} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.main, { backgroundColor: col }]} onPress={toggle} activeOpacity={0.85}>
            <Ionicons name={running ? 'pause' : 'play'} size={34} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={s.side} onPress={skip}>
            <Ionicons name="play-skip-forward" size={22} color={colors.textDim} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.stats}>
        <View style={s.stat}>
          <Text style={s.sVal}>{today.m}</Text>
          <Text style={s.sLab}>min today</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.sVal}>{today.s}</Text>
          <Text style={s.sLab}>sessions</Text>
        </View>
        <View style={s.stat}>
          <Text style={[s.sVal, streak > 0 && { color: '#FF9100' }]}>{streak}</Text>
          <Text style={s.sLab}>day streak</Text>
        </View>
      </View>

      <Text style={s.group}>FOCUS LENGTH (MIN)</Text>
      <View style={s.chips}>
        {FOCUS.map((m) => (
          <TouchableOpacity key={m} disabled={running} onPress={() => pickFocus(m)} style={[s.chip, focusMin === m && { backgroundColor: colors.accent, borderColor: colors.accent }, running && { opacity: 0.5 }]}>
            <Text style={{ color: focusMin === m ? '#fff' : colors.text, fontWeight: '800' }}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.group}>BREAK LENGTH (MIN)</Text>
      <View style={s.chips}>
        {BREAK.map((m) => (
          <TouchableOpacity key={m} disabled={running} onPress={() => pickBreak(m)} style={[s.chip, breakMin === m && { backgroundColor: '#00C853', borderColor: '#00C853' }, running && { opacity: 0.5 }]}>
            <Text style={{ color: breakMin === m ? '#fff' : colors.text, fontWeight: '800' }}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.tip}>Keep this screen open while studying. The phone vibrates when time is up. A session counts when the full focus time finishes.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  timerCard: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1.5, padding: 22, alignItems: 'center' },
  modePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  time: { color: colors.text, fontSize: 76, fontWeight: '200', marginVertical: 14 },
  barBg: { width: '100%', height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  main: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', marginHorizontal: 22 },
  side: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1E1E2A', alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', marginTop: 16, marginBottom: 8 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, marginHorizontal: 4, alignItems: 'center' },
  sVal: { color: colors.text, fontSize: 26, fontWeight: '800' },
  sLab: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  group: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginTop: 16, marginBottom: 10 },
  chips: { flexDirection: 'row' },
  chip: { minWidth: 56, height: 44, paddingHorizontal: 14, marginRight: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  tip: { color: colors.textDim, fontSize: 12, lineHeight: 18, marginTop: 22, textAlign: 'center' },
});
