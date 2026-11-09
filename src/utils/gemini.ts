import * as SecureStore from 'expo-secure-store';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const KEY_NAME = 'cp9_gemini_key';

export type Img = { mime: string; data: string };
export type Msg = { role: 'user' | 'model'; text: string; image?: Img };

// ---------- key (stored in the phone's encrypted storage) ----------
export async function getKey(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(KEY_NAME); } catch { return null; }
}
export async function setKey(k: string) { await SecureStore.setItemAsync(KEY_NAME, k.trim()); }
export async function clearKey() { try { await SecureStore.deleteItemAsync(KEY_NAME); } catch {} }

export class GeminiError extends Error {
  code: number;
  constructor(message: string, code: number) { super(message); this.code = code; }
}

function friendly(status: number, text: string): string {
  const t = text.toLowerCase();
  if (status === 400 && (t.indexOf('api key') >= 0 || t.indexOf('api_key') >= 0)) return 'Your Gemini key was rejected. Open CP9 settings and paste it again.';
  if (status === 401 || status === 403) return 'Your key is not allowed to use this. Check it in CP9 settings, or make a new one in Google AI Studio.';
  if (status === 404) return 'This model is not available for your key. Open CP9 settings and pick another model.';
  if (status === 429) return 'Too many requests, or the free limit is used up. Wait a minute and try again, or pick a lighter model (Flash-Lite) in settings.';
  if (status === 500 || status === 503) return 'Google is busy right now. Try again in a moment.';
  return 'Something went wrong (code ' + status + '). Try again.';
}

async function call(url: string, key: string, body?: object): Promise<any> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 60000);
  try {
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
    const raw = await res.text();
    let json: any = null;
    try { json = JSON.parse(raw); } catch {}
    if (!res.ok) {
      const msg = json && json.error && json.error.message ? String(json.error.message) : raw;
      throw new GeminiError(friendly(res.status, msg), res.status);
    }
    return json;
  } catch (e: any) {
    if (e instanceof GeminiError) throw e;
    if (e && e.name === 'AbortError') throw new GeminiError('That took too long. Check your internet and try again.', 0);
    throw new GeminiError('Could not reach Gemini. Check your internet connection.', 0);
  } finally {
    clearTimeout(timer);
  }
}

// models this key can use for chat, best guesses first
export async function listModels(key: string): Promise<string[]> {
  const j = await call(BASE + '/models?pageSize=200', key);
  const all: any[] = (j && j.models) || [];
  const names = all
    .filter((m) => (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0)
    .map((m) => String(m.name).replace('models/', ''))
    .filter((n) => n.indexOf('gemini') === 0)
    .filter((n) => !/(image|tts|embedding|robotics|live|audio|computer|native|vision|aqa)/.test(n))
    .filter((n) => n.indexOf('flash') >= 0 || n.indexOf('pro') >= 0);
  const ver = (n: string) => {
    const m = n.match(/gemini-(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
  };
  return names.sort((a, b) => {
    const la = a.indexOf('lite') >= 0 ? 1 : 0;
    const lb = b.indexOf('lite') >= 0 ? 1 : 0;
    if (la !== lb) return la - lb;
    return ver(b) - ver(a) || (a < b ? -1 : 1);
  });
}

// picks a sensible starting model: the newest Flash-Lite (most generous free limits), else the newest Flash
export function pickDefault(models: string[]): string {
  const lite = models.filter((n) => n.indexOf('flash-lite') >= 0 && n.indexOf('preview') < 0);
  const liteAny = models.filter((n) => n.indexOf('flash-lite') >= 0);
  const flash = models.filter((n) => n.indexOf('flash') >= 0);
  const pool = lite.length ? lite : liteAny.length ? liteAny : flash.length ? flash : models;
  return pool.length ? pool[0] : 'gemini-3.1-flash-lite';
}

export async function ask(key: string, model: string, system: string, history: Msg[]): Promise<string> {
  const contents = history.map((m) => {
    const parts: any[] = [];
    if (m.text) parts.push({ text: m.text });
    if (m.image) parts.push({ inlineData: { mimeType: m.image.mime, data: m.image.data } });
    if (parts.length === 0) parts.push({ text: '(empty)' });
    return { role: m.role, parts };
  });
  const j = await call(BASE + '/models/' + model + ':generateContent', key, {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
  });
  const cand = j && j.candidates && j.candidates[0];
  const parts: any[] = (cand && cand.content && cand.content.parts) || [];
  const text = parts.map((p) => (p.text ? p.text : '')).join('').trim();
  if (text) return text;
  if (j && j.promptFeedback && j.promptFeedback.blockReason) throw new GeminiError('CP9 could not answer that one. Try rephrasing it.', 0);
  if (cand && cand.finishReason === 'SAFETY') throw new GeminiError('CP9 could not answer that one. Try rephrasing it.', 0);
  throw new GeminiError('CP9 sent back an empty answer. Please try again.', 0);
}
