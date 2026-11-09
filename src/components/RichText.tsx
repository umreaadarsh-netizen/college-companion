import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { colors } from '../theme/colors';

const mono = Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' });

// small markdown renderer: code blocks, headings, bullets, **bold**, `code`
function inline(text: string, base: any, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.length > 4 && p.indexOf('**') === 0 && p.lastIndexOf('**') === p.length - 2) {
      return <Text key={keyPrefix + i} style={[base, { fontWeight: '800' }]}>{p.slice(2, -2)}</Text>;
    }
    if (p.length > 2 && p.charAt(0) === '`' && p.charAt(p.length - 1) === '`') {
      return <Text key={keyPrefix + i} style={[base, s.inlineCode]}>{p.slice(1, -1)}</Text>;
    }
    return <Text key={keyPrefix + i} style={base}>{p}</Text>;
  });
}

export default function RichText({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().indexOf('```') === 0) {
      const code: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim().indexOf('```') !== 0) { code.push(lines[i]); i++; }
      i++;
      out.push(
        <ScrollView key={'c' + k++} horizontal showsHorizontalScrollIndicator={false} style={s.codeBox}>
          <Text style={s.code} selectable>{code.join('\n')}</Text>
        </ScrollView>
      );
      continue;
    }

    if (line.trim() === '') { out.push(<View key={'g' + k++} style={{ height: 6 }} />); i++; continue; }

    const h = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (h) {
      out.push(<Text key={'h' + k++} style={s.heading}>{inline(h[1], s.heading, 'h' + k)}</Text>);
      i++;
      continue;
    }

    const b = line.match(/^(\s*)([-*\u2022]|\d+[.)])\s+(.*)$/);
    if (b) {
      const indent = Math.min(2, Math.floor(b[1].length / 2));
      const marker = /\d/.test(b[2]) ? b[2] : '\u2022';
      out.push(
        <View key={'b' + k++} style={[s.bulletRow, { marginLeft: indent * 14 }]}>
          <Text style={s.bullet}>{marker}</Text>
          <Text style={s.body}>{inline(b[3], s.body, 'b' + k)}</Text>
        </View>
      );
      i++;
      continue;
    }

    out.push(<Text key={'p' + k++} style={s.body} selectable>{inline(line, s.body, 'p' + k)}</Text>);
    i++;
  }
  return <View>{out}</View>;
}

const s = StyleSheet.create({
  body: { color: colors.text, fontSize: 15, lineHeight: 22, flexShrink: 1 },
  heading: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 6, marginBottom: 2 },
  bulletRow: { flexDirection: 'row', marginVertical: 2 },
  bullet: { color: colors.textDim, fontSize: 15, lineHeight: 22, width: 22 },
  inlineCode: { fontFamily: mono, backgroundColor: '#24242F', color: '#A5D6A7' },
  codeBox: { backgroundColor: '#0D0D14', borderRadius: 10, padding: 12, marginVertical: 6 },
  code: { color: '#A5D6A7', fontFamily: mono, fontSize: 12.5, lineHeight: 19 },
});
