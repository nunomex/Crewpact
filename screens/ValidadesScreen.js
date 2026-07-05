import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Animated, PanResponder, Easing } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PELE, PELE_FONT, GUTTER } from '../data/constants';
import Icon from '../components/Icon';
import PeleSide from '../components/PeleSide';
import { t } from '../data/i18n';
import { select, success, warning } from '../data/haptics';
import { confirmDiscard } from '../data/confirmDiscard';
import { AppContext } from '../data/appContext';
import {
  validityCatalog, validityStatus, validityLabel, sortValidities, isNoExpiryType,
  fieldsForType, deriveExpiry, langRenewMonths, renewMonthsForType, medCodes, medCodeHint,
  INSTRUCTOR_KINDS, LANG_LEVELS,
} from '../data/validities';

// Ícone da pele por TIPO de documento (catálogo data/validities.js).
const TYPE_IC = { medical: 'medical', licence: 'doc', cca: 'doc', typeRating: 'plane', ir: 'gauge', lang: 'book', sep: 'shield', crm: 'fam', dg: 'alert', asec: 'restricted', faid: 'heart', passport: 'passport', instructor: 'rank' };

// Grupos do ecrã "Adicionar" (mockup validades-cartoes · ecrã 2). Filtram-se contra o catálogo
// crew-aware — grupos vazios (ex.: Qualificações na cabine) não aparecem.
const DOC_GROUPS = [
  { key: 'docs',  pt: 'Documentos',          en: 'Documents',          ids: ['medical', 'licence', 'cca', 'passport'] },
  { key: 'quals', pt: 'Qualificações',       en: 'Qualifications',     ids: ['typeRating', 'ir', 'lang', 'instructor'] },
  { key: 'recur', pt: 'Formação recorrente', en: 'Recurrent training', ids: ['sep', 'crm', 'dg', 'asec', 'faid'] },
];

// Leque da carteira (mockup validades-cartoes): slot 0 = frente (centro, ink, detalhe); os outros
// em leque (perto/longe, cima/baixo, rodados). x/y = translate; r = graus; s = escala; z = zIndex.
const SLOTS = [
  { x: -4, y: 176, r: 1,   s: 1,    z: 50 },   // 0 · ATIVO (centro, mais baixo)
  { x: 18, y: 88,  r: 7,   s: 0.9,  z: 40 },   // 1 · cima-perto (recuado)
  { x: 20, y: 264, r: -7,  s: 0.9,  z: 38 },   // 2 · baixo-perto (recuado)
  { x: 46, y: 12,  r: 13,  s: 0.85, z: 30 },   // 3 · cima-longe (recuado)
  { x: 50, y: 344, r: -13, s: 0.85, z: 28 },   // 4 · baixo-longe (recuado, desce até ao botão)
];
const slotFor = (i) => SLOTS[Math.min(Math.max(i, 0), SLOTS.length - 1)];

