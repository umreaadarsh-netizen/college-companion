import React, { useState, useCallback } from 'react';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import PomodoroView from '../features/study/PomodoroView';
import FormulasView from '../features/study/FormulasView';
import SnippetsView from '../features/study/SnippetsView';
import RemindersView from '../features/study/RemindersView';
import ExpensesView from '../features/expenses/ExpensesView';
import CustomizeHomeView from '../features/home/CustomizeHomeView';

const ai = [
  { id: 'cp9', title: 'CP9 AI Assistant', sub: 'Ask doubts, send photos, get explanations', icon: 'sparkles', color: '#6C4CF0', ready: true },
];

const study = [
  { id: 'pomodoro', title: 'Study Timer', sub: 'Pomodoro focus sessions and streak', icon: 'timer', color: '#2979FF', ready: true },
  { id: 'formulas', title: 'Formula Sheets', sub: 'Maths, Physics, Mechanics and more', icon: 'flask', color: '#AB47BC', ready: true },
  { id: 'snippets', title: 'Code Snippets', sub: 'PFPS programs in C, plus your own', icon: 'code-slash', color: '#00E676', ready: true },
];

const life = [
  { id: 'expenses', title: 'Expenses', sub: 'Pocket money, spending and budget', icon: 'wallet', color: '#FFC400', ready: true },
];

const settings = [
  { id: 'customize', title: 'Customize Home', sub: 'Choose and reorder Home sections', icon: 'options', color: '#2979FF', ready: true },
  { id: 'reminders', title: 'Reminders', sub: 'Classes, exams, tests and attendance', icon: 'notifications', color: '#FF9100', ready: true },
];

const soon = [
  { id: 'contacts', title: 'Contacts', sub: 'Faculty, friends, hostel', icon: 'call', color: '#26C6DA', ready: false },
  { id: 'backup', title: 'Backup', sub: 'Save your data safely', icon: 'cloud-upload', color: '#FF9100', ready: false },
];

type Item = (typeof study)[number];

export default function MoreScreen() {
  const [view, setView] = useState<string>('hub');
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  useFocusEffect(
    useCallback(() => {
      const o = route.params && route.params.open;
      if (o) { setView(o); nav.setParams({ open: undefined }); }
    }, [route.params])
  );
  const current = [...ai, ...study, ...life, ...settings, ...soon].find((i) => i.id === view);

  const row = (it: Item) => (
    <TouchableOpacity key={it.id} activeOpacity={0.8} disabled={!it.ready} onPress={() => (it.id === 'cp9' ? nav.navigate('CP9') : setView(it.id))} style={[styles.card, !it.ready && { opacity: 0.55 }]}>
      <View style={[styles.icon, { backgroundColor: it.color + '26' }]}>
        <Ionicons name={it.icon as any} size={26} color={it.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cTitle}>{it.title}</Text>
        <Text style={styles.cSub}>{it.sub}</Text>
      </View>
      {it.ready ? (
        <Ionicons name="chevron-forward" size={22} color={colors.textDim} />
      ) : (
        <View style={styles.soon}><Text style={styles.soonText}>Soon</Text></View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        {view !== 'hub' && (
          <TouchableOpacity onPress={() => setView('hub')} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{current ? current.title : 'More'}</Text>
      </View>

      {view === 'pomodoro' ? (
        <PomodoroView />
      ) : view === 'formulas' ? (
        <FormulasView />
      ) : view === 'snippets' ? (
        <SnippetsView />
      ) : view === 'reminders' ? (
        <RemindersView />
      ) : view === 'expenses' ? (
        <ExpensesView />
      ) : view === 'customize' ? (
        <CustomizeHomeView />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.group}>AI</Text>
          {ai.map(row)}
          <Text style={[styles.group, { marginTop: 10 }]}>STUDY TOOLS</Text>
          {study.map(row)}
          <Text style={[styles.group, { marginTop: 10 }]}>MONEY</Text>
          {life.map(row)}
          <Text style={[styles.group, { marginTop: 10 }]}>SETTINGS</Text>
          {settings.map(row)}
          <Text style={[styles.group, { marginTop: 10 }]}>COMING LATER</Text>
          {soon.map(row)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  back: { marginRight: 10, marginLeft: -6, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  group: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  icon: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  cSub: { color: colors.textDim, fontSize: 13, marginTop: 3 },
  soon: { backgroundColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  soonText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
});
