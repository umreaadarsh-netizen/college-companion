import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';
import { Batch } from '../../constants/timetable';
import { classesFor, startMin, endMin, fmt, titleOf, subjectColor, subjectIcon } from '../../utils/schedule';
import { rescheduleAll } from '../../utils/reminders';

const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const todayNum = new Date().getDay();

export default function TimetableView() {
  const [batch, setBatch] = useState<Batch>('A');
  const [day, setDay] = useState(todayNum === 0 ? 1 : todayNum);

  useEffect(() => {
    AsyncStorage.getItem('batch_v1').then((b) => { if (b === 'A' || b === 'B') setBatch(b); }).catch(() => {});
  }, []);

  function pick(b: Batch) {
    setBatch(b);
    AsyncStorage.setItem('batch_v1', b).then(() => rescheduleAll()).catch(() => {});
  }

  const list = classesFor(day, batch);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.meta}>
        <Text style={styles.metaText}>Sem I, CSDS-I, Room 209</Text>
        <View style={styles.toggle}>
          {(['A', 'B'] as Batch[]).map((b) => (
            <TouchableOpacity key={b} onPress={() => pick(b)} style={[styles.tBtn, batch === b && { backgroundColor: colors.accent }]}>
              <Text style={{ color: batch === b ? '#fff' : colors.textDim, fontWeight: '800', fontSize: 13 }}>Batch {b}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.days}>
        {[1, 2, 3, 4, 5, 6].map((d) => (
          <TouchableOpacity key={d} onPress={() => setDay(d)} style={[styles.day, day === d && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
            <Text style={{ color: day === d ? '#fff' : colors.text, fontWeight: '700' }}>{NAMES[d]}</Text>
            {todayNum === d && <View style={[styles.dot, { backgroundColor: day === d ? '#fff' : colors.accent }]} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {list.map((c, i) => {
          const col = subjectColor(c.subject);
          const prev = list[i - 1];
          const recess = prev && endMin(prev) <= 750 && startMin(c) >= 795;
          return (
            <View key={c.day + '-' + c.start + '-' + (c.batch || 'all')}>
              {recess && (
                <View style={styles.recess}>
                  <View style={styles.line} />
                  <Text style={styles.recessText}>Recess 12:30 - 1:15 PM</Text>
                  <View style={styles.line} />
                </View>
              )}
              <View style={styles.card}>
                <View style={[styles.bar, { backgroundColor: col }]} />
                <View style={[styles.icon, { backgroundColor: col + '26' }]}>
                  <Ionicons name={subjectIcon(c.subject) as any} size={22} color={col} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.time}>{fmt(startMin(c))} - {fmt(endMin(c))}</Text>
                  <Text style={styles.title}>{titleOf(c)}</Text>
                  <Text style={styles.sub}>{c.teacher}</Text>
                  <Text style={styles.sub}>{c.code ? c.code + '  |  ' : ''}Room {c.room}</Text>
                </View>
                {c.kind !== 'Lecture' && (
                  <View style={[styles.badge, { backgroundColor: col + '26' }]}>
                    <Text style={{ color: col, fontSize: 11, fontWeight: '800' }}>{c.kind.toUpperCase()}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
        {list.length === 0 && <Text style={styles.none}>No classes</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  metaText: { color: colors.textDim, fontSize: 13 },
  toggle: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 3 },
  tBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 11 },
  days: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  day: { flex: 1, height: 44, marginHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  icon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginLeft: 4 },
  time: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  title: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 2 },
  sub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  recess: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  recessText: { color: colors.textDim, fontSize: 12, marginHorizontal: 10 },
  none: { color: colors.textDim, textAlign: 'center', marginTop: 40 },
});
