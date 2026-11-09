import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';
import { subjects } from '../../constants/subjects';
import { Batch } from '../../constants/timetable';
import { remainingByClass, projection } from '../../utils/semester';
import { MONTHS, monthGrid, pad } from '../../utils/dates';
import { Hist, loadHist, saveHist, removeLast, dateKey, TARGET } from '../../utils/attendance';

const KEY = 'attendance_v1';

type Rec = { a: number; t: number; log: ('P' | 'A')[] };
type Data = Record<string, Rec>;
const empty = (): Rec => ({ a: 0, t: 0, log: [] });

function info(r: Rec) {
  if (r.t === 0) return { pct: null as number | null, text: 'No classes marked yet', color: colors.textDim };
  const pct = (r.a / r.t) * 100;
  if (pct >= TARGET) {
    const skip = Math.floor((r.a * 100) / TARGET - r.t + 1e-9);
    return skip > 0
      ? { pct, text: 'Safe. You can skip ' + skip + ' more class' + (skip > 1 ? 'es' : ''), color: '#00E676' }
      : { pct, text: 'On the edge. Do not skip the next class', color: '#FFC400' };
  }
  const need = Math.ceil((TARGET * r.t - 100 * r.a) / (100 - TARGET) - 1e-9);
  return { pct, text: 'Attend the next ' + need + ' class' + (need > 1 ? 'es' : '') + ' to reach ' + TARGET + '%', color: '#FF5252' };
}

