import React, { useState, useCallback } from 'react';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import AttendanceView from '../features/academics/AttendanceView';
import TimetableView from '../features/academics/TimetableView';
import DatesView from '../features/academics/DatesView';
import CgpaView from '../features/academics/CgpaView';
import AssignmentsView from '../features/assignments/AssignmentsView';

const items = [
  { id: 'timetable', title: 'Timetable', sub: 'Your weekly class schedule', icon: 'calendar', color: '#2979FF', ready: true },
  { id: 'attendance', title: 'Attendance', sub: 'Subjects, calendar history, classes left', icon: 'checkmark-done-circle', color: '#00E676', ready: true },
  { id: 'assignments', title: 'Assignments', sub: 'Deadlines and submissions', icon: 'document-attach', color: '#FF9100', ready: true },
  { id: 'exams', title: 'Exams & Dates', sub: 'Academic calendar and countdowns', icon: 'ribbon', color: '#AB47BC', ready: true },
  { id: 'cgpa', title: 'CGPA / SGPA', sub: 'Calculate and track your grades', icon: 'stats-chart', color: '#FFC400', ready: true },
];

export default function AcademicsScreen() {
  const [view, setView] = useState<string>('hub');
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  useFocusEffect(
    useCallback(() => {
      const o = route.params && route.params.open;
      if (o) { setView(o); nav.setParams({ open: undefined }); }
    }, [route.params])
  );
  const current = items.find((i) => i.id === view);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        {view !== 'hub' && (
          <TouchableOpacity onPress={() => setView('hub')} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{current ? current.title : 'Academics'}</Text>
      </View>

      {view === 'attendance' ? (
        <AttendanceView />
      ) : view === 'timetable' ? (
        <TimetableView />
      ) : view === 'exams' ? (
        <DatesView />
      ) : view === 'cgpa' ? (
        <CgpaView />
      ) : view === 'assignments' ? (
        <AssignmentsView />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6 }} showsVerticalScrollIndicator={false}>
          {items.map((it) => (
            <TouchableOpacity
              key={it.id}
              activeOpacity={0.8}
              disabled={!it.ready}
              onPress={() => setView(it.id)}
              style={[styles.card, !it.ready && { opacity: 0.55 }]}
            >
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
          ))}
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
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  icon: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  cSub: { color: colors.textDim, fontSize: 13, marginTop: 3 },
  soon: { backgroundColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  soonText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
});
