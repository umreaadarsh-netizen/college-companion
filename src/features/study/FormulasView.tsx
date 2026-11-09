import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';
import { subjects } from '../../constants/subjects';
import { formulas } from '../../constants/formulas';

type Custom = { id: string; title: string; body: string };
const KEY = 'formulas_custom_v1';
const uid = () => Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

export default function FormulasView() {
  const [subject, setSubject] = useState('Maths');
  const [custom, setCustom] = useState<Record<string, Custom[]>>({});
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((d) => d && setCustom(JSON.parse(d))).catch(() => {});
  }, []);

  const save = (c: Record<string, Custom[]>) => { setCustom(c); AsyncStorage.setItem(KEY, JSON.stringify(c)).catch(() => {}); };

  const sub = subjects.find((x) => x.name === subject)!;
  const starters = formulas[subject] || [];
  const groups: string[] = [];
  starters.forEach((f) => { if (!groups.includes(f.g)) groups.push(f.g); });
  const mine = custom[subject] || [];

  function addOwn() {
    if (!title.trim() && !body.trim()) { setAdding(false); return; }
    const item = { id: uid(), title: title.trim() || 'Untitled', body };
    save({ ...custom, [subject]: [item, ...mine] });
    setAdding(false);
  }

  function removeOwn(c: Custom) {
    Alert.alert('Delete formula?', '"' + c.title + '" will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => save({ ...custom, [subject]: mine.filter((x) => x.id !== c.id) }) },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: 52 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {subjects.map((x) => (
            <TouchableOpacity key={x.name} onPress={() => setSubject(x.name)} style={[s.chip, subject === x.name && { backgroundColor: x.color, borderColor: x.color }]}>
              <Text style={{ color: subject === x.name ? '#fff' : colors.text, fontWeight: '700' }}>{x.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {mine.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Text style={s.group}>MY FORMULAS</Text>
            {mine.map((c) => (
              <TouchableOpacity key={c.id} activeOpacity={0.9} onLongPress={() => removeOwn(c)} style={[s.card, { borderLeftColor: sub.color }]}>
                <Text style={s.title}>{c.title}</Text>
                <Text style={s.body}>{c.body}</Text>
              </TouchableOpacity>
            ))}
            <Text style={s.tip}>Long-press one of your formulas to delete it.</Text>
          </View>
        )}

        {groups.map((g) => (
          <View key={g} style={{ marginBottom: 14 }}>
            <Text style={s.group}>{g.toUpperCase()}</Text>
            {starters.filter((f) => f.g === g).map((f) => (
              <View key={f.t} style={[s.card, { borderLeftColor: sub.color }]}>
                <Text style={s.title}>{f.t}</Text>
                <Text style={s.body}>{f.f}</Text>
              </View>
            ))}
          </View>
        ))}

        {starters.length === 0 && mine.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="flask-outline" size={34} color={colors.textDim} />
            <Text style={s.emptyText}>No formulas for {subject} yet</Text>
            <Text style={s.emptySub}>Tap + to add your own</Text>
          </View>
        )}
        {starters.length > 0 && <Text style={s.tip}>Starter formulas. Check them against your syllabus.</Text>}
      </ScrollView>

      <TouchableOpacity activeOpacity={0.85} style={[s.fab, { backgroundColor: sub.color }]} onPress={() => { setTitle(''); setBody(''); setAdding(true); }}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal visible={adding} transparent animationType="fade" onRequestClose={() => setAdding(false)}>
        <View style={s.wrap}>
          <View style={s.dialog}>
            <Text style={s.dTitle}>Add formula to {subject}</Text>
            <Text style={s.label}>Title</Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. Stokes theorem" placeholderTextColor={colors.textDim} />
            <Text style={s.label}>Formula / notes</Text>
            <TextInput style={[s.input, { height: 120, paddingTop: 12 }]} value={body} onChangeText={setBody} multiline textAlignVertical="top" placeholder="Type it here" placeholderTextColor={colors.textDim} />
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <TouchableOpacity style={[s.btn, { backgroundColor: colors.border }]} onPress={() => setAdding(false)}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { backgroundColor: colors.accent, marginLeft: 10 }]} onPress={addOwn}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  chip: { height: 38, paddingHorizontal: 16, marginRight: 8, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  group: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginBottom: 8, marginTop: 6 },
  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, padding: 14, marginBottom: 10 },
  title: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  body: { color: '#C9D4F5', fontSize: 14, lineHeight: 23 },
  tip: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 70 },
  emptyText: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 10 },
  emptySub: { color: colors.textDim, fontSize: 13, marginTop: 4 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
  dTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#1E1E2A', color: colors.text, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 15 },
  btn: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
