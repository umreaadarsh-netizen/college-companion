import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { classesFor, nextClass, startMin, endMin, fmt, titleOf, subjectColor } from '../utils/schedule';
import { useNow } from '../utils/useNow';

// every class still to come today, after the one already shown as "next"
export default function LaterToday() {
  const { batch, now } = useNow();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nxt = nextClass(batch, now);
  const shown = nxt && nxt.offset === 0 ? nxt.item : null;
  const list = classesFor(now.getDay(), batch).filter((c) => c !== shown && startMin(c) > nowMin);
  if (list.length === 0) return null;

  return (
    <View style={s.wrap}>
      <Text style={s.h}>LATER TODAY</Text>
      <View style={s.box}>
        {list.map((c, i) => {
          const prev = i > 0 ? list[i - 1] : shown;
          // lunch break sits between the classes before 12:30 and the ones from 1:15
          const lunch = prev && endMin(prev) <= 750 && startMin(c) >= 795;
          return (
            <View key={c.start + '-' + (c.batch || 'all')}>
              {lunch && (
                <View style={s.lunch}>
                  <View style={s.line} />
                  <Text style={s.lunchText}>Lunch break</Text>
                  <View style={s.line} />
                </View>
              )}
              <View style={[s.row, i > 0 && !lunch && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={[s.dot, { backgroundColor: subjectColor(c.subject) }]} />
                <Text style={s.time}>{fmt(startMin(c))}</Text>
                <Text style={s.title} numberOfLines={1}>{titleOf(c)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 20 },
  h: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginBottom: 8 },
  box: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  time: { color: colors.textDim, fontSize: 12, width: 72 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  lunch: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  lunchText: { color: colors.textDim, fontSize: 11, marginHorizontal: 10 },
});
