import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { events, status, range, label, typeColor } from '../constants/calendar';

export default function UpcomingDates() {
  const [now, setNow] = useState(new Date());
  useFocusEffect(useCallback(() => { setNow(new Date()); }, []));

  const list = events.filter((e) => status(e, now).state !== 'done').slice(0, 2);
  if (list.length === 0) return null;

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.h}>UPCOMING DATES</Text>
      <View style={s.box}>
        {list.map((e, i) => (
          <View key={e.title + e.start} style={[s.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={[s.bar, { backgroundColor: typeColor[e.type] }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={1}>{e.title}</Text>
              <Text style={s.date}>{range(e)}</Text>
            </View>
            <Text style={[s.chip, { color: typeColor[e.type] }]}>{label(e, now)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  h: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginBottom: 8 },
  box: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  bar: { width: 4, height: 32, borderRadius: 2, marginRight: 12 },
  title: { color: colors.text, fontSize: 14, fontWeight: '700' },
  date: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  chip: { fontSize: 12, fontWeight: '800', marginLeft: 8, maxWidth: 110, textAlign: 'right' },
});
