import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../theme/colors';
import RichText from '../components/RichText';
import { loadProfile } from '../utils/profile';
import { Msg, getKey, setKey, clearKey, listModels, pickDefault, ask } from '../utils/gemini';

type UiMsg = { id: string; role: 'user' | 'model'; text: string; hasImage?: boolean; thumb?: string; error?: boolean };
type Pending = { uri: string; mime: string; data: string };
type Settings = { model: string; style: 'short' | 'detailed' };

const CHAT_KEY = 'cp9_chat_v1';
const SET_KEY = 'cp9_settings_v1';
const PURPLE = '#6C4CF0';
const uid = () => Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

const SUGGEST = [
  { l: 'Explain Newton\'s rings in simple words', send: true },
  { l: 'Quiz me: 5 MCQs on Maths', send: true },
  { l: 'Make me a 3-day revision plan', send: true },
  { l: 'Help me write a C program for: ', send: false },
];

async function buildSystem(style: 'short' | 'detailed') {
  const p = await loadProfile();
  return [
    'You are CP9, the personal AI study assistant inside a college app. Your user is ' + p.name + ', a first-semester student of ' + p.branch + ' at ' + p.college + ' (Jabalpur, India).',
    'Their subjects: Engineering Physics (BT-201), Engineering Mathematics-I (BT-102), Basic Mechanical Engineering (BT-203), Basic Civil Engineering and Mechanics (BT-204), and Programming for Problem Solving in C (BT-205).',
    'Today is ' + new Date().toDateString() + '.',
    'Be friendly, clear and encouraging, like a good senior who explains well. Use simple English. Use short examples.',
    style === 'short'
      ? 'Keep answers short and to the point, under about 150 words, unless the student asks for more.'
      : 'Explain step by step with a worked example when it helps.',
    'For maths and physics problems, show the method step by step so the student understands it, and state the final answer clearly.',
    'For C programs, give clean, correct code in a code block, then explain it briefly.',
    'Write math in plain text or unicode (for example x^2, sqrt(x), pi). Never use LaTeX or dollar signs.',
    'If a photo is shared, read it carefully first. If you cannot read something, say so instead of guessing.',
    'If you are not sure about something, say so honestly.',
  ].join('\n');
}

