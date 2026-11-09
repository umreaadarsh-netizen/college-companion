import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';
import { subjects } from '../../constants/subjects';
import { GRADES, gradePoint, PERCENT_FACTOR } from '../../constants/grades';

type Row = { id: string; name: string; credits: string; grade: string | null };
type Sem = { s: string; c: string };

const SK = 'sgpa_v1';
const CK = 'cgpa_v1';
const uid = () => Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

const defaultRows = (): Row[] =>
  subjects.map((x) => ({ id: uid() + x.name, name: x.name, credits: '3', grade: null }));

const num = (t: string) => {
  const v = parseFloat(t);
  return isNaN(v) ? 0 : v;
};

export default function CgpaView() {
  const [tab, setTab] = useState<'sgpa' | 'cgpa'>('sgpa');
  const [rows, setRows] = useState<Row[]>(defaultRows());
  const [sem, setSem] = useState(1);
  const [sems, setSems] = useState<Record<string, Sem>>({});

  useEffect(() => {
    AsyncStorage.getItem(SK).then((d) => {
      if (d) { const j = JSON.parse(d); if (j.rows) setRows(j.rows); if (j.sem) setSem(j.sem); }
    }).catch(() => {});
    AsyncStorage.getItem(CK).then((d) => d && setSems(JSON.parse(d))).catch(() => {});
  }, []);

  const saveS = (r: Row[], s: number) => { setRows(r); setSem(s); AsyncStorage.setItem(SK, JSON.stringify({ rows: r, sem: s })).catch(() => {}); };
  const saveC = (c: Record<string, Sem>) => { setSems(c); AsyncStorage.setItem(CK, JSON.stringify(c)).catch(() => {}); };

  const patch = (id: string, p: Partial<Row>) => saveS(rows.map((r) => (r.id === id ? { ...r, ...p } : r)), sem);

  // ----- SGPA -----
  let cp = 0;
  let tc = 0;
  let graded = 0;
  rows.forEach((r) => {
    const gp = gradePoint(r.grade);
    const c = num(r.credits);
    if (gp !== null && c > 0) { cp += gp * c; tc += c; graded++; }
  });
  const sgpa = tc > 0 ? cp / tc : null;
  const failed = rows.some((r) => r.grade === 'F');

  function saveToCgpa() {
    if (sgpa === null) { Alert.alert('Add some grades first'); return; }
    saveC({ ...sems, [sem]: { s: sgpa.toFixed(2), c: String(tc) } });
    Alert.alert('Saved', 'SGPA ' + sgpa.toFixed(2) + ' saved to Semester ' + sem + '.');
  }

  // ----- CGPA -----
  let sumSC = 0;
  let sumC = 0;
  let counted = 0;
  for (let i = 1; i <= 8; i++) {
    const e = sems[String(i)];
    if (!e) continue;
    const sg = num(e.s);
    const c = num(e.c);
    if (sg > 0 && c > 0) { sumSC += sg * c; sumC += c; counted++; }
  }
  const cgpa = sumC > 0 ? sumSC / sumC : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={st.tabs}>
        {(['sgpa', 'cgpa'] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[st.tab, tab === t && { backgroundColor: colors.accent }]}>
            <Text style={{ color: tab === t ? '#fff' : colors.textDim, fontWeight: '800' }}>{t === 'sgpa' ? 'SGPA' : 'CGPA'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {tab === 'sgpa' ? (
          <View>
            <View style={st.result}>
              <Text style={st.rLabel}>SEMESTER GPA</Text>
              <Text style={st.rValue}>{sgpa === null ? '--' : sgpa.toFixed(2)}</Text>
              <Text style={st.rSub}>
                {sgpa === null ? 'Pick a grade for each subject' : graded + ' subject' + (graded > 1 ? 's' : '') + ', ' + tc + ' credits'}
                {failed ? '  |  F grade present' : ''}
              </Text>
            </View>

            {rows.map((r) => (
              <View key={r.id} style={st.card}>
                <View style={st.cardTop}>
                  <TextInput style={st.nameIn} value={r.name} onChangeText={(t) => patch(r.id, { name: t })} placeholder="Subject" placeholderTextColor={colors.textDim} />
                  <Text style={st.crLabel}>Credits</Text>
                  <TextInput style={st.crIn} value={r.credits} onChangeText={(t) => patch(r.id, { credits: t })} keyboardType="decimal-pad" />
                  <TouchableOpacity onPress={() => saveS(rows.filter((x) => x.id !== r.id), sem)} style={{ marginLeft: 8 }}>
                    <Ionicons name="close-circle" size={22} color={colors.textDim} />
                  </TouchableOpacity>
                </View>
                <View style={st.chips}>
                  {GRADES.map((g) => {
                    const on = r.grade === g.g;
                    return (
                      <TouchableOpacity key={g.g} onPress={() => patch(r.id, { grade: on ? null : g.g })} style={[st.chip, on && { backgroundColor: g.g === 'F' ? '#FF5252' : colors.accent, borderColor: 'transparent' }]}>
                        <Text style={{ color: on ? '#fff' : colors.text, fontWeight: '700', fontSize: 13 }}>{g.g}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <TouchableOpacity style={st.add} onPress={() => saveS([...rows, { id: uid(), name: '', credits: '1', grade: null }], sem)}>
              <Ionicons name="add" size={20} color={colors.accent} />
              <Text style={{ color: colors.accent, fontWeight: '700', marginLeft: 6 }}>Add subject (lab, workshop...)</Text>
            </TouchableOpacity>

            <Text style={st.sectionLabel}>SAVE THIS SGPA TO</Text>
            <View style={st.semRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <TouchableOpacity key={n} onPress={() => saveS(rows, n)} style={[st.semChip, sem === n && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                  <Text style={{ color: sem === n ? '#fff' : colors.text, fontWeight: '800' }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={st.saveBtn} onPress={saveToCgpa}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Save to Semester {sem}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => saveS(rows.map((r) => ({ ...r, grade: null })), sem)} style={{ alignSelf: 'center', marginTop: 16 }}>
              <Text style={{ color: colors.textDim, fontSize: 13 }}>Clear all grades</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={[st.result, { backgroundColor: '#1B3A8A' }]}>
              <Text style={st.rLabel}>CUMULATIVE GPA</Text>
              <Text style={st.rValue}>{cgpa === null ? '--' : cgpa.toFixed(2)}</Text>
              <Text style={st.rSub}>
                {cgpa === null ? 'Enter SGPA and credits for your semesters' : counted + ' semester' + (counted > 1 ? 's' : '') + ', ' + sumC + ' credits  |  about ' + (cgpa * PERCENT_FACTOR).toFixed(1) + '%'}
              </Text>
            </View>

            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
              const e = sems[String(n)] || { s: '', c: '' };
              return (
                <View key={n} style={st.semCard}>
                  <View style={st.semNum}><Text style={{ color: colors.accent, fontWeight: '800' }}>{n}</Text></View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={st.fLabel}>SGPA</Text>
                    <TextInput style={st.fIn} value={e.s} onChangeText={(t) => saveC({ ...sems, [n]: { ...e, s: t } })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textDim} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.fLabel}>Credits</Text>
                    <TextInput style={st.fIn} value={e.c} onChangeText={(t) => saveC({ ...sems, [n]: { ...e, c: t } })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textDim} />
                  </View>
                </View>
              );
            })}
            <Text style={st.note}>CGPA = sum of (SGPA x credits) divided by total credits. Percentage is approximate (CGPA x {PERCENT_FACTOR}); check your college's rule for the official value.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  tabs: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 4 },
  tab: { flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  result: { backgroundColor: colors.accent, borderRadius: 20, padding: 20, marginBottom: 16 },
  rLabel: { color: '#D6E4FF', fontSize: 12, letterSpacing: 1.3, fontWeight: '700' },
  rValue: { color: '#fff', fontSize: 48, fontWeight: '800', marginTop: 2 },
  rSub: { color: '#D6E4FF', fontSize: 13, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  nameIn: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700', paddingVertical: 4 },
  crLabel: { color: colors.textDim, fontSize: 12, marginRight: 6 },
  crIn: { width: 52, height: 36, backgroundColor: '#1E1E2A', color: colors.text, borderRadius: 10, textAlign: 'center', fontSize: 15, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { minWidth: 44, height: 36, paddingHorizontal: 10, marginRight: 8, marginBottom: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: '#1E1E2A', alignItems: 'center', justifyContent: 'center' },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.accent, marginTop: 4 },
  sectionLabel: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginTop: 24, marginBottom: 10 },
  semRow: { flexDirection: 'row', flexWrap: 'wrap' },
  semChip: { width: 40, height: 40, marginRight: 8, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { height: 50, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  semCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10 },
  semNum: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#1D2B4A', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  fLabel: { color: colors.textDim, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  fIn: { height: 40, backgroundColor: '#1E1E2A', color: colors.text, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, fontWeight: '700' },
  note: { color: colors.textDim, fontSize: 12, lineHeight: 18, marginTop: 8 },
});
