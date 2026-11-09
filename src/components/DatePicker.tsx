import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { MONTHS, monthGrid, ymd, parseYmd } from '../utils/dates';

type Props = { visible: boolean; value: string | null; onPick: (v: string) => void; onClose: () => void };

export default function DatePicker({ visible, value, onPick, onClose }: Props) {
  const base = value ? parseYmd(value) : new Date();
  const [year, setYear] = useState(base.getFullYear());
  const [month, setMonth] = useState(base.getMonth());

  useEffect(() => {
    if (visible) {
      const b = value ? parseYmd(value) : new Date();
      setYear(b.getFullYear());
      setMonth(b.getMonth());
    }
  }, [visible]);

  function move(n: number) {
    const d = new Date(year, month + n, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const today = ymd(new Date());
  const weeks = monthGrid(year, month);
  const key = (d: number) => year + '-' + (month + 1 < 10 ? '0' : '') + (month + 1) + '-' + (d < 10 ? '0' : '') + d;
  const plus = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.wrap}>
        <View style={s.box}>
          <View style={s.head}>
            <TouchableOpacity onPress={() => move(-1)} style={s.nav}><Ionicons name="chevron-back" size={22} color={colors.text} /></TouchableOpacity>
            <Text style={s.month}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={() => move(1)} style={s.nav}><Ionicons name="chevron-forward" size={22} color={colors.text} /></TouchableOpacity>
          </View>
          <View style={s.row}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => (<Text key={i} style={s.dow}>{x}</Text>))}
          </View>
          {weeks.map((w, i) => (
            <View key={i} style={s.row}>
              {w.map((d, j) => {
                if (d === null) return <View key={j} style={s.cell} />;
                const k = key(d);
                const sel = value === k;
                return (
                  <TouchableOpacity key={j} style={s.cell} onPress={() => onPick(k)}>
                    <View style={[s.day, sel && { backgroundColor: colors.accent }, !sel && k === today && { borderWidth: 1, borderColor: colors.accent }]}>
                      <Text style={{ color: sel ? '#fff' : colors.text, fontWeight: sel ? '800' : '500' }}>{d}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <View style={s.quick}>
            <TouchableOpacity style={s.q} onPress={() => onPick(plus(0))}><Text style={s.qt}>Today</Text></TouchableOpacity>
            <TouchableOpacity style={s.q} onPress={() => onPick(plus(1))}><Text style={s.qt}>Tomorrow</Text></TouchableOpacity>
            <TouchableOpacity style={s.q} onPress={() => onPick(plus(7))}><Text style={s.qt}>+1 week</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={s.cancel} onPress={onClose}><Text style={{ color: colors.textDim, fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: colors.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  nav: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  month: { color: colors.text, fontSize: 17, fontWeight: '800' },
  row: { flexDirection: 'row' },
  dow: { flex: 1, textAlign: 'center', color: colors.textDim, fontSize: 12, fontWeight: '700', paddingVertical: 6 },
  cell: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  quick: { flexDirection: 'row', marginTop: 10 },
  q: { flex: 1, height: 38, marginHorizontal: 3, borderRadius: 10, backgroundColor: '#1E1E2A', alignItems: 'center', justifyContent: 'center' },
  qt: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  cancel: { alignItems: 'center', paddingTop: 14, paddingBottom: 4 },
});
