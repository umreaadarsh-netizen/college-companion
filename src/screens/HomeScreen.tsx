import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import NextClassCard from '../components/NextClassCard';
import LaterToday from '../components/LaterToday';
import UpcomingDates from '../components/UpcomingDates';
import DueCard from '../components/DueCard';
import CP9Card from '../components/CP9Card';
import { Item, defaultLayout, loadLayout } from '../utils/homeLayout';
import { Profile, defaultProfile, loadProfile, saveProfile, pickPhoto, removePhoto, initialsOf } from '../utils/profile';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const [p, setP] = useState<Profile>(defaultProfile);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Profile>(defaultProfile);
  const [layout, setLayout] = useState<Item[]>(defaultLayout);

  useFocusEffect(useCallback(() => { loadProfile().then(setP); loadLayout().then(setLayout); }, []));

  function openEdit() { setForm(p); setEdit(true); }

  async function changePhoto() {
    const uri = await pickPhoto();
    if (uri) {
      if (form.photo && form.photo !== p.photo) removePhoto(form.photo);
      setForm({ ...form, photo: uri });
    }
  }

  function save() {
    if (!form.name.trim()) { Alert.alert('Your name cannot be empty'); return; }
    if (p.photo && p.photo !== form.photo) removePhoto(p.photo);
    const next = { ...form, name: form.name.trim(), college: form.college.trim(), rollNo: form.rollNo.trim(), branch: form.branch.trim() };
    saveProfile(next);
    setP(next);
    setEdit(false);
  }

  function cancel() {
    if (form.photo && form.photo !== p.photo) removePhoto(form.photo);
    setEdit(false);
  }

  const field = (label: string, key: 'name' | 'college' | 'rollNo' | 'branch') => (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={form[key]} onChangeText={(t) => setForm({ ...form, [key]: t })} placeholderTextColor={colors.textDim} />
    </View>
  );

  const tiles = [
    { l: 'Calculator', i: 'calculator', c: '#2979FF', go: () => nav.navigate('Calculator') },
    { l: 'Assignments', i: 'document-attach', c: '#FF9100', go: () => nav.navigate('Academics', { open: 'assignments' }) },
    { l: 'Study timer', i: 'timer', c: '#AB47BC', go: () => nav.navigate('More', { open: 'pomodoro' }) },
    { l: 'Expenses', i: 'wallet', c: '#00C853', go: () => nav.navigate('More', { open: 'expenses' }) },
  ];

  const renderSection = (id: string) => {
    if (id === 'next') return <NextClassCard />;
    if (id === 'cp9') return <CP9Card />;
    if (id === 'quick') {
      return (
        <View style={styles.tiles}>
          {tiles.map((t) => (
            <TouchableOpacity key={t.l} activeOpacity={0.8} style={styles.tile} onPress={t.go}>
              <View style={[styles.tileIcon, { backgroundColor: t.c + '26' }]}>
                <Ionicons name={t.i as any} size={24} color={t.c} />
              </View>
              <Text style={styles.tileText} numberOfLines={1}>{t.l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    if (id === 'due') return <DueCard />;
    if (id === 'later') return <LaterToday />;
    if (id === 'dates') return <UpcomingDates />;
    return null;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.greet}>{greeting()},</Text>
            <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>{p.name}</Text>
            <Text style={styles.college}>
              {p.college}
              <Text style={styles.roll}>{'   |   '}{p.rollNo}</Text>
            </Text>
            <Text style={styles.branch}>{p.branch}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.85} onPress={openEdit}>
            {p.photo ? (
              <Image source={{ uri: p.photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarText}>{initialsOf(p.name)}</Text></View>
            )}
            <View style={styles.badge}><Ionicons name="pencil" size={11} color="#fff" /></View>
          </TouchableOpacity>
        </View>

        {layout.filter((x) => x.on).map((x) => (
          <React.Fragment key={x.id}>{renderSection(x.id)}</React.Fragment>
        ))}

        {layout.every((x) => !x.on) && (
          <View style={styles.allOff}>
            <Ionicons name="eye-off-outline" size={28} color={colors.textDim} />
            <Text style={styles.allOffText}>All sections are hidden</Text>
          </View>
        )}

        <TouchableOpacity activeOpacity={0.8} style={styles.customize} onPress={() => nav.navigate('More', { open: 'customize' })}>
          <Ionicons name="options-outline" size={18} color={colors.textDim} />
          <Text style={styles.customizeText}>Customize Home</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={edit} transparent animationType="slide" onRequestClose={cancel}>
        <View style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>Edit profile</Text>
              <View style={{ alignItems: 'center', marginVertical: 14 }}>
                {form.photo ? (
                  <Image source={{ uri: form.photo }} style={styles.bigAvatar} />
                ) : (
                  <View style={styles.bigAvatar}><Text style={[styles.avatarText, { fontSize: 32 }]}>{initialsOf(form.name)}</Text></View>
                )}
                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                  <TouchableOpacity style={styles.photoBtn} onPress={changePhoto}>
                    <Ionicons name="image-outline" size={18} color={colors.accent} />
                    <Text style={styles.photoText}>{form.photo ? 'Change photo' : 'Add photo'}</Text>
                  </TouchableOpacity>
                  {form.photo ? (
                    <TouchableOpacity style={[styles.photoBtn, { marginLeft: 10 }]} onPress={() => setForm({ ...form, photo: null })}>
                      <Ionicons name="trash-outline" size={18} color="#FF5252" />
                      <Text style={[styles.photoText, { color: '#FF5252' }]}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
              {field('Name', 'name')}
              {field('College', 'college')}
              {field('Roll number', 'rollNo')}
              {field('Branch', 'branch')}
              <View style={{ flexDirection: 'row', marginTop: 20 }}>
                <TouchableOpacity style={[styles.btn, { backgroundColor: colors.border }]} onPress={cancel}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent, marginLeft: 10 }]} onPress={save}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 20 },
  greet: { color: colors.textDim, fontSize: 14 },
  name: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 2 },
  college: { color: colors.accent, fontSize: 14, fontWeight: '700', marginTop: 4 },
  roll: { color: colors.text, fontWeight: '700', letterSpacing: 0.5 },
  branch: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  badge: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#3A3A4A', borderWidth: 2, borderColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', marginBottom: 22 },
  allOff: { alignItems: 'center', paddingVertical: 40 },
  allOffText: { color: colors.textDim, fontSize: 14, marginTop: 10 },
  customize: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, marginTop: 6 },
  customizeText: { color: colors.textDim, fontSize: 13, fontWeight: '700', marginLeft: 8 },
  tile: { flex: 1, alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, marginHorizontal: 4 },
  tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  sheetWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  bigAvatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E2A', borderRadius: 12, height: 40, paddingHorizontal: 14 },
  photoText: { color: colors.accent, fontWeight: '700', marginLeft: 8, fontSize: 13 },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: '#1E1E2A', color: colors.text, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 16 },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
