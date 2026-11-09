import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { MONTHS, prettyDate, ymd } from '../../utils/dates';
import DatePicker from '../../components/DatePicker';
import { Entry, OUT_CATS, IN_CATS, uid, loadEntries, saveEntries, loadBudget, saveBudget, money, catOf } from './store';

type Form = { id: string | null; type: 'out' | 'in'; amount: string; cat: string; note: string; date: string };

export default function ExpensesView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [items, setItems] = useState<Entry[]>([]);
  const [budget, setBudget] = useState(0);
  const [form, setForm] = useState<Form | null>(null);
  const [pickDate, setPickDate] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetText, setBudgetText] = useState('');

  useEffect(() => {
    loadEntries().then(setItems);
    loadBudget().then(setBudget);
  }, []);

  const upd = (e: Entry[]) => { setItems(e); saveEntries(e); };

  function move(n: number) {
    const d = new Date(year, month + n, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const prefix = year + '-' + (month + 1 < 10 ? '0' : '') + (month + 1);
  const monthItems = items.filter((e) => e.date.indexOf(prefix) === 0).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const income = monthItems.filter((e) => e.type === 'in').reduce((s, e) => s + e.amount, 0);
  const spent = monthItems.filter((e) => e.type === 'out').reduce((s, e) => s + e.amount, 0);
  const balance = income - spent;

  const byCat: Record<string, number> = {};
  monthItems.filter((e) => e.type === 'out').forEach((e) => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
  const catRows = Object.keys(byCat).map((n) => ({ n, v: byCat[n] })).sort((a, b) => b.v - a.v);

  function openNew() {
    const today = ymd(new Date());
    const inThisMonth = today.indexOf(prefix) === 0;
    setForm({ id: null, type: 'out', amount: '', cat: 'Food', note: '', date: inThisMonth ? today : prefix + '-01' });
  }
  function openEdit(e: Entry) {
    setForm({ id: e.id, type: e.type, amount: String(e.amount), cat: e.cat, note: e.note, date: e.date });
  }

  function saveForm() {
    if (!form) return;
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Enter an amount'); return; }
    const entry: Entry = { id: form.id || uid(), type: form.type, amount, cat: form.cat, note: form.note.trim(), date: form.date };
    if (form.id) upd(items.map((x) => (x.id === form.id ? entry : x)));
    else upd([entry, ...items]);
    setForm(null);
  }

  function remove() {
    if (!form || !form.id) return;
    const id = form.id;
    Alert.alert('Delete this entry?', 'It will be removed from your records.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { upd(items.filter((x) => x.id !== id)); setForm(null); } },
    ]);
  }

  function setType(t: 'out' | 'in') {
    if (!form) return;
    setForm({ ...form, type: t, cat: t === 'out' ? 'Food' : 'Pocket money' });
  }

  function saveBudgetText() {
    const v = parseFloat(budgetText);
    const b = isNaN(v) || v < 0 ? 0 : v;
    setBudget(b);
    saveBudget(b);
    setBudgetOpen(false);
  }

  const usedPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const over = budget > 0 && spent > budget;

  // group entries by date
  const dates: string[] = [];
  monthItems.forEach((e) => { if (dates.indexOf(e.date) < 0) dates.push(e.date); });

  const cats = form && form.type === 'in' ? IN_CATS : OUT_CATS;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={s.monthRow}>
          <TouchableOpacity onPress={() => move(-1)} style={s.nav}><Ionicons name="chevron-back" size={22} color={colors.text} /></TouchableOpacity>
          <Text style={s.month}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={() => move(1)} style={s.nav}><Ionicons name="chevron-forward" size={22} color={colors.text} /></TouchableOpacity>
        </View>

        <View style={s.summary}>
          <Text style={s.sLabel}>BALANCE</Text>
          <Text style={[s.sBal, balance < 0 && { color: '#FFB4B4' }]}>{money(balance)}</Text>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.sSmall}>Income</Text>
              <Text style={s.sVal}>{money(income)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sSmall}>Spent</Text>
              <Text style={s.sVal}>{money(spent)}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.85} style={s.budget} onPress={() => { setBudgetText(budget > 0 ? String(budget) : ''); setBudgetOpen(true); }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="speedometer-outline" size={20} color={over ? '#FF5252' : colors.accent} />
            <Text style={s.bTitle}>{budget > 0 ? 'Monthly budget ' + money(budget) : 'Set a monthly budget'}</Text>
            <Ionicons name="create-outline" size={18} color={colors.textDim} />
          </View>
          {budget > 0 && (
            <View>
              <View style={s.barBg}><View style={[s.barFill, { width: usedPct + '%', backgroundColor: over ? '#FF5252' : usedPct > 80 ? '#FFC400' : '#00E676' }]} /></View>
              <Text style={[s.bSub, over && { color: '#FF5252' }]}>
                {over ? 'Over budget by ' + money(spent - budget) : money(budget - spent) + ' left this month'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {catRows.length > 0 && (
          <View style={s.box}>
            <Text style={s.group}>WHERE IT WENT</Text>
            {catRows.map((r) => {
              const c = catOf('out', r.n);
              return (
                <View key={r.n} style={s.catRow}>
                  <View style={[s.catIcon, { backgroundColor: c.c + '26' }]}><Ionicons name={c.icon as any} size={16} color={c.c} /></View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={s.catName}>{r.n}</Text>
                      <Text style={s.catVal}>{money(r.v)}</Text>
                    </View>
                    <View style={s.barBg}><View style={[s.barFill, { width: (spent > 0 ? (r.v / spent) * 100 : 0) + '%', backgroundColor: c.c }]} /></View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {monthItems.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="wallet-outline" size={36} color={colors.textDim} />
            <Text style={s.emptyText}>Nothing recorded this month</Text>
            <Text style={s.emptySub}>Tap + to add money in or out</Text>
          </View>
        )}

        {dates.map((d) => (
          <View key={d} style={{ marginTop: 14 }}>
            <Text style={s.group}>{prettyDate(d).toUpperCase()}</Text>
            {monthItems.filter((e) => e.date === d).map((e) => {
              const c = catOf(e.type, e.cat);
              return (
                <TouchableOpacity key={e.id} activeOpacity={0.85} style={s.entry} onPress={() => openEdit(e)}>
                  <View style={[s.eIcon, { backgroundColor: c.c + '26' }]}><Ionicons name={c.icon as any} size={20} color={c.c} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.eTitle}>{e.cat}</Text>
                    {e.note !== '' && <Text style={s.eNote} numberOfLines={1}>{e.note}</Text>}
                  </View>
                  <Text style={[s.eAmt, { color: e.type === 'in' ? '#00E676' : colors.text }]}>{e.type === 'in' ? '+' : '-'}{money(e.amount)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity activeOpacity={0.85} style={s.fab} onPress={openNew}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* add / edit */}
      <Modal visible={form !== null} transparent animationType="slide" onRequestClose={() => setForm(null)}>
        <View style={s.sheetWrap}>
          <View style={s.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={s.typeRow}>
                {(['out', 'in'] as const).map((t) => (
                  <TouchableOpacity key={t} onPress={() => setType(t)} style={[s.typeBtn, form && form.type === t && { backgroundColor: t === 'out' ? '#FF5252' : '#00C853' }]}>
                    <Text style={{ color: form && form.type === t ? '#fff' : colors.textDim, fontWeight: '800' }}>{t === 'out' ? 'Expense' : 'Income'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Amount</Text>
              <View style={s.amtBox}>
                <Text style={s.rupee}>{'\u20B9'}</Text>
                <TextInput style={s.amtIn} value={form ? form.amount : ''} onChangeText={(t) => form && setForm({ ...form, amount: t })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textDim} autoFocus={!!form && !form.id} />
              </View>

              <Text style={s.label}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {cats.map((c) => {
                  const on = form && form.cat === c.n;
                  return (
                    <TouchableOpacity key={c.n} onPress={() => form && setForm({ ...form, cat: c.n })} style={[s.catChip, on && { backgroundColor: c.c, borderColor: c.c }]}>
                      <Ionicons name={c.icon as any} size={15} color={on ? '#fff' : c.c} />
                      <Text style={{ color: on ? '#fff' : colors.text, fontWeight: '700', marginLeft: 6, fontSize: 13 }}>{c.n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.label}>Date</Text>
              <TouchableOpacity style={s.dateBtn} onPress={() => setPickDate(true)}>
                <Ionicons name="calendar-outline" size={20} color={colors.accent} />
                <Text style={s.dateText}>{form ? prettyDate(form.date) : ''}</Text>
              </TouchableOpacity>

              <Text style={s.label}>Note (optional)</Text>
              <TextInput style={s.input} value={form ? form.note : ''} onChangeText={(t) => form && setForm({ ...form, note: t })} placeholder="e.g. Canteen lunch" placeholderTextColor={colors.textDim} />

              <View style={{ flexDirection: 'row', marginTop: 18 }}>
                {form && form.id ? (
                  <TouchableOpacity style={[s.btn, { backgroundColor: '#3A1515', flex: 0, width: 56 }]} onPress={remove}>
                    <Ionicons name="trash" size={20} color="#FF5252" />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={[s.btn, { backgroundColor: colors.border, marginLeft: form && form.id ? 10 : 0 }]} onPress={() => setForm(null)}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, { backgroundColor: colors.accent, marginLeft: 10 }]} onPress={saveForm}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DatePicker visible={pickDate} value={form ? form.date : null} onClose={() => setPickDate(false)} onPick={(v) => { if (form) setForm({ ...form, date: v }); setPickDate(false); }} />

      {/* budget */}
      <Modal visible={budgetOpen} transparent animationType="fade" onRequestClose={() => setBudgetOpen(false)}>
        <View style={s.dialogWrap}>
          <View style={s.dialog}>
            <Text style={s.dTitle}>Monthly budget</Text>
            <Text style={s.dSub}>How much do you want to spend per month? Enter 0 to remove it.</Text>
            <View style={s.amtBox}>
              <Text style={s.rupee}>{'\u20B9'}</Text>
              <TextInput style={s.amtIn} value={budgetText} onChangeText={setBudgetText} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textDim} autoFocus />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <TouchableOpacity style={[s.btn, { backgroundColor: colors.border }]} onPress={() => setBudgetOpen(false)}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { backgroundColor: colors.accent, marginLeft: 10 }]} onPress={saveBudgetText}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  nav: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  month: { color: colors.text, fontSize: 18, fontWeight: '800' },
  summary: { backgroundColor: colors.accent, borderRadius: 20, padding: 20 },
  sLabel: { color: '#D6E4FF', fontSize: 12, letterSpacing: 1.3, fontWeight: '700' },
  sBal: { color: '#fff', fontSize: 38, fontWeight: '800', marginTop: 2 },
  sSmall: { color: '#D6E4FF', fontSize: 12 },
  sVal: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 2 },
  budget: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 12 },
  bTitle: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700', marginLeft: 10 },
  bSub: { color: colors.textDim, fontSize: 12, marginTop: 8 },
  barBg: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden', marginTop: 10 },
  barFill: { height: 8, borderRadius: 4 },
  box: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 12 },
  group: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginBottom: 8 },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  catIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  catVal: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 10 },
  emptySub: { color: colors.textDim, fontSize: 13, marginTop: 4 },
  entry: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8 },
  eIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  eTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  eNote: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  eAmt: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  sheetWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  typeRow: { flexDirection: 'row', backgroundColor: '#1E1E2A', borderRadius: 14, padding: 4 },
  typeBtn: { flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  amtBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E2A', borderRadius: 14, paddingHorizontal: 14 },
  rupee: { color: colors.textDim, fontSize: 26, fontWeight: '700', marginRight: 8 },
  amtIn: { flex: 1, color: colors.text, fontSize: 28, fontWeight: '800', height: 56 },
  catChip: { flexDirection: 'row', alignItems: 'center', height: 38, paddingHorizontal: 12, marginRight: 8, marginBottom: 8, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: '#1E1E2A' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E2A', borderRadius: 12, height: 46, paddingHorizontal: 14 },
  dateText: { color: colors.text, fontSize: 16, fontWeight: '700', marginLeft: 10 },
  input: { backgroundColor: '#1E1E2A', color: colors.text, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 16 },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dialogWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
  dTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  dSub: { color: colors.textDim, fontSize: 13, marginTop: 4, marginBottom: 12, lineHeight: 18 },
});
