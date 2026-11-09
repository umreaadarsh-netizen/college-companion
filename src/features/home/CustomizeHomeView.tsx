import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Item, SECTIONS, defaultLayout, loadLayout, saveLayout } from '../../utils/homeLayout';

export default function CustomizeHomeView() {
  const [layout, setLayout] = useState<Item[]>(defaultLayout);

  useEffect(() => { loadLayout().then(setLayout); }, []);

  const apply = (l: Item[]) => { setLayout(l); saveLayout(l); };

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= layout.length) return;
    const next = layout.slice();
    const t = next[i];
    next[i] = next[j];
    next[j] = t;
    apply(next);
  }

  function toggle(i: number, on: boolean) {
    apply(layout.map((x, k) => (k === i ? { ...x, on } : x)));
  }

  const shown = layout.filter((x) => x.on).length;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
      <Text style={s.intro}>
        Switch sections on or off and use the arrows to change their order. Your name, college and roll number always stay at the top of Home.
      </Text>

      {layout.map((it, i) => {
        const def = SECTIONS.find((x) => x.id === it.id)!;
        return (
          <View key={it.id} style={[s.card, !it.on && { opacity: 0.6 }]}>
            <View style={s.order}><Text style={s.orderText}>{i + 1}</Text></View>
            <View style={[s.icon, { backgroundColor: def.color + '26' }]}>
              <Ionicons name={def.icon as any} size={22} color={def.color} />
            </View>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <Text style={s.title}>{def.title}</Text>
              <Text style={s.sub} numberOfLines={2}>{def.sub}</Text>
            </View>
            <View style={s.arrows}>
              <TouchableOpacity disabled={i === 0} onPress={() => move(i, -1)} style={[s.arrow, i === 0 && { opacity: 0.25 }]} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="chevron-up" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity disabled={i === layout.length - 1} onPress={() => move(i, 1)} style={[s.arrow, i === layout.length - 1 && { opacity: 0.25 }]} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="chevron-down" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Switch
              value={it.on}
              onValueChange={(v) => toggle(i, v)}
              trackColor={{ false: '#2A2A38', true: colors.accent + '99' }}
              thumbColor={it.on ? colors.accent : '#8E8E9A'}
            />
          </View>
        );
      })}

      <Text style={s.count}>{shown} of {layout.length} sections showing on Home</Text>

      <TouchableOpacity style={s.reset} onPress={() => apply(defaultLayout)}>
        <Ionicons name="refresh" size={18} color={colors.textDim} />
        <Text style={s.resetText}>Reset to default</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  intro: { color: colors.textDim, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10 },
  order: { width: 22, alignItems: 'center', marginRight: 6 },
  orderText: { color: colors.textDim, fontSize: 13, fontWeight: '800' },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  sub: { color: colors.textDim, fontSize: 11.5, marginTop: 2, lineHeight: 15 },
  arrows: { marginRight: 6 },
  arrow: { width: 32, height: 28, borderRadius: 8, backgroundColor: '#1E1E2A', alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  count: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 8 },
  reset: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginTop: 14 },
  resetText: { color: colors.textDim, fontWeight: '700', marginLeft: 8 },
});
