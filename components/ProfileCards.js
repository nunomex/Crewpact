// CrewPact · As peças do PERFIL (W1 "como um voo" de design/perfil-6.html, escolhida pelo Nuno a 2026-11-14). O que vai para
// onde decide-o data/profileCards.js (golden test:profilecards); aqui só o desenho, na linguagem do Início 3.0 (os cartões
// neutros de raio 24, a tinta, o laranja com "!" e o vermelho com "✕" do mapa B). Imagens do Nuno: 3428 (o cartão de progresso)
// · 3436 (as contagens em pontos) · 3422/3417/3444 (a perna de voo) · 3418 (o bilhete picotado) · 3419 (três números com a
// unidade pequena) · 3424 (o chip de estado) · as duas imagens da família (os círculos e o "+") · a imagem "Settings" e a 3442
// (os mini-cartões com interruptor). Movimento (docs/motion-design-system.md §3): a barra cresce 800 ms; o avião percorre a
// perna e o traço enche-se atrás (800 ms out(cubic)); os círculos aparecem um a um (260 ms, 60 ms); as contagens no CountUp.
// Com movimentos reduzidos: tudo no estado final.
// A COR (K1 de design/perfil-cor.html, escolhida pelo Nuno a 2026-11-14): a carreira no AZUL DO VOO (é a vida a voar — o azul do
// voo em toda a app) e o cartão de tripulante a TINTA (um crachá); o resto neutro, e o laranja só quando uma validade pede atenção.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Switch } from 'react-native';
import Icon from './Icon';
import CountUp from './CountUp';
import PillButton from './PillButton';
import useReduceMotion from '../hooks/useReduceMotion';
import { CARD, TXT3, SPACE, RADIUS } from '../data/constants';

const C = CARD.day;
const MAX = 1.3;   // letra grande: os cartões crescem até 130 %