// "Validades & Documentos" (premium) — CARTEIRA (deck) do que expira + FORMULÁRIO RICO por tipo.
export default function ValidadesScreen({ navigation }) {
  const { validities, addValidity, updateValidity, removeValidity, isPilot, instructorRated, lang } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const insets = useSafeAreaInsets();
  const catalog = validityCatalog(isPilot, { instructorRated });

  const [editing, setEditing] = useState(null);
  const [attempted, setAttempted] = useState(false);
  const baseSnap = useRef('');
  const openWith = (obj) => { setEditing(obj); setAttempted(false); baseSnap.current = JSON.stringify(obj); };
  const requestCloseEditing = () => {
    if (editing && JSON.stringify(editing) !== baseSnap.current) { confirmDiscard(lang, () => setEditing(null)); return; }
    setEditing(null);
  };
  const backToPicker = () => {   // form → volta ao seletor de tipo (com dirty-check)
    if (editing && JSON.stringify(editing) !== baseSnap.current) { confirmDiscard(lang, () => openWith(blank(null))); return; }
    openWith(blank(null));
  };
  const blank = (type) => ({ type, d: '', m: '', y: '', number: '', note: '', aircraft: '', nationality: '', level: null, instrKind: null, limitations: [] });
  const openAdd = () => { select(); openWith(blank(null)); };   // abre no SELETOR de tipo (sem tipo escolhido)
  const openEdit = (item) => {
    select();
    const ff2 = fieldsForType(item.type);
    const src = (ff2.doneDate || ff2.level) ? item.doneDate : item.expiry;
    const p = src ? src.split('-') : ['', '', ''];
    openWith({
      id: item.id, type: item.type, d: p[2] || '', m: p[1] || '', y: p[0] || '',
      number: item.number || '', note: item.note || '', aircraft: item.aircraft || '',
      nationality: item.nationality || '', level: item.level || null, instrKind: item.instrKind || null,
      limitations: item.limitations || [],
    });
  };

  const bandColor = (b) => (b === 'valid' ? PELE.ok : b === 'expiring' ? PELE.warn : b === 'expired' ? PELE.red : PELE.ghost);
  const bandTextColor = (b) => (b === 'valid' ? PELE.ok : b === 'expiring' ? PELE.warn : b === 'expired' ? PELE.red : PELE.grey);
  const pillBgC = (b) => (b === 'valid' ? PELE.okSoft : b === 'expiring' ? PELE.warnSoft : b === 'expired' ? PELE.redSoft : PELE.soft);
  const statusShort = (st) =>
    st.band === 'reference' ? l('Ref.', 'Ref.') : st.band === 'none' ? l('Sem data', 'No date') :
    st.band === 'expired' ? l('Expirado', 'Expired') : st.band === 'expiring' ? l('A expirar', 'Expiring') : l('Válido', 'Valid');
  const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(`${iso}T00:00:00`); return isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }); };

  // Cartão da frente (ativo): número grande + 2 campos, derivados do tipo/estado.
  const cardBig = (item, st) => {
    if (st.band === 'reference') return { big: '—', unit: '' };
    if (item.type === 'lang' && item.level) return { big: String(item.level), unit: l('nível', 'level') };
    if (st.days == null) return { big: '—', unit: '' };
    return { big: String(Math.abs(st.days)), unit: l('dias', 'days') };
  };
  const cardFoot = (item, st) => {
    const rows = [];
    if (st.band === 'reference') rows.push({ k: l('Validade', 'Validity'), v: l('Não expira', 'No expiry') });
    else rows.push({ k: st.band === 'expired' ? l('Expirou', 'Expired') : l('Expira', 'Expires'), v: fmtDate(item.expiry) });
    const e2 = item.aircraft ? { k: l('Avião', 'Aircraft'), v: item.aircraft }
      : item.level ? { k: l('Nível', 'Level'), v: `ICAO ${item.level}` }
      : item.nationality ? { k: l('País', 'Country'), v: item.nationality }
      : item.number ? { k: 'Nº', v: item.number }
      : (item.limitations && item.limitations.length) ? { k: l('Limit.', 'Limit.'), v: item.limitations.join(' ') }
      : null;
    if (e2) rows.push(e2);
    return rows;
  };

  const buildISO = (d, m, y) => {
    const dd = +d, mm = +m, yy = +y;
    if (!dd || !mm || !yy || yy < 2000 || yy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    const iso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    const chk = new Date(`${iso}T00:00:00`);
    return isNaN(chk.getTime()) ? null : iso;
  };

  // ── Estado derivado do formulário (por tipo) ──
  const ff = editing ? fieldsForType(editing.type) : {};
  const isRef = !!editing && (ff.reference || (ff.level && editing.level === 6));
  const usesDone = ff.doneDate || (ff.level && editing?.level && editing.level !== 6);
  const formISO = editing ? buildISO(editing.d, editing.m, editing.y) : null;
  const renewM = editing ? (ff.level ? langRenewMonths(editing.level) : renewMonthsForType(editing.type)) : null;
  const derivedISO = usesDone && formISO && renewM ? deriveExpiry(formISO, renewM) : null;
  const finalExpiry = isRef ? null : (ff.date ? formISO : derivedISO);
  const needsLevel = ff.level && !editing?.level;
  const canSave = !!editing && !needsLevel && (isRef || !!formISO);
  const isPicking = !!editing && !editing.id && !editing.type;   // passo 1: escolher o tipo (mockup ecrã 2)

  const set = (patch) => setEditing((e) => ({ ...e, ...patch }));
  const toggleLimit = (code) => setEditing((e) => {
    const cur = e.limitations || [];
    return { ...e, limitations: cur.includes(code) ? cur.filter((x) => x !== code) : [...cur, code] };
  });

  const saveEditing = () => {
    if (!canSave) { setAttempted(true); warning(); return; }
    const clean = (v) => ((v || '').trim() || null);
    const up = (v) => { const x = (v || '').trim().toUpperCase(); return x || null; };
    const item = {
      type: editing.type, expiry: finalExpiry, doneDate: usesDone ? formISO : null,
      number: ff.number ? clean(editing.number) : null,
      nationality: ff.nationality ? up(editing.nationality) : null,
      aircraft: ff.aircraft ? up(editing.aircraft) : null,
      level: ff.level ? (editing.level || null) : null,
      instrKind: ff.instrKind ? (editing.instrKind || null) : null,
      limitations: ff.limitations && editing.limitations && editing.limitations.length ? editing.limitations : null,
      note: clean(editing.note),
    };
    if (editing.id) updateValidity(editing.id, item);
    else { addFrontRef.current = new Set(sorted.map((x) => x.id)); addValidity(item); }   // marca o "antes" → cartão novo assenta à frente
    success(); setEditing(null);
  };
  const deleteEditing = () => {
    if (!editing?.id) { setEditing(null); return; }
    warning();
    Alert.alert(l('Apagar esta validade?', 'Delete this item?'), l('Não dá para desfazer.', 'This cannot be undone.'), [
      { text: l('Cancelar', 'Cancel'), style: 'cancel' },
      { text: l('Apagar', 'Delete'), style: 'destructive', onPress: () => { removeValidity(editing.id); success(); setEditing(null); } },
    ]);
  };

  const sorted = sortValidities(validities);
  const expiringCount = sorted.filter((item) => {
    if (isNoExpiryType(item.type)) return false;
    const st = validityStatus(item.expiry);
    return st.band === 'expiring' || st.band === 'expired';
  }).length;

  // ── CARTEIRA · deck animado (arrastar ↑/↓ roda; toca no da frente = editar; noutro = trazer à frente) ──
  const anims = useRef({}).current;   // { [id]: {tx,ty,rot,sc,act} } — transforms por cartão
  const addFrontRef = useRef(null);   // ids ANTES de gravar um novo → o cartão novo entra a assentar no seu lugar
  const frontAnimRef = useRef(null);  // anim do cartão da FRENTE — lido pelo pan p/ acompanhar o dedo
  const nextDurRef = useRef(null);    // duração da PRÓXIMA animação de ordem (inserção = mais lenta)
  sorted.forEach((it, i) => { if (!anims[it.id]) { const sl = slotFor(i); const isNew = addFrontRef.current && !addFrontRef.current.has(it.id); anims[it.id] = { tx: new Animated.Value(sl.x), ty: new Animated.Value(sl.y), rot: new Animated.Value(sl.r), sc: new Animated.Value(sl.s), act: new Animated.Value(isNew ? 0 : (i === 0 ? 1 : 0)) }; } });
  const [order, setOrder] = useState(() => sortValidities(validities).map((_, i) => i));
  const applyOrder = (ord, list, animate, dur = 420) => {
    const actDur = Math.max(220, dur - 40);
    ord.forEach((cardIdx, slotIdx) => {
      const it = list[cardIdx]; if (!it || !anims[it.id]) return;
      const a = anims[it.id], sl = slotFor(slotIdx), act1 = slotIdx === 0 ? 1 : 0;
      // Ease-out cúbico (fluido, sem bounce) — como as boas apps de carteira. `act` = 0 trás → 1 frente.
      if (animate) Animated.parallel([
        Animated.timing(a.tx, { toValue: sl.x, duration: dur, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(a.ty, { toValue: sl.y, duration: dur, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(a.rot, { toValue: sl.r, duration: dur, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(a.sc, { toValue: sl.s, duration: dur, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(a.act, { toValue: act1, duration: actDur, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
      else { a.tx.setValue(sl.x); a.ty.setValue(sl.y); a.rot.setValue(sl.r); a.sc.setValue(sl.s); a.act.setValue(act1); }
    });
  };
  const sortedKey = sorted.map((x) => x.id).join('|');
  useEffect(() => {
    const beforeIds = addFrontRef.current;
    const ord = sorted.map((_, i) => i);   // ordem NATURAL: expirado → a expirar → válido → sem data (mais urgente à FRENTE)
    if (beforeIds) {
      addFrontRef.current = null;
      const nIdx = sorted.findIndex((x) => !beforeIds.has(x.id));   // o cartão acabado de gravar
      const a = nIdx >= 0 ? anims[sorted[nIdx].id] : null;
      if (a) {
        // arranque SUBTIL: o novo assenta no SEU lugar (o mais urgente fica à frente); os outros deslizam p/ os slots
        const sl = slotFor(nIdx);
        a.tx.setValue(sl.x); a.rot.setValue(sl.r); a.ty.setValue(sl.y + 8); a.sc.setValue(sl.s - 0.04); a.act.setValue(0);
        nextDurRef.current = 950;   // inserção LENTA — dá p/ ver o cartão a assentar em cima
        setOrder(ord);   // [order] → applyOrder(true): reordena suave; o novo assenta no lugar certo
        return;
      }
    }
    setOrder(ord);
    applyOrder(ord, sorted, false);
  }, [sortedKey]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const d = nextDurRef.current; nextDurRef.current = null; applyOrder(order, sorted, true, d || 420); }, [order]);   // eslint-disable-line react-hooks/exhaustive-deps
  const cycle = (dir) => setOrder((o) => o.length < 2 ? o : (dir > 0 ? o.slice(1).concat(o[0]) : [o[o.length - 1]].concat(o.slice(0, -1))));
  const bringToFront = (i) => setOrder((o) => { const idx = o.indexOf(i); return idx <= 0 ? o : o.slice(idx).concat(o.slice(0, idx)); });
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
    // ÁREA FIXA — só o cartão da FRENTE acompanha o dedo (o resto do baralho não mexe).
    onPanResponderMove: (_, g) => { const a = frontAnimRef.current; if (a) a.ty.setValue(slotFor(0).y + g.dy * 0.5); },
    onPanResponderRelease: (_, g) => {
      const a = frontAnimRef.current;
      // passou o limite (distância OU flick) → roda os cartões; senão o da frente volta ao sítio.
      if (g.dy < -28 || g.vy < -0.35) { select(); cycle(1); }
      else if (g.dy > 28 || g.vy > 0.35) { select(); cycle(-1); }
      else if (a) Animated.timing(a.ty, { toValue: slotFor(0).y, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    },
    onPanResponderTerminate: () => { const a = frontAnimRef.current; if (a) Animated.timing(a.ty, { toValue: slotFor(0).y, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); },
  })).current;
  // aponta sempre ao cartão da FRENTE (order[0]) — lido pelo pan em tempo real
  frontAnimRef.current = (order.length && sorted[order[0]]) ? anims[sorted[order[0]].id] : null;

  const chipRow = (opts, cur, onPick, fmt) => (
    <View style={s.chips}>
      {opts.map((o) => {
        const val = fmt ? o.value : o;
        const on = cur === val;
        return (
          <TouchableOpacity key={String(val)} onPress={() => { select(); onPick(val); }} style={[s.chip, on && s.chipOn]} activeOpacity={0.85} hitSlop={{ top: 6, bottom: 6, left: 3, right: 3 }}
            accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={String(fmt ? o.label : o)}>
            <Text style={[s.chipTxt, on && s.chipTxtOn]}>{fmt ? o.label : o}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
  const textField = (labelPt, labelEn, key, placeholder, extra = {}) => (
    <>
      <Text style={[s.fLbl, { marginTop: 14 }]}>{l(labelPt, labelEn)} <Text style={s.fOpt}>{l('· opcional', '· optional')}</Text></Text>
      <TextInput style={s.noteInput} value={editing?.[key]} onChangeText={(v) => set({ [key]: v })} placeholder={placeholder} placeholderTextColor={PELE.grey} {...extra} />
    </>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PeleSide label={l('CARTEIRA', 'WALLET')} accent={`${sorted.length} ${l('DOCS', 'DOCS')}`} />
      <View style={s.hdr}>
        <TouchableOpacity style={s.bk} onPress={() => navigation.goBack()} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('common.back', lang)}>
          <Icon name="back" size={18} color={PELE.ink} />
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        {/* Herói compacto */}
        <Text style={s.greet}>{l('Documentos', 'Documents')}</Text>
        <View style={s.hero}>
          <Text style={s.ghost} numberOfLines={1} allowFontScaling={false}>{String(sorted.length).padStart(2, '0')}</Text>
          <Text style={s.word} numberOfLines={1} allowFontScaling={false}>{l('Validades', 'Currency')}</Text>
          <Text style={s.kick} numberOfLines={1}>{sorted.length} {l(sorted.length === 1 ? 'documento' : 'documentos', sorted.length === 1 ? 'document' : 'documents')}{expiringCount ? <Text style={s.kickW}>{`  ·  ${expiringCount} ${l('a expirar', 'expiring')}`}</Text> : null}</Text>
        </View>
        <View style={s.hr} />

        {/* Carteira · deck arrastável */}
        {sorted.length === 0 ? (
          <View style={s.emptyWrap}><Text style={s.empty}>{l('Ainda sem validades. Adiciona a primeira em baixo.', 'No items yet. Add your first below.')}</Text></View>
        ) : (
          <Animated.View style={s.wallet} {...pan.panHandlers}>
            {sorted.map((it, i) => {
              const st = isNoExpiryType(it.type) ? { band: 'reference', days: null } : validityStatus(it.expiry);
              const slotIdx = order.indexOf(i);
              const isActive = slotIdx === 0;
              const a = anims[it.id];
              if (!a) return null;
              const bg = cardBig(it, st), foot = cardFoot(it, st);
              const bgC = a.act.interpolate({ inputRange: [0, 1], outputRange: ['#E7E5DE', '#141414'] });
              const bdC = a.act.interpolate({ inputRange: [0, 1], outputRange: ['#DAD8D0', '#141414'] });
              const nameC = a.act.interpolate({ inputRange: [0, 1], outputRange: ['#9C9A92', '#FFFFFF'] });
              return (
                <Animated.View key={it.id} style={[s.dcard, isActive && s.dcardShadow, { zIndex: slotFor(slotIdx < 0 ? 99 : slotIdx).z, backgroundColor: bgC, borderColor: bdC, transform: [{ translateX: a.tx }, { translateY: a.ty }, { rotate: a.rot.interpolate({ inputRange: [-30, 30], outputRange: ['-30deg', '30deg'] }) }, { scale: a.sc }] }]}>
                  {/* faixa de estado (direita) — só no cartão da frente */}
                  <Animated.View style={[s.dAccent, { backgroundColor: bandColor(st.band), opacity: a.act }]} pointerEvents="none" />
                  <TouchableOpacity activeOpacity={0.92} onPress={() => (isActive ? openEdit(it) : bringToFront(i))} style={{ flex: 1 }}>
                    <View style={s.chead}>
                      <Icon name={TYPE_IC[it.type] || 'doc'} size={15} color={isActive ? PELE.onInkFaint : '#B3B1A9'} />
                      <Animated.Text style={[s.cheadTxt, { color: nameC }]} numberOfLines={1}>{validityLabel(it.type, isPilot, lang)}</Animated.Text>
                      <View style={[s.pill, { backgroundColor: pillBgC(st.band) }]}><Text style={[s.pillTxt, { color: bandTextColor(st.band) }]}>{statusShort(st)}</Text></View>
                    </View>
                    {/* Detalhe — REVELA-SE (cresce em altura + fade) quando o cartão fica à frente. HORIZONTAL: número à ESQUERDA, campos à DIREITA (cartão de crédito) */}
                    <Animated.View style={{ opacity: a.act, maxHeight: a.act.interpolate({ inputRange: [0, 1], outputRange: [0, 118] }), transform: [{ translateY: a.act.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }], overflow: 'hidden' }}>
                      <View style={s.cbody}>
                        <View style={s.cnum}>
                          <Text style={s.cbig}>{bg.big}</Text>
                          {bg.unit ? <Text style={s.cbigUnit}>{bg.unit}</Text> : null}
                        </View>
                        <View style={s.cfoot}>
                          {foot.map((f, fi) => <View key={fi} style={s.cfootCol}><Text style={s.cfootK}>{f.k}</Text><Text style={s.cfootV} numberOfLines={1}>{f.v}</Text></View>)}
                        </View>
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}
      </View>

      <View style={[s.addWrap, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
        <TouchableOpacity style={s.addBtn} activeOpacity={0.85} onPress={openAdd} accessibilityRole="button" accessibilityLabel={l('Adicionar documento', 'Add document')}>
          <Icon name="plus" size={17} color={PELE.ink} />
          <Text style={s.addTxt}>{l('Adicionar documento', 'Add document')}</Text>
        </TouchableOpacity>
      </View>

      {/* Adicionar / Editar — form rico por tipo */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={requestCloseEditing}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.mOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={requestCloseEditing} />
          <View style={[s.sheet, { paddingBottom: Math.max(32, insets.bottom + 12) }]}>
            <View style={s.grab} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={s.sheetHead}>
                <View style={s.sheetHeadL}>
                  {(!isPicking && !editing?.id) ? (
                    <TouchableOpacity onPress={backToPicker} hitSlop={8} style={s.sheetBack} accessibilityRole="button" accessibilityLabel={l('Mudar tipo', 'Change type')}><Icon name="back" size={16} color={PELE.ink} /></TouchableOpacity>
                  ) : null}
                  <Text style={s.sheetTitle} numberOfLines={1}>{isPicking ? l('Adicionar', 'Add') : editing?.id ? l('Editar validade', 'Edit item') : validityLabel(editing?.type, isPilot, lang)}</Text>
                </View>
                <TouchableOpacity onPress={requestCloseEditing} hitSlop={8} style={s.sheetClose} accessibilityRole="button" accessibilityLabel={t('common.close', lang)}><Icon name="close" size={18} color={PELE.ink} /></TouchableOpacity>
              </View>

              {isPicking ? (
                <>
                  {/* Passo 1 · escolher tipo — herói + grelha AGRUPADA + nota crew-aware (mockup ecrã 2) */}
                  <View style={s.aHero}>
                    <View style={s.aGhost} pointerEvents="none"><Icon name="plus" size={112} color={PELE.ghost} /></View>
                    <Text style={s.aWord}>{l('Novo\ndocumento', 'New\ndocument')}</Text>
                    <Text style={s.aKick}>{l('escolhe o tipo — o cartão ', 'choose a type — the card ')}<Text style={s.aKickY}>{l('desenha-se', 'draws itself')}</Text>{l(' com os teus dados', ' with your data')}</Text>
                  </View>
                  <View style={s.ahr} />
                  {DOC_GROUPS.map((g) => {
                    const items = catalog.filter((tp) => g.ids.includes(tp.id));
                    if (!items.length) return null;
                    return (
                      <View key={g.key}>
                        <Text style={s.glbl}>{l(g.pt, g.en)}</Text>
                        <View style={s.tgrid}>
                          {items.map((tp) => (
                            <TouchableOpacity key={tp.id} onPress={() => { select(); openWith(blank(tp.id)); }} style={s.tgt} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={validityLabel(tp.id, isPilot, lang)}>
                              <View style={s.tgtIc}><Icon name={TYPE_IC[tp.id] || 'doc'} size={17} color={PELE.ink} /></View>
                              <Text style={s.tgtNm} numberOfLines={2}>{validityLabel(tp.id, isPilot, lang)}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                  <Text style={s.note}>
                    <Text style={s.noteB}>{isPilot ? l('Lista de piloto', 'Pilot list') : l('Lista de cabine', 'Cabin list')}</Text>
                    {isPilot
                      ? l(' — a cabine vê o seu conjunto (Atestado CCA, sem type rating/IR/inglês). ', ' — cabin crew see their own set (Cabin Attestation, no type rating/IR/English). ')
                      : l(' — o piloto vê o seu conjunto (licença, type rating, IR, inglês). ', ' — pilots see their own set (licence, type rating, IR, English). ')}
                    {l('Introdução manual; a app ', 'Manual entry; the app ')}
                    <Text style={s.noteB}>{l('não guarda foto nem scan', 'stores no photo or scan')}</Text>
                    {l(' (dado de saúde, RGPD Art.9) — vive do estado de validade, que alimenta os avisos e o «estou legal?».', ' (health data, GDPR Art.9) — it lives off the validity status, feeding the alerts and the "am I legal?".')}
                  </Text>
                </>
              ) : (
                <>

              {ff.level ? (
                <>
                  <Text style={[s.fLbl, { marginTop: 14 }]}>{l('Nível ICAO', 'ICAO level')}</Text>
                  {chipRow(LANG_LEVELS.map((lv) => ({ value: lv, label: `${lv}${lv === 6 ? l(' · sem prazo', ' · no expiry') : ''}` })), editing?.level, (lv) => set({ level: lv }), true)}
                </>
              ) : null}

              {ff.instrKind ? (
                <>
                  <Text style={[s.fLbl, { marginTop: 14 }]}>{l('Tipo', 'Kind')} <Text style={s.fOpt}>{l('· opcional', '· optional')}</Text></Text>
                  {chipRow(INSTRUCTOR_KINDS, editing?.instrKind, (k) => set({ instrKind: editing?.instrKind === k ? null : k }), false)}
                </>
              ) : null}

              {isRef ? (
                <Text style={[s.fLbl, { marginTop: 14, color: PELE.grey, fontFamily: PELE_FONT.body }]}>{l('Não expira — guardado como referência.', 'No expiry — kept as a reference.')}</Text>
              ) : needsLevel ? (
                <Text style={[s.fLbl, { marginTop: 14, color: attempted ? PELE.red : PELE.grey, fontFamily: attempted ? PELE_FONT.bodyBold : PELE_FONT.body }]}>{l('Escolhe o nível acima.', 'Choose the level above.')}</Text>
              ) : (
                <>
                  <Text style={[s.fLbl, { marginTop: 14 }]}>{usesDone ? l('Feito em', 'Done on') : l('Validade', 'Expiry')}</Text>
                  <View style={s.dateRow}>
                    <TextInput style={[s.dateIn, attempted && !formISO && s.dateInErr]} value={editing?.d} onChangeText={(v) => set({ d: v.replace(/\D/g, '').slice(0, 2) })} placeholder={l('DD', 'DD')} placeholderTextColor={PELE.grey} keyboardType="number-pad" maxLength={2} />
                    <Text style={s.dateSep}>/</Text>
                    <TextInput style={[s.dateIn, attempted && !formISO && s.dateInErr]} value={editing?.m} onChangeText={(v) => set({ m: v.replace(/\D/g, '').slice(0, 2) })} placeholder={l('MM', 'MM')} placeholderTextColor={PELE.grey} keyboardType="number-pad" maxLength={2} />
                    <Text style={s.dateSep}>/</Text>
                    <TextInput style={[s.dateIn, s.dateInY, attempted && !formISO && s.dateInErr]} value={editing?.y} onChangeText={(v) => set({ y: v.replace(/\D/g, '').slice(0, 4) })} placeholder={l('AAAA', 'YYYY')} placeholderTextColor={PELE.grey} keyboardType="number-pad" maxLength={4} />
                  </View>
                  {attempted && !formISO ? <Text style={s.dateErr}>{l('Data inválida — confere dia, mês e ano.', 'Invalid date — check day, month and year.')}</Text> : null}
                  {derivedISO ? <Text style={s.derived}>→ {l('válido até', 'valid until')} {fmtDate(derivedISO)}</Text> : null}
                </>
              )}

              {ff.limitations ? (
                <>
                  <Text style={[s.fLbl, { marginTop: 14 }]}>{l('Limitações', 'Limitations')} <Text style={s.fOpt}>{l('· opcional', '· optional')}</Text></Text>
                  <View style={s.chips}>
                    {medCodes(isPilot).map((c) => {
                      const on = (editing?.limitations || []).includes(c.code);
                      return (
                        <TouchableOpacity key={c.code} onPress={() => toggleLimit(c.code)} style={[s.chip, on && s.chipOn]} activeOpacity={0.85} hitSlop={{ top: 6, bottom: 6, left: 3, right: 3 }}>
                          <Text style={[s.chipTxt, on && s.chipTxtOn]}>{c.code}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {(editing?.limitations || []).length ? (
                    <Text style={s.hint}>{editing.limitations.map((code) => `${code} — ${medCodeHint(code, isPilot, lang)}`).join('\n')}</Text>
                  ) : null}
                </>
              ) : null}

              {ff.aircraft ? (
                <>
                  <Text style={[s.fLbl, { marginTop: 14 }]}>{l('Avião', 'Aircraft')}</Text>
                  <TextInput style={s.noteInput} value={editing?.aircraft} onChangeText={(v) => set({ aircraft: v })} placeholder={l('ex. A320', 'e.g. A320')} placeholderTextColor={PELE.grey} autoCapitalize="characters" maxLength={12} />
                </>
              ) : null}

              {ff.nationality ? textField('Nacionalidade', 'Nationality', 'nationality', l('ex. PRT', 'e.g. PRT'), { autoCapitalize: 'characters', maxLength: 20 }) : null}
              {ff.number ? textField('Número', 'Number', 'number', l('nº do documento', 'document number'), { maxLength: 40 }) : null}
              {textField('Nota', 'Note', 'note', l('qualquer nota', 'any note'), { maxLength: 80 })}

              <TouchableOpacity onPress={saveEditing} activeOpacity={0.9} style={s.saveBtn} accessibilityRole="button" accessibilityLabel={t('common.save', lang)}>
                <Text style={s.saveTxt}>{t('common.save', lang)}</Text>
              </TouchableOpacity>
              {editing?.id ? (
                <TouchableOpacity onPress={deleteEditing} activeOpacity={0.85} style={s.delBtn} hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}>
                  <Icon name="trash" size={16} color={PELE.red} />
                  <Text style={s.delTxt}>{l('Apagar', 'Delete')}</Text>
                </TouchableOpacity>
              ) : null}
                </>
              )}
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  hdr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 8 },
  bk: { width: 34, height: 34, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: GUTTER },

  // Herói
  greet: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: PELE.grey, marginTop: 6 },
  hero: { position: 'relative', minHeight: 120, marginTop: 2, justifyContent: 'flex-end', paddingBottom: 8 },
  ghost: { position: 'absolute', right: 2, top: -16, fontFamily: PELE_FONT.display, fontSize: 130, lineHeight: 130, letterSpacing: -4, color: PELE.ghost },
  word: { fontFamily: PELE_FONT.display, fontSize: 44, letterSpacing: -0.5, color: PELE.ink },
  kick: { fontFamily: PELE_FONT.bodyBold, fontSize: 12.5, color: PELE.grey, marginTop: 6 },
  kickW: { color: PELE.warn, fontFamily: PELE_FONT.bodyHeavy },
  hr: { height: 1.5, backgroundColor: PELE.ink, marginTop: 6 },

  emptyWrap: { flex: 1, justifyContent: 'center' },
  empty: { fontSize: 13, fontFamily: PELE_FONT.body, color: PELE.grey, lineHeight: 20, textAlign: 'center' },

  // Carteira · deck
  wallet: { flex: 1, position: 'relative', marginTop: 8 },
  dcard: { position: 'absolute', top: 0, left: '50%', marginLeft: -150, width: 300, minHeight: 132, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 16, backgroundColor: '#E7E5DE', borderWidth: 1, borderColor: '#DAD8D0', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  dcardShadow: { shadowOpacity: 0.5, shadowRadius: 26, shadowOffset: { width: 0, height: 20 }, elevation: 14 },
  dAccent: { position: 'absolute', right: 0, top: 22, bottom: 22, width: 3, borderRadius: 3, zIndex: 2 },
  chead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cheadTxt: { flex: 1, fontSize: 12.5, fontFamily: PELE_FONT.bodyHeavy, color: '#9C9A92' },
  cheadTxtA: { color: PELE.onInk },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillTxt: { fontSize: 8.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.6, textTransform: 'uppercase' },
  cbody: { flexDirection: 'row', alignItems: 'center', marginTop: 14, minHeight: 104 },
  cnum: { marginRight: 22, minWidth: 54 },
  cbig: { fontFamily: PELE_FONT.display, fontSize: 52, lineHeight: 50, color: PELE.onInk, fontVariant: ['tabular-nums'] },
  cbigUnit: { fontSize: 11.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.8, textTransform: 'uppercase', color: PELE.onInkSub, marginTop: 3 },
  cfoot: { flex: 1, flexDirection: 'row', gap: 18 },
  cfootCol: { flex: 1 },
  cfootK: { fontSize: 8.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1, textTransform: 'uppercase', color: PELE.onInkSub },
  cfootV: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.onInk, marginTop: 3 },

  addWrap: { paddingHorizontal: GUTTER, paddingTop: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: PELE.ink, borderRadius: 14, paddingVertical: 14 },
  addTxt: { fontSize: 14, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },

  // Modal / form
  mOverlay: { flex: 1, backgroundColor: 'rgba(10,10,8,0.42)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: PELE.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 32, maxHeight: '90%' },
  grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: PELE.line, alignSelf: 'center', marginBottom: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 22, fontFamily: PELE_FONT.display, letterSpacing: -0.3, color: PELE.ink },
  sheetClose: { width: 34, height: 34, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  sheetHeadL: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  sheetBack: { width: 30, height: 30, borderRadius: 10, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  // Passo 1 "Adicionar" (mockup ecrã 2): herói + grupos + nota
  aHero: { position: 'relative', minHeight: 118, justifyContent: 'flex-end', marginTop: 2, marginBottom: 2 },
  aGhost: { position: 'absolute', right: 0, top: -6 },
  aWord: { fontFamily: PELE_FONT.display, fontSize: 40, lineHeight: 38, letterSpacing: -0.5, color: PELE.ink },
  aKick: { fontFamily: PELE_FONT.bodyBold, fontSize: 12.5, color: PELE.grey, marginTop: 8 },
  aKickY: { color: PELE.yellow, fontFamily: PELE_FONT.bodyHeavy },
  ahr: { height: 1.5, backgroundColor: PELE.ink, marginTop: 12, marginBottom: 2 },
  glbl: { fontSize: 9, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.4, textTransform: 'uppercase', color: PELE.grey, marginTop: 16, marginBottom: 8 },
  note: { fontSize: 11, fontFamily: PELE_FONT.body, color: PELE.grey, lineHeight: 17, marginTop: 18 },
  noteB: { fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink },
  fLbl: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, marginBottom: 8 },
  fOpt: { fontFamily: PELE_FONT.body, color: PELE.grey },
  noteInput: { backgroundColor: PELE.soft, borderRadius: 10, borderWidth: 1, borderColor: PELE.line, paddingHorizontal: 12, paddingVertical: 11, color: PELE.ink, fontSize: 15, fontFamily: PELE_FONT.body },
  tgrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tgt: { width: '31.5%', marginBottom: 8, borderWidth: 1, borderColor: PELE.line, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 6, alignItems: 'center', gap: 8, minHeight: 82 },
  tgtOn: { backgroundColor: PELE.ink, borderColor: PELE.ink },
  tgtIc: { width: 38, height: 38, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  tgtIcOn: { backgroundColor: '#242320' },
  tgtNm: { fontSize: 11, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, textAlign: 'center', lineHeight: 13.5 },
  tgtNmOn: { color: PELE.onInk },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: PELE.line, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: PELE.paper },
  chipOn: { backgroundColor: PELE.ink, borderColor: PELE.ink },
  chipTxt: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  chipTxtOn: { color: PELE.onInk },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateIn: { width: 60, backgroundColor: PELE.soft, borderRadius: 10, borderWidth: 1, borderColor: PELE.line, paddingHorizontal: 12, paddingVertical: 12, color: PELE.ink, fontSize: 15, fontFamily: PELE_FONT.bodyBold, textAlign: 'center' },
  dateInErr: { borderColor: PELE.red },
  dateErr: { fontSize: 11, fontFamily: PELE_FONT.bodyBold, color: PELE.red, marginTop: 8 },
  dateInY: { width: 86 },
  dateSep: { fontSize: 20, color: PELE.grey },
  derived: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ok, marginTop: 8 },
  hint: { fontSize: 11.5, lineHeight: 17, fontFamily: PELE_FONT.body, color: PELE.grey, marginTop: 8 },
  saveBtn: { backgroundColor: PELE.ink, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  saveTxt: { fontSize: 14, fontFamily: PELE_FONT.bodyBold, color: PELE.paper },
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, marginTop: 6 },
  delTxt: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.red },
});