export default function CP9Screen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const scroll = useRef<any>(null);

  const [key, setKeyState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>({ model: 'gemini-3.1-flash-lite', style: 'short' });
  const [msgs, setMsgs] = useState<UiMsg[]>([]);
  const [input, setInput] = useState('');
  const [img, setImg] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const k = await getKey();
      setKeyState(k);
      try {
        const st = await AsyncStorage.getItem(SET_KEY);
        if (st) setSettings((cur) => ({ ...cur, ...JSON.parse(st) }));
        const ch = await AsyncStorage.getItem(CHAT_KEY);
        if (ch) setMsgs(JSON.parse(ch));
      } catch {}
      setReady(true);
    })();
  }, []);

  // a Home chip can open CP9 with a ready-made prompt
  const stamp = route.params ? route.params.stamp : undefined;
  useFocusEffect(
    useCallback(() => {
      const p = route.params && route.params.prompt;
      if (p) {
        setInput(p);
        setShowSettings(false);
        nav.setParams({ prompt: undefined });
      }
    }, [stamp])
  );

  const saveSettings = (s: Settings) => { setSettings(s); AsyncStorage.setItem(SET_KEY, JSON.stringify(s)).catch(() => {}); };
  const persist = (m: UiMsg[]) => {
    const keep = m.filter((x) => !x.error).slice(-60).map((x) => ({ id: x.id, role: x.role, text: x.text, hasImage: x.hasImage }));
    AsyncStorage.setItem(CHAT_KEY, JSON.stringify(keep)).catch(() => {});
  };

  // ---------- key and models ----------
  async function refreshModels(k: string, keepCurrent: boolean) {
    const list = await listModels(k);
    setModels(list);
    if (list.length === 0) throw new Error('No chat models were found for this key.');
    if (!keepCurrent || list.indexOf(settings.model) < 0) saveSettings({ ...settings, model: pickDefault(list) });
  }

  async function saveKey() {
    const k = keyInput.trim();
    if (k.length < 20) { setKeyError('That does not look like a full key. Copy it again from Google AI Studio.'); return; }
    setKeyBusy(true);
    setKeyError('');
    try {
      await refreshModels(k, false);
      await setKey(k);
      setKeyState(k);
      setKeyInput('');
    } catch (e: any) {
      setKeyError(e && e.message ? e.message : 'Could not check the key.');
    }
    setKeyBusy(false);
  }

  function removeKey() {
    Alert.alert('Remove your key?', 'CP9 will stop working until you add a key again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await clearKey(); setKeyState(null); setModels([]); } },
    ]);
  }

  async function reloadModels() {
    if (!key) return;
    setKeyBusy(true);
    setKeyError('');
    try { await refreshModels(key, true); } catch (e: any) { setKeyError(e && e.message ? e.message : 'Could not load models.'); }
    setKeyBusy(false);
  }

  // ---------- photo ----------
  async function takePhoto() {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) { Alert.alert('Camera permission needed', 'Allow camera access to take a photo.'); return; }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true });
    grab(r);
  }
  async function pickPhoto() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
    grab(r);
  }
  function grab(r: ImagePicker.ImagePickerResult) {
    if (r.canceled || !r.assets || !r.assets.length) return;
    const a = r.assets[0];
    if (!a.base64) { Alert.alert('Could not read that photo'); return; }
    setImg({ uri: a.uri, mime: a.mimeType || 'image/jpeg', data: a.base64 });
  }
  function addPhoto() {
    Alert.alert('Add a photo', 'Show CP9 a question, a diagram or your code.', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Gallery', onPress: pickPhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // ---------- chat ----------
  async function send(preset?: string) {
    const t = (preset !== undefined ? preset : input).trim();
    if ((!t && !img) || busy) return;
    if (!key) { setShowSettings(true); return; }

    const mine: UiMsg = { id: uid(), role: 'user', text: t, hasImage: !!img, thumb: img ? img.uri : undefined };
    const sendImg = img;
    const next = msgs.concat([mine]);
    setMsgs(next);
    setInput('');
    setImg(null);
    setBusy(true);

    try {
      const usable = next.filter((m) => !m.error).slice(-14);
      while (usable.length && usable[0].role === 'model') usable.shift();
      const hist: Msg[] = usable.map((m) => ({
        role: m.role,
        text: m.text || (m.hasImage ? '[photo]' : ''),
        image: m.id === mine.id && sendImg ? { mime: sendImg.mime, data: sendImg.data } : undefined,
      }));
      const system = await buildSystem(settings.style);
      const answer = await ask(key, settings.model, system, hist);
      const out = next.concat([{ id: uid(), role: 'model', text: answer }]);
      setMsgs(out);
      persist(out);
    } catch (e: any) {
      setMsgs(next.concat([{ id: uid(), role: 'model', text: e && e.message ? e.message : 'Something went wrong.', error: true }]));
      persist(next);
    }
    setBusy(false);
  }

  function newChat() {
    if (msgs.length === 0) return;
    Alert.alert('Start a new chat?', 'The current conversation will be cleared.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { setMsgs([]); persist([]); } },
    ]);
  }

  async function copy(m: UiMsg) {
    await Clipboard.setStringAsync(m.text);
    setCopied(m.id);
    setTimeout(() => setCopied(null), 1500);
  }

  if (!ready) return <SafeAreaView style={s.safe} />;

  const needsKey = !key;

  // ================= SETTINGS =================
  const settingsView = (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={s.group}>GEMINI KEY</Text>
      {key ? (
        <View style={s.box}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="shield-checkmark" size={22} color="#00E676" />
            <Text style={s.keySaved}>Key saved on this phone  (ends in {key.slice(-4)})</Text>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity style={[s.smallBtn, { flex: 1 }]} onPress={() => { setKeyState(null); }}>
              <Text style={s.smallBtnText}>Replace key</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.smallBtn, { flex: 1, marginLeft: 10 }]} onPress={removeKey}>
              <Text style={[s.smallBtnText, { color: '#FF5252' }]}>Remove key</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={s.box}>
          <Text style={s.help}>1. Open Google AI Studio and make a free key.{'\n'}2. Copy it and paste it below. It is stored in your phone's encrypted storage.</Text>
          <TouchableOpacity style={s.linkBtn} onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}>
            <Ionicons name="open-outline" size={16} color={colors.accent} />
            <Text style={s.linkText}>Get a free key (aistudio.google.com)</Text>
          </TouchableOpacity>
          <TextInput
            style={s.input}
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder="Paste your Gemini key here"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <TouchableOpacity style={[s.primary, keyBusy && { opacity: 0.6 }]} disabled={keyBusy} onPress={saveKey}>
            {keyBusy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Check and save key</Text>}
          </TouchableOpacity>
        </View>
      )}
      {keyError !== '' && <Text style={s.error}>{keyError}</Text>}

      {key && (
        <View>
          <Text style={[s.group, { marginTop: 22 }]}>MODEL</Text>
          <View style={s.box}>
            <Text style={s.help}>Using: <Text style={{ color: colors.text, fontWeight: '800' }}>{settings.model}</Text>{'\n'}Flash-Lite models have the most generous free limits. Bigger Flash models are smarter but may hit the free limit sooner.</Text>
            {models.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
                {models.slice(0, 10).map((m) => (
                  <TouchableOpacity key={m} onPress={() => saveSettings({ ...settings, model: m })} style={[s.chip, settings.model === m && { backgroundColor: PURPLE, borderColor: PURPLE }]}>
                    <Text style={{ color: settings.model === m ? '#fff' : colors.text, fontSize: 12, fontWeight: '700' }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity style={[s.smallBtn, { marginTop: 12 }, keyBusy && { opacity: 0.6 }]} disabled={keyBusy} onPress={reloadModels}>
              {keyBusy ? <ActivityIndicator color={colors.accent} /> : <Text style={s.smallBtnText}>{models.length ? 'Refresh model list' : 'Show models for my key'}</Text>}
            </TouchableOpacity>
          </View>

          <Text style={[s.group, { marginTop: 22 }]}>ANSWER STYLE</Text>
          <View style={{ flexDirection: 'row' }}>
            {(['short', 'detailed'] as const).map((st) => (
              <TouchableOpacity key={st} onPress={() => saveSettings({ ...settings, style: st })} style={[s.styleBtn, settings.style === st && { backgroundColor: PURPLE, borderColor: PURPLE }]}>
                <Text style={{ color: settings.style === st ? '#fff' : colors.text, fontWeight: '800' }}>{st === 'short' ? 'Short' : 'Detailed'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.privacy}>
            What you type, and any photo you send, goes to Google's Gemini to get an answer. Do not send your Aadhaar, marksheets, passwords or other private documents. CP9 only works when you tap send, and it needs internet.
          </Text>
        </View>
      )}
    </ScrollView>
  );

  // ================= CHAT =================
  const chatView = (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 10 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scroll.current && scroll.current.scrollToEnd({ animated: true })}
      >
        {msgs.length === 0 && (
          <View style={s.hello}>
            <View style={s.bigLogo}><Ionicons name="sparkles" size={34} color="#fff" /></View>
            <Text style={s.helloTitle}>Hi, I am CP9</Text>
            <Text style={s.helloSub}>Ask me about Physics, Maths, Mechanics, Civil, BME or C programming. You can also send a photo of a question.</Text>
            {needsKey ? (
              <TouchableOpacity style={s.primary} onPress={() => setShowSettings(true)}>
                <Text style={s.primaryText}>Add your Gemini key to start</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: '100%', marginTop: 14 }}>
                {SUGGEST.map((x) => (
                  <TouchableOpacity key={x.l} style={s.suggest} activeOpacity={0.8} onPress={() => (x.send ? send(x.l) : setInput(x.l))}>
                    <Text style={s.suggestText}>{x.l}</Text>
                    <Ionicons name={x.send ? 'arrow-up-circle' : 'create-outline'} size={20} color="#B39DFF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {msgs.map((m) =>
          m.role === 'user' ? (
            <View key={m.id} style={s.userRow}>
              <View style={s.userBubble}>
                {m.thumb ? <Image source={{ uri: m.thumb }} style={s.thumb} /> : m.hasImage ? <Text style={s.photoNote}>[photo]</Text> : null}
                {m.text !== '' && <Text style={s.userText}>{m.text}</Text>}
              </View>
            </View>
          ) : (
            <View key={m.id} style={s.botRow}>
              <View style={s.botDot}><Ionicons name="sparkles" size={14} color="#fff" /></View>
              <View style={[s.botBubble, m.error && { borderColor: '#FF525266', backgroundColor: '#2A1518' }]}>
                {m.error ? <Text style={s.errText}>{m.text}</Text> : <RichText text={m.text} />}
                {m.error ? (
                  <TouchableOpacity onPress={() => setShowSettings(true)} style={s.copyBtn}>
                    <Ionicons name="settings-outline" size={15} color={colors.accent} />
                    <Text style={s.copyText}>Open settings</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => copy(m)} style={s.copyBtn}>
                    <Ionicons name={copied === m.id ? 'checkmark' : 'copy-outline'} size={15} color={copied === m.id ? '#00E676' : colors.textDim} />
                    <Text style={[s.copyText, { color: copied === m.id ? '#00E676' : colors.textDim }]}>{copied === m.id ? 'Copied' : 'Copy'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        )}

        {busy && (
          <View style={s.botRow}>
            <View style={s.botDot}><Ionicons name="sparkles" size={14} color="#fff" /></View>
            <View style={[s.botBubble, { flexDirection: 'row', alignItems: 'center' }]}>
              <ActivityIndicator size="small" color="#B39DFF" />
              <Text style={s.thinking}>CP9 is thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {img && (
        <View style={s.preview}>
          <Image source={{ uri: img.uri }} style={s.previewImg} />
          <Text style={s.previewText}>Photo ready to send</Text>
          <TouchableOpacity onPress={() => setImg(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={24} color={colors.textDim} />
          </TouchableOpacity>
        </View>
      )}

      <View style={s.inputBar}>
        <TouchableOpacity style={s.attach} onPress={addPhoto} disabled={busy}>
          <Ionicons name="camera" size={22} color={colors.textDim} />
        </TouchableOpacity>
        <TextInput
          style={s.textIn}
          value={input}
          onChangeText={setInput}
          placeholder={needsKey ? 'Add your key in settings first' : 'Ask CP9...'}
          placeholderTextColor={colors.textDim}
          multiline
          editable={!needsKey}
        />
        <TouchableOpacity style={[s.send, ((!input.trim() && !img) || busy || needsKey) && { opacity: 0.4 }]} onPress={() => send()} disabled={(!input.trim() && !img) || busy || needsKey}>
          <Ionicons name="arrow-up" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.top}>
        <TouchableOpacity onPress={() => (showSettings ? setShowSettings(false) : nav.navigate('Home'))} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={s.logo}><Ionicons name="sparkles" size={16} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{showSettings ? 'CP9 settings' : 'CP9'}</Text>
          {!showSettings && <Text style={s.model} numberOfLines={1}>{needsKey ? 'Not connected' : settings.model}</Text>}
        </View>
        {!showSettings && (
          <TouchableOpacity onPress={newChat} style={s.iconBtn}>
            <Ionicons name="create-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        {!showSettings && (
          <TouchableOpacity onPress={() => setShowSettings(true)} style={s.iconBtn}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>
      {showSettings ? settingsView : chatView}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: 6, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 32, height: 32, borderRadius: 10, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  model: { color: colors.textDim, fontSize: 11, marginTop: 1 },
  hello: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 10 },
  bigLogo: { width: 72, height: 72, borderRadius: 22, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  helloTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  helloSub: { color: colors.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 6 },
  suggest: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1530', borderRadius: 14, borderWidth: 1, borderColor: '#5B3FD455', padding: 14, marginBottom: 8 },
  suggestText: { flex: 1, color: '#D8CFFF', fontSize: 14, fontWeight: '600' },
  userRow: { alignItems: 'flex-end', marginBottom: 12 },
  userBubble: { maxWidth: '85%', backgroundColor: PURPLE, borderRadius: 18, borderBottomRightRadius: 4, padding: 12 },
  userText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  thumb: { width: 160, height: 120, borderRadius: 10, marginBottom: 8 },
  photoNote: { color: '#E6DEFF', fontSize: 13, marginBottom: 4 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  botDot: { width: 26, height: 26, borderRadius: 9, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 2 },
  botBubble: { flex: 1, backgroundColor: colors.card, borderRadius: 18, borderTopLeftRadius: 4, borderWidth: 1, borderColor: colors.border, padding: 12 },
  errText: { color: '#FFB4B4', fontSize: 14, lineHeight: 20 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start' },
  copyText: { color: colors.accent, fontSize: 12, fontWeight: '700', marginLeft: 5 },
  thinking: { color: colors.textDim, fontSize: 14, marginLeft: 10 },
  preview: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, marginHorizontal: 12, marginBottom: 6, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: colors.border },
  previewImg: { width: 44, height: 44, borderRadius: 8, marginRight: 10 },
  previewText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  attach: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1E1E2A', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  textIn: { flex: 1, maxHeight: 120, minHeight: 42, backgroundColor: '#1E1E2A', color: colors.text, borderRadius: 21, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  group: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginBottom: 8 },
  box: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 },
  help: { color: colors.textDim, fontSize: 13, lineHeight: 20 },
  keySaved: { color: colors.text, fontSize: 14, fontWeight: '600', marginLeft: 10, flex: 1 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 12 },
  linkText: { color: colors.accent, fontSize: 13, fontWeight: '700', marginLeft: 6 },
  input: { backgroundColor: '#1E1E2A', color: colors.text, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15 },
  primary: { height: 50, borderRadius: 14, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 20 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  smallBtn: { height: 42, borderRadius: 12, backgroundColor: '#1E1E2A', alignItems: 'center', justifyContent: 'center' },
  smallBtnText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  error: { color: '#FF8A8A', fontSize: 13, lineHeight: 19, marginTop: 10 },
  chip: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#1E1E2A', paddingHorizontal: 10, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  styleBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  privacy: { color: colors.textDim, fontSize: 12, lineHeight: 18, marginTop: 22 },
});
