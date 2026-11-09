import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { daysFromToday } from '../utils/dates';
import { Assignment, loadAssignments, dueLabel, dueColor } from '../features/assignments/store';

export default function DueCard() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<Assignment[]>([]);
  useFocusEffect(useCallback(() => { loadAssignments().then(setItems); }, []));

  const pending = items.filter((x) => !x.done).sort((a, b) => (a.due < b.due ? -1 : 1));
  const list = pending.slice(0, 2);
  const open = () => nav.navigate('Academics', { open: 'assignments' });

  return (
    <View style={{ marginBottom: 20 }}>
      <View style={s.headRow}>
        <Text style={s.h}>ASSIGNMENTS DUE</Text>
        {pending.length > 2 && (
          <TouchableOpacity onPress={open}><Text style={s.more}>See all {pending.length}</Text></TouchableOpacity>
        )}
      </View>
      <View style={s.box}>
        {list.length === 0 ? (
          <TouchableOpacity activeOpacity={0.8} onPress={open} style={s.empty}>
            <Ionicons name={items.length === 0 ? 'add-circle-outline' : 'checkmark-done'} size={20} color={items.length === 0 ? colors.accent : '#00E676'} />
            <Text style={s.emptyText}>{items.length === 0 ? 'Add your first assignment' : 'Nothing pending. Nice!'}</Text>
          </TouchableOpacity>
        ) : (
          list.map((a, i) => {
            const days = daysFromToday(a.due);
            const col = dueColor(days);
            return (
              <TouchableOpacity key={a.id} activeOpacity={0.8} onPress={open} style={[s.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={[s.bar, { backgroundColor: col }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.title} numberOfLines={1}>{a.title}</Text>
                  <Text style={s.sub}>{a.subject}  |  {a.kind}</Text>
                </View>
                <Text style={[s.chip, { color: col }]}>{dueLabel(days)}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  h: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1.3 },
  more: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  box: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  bar: { width: 4, height: 32, borderRadius: 2, marginRight: 12 },
  title: { color: colors.text, fontSize: 14, fontWeight: '700' },
  sub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  chip: { fontSize: 12, fontWeight: '800', marginLeft: 8 },
  empty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18 },
  emptyText: { color: colors.textDim, fontSize: 14, marginLeft: 10 },
});
