import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { nextClass, startMin, endMin, fmt, dur, titleOf, subjectColor, subjectIcon } from '../utils/schedule';
import { useNow } from '../utils/useNow';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function NextClassCard() {
  const { batch, now } = useNow();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nxt = nextClass(batch, now);
  if (!nxt) return null;

  const c = nxt.item;
  const col = subjectColor(c.subject);
  let when = '';
  if (nxt.offset === 0) when = nxt.ongoing ? 'Ends in ' + dur(endMin(c) - nowMin) : 'Starts in ' + dur(startMin(c) - nowMin);
  else if (nxt.offset === 1) when = 'Tomorrow, ' + fmt(startMin(c));
  else when = DAYS[nxt.day] + ', ' + fmt(startMin(c));

  return (
    <View style={[s.card, { backgroundColor: col + '1A', borderColor: col + '66' }]}>
      <View style={s.top}>
        <View style={[s.pill, { backgroundColor: col + '33' }]}>
          <Text style={[s.pillText, { color: col }]}>{nxt.ongoing ? 'CLASS NOW' : 'NEXT CLASS'}</Text>
        </View>
        <Text style={[s.when, { color: col }]}>{when}</Text>
      </View>
      <View style={s.mid}>
        <View style={[s.icon, { backgroundColor: col + '33' }]}>
          <Ionicons name={subjectIcon(c.subject) as any} size={28} color={col} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{titleOf(c)}</Text>
          <Text style={s.sub}>{fmt(startMin(c))} - {fmt(endMin(c))}  |  Room {c.room}</Text>
          <Text style={s.sub} numberOfLines={1}>{c.teacher}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1.5, padding: 16, marginBottom: 16 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  pill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  when: { fontSize: 13, fontWeight: '800' },
  mid: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 13, marginTop: 3 },
});