// Um cartão neutro (o LineCard de sempre), tocável quando abre alguma coisa.
function Card({ children, onPress, a11y, hint, style }) {
  const W = onPress ? TouchableOpacity : View;
  return (
    <W style={[s.card, style]} {...(onPress ? { onPress, activeOpacity: 0.85, accessibilityRole: 'button', accessibilityLabel: a11y, accessibilityHint: hint } : {})}>
      {children}
    </W>
  );
}
function Head({ kind, right, color = C.neutralKind }) {
  return (
    <View style={s.head}>
      <Text style={[TXT3.kind, s.flex, { color }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{kind}</Text>
      {right}
    </View>
  );
}
// O chip de estado (3424): branco; laranja "a expirar"; vermelho "caducado".
function Chip({ text, tone }) {
  const bg = tone === 'alert' ? C.alert : tone === 'stop' ? C.stop : C.sheet;
  return <View style={[s.chip, { backgroundColor: bg }]}><Text style={[TXT3.badge, { color: C.ink }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{text}</Text></View>;
}
// O sinal do mapa B ao lado do texto: "!" laranja (olhar) e "✕" vermelho (parar).
function Sign({ band }) {
  if (band !== 'expiring' && band !== 'expired') return null;
  return <View style={[s.sign, { backgroundColor: band === 'expired' ? C.stop : C.alert }]}><Text style={[TXT3.badge, { color: C.ink }]} allowFontScaling={false}>{band === 'expired' ? '✕' : '!'}</Text></View>;
}

// A barra que cresce (800 ms) — com movimentos reduzidos aparece já cheia.
function GrowBar({ ratio, color, delay = 300 }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) { v.setValue(1); return; }
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 800, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [ratio, reduce, v, delay]);
  return (
    <View style={s.track}>
      <View style={[s.fillBox, { width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%` }]}>
        <Animated.View style={[s.fill, { backgroundColor: color, transform: [{ scaleX: v }] }]} />
      </View>
    </View>
  );
}

// ── A VALIDADE MAIS PERTO (3428 · 3436) ──
export function ValidityCard({ nv, l, fmtDate, onPress }) {
  if (!nv) {
    return (
      <Card onPress={onPress} a11y={l('Validades: ainda sem documentos. Juntar', 'Currency: no documents yet. Add')}>
        <Head kind={l('Validades', 'Currency')} />
        <Text style={[TXT3.slimTitle, { color: C.ink }]} maxFontSizeMultiplier={MAX}>{l('Ainda sem validades', 'No currency yet')}</Text>
        <Text style={[TXT3.cardSub, { color: C.tabSub }]} maxFontSizeMultiplier={MAX}>{l('Junta o médico, o passaporte e os recorrentes: a app avisa antes de caducarem.', 'Add your medical, passport and recurrents: the app warns before they expire.')}</Text>
      </Card>
    );
  }
  const it = nv.item;
  const dots = (
    <View style={s.dots} accessible={false}>
      {nv.dots.map((b, i) => <View key={i} style={[s.dot, b === 'none' ? s.dotNone : { backgroundColor: b === 'expired' ? C.stop : b === 'expiring' ? C.alert : C.ink }]} />)}
      <Text style={[TXT3.cardSub, { color: C.tabSub }]} maxFontSizeMultiplier={MAX}>{nv.counts.total === 1 ? l('1 documento', '1 document') : l(`${nv.counts.total} documentos`, `${nv.counts.total} documents`)}</Text>
    </View>
  );
  if (!it) {
    return (
      <Card onPress={onPress} a11y={l('Validades sem data. Abrir', 'Currency without dates. Open')}>
        <Head kind={l('Validades', 'Currency')} />
        <Text style={[TXT3.slimTitle, { color: C.ink }]} maxFontSizeMultiplier={MAX}>{l('Sem datas', 'No dates')}</Text>
        <Text style={[TXT3.cardSub, { color: C.tabSub }]} maxFontSizeMultiplier={MAX}>{l('Escreve o "válido até" de cada um para a app te avisar.', 'Enter each "valid until" so the app can warn you.')}</Text>
        {dots}
      </Card>
    );
  }
  const expired = it.band === 'expired';
  const n = Math.abs(it.days);
  const a11y = `${l('Validades, a mais perto', 'Currency, the nearest')}: ${it.label}. ${expired ? l(`caducou há ${n} dias`, `expired ${n} days ago`) : l(`faltam ${n} dias`, `${n} days left`)}, ${l('até', 'until')} ${fmtDate(it.expiry)}.`;
  return (
    <Card onPress={onPress} a11y={a11y} hint={l('Abre as validades', 'Opens your currency')}>
      <Head kind={l('Validades · a mais perto', 'Currency · nearest')}
        right={it.band === 'expiring' ? <Chip text={l('A EXPIRAR', 'EXPIRING')} tone="alert" /> : expired ? <Chip text={l('CADUCADO', 'EXPIRED')} tone="stop" /> : null} />
      <View style={s.vRow}>
        <View style={[s.flex, s.vTitle]}>
          <Sign band={it.band} />
          <Text style={[TXT3.cardTitle, s.flex, { color: C.ink }]} numberOfLines={2} maxFontSizeMultiplier={MAX}>{it.label}</Text>
        </View>
        <View style={s.vNum}>
          <View style={s.vNumRow}>
            <CountUp value={n} style={[TXT3.cardTitle, { color: C.ink }]} allowFontScaling={false} delay={300} />
            <Text style={[TXT3.dur, { color: C.ink }]} allowFontScaling={false}>{` ${n === 1 ? l('dia', 'day') : l('dias', 'days')}`}</Text>
          </View>
          <Text style={[TXT3.cardNumLbl, { color: C.tabSub }]} maxFontSizeMultiplier={MAX}>{expired ? l('caducou há', 'expired ago') : l('faltam', 'left')}</Text>
        </View>
      </View>
      {nv.bar != null ? <GrowBar ratio={nv.bar} color={expired ? C.stop : it.band === 'expiring' ? C.alert : C.ink} /> : null}
      <View style={s.vSub}>
        <Text style={[TXT3.cardSub, s.flex, { color: C.tabSub }]} maxFontSizeMultiplier={MAX}>{`${l('até', 'until')} `}<Text style={{ color: C.ink }}>{fmtDate(it.expiry)}</Text></Text>
        {dots}
      </View>
    </Card>
  );
}

// ── A CARREIRA COMO UMA PERNA DE VOO (3422 · 3417 · 3444) ──
export function CareerCard({ leg, l, companyName, base, catLabel }) {
  const reduce = useReduceMotion();
  const [w, setW] = useState(0);
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (!w) return;
    if (reduce) { v.setValue(1); return; }
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 800, delay: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [w, reduce, v]);
  if (!leg) return null;
  const a11y = `${l('A tua carreira', 'Your career')}${companyName ? ` · ${companyName}` : ''}: ${l('entraste em', 'joined in')} ${leg.from.year}${leg.from.category ? ` (${leg.from.category})` : ''}`
    + `${leg.stops.map((st) => `, ${st.year} ${st.category}`).join('')}; ${l('hoje', 'today')} ${leg.to.category || ''}. ${leg.text}.`;
  const planeX = v.interpolate({ inputRange: [0, 1], outputRange: [-Math.max(0, w - 24), 0] });
  return (
    <Card a11y={a11y} style={{ backgroundColor: C.flight }}>
      <View accessible accessibilityLabel={a11y}>
        <Head color={CARD.onCardKind} kind={`${l('A tua carreira', 'Your career')}${companyName ? ` · ${companyName}` : ''}`}
          right={base ? <Text style={[TXT3.kind, { color: CARD.onCardKind }]} maxFontSizeMultiplier={MAX}>{base}</Text> : null} />
        <View style={s.leg}>
          <View>
            <Text style={[TXT3.cardTitle, { color: C.ink }]} maxFontSizeMultiplier={MAX}>{leg.from.year}</Text>
            <Text style={[TXT3.cardNumLbl, { color: CARD.onCardSub }]} maxFontSizeMultiplier={MAX}>{leg.from.category || '—'}</Text>
          </View>
          <View style={s.trackLeg} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
            <View style={s.legBase} />
            <Animated.View style={[s.legFill, { transform: [{ scaleX: v }] }]} />
            {leg.stops.map((st) => (
              <View key={st.ym} style={[s.stopWrap, { left: `${Math.round(st.pct * 100)}%` }]}>
                <Text style={[TXT3.cardNumLbl, s.stopLbl, { color: CARD.onCard }]} numberOfLines={1} allowFontScaling={false}>{`${st.year} · ${st.category}`}</Text>
                <View style={s.stop} />
              </View>
            ))}
            <Animated.View style={[s.plane, { transform: [{ translateX: planeX }] }]}><Icon name="plane" size={20} color={C.ink} rot={90} /></Animated.View>
          </View>
          <View style={s.legEnd}>
            <Text style={[TXT3.cardTitle, { color: C.ink }]} maxFontSizeMultiplier={MAX}>{leg.label}</Text>
            <Text style={[TXT3.cardNumLbl, { color: CARD.onCardSub }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{catLabel || leg.to.category || '—'}</Text>
          </View>
        </View>
        <View style={s.selo}><Text style={[TXT3.dur, s.seloTxt]} maxFontSizeMultiplier={MAX}>{leg.text}</Text></View>
      </View>
    </Card>
  );
}

// ── O CARTÃO DE TRIPULANTE, picotado como um cartão de embarque (3418 · 3417) ──
// cells: [{ k, label, v, sub, dot, onPress }]
export function CrewPass({ l, name, crewId, roleLabel, cells = [], onChange }) {
  return (
    <View style={s.pass}>
      <View style={s.passTop}>
        <View style={s.flex}>
          <Text style={[TXT3.kind, { color: C.darkSub }]} maxFontSizeMultiplier={MAX}>{l('O teu cartão de tripulante', 'Your crew card')}</Text>
          <Text style={[TXT3.cardTitle, s.passName, { color: C.sheet }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{name || l('O teu nome', 'Your name')}</Text>
          <Text style={[TXT3.cardSub, { color: C.darkSub }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{[roleLabel, crewId ? l(`nº ${crewId}`, `no. ${crewId}`) : null].filter(Boolean).join(' · ')}</Text>
        </View>
        <PillButton label={l('Mudar', 'Change')} ink={C.sheet} onPress={onChange} a11yLabel={l('Mudar o teu trabalho', 'Change your job details')} />
      </View>
      <View style={s.perf}>
        <View style={[s.notch, s.notchL]} />
        <View style={s.perfLine} />
        <View style={[s.notch, s.notchR]} />
      </View>
      <View style={s.grid}>
        {cells.map((c) => (
          <TouchableOpacity key={c.k} style={s.cell} onPress={c.onPress} disabled={!c.onPress} activeOpacity={0.7}
            accessibilityRole={c.onPress ? 'button' : undefined} accessibilityLabel={[c.label, c.v, c.sub].filter(Boolean).join(', ')}>
            <Text style={[TXT3.badge, { color: C.darkSub }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{c.label.toUpperCase()}</Text>
            <View style={s.cellRow}>
              {c.dot ? <View style={s.dotAlert} /> : null}
              <Text style={[TXT3.fact, s.flexShrink, { color: C.sheet }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{c.v}</Text>
            </View>
            {c.sub ? <Text style={[TXT3.cardNumLbl, { color: C.darkSub }]} numberOfLines={2} maxFontSizeMultiplier={MAX}>{c.sub}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── O ACORDO EM NÚMEROS (3419 · 3424) ──
export function AgreementCard({ ag, l, onItem, onChip }) {
  return (
    <Card>
      <Head kind={l('Acordo e serviço', 'Agreement and duty')}
        right={ag.chip ? <TouchableOpacity onPress={onChip} accessibilityRole="button" accessibilityLabel={`${ag.chip}. ${l('Abre a página', 'Opens the page')}`}><Chip text={ag.chip} /></TouchableOpacity> : null} />
      <View style={s.three}>
        {ag.items.map((x, i) => (
          <TouchableOpacity key={x.k} style={[s.threeCell, i > 0 ? s.threeRule : null]} onPress={() => onItem && onItem(x.k)} activeOpacity={0.7}
            accessibilityRole="button" accessibilityLabel={`${x.l}: ${x.v}${x.unit ? ` ${x.unit}` : ''}${x.dot ? `, ${l('assumido — confirma', 'assumed — confirm')}` : ''}`}>
            <View style={s.cellRow}>
              {x.dot ? <View style={s.dotAlert} /> : null}
              <Text style={[TXT3.cardNum, { color: C.ink }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{x.v}</Text>
              {x.unit ? <Text style={[TXT3.dur, { color: C.ink }]} maxFontSizeMultiplier={MAX}>{` ${x.unit}`}</Text> : null}
            </View>
            <Text style={[TXT3.cardNumLbl, { color: C.tabSub }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{x.l}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
}

// ── A FAMÍLIA EM CÍRCULOS (as duas imagens do Nuno): as iniciais, nunca fotos; o "+" para juntar ──
function Pop({ i, children }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) { v.setValue(1); return; }
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 260, delay: 500 + i * 60, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [reduce, v, i]);
  return <Animated.View style={{ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }}>{children}</Animated.View>;
}
export function FamilyCard({ fam, total, l, onAdd, onOpen }) {
  return (
    <Card>
      <Head kind={l('Família · chegada ao vivo', 'Family · live arrival')}
        right={total ? <Text style={[TXT3.cardSub, { color: C.tabSub }]} maxFontSizeMultiplier={MAX}>{total === 1 ? l('1 pessoa', '1 person') : l(`${total} pessoas`, `${total} people`)}</Text> : null} />
      <View style={s.people}>
        <TouchableOpacity style={s.pc} onPress={onAdd} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={l('Juntar uma pessoa', 'Add a person')}>
          <Pop i={0}><View style={[s.av, s.avAdd]}><Icon name="plus" size={20} color={C.ink} /></View></Pop>
          <Text style={[TXT3.dur, { color: C.ink }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{l('Juntar', 'Add')}</Text>
        </TouchableOpacity>
        {fam.people.map((p, i) => (
          <TouchableOpacity key={p.id} style={s.pc} onPress={onOpen} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${p.label}. ${l('Abre a família', 'Opens family')}`}>
            <Pop i={i + 1}><View style={s.av}><Text style={[TXT3.slimTitle, { color: C.sheet }]} allowFontScaling={false}>{p.initials}</Text></View></Pop>
            <Text style={[TXT3.dur, { color: C.ink }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{p.label.split(/\s+/)[0]}</Text>
          </TouchableOpacity>
        ))}
        {fam.more ? (
          <TouchableOpacity style={s.pc} onPress={onOpen} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={l(`Mais ${fam.more}. Abre a família`, `${fam.more} more. Opens family`)}>
            <Pop i={4}><View style={[s.av, s.avMore]}><Text style={[TXT3.slimTitle, { color: C.ink }]} allowFontScaling={false}>{`+${fam.more}`}</Text></View></Pop>
            <Text style={[TXT3.dur, { color: C.ink }]} maxFontSizeMultiplier={MAX}>{l('mais', 'more')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={[TXT3.cardSub, { color: C.tabSub }]} maxFontSizeMultiplier={MAX}>{l('Cada pessoa tem o seu link: vê só a tua chegada do dia.', 'Each person has their own link: they only see your arrival that day.')}</Text>
    </Card>
  );
}

// ── OS MINI-CARTÕES DAS DEFINIÇÕES (a imagem "Settings" do Nuno · 3442 · 3426) ──
export function QuickSettings({ l, lang, lockOn, onLock, remindersOn, onReminders, onLang }) {
  const sw = (on, fn, label) => (
    <Switch value={!!on} onValueChange={fn} trackColor={{ true: C.ink, false: C.round }} thumbColor={C.sheet} ios_backgroundColor={C.round} accessibilityLabel={label} />
  );
  return (
    <View style={s.minis}>
      <View style={s.mini}>
        <View style={s.ci}><Icon name="faceid" size={16} color={C.ink} /></View>
        <View><Text style={[TXT3.slimTitle, { color: C.ink }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>Face ID</Text><Text style={[TXT3.cardSub, { color: C.tabSub }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{l('ao abrir', 'on open')}</Text></View>
        {sw(lockOn, onLock, l('Bloqueio com Face ID', 'Face ID lock'))}
      </View>
      <View style={s.mini}>
        <View style={s.ci}><Icon name="bell" size={16} color={C.ink} /></View>
        <View><Text style={[TXT3.slimTitle, { color: C.ink }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{l('Lembretes', 'Reminders')}</Text><Text style={[TXT3.cardSub, { color: C.tabSub }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{l('antes do report', 'before report')}</Text></View>
        {sw(remindersOn, onReminders, l('Lembretes antes do report', 'Reminders before report'))}
      </View>
      <View style={s.mini}>
        <View style={s.ci}><Icon name="globe" size={16} color={C.ink} /></View>
        <View><Text style={[TXT3.slimTitle, { color: C.ink }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{l('Idioma', 'Language')}</Text><Text style={[TXT3.cardSub, { color: C.tabSub }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{l('da app', 'of the app')}</Text></View>
        <View style={s.seg} accessibilityRole="tablist">
          {[['pt', 'PT'], ['en', 'EN']].map(([k, t]) => {
            const on = lang === k;
            return (
              <TouchableOpacity key={k} onPress={() => onLang && onLang(k)} style={[s.segB, on ? { backgroundColor: C.ink } : null]} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={k === 'pt' ? 'Português' : 'English'}>
                <Text style={[TXT3.badge, { color: on ? C.sheet : C.soft }]} allowFontScaling={false}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ── OS ATALHOS (Hotéis · Biblioteca · Relatórios) ──
export function QuickTiles({ items = [] }) {
  return (
    <View style={s.quick}>
      {items.map((x) => (
        <TouchableOpacity key={x.k} style={s.q} onPress={x.onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`${x.label}, ${x.sub}`}>
          <View style={s.ci}><Icon name={x.icon} size={16} color={C.ink} /></View>
          <Text style={[TXT3.dur, { color: C.ink }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{x.label}</Text>
          <Text style={[TXT3.cardNumLbl, { color: C.tabSub }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{x.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── A CONTA NUMA LINHA ESCURA (3447) ──
export function AccountRow({ l, sub, onPress }) {
  return (
    <TouchableOpacity style={s.acc} onPress={onPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${l('A tua conta', 'Your account')}. ${sub}`}>
      <View style={[s.ci, { backgroundColor: C.darkGo }]}><Icon name="user" size={16} color={C.sheet} /></View>
      <View style={s.flex}>
        <Text style={[TXT3.slimTitle, { color: C.sheet }]} maxFontSizeMultiplier={MAX}>{l('A tua conta', 'Your account')}</Text>
        <Text style={[TXT3.cardSub, { color: C.darkSub }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{sub}</Text>
      </View>
      <Icon name="chevron" size={14} color={C.darkSub} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  flexShrink: { flexShrink: 1 },
  card: { backgroundColor: C.neutral, borderRadius: RADIUS.xxl, padding: SPACE.lg, gap: SPACE.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  chip: { height: 24, paddingHorizontal: SPACE.md - 2, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  sign: { width: 20, height: 20, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', marginTop: SPACE.xxs },
  track: { height: 10, borderRadius: RADIUS.pill, backgroundColor: C.round, overflow: 'hidden' },
  fillBox: { height: '100%' },
  fill: { height: '100%', borderRadius: RADIUS.pill, transformOrigin: 'left' },
  vRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.md },
  vTitle: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.s },
  vNum: { alignItems: 'flex-end' },
  vNumRow: { flexDirection: 'row', alignItems: 'baseline' },
  vSub: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  dots: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs + 1 },
  dot: { width: 10, height: 10, borderRadius: RADIUS.pill },
  dotNone: { borderWidth: 1.5, borderColor: C.tabSub },
  dotAlert: { width: 7, height: 7, borderRadius: RADIUS.pill, backgroundColor: C.alert, marginRight: SPACE.s },
  // a perna
  leg: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  legEnd: { alignItems: 'flex-end', maxWidth: 112 },
  trackLeg: { flex: 1, height: 44, justifyContent: 'center' },
  legBase: { position: 'absolute', left: 0, right: 0, top: 23, borderTopWidth: 2, borderStyle: 'dashed', borderColor: CARD.onCardSub },
  legFill: { position: 'absolute', left: 0, right: 0, top: 22, height: 4, borderRadius: RADIUS.pill, backgroundColor: C.ink, transformOrigin: 'left' },
  stopWrap: { position: 'absolute', top: 0, alignItems: 'center', transform: [{ translateX: -40 }], width: 80 },
  stopLbl: { height: 16 },
  stop: { width: 14, height: 14, borderRadius: RADIUS.pill, backgroundColor: C.flight, borderWidth: 3, borderColor: C.ink },
  plane: { position: 'absolute', right: -4, top: 14 },
  selo: { alignItems: 'center' },
  seloTxt: { color: C.sheet, backgroundColor: C.ink, borderRadius: RADIUS.pill, overflow: 'hidden', paddingHorizontal: SPACE.md - 2, paddingVertical: SPACE.xs },
  // o cartão de tripulante
  pass: { backgroundColor: C.ink, borderRadius: RADIUS.xxl },
  passTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md, padding: SPACE.lg, paddingBottom: SPACE.md + 2 },
  passName: { marginTop: SPACE.s },
  perf: { flexDirection: 'row', alignItems: 'center', height: 24 },
  perfLine: { flex: 1, borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.darkGo, marginHorizontal: SPACE.xs },
  notch: { width: 24, height: 24, borderRadius: RADIUS.pill, backgroundColor: C.sheet },
  notchL: { marginLeft: -12 },
  notchR: { marginRight: -12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACE.lg, paddingBottom: SPACE.lg, paddingTop: SPACE.sm, rowGap: SPACE.md },
  cell: { width: '50%', paddingRight: SPACE.md, gap: 2 },
  cellRow: { flexDirection: 'row', alignItems: 'baseline' },
  // o acordo
  three: { flexDirection: 'row' },
  threeCell: { flex: 1, minWidth: 0, gap: 2 },
  threeRule: { borderLeftWidth: 1, borderLeftColor: C.round, paddingLeft: SPACE.md - 2 },
  // a família
  people: { flexDirection: 'row', gap: SPACE.md },
  pc: { width: 64, alignItems: 'center', gap: SPACE.s },
  av: { width: 56, height: 56, borderRadius: RADIUS.pill, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  avAdd: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.tabSub },
  avMore: { backgroundColor: C.sheet },
  // os mini-cartões
  minis: { flexDirection: 'row', gap: SPACE.sm },
  mini: { flex: 1, minWidth: 0, backgroundColor: C.neutral, borderRadius: RADIUS.xl, padding: SPACE.md, gap: SPACE.sm, justifyContent: 'space-between' },
  ci: { width: 32, height: 32, borderRadius: RADIUS.pill, backgroundColor: C.sheet, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: C.round, borderRadius: RADIUS.pill, padding: 2 },
  segB: { height: 27, minWidth: 34, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.s },
  // os atalhos e a conta
  quick: { flexDirection: 'row', gap: SPACE.sm },
  q: { flex: 1, minWidth: 0, backgroundColor: C.neutral, borderRadius: RADIUS.xl, paddingVertical: SPACE.md, paddingHorizontal: SPACE.sm, alignItems: 'center', gap: SPACE.s },
  acc: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: C.ink, borderRadius: RADIUS.xl, paddingVertical: SPACE.md, paddingHorizontal: SPACE.md + 2 },
});
