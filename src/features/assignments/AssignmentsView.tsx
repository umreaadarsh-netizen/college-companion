import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { colors } from '../../theme/colors';
import { subjects } from '../../constants/subjects';
import { daysFromToday, prettyDate, ymd } from '../../utils/dates';
import DatePicker from '../../components/DatePicker';
import {
  Assignment, Attach, KINDS, uid, loadAssignments, saveAssignments, dueLabel, dueColor,
  saveAttachment, deleteAttachment,
} from './store';

type Form = {
  id: string | null;
  title: string;
  subject: string;
  kind: string;
  due: string;
  note: string;
  done: boolean;
  attachments: Attach[];
  origIds: string[]; // files that were already saved before this edit
};

const OTHER = 'Other';
const subjColor = (n: string) => subjects.find((x) => x.name === n)?.color || '#8E8E9A';

export default function AssignmentsView() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [pickDate, setPickDate] = useState(false);
  const [viewer, setViewer] = useState<Attach | null>(null);

  useEffect(() => { loadAssignments().then(setItems); }, []);

  const upd = (a: Assignment[]) => { setItems(a); saveAssignments(a); };

  function openNew() {
    setForm({ id: null, title: '', subject: subjects[0].name, kind: 'Assignment', due: ymd(new Date(Date.now() + 86400000 * 3)), note: '', done: false, attachments: [], origIds: [] });
  }
  function openEdit(a: Assignment) {
    const at = a.attachments || [];
    setForm({ id: a.id, title: a.title, subject: a.subject, kind: a.kind, due: a.due, note: a.note, done: a.done, attachments: at, origIds: at.map((x) => x.id) });
  }

  // ---------- attachments ----------
  async function attach(src: 'camera' | 'gallery' | 'file') {
    try {
      let uri = '';
      let name = '';
      let mime = '';
      if (src === 'camera') {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) { Alert.alert('Camera permission needed', 'Allow camera access to take a photo.'); return; }
        const r = await ImagePicker.launchCameraAsync({ quality: 0.85 });
        if (r.canceled || !r.assets || !r.assets.length) return;
        const a = r.assets[0];
        uri = a.uri; name = a.fileName || 'photo.jpg'; mime = a.mimeType || 'image/jpeg';
      } else if (src === 'gallery') {
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
        if (r.canceled || !r.assets || !r.assets.length) return;
        const a = r.assets[0];
        uri = a.uri; name = a.fileName || 'image.jpg'; mime = a.mimeType || 'image/jpeg';
      } else {
        const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' });
        if (r.canceled || !r.assets || !r.assets.length) return;
        const a = r.assets[0];
        uri = a.uri; name = a.name; mime = a.mimeType || '';
      }
      const att = await saveAttachment(uri, name, mime);
      setForm((f) => (f ? { ...f, attachments: f.attachments.concat([att]) } : f));
    } catch {
      Alert.alert('Could not attach', 'Something went wrong while saving that file. Please try again.');
    }
  }

  function removeAttachment(a: Attach) {
    setForm((f) => (f ? { ...f, attachments: f.attachments.filter((x) => x.id !== a.id) } : f));
  }

  async function openAttachment(a: Attach) {
    if (a.kind === 'image') { setViewer(a); return; }
    try {
      if (!(await Sharing.isAvailableAsync())) { Alert.alert('Cannot open files on this device'); return; }
      await Sharing.shareAsync(a.uri, { mimeType: a.mime || undefined, dialogTitle: a.name });
    } catch { Alert.alert('Could not open this file'); }
  }

  // ---------- save / cancel / delete ----------
  function closeForm() {
    if (form) {
      // throw away files that were added during this edit but never saved
      form.attachments.filter((a) => form.origIds.indexOf(a.id) < 0).forEach(deleteAttachment);
    }
    setForm(null);
  }

  function saveForm() {
    if (!form) return;
    if (!form.title.trim()) { Alert.alert('Add a title first'); return; }
    // delete files that were removed from an existing assignment
    const keep = form.attachments.map((a) => a.id);
    const old = form.id ? (items.find((x) => x.id === form.id)?.attachments || []) : [];
    old.filter((a) => keep.indexOf(a.id) < 0).forEach(deleteAttachment);

    const data = { title: form.title.trim(), subject: form.subject, kind: form.kind, due: form.due, note: form.note, done: form.done, attachments: form.attachments };
    if (form.id) upd(items.map((x) => (x.id === form.id ? { ...x, ...data } : x)));
    else upd([{ id: uid(), ...data }, ...items]);
    setForm(null);
  }

  function remove() {
    if (!form || !form.id) return;
    const id = form.id;
    Alert.alert('Delete this?', 'The assignment and its files will be removed from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          const target = items.find((x) => x.id === id);
          (target?.attachments || []).forEach(deleteAttachment);
          form.attachments.filter((a) => form.origIds.indexOf(a.id) < 0).forEach(deleteAttachment);
          upd(items.filter((x) => x.id !== id));
          setForm(null);
        },
      },
    ]);
  }

  const toggle = (id: string) => upd(items.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));

  const pending = items.filter((x) => !x.done).sort((a, b) => (a.due < b.due ? -1 : 1));
  const done = items.filter((x) => x.done).sort((a, b) => (a.due < b.due ? 1 : -1));
  const overdue = pending.filter((x) => daysFromToday(x.due) < 0);
  const upcoming = pending.filter((x) => daysFromToday(x.due) >= 0);

  const card = (a: Assignment) => {
    const days = daysFromToday(a.due);
    const col = a.done ? colors.textDim : dueColor(days);
    const nFiles = a.attachments ? a.attachments.length : 0;
    return (
      <TouchableOpacity key={a.id} activeOpacity={0.85} style={[s.card, a.done && { opacity: 0.55 }]} onPress={() => openEdit(a)}>
        <TouchableOpacity onPress={() => toggle(a.id)} style={s.check} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={a.done ? 'checkmark-circle' : 'ellipse-outline'} size={30} color={a.done ? '#00E676' : colors.textDim} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, a.done && { textDecorationLine: 'line-through' }]} numberOfLines={2}>{a.title}</Text>
          <View style={s.meta}>
            <View style={[s.tag, { backgroundColor: subjColor(a.subject) + '26' }]}>
              <Text style={{ color: subjColor(a.subject), fontSize: 11, fontWeight: '800' }}>{a.subject}</Text>
            </View>
            <Text style={s.kind}>{a.kind}</Text>
            {nFiles > 0 && (
              <View style={s.clip}>
                <Ionicons name="attach" size={14} color={colors.textDim} />
                <Text style={s.clipText}>{nFiles}</Text>
              </View>
            )}
          </View>
          <Text style={s.date}>{prettyDate(a.due)}</Text>
        </View>
        {!a.done && (
          <View style={[s.chip, { backgroundColor: col + '26' }]}>
            <Text style={{ color: col, fontSize: 12, fontWeight: '800' }}>{dueLabel(days)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const groupBlock = (title: string, list: Assignment[], color?: string) =>
    list.length === 0 ? null : (
      <View style={{ marginBottom: 12 }}>
        <Text style={[s.group, color ? { color } : null]}>{title}</Text>
        {list.map(card)}
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {items.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="document-attach-outline" size={36} color={colors.textDim} />
            <Text style={s.emptyText}>No assignments yet</Text>
            <Text style={s.emptySub}>Tap + to add one. You can attach the teacher's photos and PDFs too.</Text>
          </View>
        )}
        {groupBlock('OVERDUE', overdue, '#FF5252')}
        {groupBlock('PENDING', upcoming)}
        {groupBlock('DONE', done)}
        {items.length > 0 && <Text style={s.tip}>Tap the circle to tick an assignment complete. Tap the card to open its files.</Text>}
      </ScrollView>

      <TouchableOpacity activeOpacity={0.85} style={s.fab} onPress={openNew}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal visible={form !== null} transparent animationType="slide" onRequestClose={closeForm}>
        <View style={s.sheetWrap}>
          <View style={s.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={s.sheetTitle}>{form && form.id ? 'Assignment' : 'New assignment'}</Text>

              <Text style={s.label}>Title</Text>
              <TextInput style={s.input} value={form ? form.title : ''} onChangeText={(t) => form && setForm({ ...form, title: t })} placeholder="e.g. Physics assignment 2" placeholderTextColor={colors.textDim} />

              <Text style={s.label}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {subjects.map((x) => (
                  <TouchableOpacity key={x.name} onPress={() => form && setForm({ ...form, subject: x.name })} style={[s.pick, form && form.subject === x.name && { backgroundColor: x.color, borderColor: x.color }]}>
                    <Text style={{ color: form && form.subject === x.name ? '#fff' : colors.text, fontWeight: '700' }}>{x.name}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => form && setForm({ ...form, subject: OTHER })} style={[s.pick, form && form.subject === OTHER && { backgroundColor: '#8E8E9A', borderColor: '#8E8E9A' }]}>
                  <Text style={{ color: form && form.subject === OTHER ? '#fff' : colors.text, fontWeight: '700' }}>Other</Text>
                </TouchableOpacity>
              </ScrollView>

              <Text style={s.label}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {KINDS.map((k) => (
                  <TouchableOpacity key={k} onPress={() => form && setForm({ ...form, kind: k })} style={[s.pick, form && form.kind === k && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                    <Text style={{ color: form && form.kind === k ? '#fff' : colors.text, fontWeight: '700' }}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.label}>Deadline</Text>
              <TouchableOpacity style={s.dateBtn} onPress={() => setPickDate(true)}>
                <Ionicons name="calendar-outline" size={20} color={colors.accent} />
                <Text style={s.dateText}>{form ? prettyDate(form.due) : ''}</Text>
              </TouchableOpacity>

              <Text style={s.label}>Teacher's material and your work</Text>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={s.attBtn} onPress={() => attach('camera')}>
                  <Ionicons name="camera" size={20} color="#2979FF" />
                  <Text style={s.attText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.attBtn} onPress={() => attach('gallery')}>
                  <Ionicons name="images" size={20} color="#AB47BC" />
                  <Text style={s.attText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.attBtn} onPress={() => attach('file')}>
                  <Ionicons name="document-attach" size={20} color="#00E676" />
                  <Text style={s.attText}>PDF / File</Text>
                </TouchableOpacity>
              </View>

              {form && form.attachments.map((a) => (
                <View key={a.id} style={s.file}>
                  <TouchableOpacity style={s.fileMain} activeOpacity={0.8} onPress={() => openAttachment(a)}>
                    {a.kind === 'image' ? (
                      <Image source={{ uri: a.uri }} style={s.thumb} />
                    ) : (
                      <View style={[s.thumb, s.thumbIcon]}>
                        <Ionicons name={a.kind === 'pdf' ? 'document-text' : 'document'} size={24} color={colors.accent} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.fileName} numberOfLines={1}>{a.name}</Text>
                      <Text style={s.fileSub}>{a.kind === 'pdf' ? 'PDF' : a.kind === 'image' ? 'Photo' : 'File'}  |  tap to open</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeAttachment(a)} style={s.fileX} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={22} color={colors.textDim} />
                  </TouchableOpacity>
                </View>
              ))}

              <Text style={s.label}>Note (optional)</Text>
              <TextInput style={[s.input, { height: 80, paddingTop: 12 }]} multiline textAlignVertical="top" value={form ? form.note : ''} onChangeText={(t) => form && setForm({ ...form, note: t })} placeholder="Questions, page numbers, submit to whom..." placeholderTextColor={colors.textDim} />

              <TouchableOpacity activeOpacity={0.85} style={[s.doneRow, form && form.done && { borderColor: '#00E676', backgroundColor: '#0F2E1D' }]} onPress={() => form && setForm({ ...form, done: !form.done })}>
                <Ionicons name={form && form.done ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={form && form.done ? '#00E676' : colors.textDim} />
                <Text style={[s.doneText, form && form.done && { color: '#00E676' }]}>{form && form.done ? 'Completed' : 'Mark as completed'}</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', marginTop: 18 }}>
                {form && form.id ? (
                  <TouchableOpacity style={[s.btn, { backgroundColor: '#3A1515', flex: 0, width: 56 }]} onPress={remove}>
                    <Ionicons name="trash" size={20} color="#FF5252" />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={[s.btn, { backgroundColor: colors.border, marginLeft: form && form.id ? 10 : 0 }]} onPress={closeForm}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, { backgroundColor: colors.accent, marginLeft: 10 }]} onPress={saveForm}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DatePicker visible={pickDate} value={form ? form.due : null} onClose={() => setPickDate(false)} onPick={(v) => { if (form) setForm({ ...form, due: v }); setPickDate(false); }} />

      <Modal visible={viewer !== null} animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={s.viewer}>
          {viewer && <Image source={{ uri: viewer.uri }} style={{ flex: 1 }} resizeMode="contain" />}
          <View style={s.vBar}>
            <TouchableOpacity onPress={() => setViewer(null)} style={s.vBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={s.vTitle} numberOfLines={1}>{viewer ? viewer.name : ''}</Text>
            <TouchableOpacity onPress={() => viewer && Sharing.shareAsync(viewer.uri, { mimeType: viewer.mime || undefined }).catch(() => {})} style={s.vBtn}>
              <Ionicons name="share-social" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  group: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  check: { marginRight: 12 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  tag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  kind: { color: colors.textDim, fontSize: 12, marginLeft: 8 },
  clip: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  clipText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  date: { color: colors.textDim, fontSize: 12, marginTop: 6 },
  chip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 8, maxWidth: 110 },
  tip: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 8 },
  empty: { alignItems: 'center', marginTop: 70, paddingHorizontal: 20 },
  emptyText: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 10 },
  emptySub: { color: colors.textDim, fontSize: 13, marginTop: 4, textAlign: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  sheetWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  input: { backgroundColor: '#1E1E2A', color: colors.text, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 16 },
  pick: { height: 38, paddingHorizontal: 14, marginRight: 8, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: '#1E1E2A', alignItems: 'center', justifyContent: 'center' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E2A', borderRadius: 12, height: 46, paddingHorizontal: 14 },
  dateText: { color: colors.text, fontSize: 16, fontWeight: '700', marginLeft: 10 },
  attBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 46, marginRight: 8, borderRadius: 12, backgroundColor: '#1E1E2A' },
  attText: { color: colors.text, fontSize: 13, fontWeight: '700', marginLeft: 6 },
  file: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E2A', borderRadius: 12, padding: 8, marginTop: 8 },
  fileMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 46, height: 46, borderRadius: 10, marginRight: 12, backgroundColor: '#14141C' },
  thumbIcon: { alignItems: 'center', justifyContent: 'center' },
  fileName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  fileSub: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  fileX: { paddingHorizontal: 8 },
  doneRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#1E1E2A', padding: 14, marginTop: 18 },
  doneText: { color: colors.text, fontSize: 16, fontWeight: '700', marginLeft: 12 },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  viewer: { flex: 1, backgroundColor: '#000' },
  vBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingTop: 36, paddingHorizontal: 12, paddingBottom: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
  vBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  vTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700', marginHorizontal: 6 },
});
