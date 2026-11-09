import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const CHIPS = [
  { l: 'Explain a topic', p: 'Explain this topic simply: ' },
  { l: 'Solve a problem', p: 'Help me solve this step by step: ' },
  { l: 'Check my C code', p: 'Why is my C code not working?\n\n' },
];

export default function CP9Card() {
  const nav = useNavigation<any>();
  return (
    <View style={s.card}>
      <TouchableOpacity activeOpacity={0.85} style={s.top} onPress={() => nav.navigate('CP9')}>
        <View style={s.logo}><Ionicons name="sparkles" size={24} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>CP9</Text>
          <Text style={s.sub}>Your AI study assistant. Ask anything.</Text>
        </View>
        <Ionicons name="arrow-forward-circle" size={30} color="#B39DFF" />
      </TouchableOpacity>
      <View style={s.chips}>
        {CHIPS.map((c) => (
          <TouchableOpacity key={c.l} style={s.chip} activeOpacity={0.8} onPress={() => nav.navigate('CP9', { prompt: c.p, stamp: Date.now() })}>
            <Text style={s.chipText}>{c.l}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#1A1530', borderRadius: 22, borderWidth: 1.5, borderColor: '#5B3FD466', padding: 14, marginBottom: 16 },
  top: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#6C4CF0', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  name: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  sub: { color: '#B8B0D9', fontSize: 13, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  chip: { backgroundColor: '#2A2250', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 4 },
  chipText: { color: '#D8CFFF', fontSize: 12, fontWeight: '700' },
});
