import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../../theme/colors';
import { Snip, starters } from './snippets';

const KEY = 'snippets_custom_v1';
const GREEN = '#00E676';
const mono = Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' });
const uid = () => Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

export default function SnippetsView() {
  const [mine, setMine] = useState<Snip[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((d) => d && setMine(JSON.parse(d))).catch(() => {});
  }, []);

  const save = (m: Snip[]) => { setMine(m); AsyncStorage.setItem(KEY, JSON.stringify(m)).catch(() => {}); };

  async function copy(sn: Snip) {
    await Clipboard.setStringAsync(sn.code);
    setCopied(sn.id);
    setTimeout(() => setCopied(null), 1500);
  }

  function addOwn() {
    if (!title.trim() && !code.trim()) { setAdding(false); return; }
    save([{ id: uid(), title: title.trim() || 'Untitled', code }, ...mine]);
    setAdding(false);
  }

  function removeOwn(sn: Snip) {
    Alert.alert('Delete snippet?', '"' + sn.title + '" will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => save(mine.filter((x) => x.id !== sn.id)) },
    ]);
  }

  const card = (sn: Snip, own: boolean) => {
    const isOpen = open === sn.id;
    return (
      <View key={sn.id} style={s.card}>
        <TouchableOpacity activeOpacity={0.8} style={s.head} onPress={() => setOpen(isOpen ? null : sn.id)} onLongPress={own ? () => removeOwn(sn) : undefined}>
          <View style={s.icon}><Ionicons name="code-slash" size={18} color={GREEN} /></View>
          <Text style={s.title} numberOfLines={1}>{sn.title}</Text>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textDim} />
        </TouchableOpacity>
        {isOpen && (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.codeBox}>
              <Text style={s.code}>{sn.code}</Text>
            </ScrollView>
            <TouchableOpacity style={s.copyBtn} onPress={() => copy(sn)}>
              <Ionicons name={copied === sn.id ? 'checkmark' : 'copy-outline'} size={18} color={copied === sn.id ? GREEN : colors.accent} />
              <Text style={{ color: copied === sn.id ? GREEN : colors.accent, fontWeight: '700', marginLeft: 6 }}>{copied === sn.id ? 'Copied' : 'Copy code'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {mine.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Text style={s.group}>MY SNIPPETS</Text>
            {mine.map((x) => card(x, true))}
            <Text style={s.tip}>Long-press one of yours to delete it.</Text>
          </View>
        )}
        <Text style={s.group}>PFPS STARTERS (C)</Text>
        {starters.map((x) => card(x, false))}
      </ScrollView>

      <TouchableOpacity activeOpacity={0.85} style={[s.fab, { backgroundColor: GREEN }]} onPress={() => { setTitle(''); setCode(''); setAdding(true); }}>
        <Ionicons name="add" size={32} color="#04210F" />
      </TouchableOpacity>

      <Modal visible={adding} transparent animationType="fade" onRequestClose={() => setAdding(false)}>
        <View style={s.wrap}>
          <View style={s.dialog}>
            <Text style={s.dTitle}>New snippet</Text>
            <Text style={s.label}>Title</Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. Linked list insert" placeholderTextColor={colors.textDim} />
            <Text style={s.label}>Code</Text>
            <TextInput style={[s.input, { height: 180, paddingTop: 12, fontFamily: mono }]} value={code} onChangeText={setCode} multiline textAlignVertical="top" autoCapitalize="none" autoCorrect={false} placeholder="Paste or type code" placeholderTextColor={colors.textDim} />
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
  group: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginBottom: 8, marginTop: 6 },
  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#00E67626', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  codeBox: { backgroundColor: '#0D0D14', marginHorizontal: 12, borderRadius: 10, padding: 12 },
  code: { color: '#A5D6A7', fontFamily: mono, fontSize: 12.5, lineHeight: 19 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, marginTop: 4, marginBottom: 6 },
  tip: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 2 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
  dTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#1E1E2A', color: colors.text, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 15 },
  btn: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