export default function AttendanceView() {
  const [tab, setTab] = useState<'subjects' | 'calendar'>('subjects');
  const [data, setData] = useState<Data>({});
  const [hist, setHist] = useState<Hist>({});
  const [batch, setBatch] = useState<Batch>('A');
  const [editing, setEditing] = useState<string | null>(null);
  const [ea, setEa] = useState('');
  const [et, setEt] = useState('');

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((d) => d && setData(JSON.parse(d))).catch(() => {});
    AsyncStorage.getItem('batch_v1').then((b) => { if (b === 'A' || b === 'B') setBatch(b); }).catch(() => {});
    loadHist().then(setHist);
  }, []);

  function save(next: Data) {
    setData(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }
  function saveH(h: Hist) { setHist(h); saveHist(h); }

  const get = (n: string): Rec => data[n] || empty();

  function mark(n: string, type: 'P' | 'A') {
    const r = get(n);
    save({ ...data, [n]: { a: r.a + (type === 'P' ? 1 : 0), t: r.t + 1, log: [...r.log, type] } });
    const dk = dateKey(new Date());
    const next: Hist = Object.assign({}, hist);
    next[dk] = (next[dk] || []).concat([{ k: 'm' + Date.now(), s: n, t: type }]);
    saveH(next);
  }

  function undo(n: string) {
    const r = get(n);
    if (r.log.length === 0) return;
    const last = r.log[r.log.length - 1];
    save({ ...data, [n]: { a: r.a - (last === 'P' ? 1 : 0), t: r.t - 1, log: r.log.slice(0, -1) } });
    saveH(removeLast(hist, n, last));
  }

  function openEdit(n: string) {
    const r = get(n);
    setEa(String(r.a));
    setEt(String(r.t));
    setEditing(n);
  }

  function saveEdit() {
    const a = parseInt(ea, 10);
    const t = parseInt(et, 10);
    if (editing && !isNaN(a) && !isNaN(t) && a >= 0 && a <= t) {
      save({ ...data, [editing]: { a, t, log: [] } });
      setEditing(null);
    }
  }

  const totalA = subjects.reduce((s, x) => s + get(x.name).a, 0);
  const totalT = subjects.reduce((s, x) => s + get(x.name).t, 0);
  const overall = totalT ? (totalA / totalT) * 100 : null;
  const left = remainingByClass(batch);

  // ---------- calendar ----------
  const dayKey = (d: number) => year + '-' + (month + 1) + '-' + d;
  function move(n: number) {
    const d = new Date(year, month + n, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setPicked(null);
  }
  let mp = 0;
  let ma = 0;
  Object.keys(hist).forEach((k) => {
    const p = k.split('-').map(Number);
    if (p[0] === year && p[1] === month + 1) hist[k].forEach((e) => { if (e.t === 'P') mp++; else ma++; });
  });
  const weeks = monthGrid(year, month);
  const todayK = dateKey(new Date());
  const pickedList = picked ? hist[picked] || [] : [];

  return (
    <View style={{ flex: 1 }}>
      <View style={st.tabs}>
        {(['subjects', 'calendar'] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => { setTab(t); if (t === 'calendar') loadHist().then(setHist); }} style={[st.tab, tab === t && { backgroundColor: colors.accent }]}>
            <Text style={{ color: tab === t ? '#fff' : colors.textDim, fontWeight: '800' }}>{t === 'subjects' ? 'Subjects' : 'Calendar'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'subjects' ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={st.overall}>
            <Text style={st.oLabel}>OVERALL ATTENDANCE</Text>
            <Text style={st.oValue}>{overall === null ? '--' : overall.toFixed(1) + '%'}</Text>
            <Text style={st.oSub}>{totalA} attended of {totalT} classes. Target {TARGET}%</Text>
          </View>

          {subjects.map((s) => {
            const r = get(s.name);
            const i = info(r);
            const rem = left[s.name] || 0;
            const pr = projection(r.a, r.t, rem, TARGET);
            return (
              <View key={s.name} style={st.card}>
                <View style={st.cardTop}>
                  <View style={[st.icon, { backgroundColor: s.color + '26' }]}>
                    <Ionicons name={s.icon as any} size={22} color={s.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.sName}>{s.name}</Text>
                    <Text style={st.sCount}>{r.a} / {r.t} classes</Text>
                  </View>
                  <Text style={[st.pct, { color: i.pct === null ? colors.textDim : i.color }]}>
                    {i.pct === null ? '--' : i.pct.toFixed(0) + '%'}
                  </Text>
                </View>

                <View style={st.barBg}>
                  <View style={[st.barFill, { width: (i.pct === null ? 0 : Math.min(i.pct, 100)) + '%', backgroundColor: i.pct === null ? colors.border : i.color }]} />
                  <View style={[st.marker, { left: TARGET + '%' }]} />
                </View>
                <Text style={[st.status, { color: i.color }]}>{i.text}</Text>

                {rem > 0 && (
                  <View style={st.left}>
                    <Ionicons name="hourglass-outline" size={15} color={colors.textDim} />
                    <Text style={st.leftText}>
                      About {rem} class{rem > 1 ? 'es' : ''} left this semester.{' '}
                      {r.t === 0
                        ? ''
                        : pr.possible
                          ? 'You can still miss ' + pr.skip + ' and finish at ' + TARGET + '%.'
                          : 'Even if you attend all, the best you can reach is ' + pr.best.toFixed(0) + '%.'}
                    </Text>
                  </View>
                )}

                <View style={st.btnRow}>
                  <TouchableOpacity style={[st.btn, { backgroundColor: '#0F2E1D' }]} onPress={() => mark(s.name, 'P')}>
                    <Ionicons name="checkmark" size={18} color="#00E676" />
                    <Text style={[st.btnText, { color: '#00E676' }]}>Present</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.btn, { backgroundColor: '#3A1515' }]} onPress={() => mark(s.name, 'A')}>
                    <Ionicons name="close" size={18} color="#FF5252" />
                    <Text style={[st.btnText, { color: '#FF5252' }]}>Absent</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={st.small} onPress={() => undo(s.name)}>
                    <Ionicons name="arrow-undo" size={18} color={colors.textDim} />
                  </TouchableOpacity>
                  <TouchableOpacity style={st.small} onPress={() => openEdit(s.name)}>
                    <Ionicons name="create-outline" size={18} color={colors.textDim} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          <Text style={st.note}>
            "Classes left" counts your timetable from today to the last teaching day (5 Jan 2027), skipping the sessional exam weeks. It ignores holidays and cancelled classes, so treat it as an estimate.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={st.calBox}>
            <View style={st.calHead}>
              <TouchableOpacity onPress={() => move(-1)} style={st.nav}><Ionicons name="chevron-back" size={22} color={colors.text} /></TouchableOpacity>
              <Text style={st.calMonth}>{MONTHS[month]} {year}</Text>
              <TouchableOpacity onPress={() => move(1)} style={st.nav}><Ionicons name="chevron-forward" size={22} color={colors.text} /></TouchableOpacity>
            </View>
            <View style={st.wk}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => (<Text key={i} style={st.dow}>{x}</Text>))}
            </View>
            {weeks.map((w, i) => (
              <View key={i} style={st.wk}>
                {w.map((d, j) => {
                  if (d === null) return <View key={j} style={st.cell} />;
                  const k = dayKey(d);
                  const list = hist[k] || [];
                  const hasA = list.some((e) => e.t === 'A');
                  const hasP = list.some((e) => e.t === 'P');
                  const bg = hasA && hasP ? '#FFC40033' : hasA ? '#FF525233' : hasP ? '#00E67633' : 'transparent';
                  const ring = hasA && hasP ? '#FFC400' : hasA ? '#FF5252' : hasP ? '#00E676' : 'transparent';
                  return (
                    <TouchableOpacity key={j} style={st.cell} onPress={() => setPicked(k)}>
                      <View style={[st.dayDot, { backgroundColor: bg, borderColor: picked === k ? colors.accent : k === todayK ? colors.textDim : ring, borderWidth: picked === k || k === todayK || list.length ? 1.5 : 0 }]}>
                        <Text style={{ color: colors.text, fontWeight: list.length ? '800' : '500' }}>{d}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            <View style={st.legend}>
              <View style={st.lg}><View style={[st.lgDot, { backgroundColor: '#00E676' }]} /><Text style={st.lgText}>All present</Text></View>
              <View style={st.lg}><View style={[st.lgDot, { backgroundColor: '#FF5252' }]} /><Text style={st.lgText}>Absent</Text></View>
              <View style={st.lg}><View style={[st.lgDot, { backgroundColor: '#FFC400' }]} /><Text style={st.lgText}>Mixed</Text></View>
            </View>
          </View>

          <View style={st.sumRow}>
            <View style={st.sum}><Text style={[st.sumVal, { color: '#00E676' }]}>{mp}</Text><Text style={st.sumLab}>present this month</Text></View>
            <View style={st.sum}><Text style={[st.sumVal, { color: '#FF5252' }]}>{ma}</Text><Text style={st.sumLab}>absent this month</Text></View>
          </View>

          {picked && (
            <View style={st.dayBox}>
              <Text style={st.dayTitle}>{picked.split('-')[2]} {MONTHS[Number(picked.split('-')[1]) - 1]} {picked.split('-')[0]}</Text>
              {pickedList.length === 0 ? (
                <Text style={st.none}>Nothing marked on this day</Text>
              ) : (
                pickedList.map((e, i) => (
                  <View key={e.k + i} style={st.entry}>
                    <Ionicons name={e.t === 'P' ? 'checkmark-circle' : 'close-circle'} size={20} color={e.t === 'P' ? '#00E676' : '#FF5252'} />
                    <Text style={st.entryText}>{e.s}</Text>
                    <Text style={[st.entryTag, { color: e.t === 'P' ? '#00E676' : '#FF5252' }]}>{e.t === 'P' ? 'Present' : 'Absent'}</Text>
                  </View>
                ))
              )}
            </View>
          )}
          <Text style={st.note}>History starts from the day you update the app. Classes you marked before that, or typed in with the pencil, are counted in your totals but not shown here.</Text>
        </ScrollView>
      )}

      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={st.modalWrap}>
          <View style={st.modal}>
            <Text style={st.mTitle}>Edit {editing}</Text>
            <Text style={st.mHint}>Use this to enter your attendance so far.</Text>
            <Text style={st.mLabel}>Classes attended</Text>
            <TextInput style={st.input} value={ea} onChangeText={setEa} keyboardType="number-pad" />
            <Text style={st.mLabel}>Total classes held</Text>
            <TextInput style={st.input} value={et} onChangeText={setEt} keyboardType="number-pad" />
            <View style={{ flexDirection: 'row', marginTop: 18 }}>
              <TouchableOpacity style={[st.mBtn, { backgroundColor: colors.border }]} onPress={() => setEditing(null)}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.mBtn, { backgroundColor: colors.accent, marginLeft: 10 }]} onPress={saveEdit}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 4, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 4 },
  tab: { flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  overall: { backgroundColor: colors.accent, borderRadius: 20, padding: 20, marginBottom: 18 },
  oLabel: { color: '#D6E4FF', fontSize: 12, letterSpacing: 1.3, fontWeight: '700' },
  oValue: { color: '#fff', fontSize: 44, fontWeight: '800', marginTop: 4 },
  oSub: { color: '#D6E4FF', fontSize: 13, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  icon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  sCount: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  pct: { fontSize: 26, fontWeight: '800' },
  barBg: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  marker: { position: 'absolute', top: 0, width: 2, height: 8, backgroundColor: '#fff' },
  status: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 8 },
  left: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1E1E2A', borderRadius: 10, padding: 10, marginBottom: 12 },
  leftText: { color: colors.textDim, fontSize: 12, lineHeight: 17, flex: 1, marginLeft: 8 },
  btnRow: { flexDirection: 'row', alignItems: 'center' },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 42, borderRadius: 12, marginRight: 8 },
  btnText: { fontWeight: '700', marginLeft: 6 },
  small: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#1E1E2A', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  note: { color: colors.textDim, fontSize: 12, lineHeight: 18, marginTop: 8 },
  calBox: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 14 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  nav: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  calMonth: { color: colors.text, fontSize: 17, fontWeight: '800' },
  wk: { flexDirection: 'row' },
  dow: { flex: 1, textAlign: 'center', color: colors.textDim, fontSize: 12, fontWeight: '700', paddingVertical: 6 },
  cell: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' },
  dayDot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  lg: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  lgDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  lgText: { color: colors.textDim, fontSize: 12 },
  sumRow: { flexDirection: 'row', marginTop: 14 },
  sum: { flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, marginHorizontal: 4, alignItems: 'center' },
  sumVal: { fontSize: 28, fontWeight: '800' },
  sumLab: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  dayBox: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 14 },
  dayTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  none: { color: colors.textDim, fontSize: 13 },
  entry: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  entryText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600', marginLeft: 10 },
  entryTag: { fontSize: 12, fontWeight: '800' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
  mTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  mHint: { color: colors.textDim, fontSize: 13, marginTop: 4, marginBottom: 8 },
  mLabel: { color: colors.textDim, fontSize: 12, marginTop: 10, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#1E1E2A', color: colors.text, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 18 },
  mBtn: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
