// O INÍCIO 3.0 "cartões de cor" — as peças que desenham o que data/homeCards.js decide (esboço design/inicio-cartoes.html,
// design-system §14, 2026-11-11). Só apresentação: nenhum número nasce aqui.
//   HomeTop   — a pílula do estado (preta, não se toca) + a de contorno (abre o dia na Escala, 38 à vista e 44 de toque)
//               + o sino; a legenda; o número em DUAS linhas e os dois factos ao lado de um fio.
//   HomeCards — a lista da folha: cartão grande · linha fina · linhas (parcelas, passos) · texto.
// Acessibilidade: o cartão inteiro abre o detalhe (um botão com tudo o que diz); o ícone de partilhar e a barra de ação são
// botões À PARTE (irmãos, não filhos — o VoiceOver chega aos três). O número gigante não cresce com a letra grande (a largura
// é calculada pelas métricas da fonte); os cartões crescem e a folha desliza.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Icon from './Icon';
import { CARD, TXT3, SPACE, RADIUS, BRAND, PELE_FONT } from '../data/constants';
import { GIANT } from '../data/homeCards';
import { textWidth } from '../data/fontMetrics';

// Largura de uma pílula do topo (Hanken 700 · 13, 16 de cada lado, fio de 1,5; o ponto amarelo leva 7 + 8).
export const pillWidth = (text, dot = false) => Math.ceil(2 * SPACE.lg + 3 + textWidth(text, 13, 'b') + (dot ? 7 + SPACE.sm : 0));

// A altura da linha do número: 1,1 do tamanho (a Hanken tem 1,303 em de altura natural; abaixo do tamanho o iOS cortou
// letras no v6) e as duas linhas aproximadas por margem negativa até 0,9 em de base a base, como no esboço.
export const GIANT_LINE = { lh: 1.1, lead: 0.9, trim: 0.1 };

const MAX_SCALE = 1.3;
// A língua do VoiceOver = a língua escolhida na app (na Expo Go o iOS usava a voz inglesa da Expo Go para ler português — iPhone, 2026-11-11).
const a11yLang = (l) => (l ? l('pt-PT', 'en-GB') : 'pt-PT');   // letra grande: os cartões crescem até 130 % (a folha desliza); o topo fica fixo

function toneOf(C, color) {
  if (color === 'dark') return { bg: C.ink, fg: C.sheet, sub: C.darkSub, kind: C.darkSub, go: C.darkGo };
  if (color === 'neutral' || !C[color]) return { bg: C.neutral, fg: C.ink, sub: C.neutralSub, kind: C.neutralKind, go: C.neutralGo };
  return { bg: C[color], fg: CARD.onCard, sub: CARD.onCardSub, kind: CARD.onCardKind, go: CARD.go };
}

function GainChip({ text }) {
  return (
    <View style={s.chip}><Text style={[TXT3.chip, { color: CARD.gain }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{text}</Text></View>
  );
}

// ── O TOPO ──
// `rightW` = a largura do que está à direita (o sino, 44; ou a pílula "Exemplo · sair").
export function HomeTop({ top, C, size, onPill2, right, rightW = 44, l }) {
  const { width: winW } = useWindowDimensions();
  const AL = a11yLang(l);
  if (!top) return null;
  // As pílulas NUNCA se cortam ("Novem…" no iPhone, 2026-11-11): se as três não cabem numa linha, sai a de contorno
  // (a secundária). Medido com as larguras da Hanken, como o número gigante.
  // A Escala (2026-11-13) usa o mesmo topo sem a pílula preta e com a de contorno como botão do mês (seta ▾ e dica própria).
  const p2W = top.pill2 ? pillWidth(top.pill2.text) + (top.pill2.chevron ? 12 + SPACE.sm : 0) : 0;
  const pillsW = (top.pill ? pillWidth(top.pill.text, top.pill.live) + SPACE.sm : 0) + (top.pill2 ? p2W + SPACE.sm : 0) + rightW;
  const showP2 = !!top.pill2 && pillsW <= winW - 2 * SPACE.lgPlus;
  const g = top.giant || {};
  const lh = Math.round(size * GIANT_LINE.lh);
  // O aperto entre letras (−0,046 em) também se aplica DEPOIS da última: o iOS mede a caixa ~4 pt mais estreita do que o
  // desenho do último algarismo e, numa linha só, corta-o ("o 8 parece cortado", iPhone 2026-11-11). Devolve-se esse aperto
  // à direita (e tira-se ao espaço antes da unidade, para a distância à vista não mudar).
  const tail = Math.ceil(-size * GIANT.ls);
  const giantStyle = { fontFamily: PELE_FONT.bodyBold, fontSize: size, lineHeight: lh, letterSpacing: size * GIANT.ls, color: C.ink, paddingRight: tail };
  const heroA11y = [top.what, `${g.l1 || ''}${g.unit ? ` ${g.unit}` : ''}`, g.l2, ...(top.facts || []).map((f) => `${f.tone === 'was' ? l('estava', 'was') + ' ' : ''}${f.v} ${f.l}`)].filter(Boolean).join('. ');
  const P2 = top.pill2 && top.pill2.iso ? TouchableOpacity : View;
  return (
    <View style={s.top}>
      <View style={s.pills}>
        {top.pill ? (
          <View style={[s.pill, { backgroundColor: C.ink, borderColor: C.ink }]} accessible accessibilityLanguage={AL} accessibilityLabel={top.pill.text}>
            {top.pill.live ? <View style={[s.pillDot, { backgroundColor: BRAND.signal }]} /> : null}
            <Text style={[TXT3.pill, { color: C.desk }]} numberOfLines={1} allowFontScaling={false}>{top.pill.text}</Text>
          </View>
        ) : null}
        {showP2 ? (
          <P2 style={[s.pill, s.pillOut, { borderColor: C.ink }]} {...(top.pill2.iso ? { onPress: () => onPill2(top.pill2.iso), activeOpacity: 0.7, hitSlop: { top: 3, bottom: 3, left: 2, right: 2 },
            accessibilityRole: 'button', accessibilityLanguage: AL, accessibilityLabel: top.pill2.text, accessibilityHint: top.pill2.hint || l('Abre este dia na Escala', 'Opens this day in the Roster') } : { accessible: true, accessibilityLanguage: AL, accessibilityLabel: top.pill2.text })}>
            <Text style={[TXT3.pill, { color: C.ink }]} numberOfLines={1} allowFontScaling={false}>{top.pill2.text}</Text>
            {top.pill2.chevron ? <Icon name="chevron" rot={90} size={12} color={C.ink} /> : null}
          </P2>
        ) : null}
        <View style={s.grow} />
        {right}
      </View>
      <Text style={[TXT3.what, { color: C.soft }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>{top.what}</Text>
      <View style={s.hero} accessible accessibilityLanguage={AL} accessibilityLabel={heroA11y}>
        <View style={{ marginTop: -Math.round(size * GIANT_LINE.trim), marginBottom: -Math.round(size * GIANT_LINE.trim) }}>
          <View style={s.l1Row}>
            <Text style={giantStyle} numberOfLines={1} allowFontScaling={false}>{g.l1}</Text>
            {g.unit ? <Text style={[TXT3.unit, { marginLeft: GIANT.unitGap - tail, color: C.ink }]} numberOfLines={1} allowFontScaling={false}>{g.unit}</Text> : null}
          </View>
          {g.l2 ? (
            <Text style={[giantStyle, { color: g.l2Grey ? C.grey : C.ink, marginTop: -Math.round(size * (GIANT_LINE.lh - GIANT_LINE.lead)) }]} numberOfLines={1} allowFontScaling={false}>{g.l2}</Text>
          ) : null}
        </View>
        {top.facts ? (
          <View style={[s.side, { borderLeftColor: C.ink }]}>
            {top.facts.map((f) => (
              <View key={`${f.v}-${f.l}`}>
                <Text style={[TXT3.fact, { color: f.tone === 'gain' ? C.gainOut : C.ink }, f.tone === 'was' ? s.was : null]} numberOfLines={1} allowFontScaling={false}>{f.v}</Text>
                <Text style={[TXT3.factLbl, { color: C.soft }]} numberOfLines={1} allowFontScaling={false}>{f.l}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── O CARTÃO GRANDE ──
function BigCard({ c, C, onOpen, l }) {
  const AL = a11yLang(l);
  const T = toneOf(C, c.color);
  const legsA11y = Array.isArray(c.legs) ? c.legs.map((g) => [g.fno, `${g.a.l} ${g.a.v}`, g.dur, `${g.b.l} ${g.b.v}`, g.z, g.gap].filter(Boolean).join(', ')) : [];
  const a11y = [c.kind, c.title, c.sub, c.gain, ...legsA11y, c.a && `${c.a.l} ${c.a.v}`, c.dur, c.b && `${c.b.l} ${c.b.v}`].filter(Boolean).join('. ');
  const Main = c.open ? TouchableOpacity : View;
  const mainProps = c.open
    ? { activeOpacity: 0.85, onPress: () => onOpen(c.open), accessibilityRole: 'button', accessibilityLanguage: AL, accessibilityLabel: a11y, accessibilityHint: l('Abre o detalhe', 'Opens the detail') }
    : { accessible: true, accessibilityLanguage: AL, accessibilityLabel: a11y };
  const share = c.corner === 'share';
  return (
    <View style={[s.cd, { backgroundColor: T.bg }]}>
      <Main style={s.cdMain} {...mainProps}>
        <View style={s.cdTop}>
          <View style={s.cdHead}>
            <Text style={[TXT3.kind, { color: T.kind }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.kind}</Text>
            <Text style={[TXT3.cardTitle, s.cdTitle, { color: T.fg }]} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE}>{c.title}</Text>
          </View>
          <View style={s.goSpace} />
        </View>
        {(c.sub || c.gain) ? (
          <View style={s.subRow}>
            <Text style={[TXT3.cardSub, s.subTxt, { color: T.sub }]} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE}>{c.sub || ''}</Text>
            {c.gain ? <GainChip text={c.gain} /> : null}
          </View>
        ) : null}
        {Array.isArray(c.legs) && c.legs.length ? <Legs legs={c.legs} T={T} /> : null}
        {(c.a || c.dur || c.b) ? (
          <View style={s.cdRow}>
            <View style={s.cdEnd}>
              {c.a ? <Text style={[TXT3.cardNum, { color: T.fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.a.v}</Text> : null}
              {c.a ? <Text style={[TXT3.cardNumLbl, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.a.l}</Text> : null}
            </View>
            {c.dur ? <View style={s.dur}><Text style={[TXT3.dur, { color: CARD.onCard }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.dur}</Text></View> : null}
            <View style={[s.cdEnd, s.cdEndR]}>
              {c.b ? (c.b.gain ? <GainChip text={c.b.v} /> : <Text style={[TXT3.cardNum, { color: T.fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.b.v}</Text>) : null}
              {c.b ? <Text style={[TXT3.cardNumLbl, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.b.l}</Text> : null}
            </View>
          </View>
        ) : null}
        {c.pct != null ? (
          <View style={s.prog} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <View style={[s.progTrack, { backgroundColor: CARD.onCardTrack }]} />
            <View style={[s.progFill, { width: `${c.pct}%`, backgroundColor: CARD.onCard }]} />
            <View style={[s.progKnob, { left: `${c.pct}%`, backgroundColor: CARD.onCard, borderColor: T.bg }]} />
          </View>
        ) : null}
      </Main>
      {/* O canto: partilhar é um botão próprio (36 à vista, 44 de toque); a seta é só sinal — o cartão inteiro abre o detalhe. */}
      {share ? (
        <TouchableOpacity style={[s.go, { backgroundColor: T.go }]} onPress={() => onOpen({ to: c.id === 'rest' ? 'shareClose' : 'share' })} hitSlop={4} activeOpacity={0.7}
          accessibilityRole="button" accessibilityLanguage={AL} accessibilityLabel={l('Partilhar o voo', 'Share the flight')}>
          <Icon name="share" size={16} color={T.fg} />
        </TouchableOpacity>
      ) : c.open ? (
        <View style={[s.go, { backgroundColor: T.go }]} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Icon name="chevron" size={16} color={T.fg} />
        </View>
      ) : null}
      {c.action ? (
        <TouchableOpacity style={[s.act, { backgroundColor: CARD.act }]} onPress={() => onOpen(c.action.open)} activeOpacity={0.8} accessibilityRole="button" accessibilityLanguage={AL} accessibilityLabel={c.action.label}>
          <Icon name={c.action.icon} size={16} color={CARD.onCard} />
          <Text style={[TXT3.act, { color: CARD.onCard }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── B2 · AS PERNAS (dentro do cartão grande; a Escala, design-system §14) ──
// O número do voo numa faixa (e a Zulu só quando difere) · as duas horas grandes, o código e a cidade por baixo · o fio com ✈
// e a duração real no selo · entre pernas, o tempo no solo numa linha fina. Os textos vêm prontos de data/escalaDay.js.
function Legs({ legs, T }) {
  return (
    <View style={s.legs} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {legs.map((g, i) => (
        <View key={`leg${i}`}>
          {(g.fno || g.z) ? (
            <View style={s.legH}>
              {g.fno ? <View style={[s.fno, { backgroundColor: CARD.go }]}><Text style={[TXT3.kind, { color: CARD.onCard }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{g.fno}</Text></View> : <View />}
              {g.z ? <Text style={[TXT3.cardNumLbl, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{g.z}</Text> : null}
            </View>
          ) : null}
          <View style={s.leg}>
            <View style={s.cdEnd}>
              <Text style={[TXT3.cardNum, { color: T.fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{g.a.v}</Text>
              <Text style={[TXT3.cardNumLbl, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{g.a.l}</Text>
            </View>
            <View style={s.legMid}>
              <View style={[s.legWire, { backgroundColor: CARD.onCardTrack }]} />
              {g.dur ? (
                <View style={[s.dur, s.legDur]}>
                  <Icon name="plane" size={12} color={CARD.onCard} />
                  <Text style={[TXT3.dur, { color: CARD.onCard }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{g.dur}</Text>
                </View>
              ) : null}
            </View>
            <View style={[s.cdEnd, s.cdEndR]}>
              <Text style={[TXT3.cardNum, { color: T.fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{g.b.v}</Text>
              <Text style={[TXT3.cardNumLbl, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{g.b.l}</Text>
            </View>
          </View>
          {g.gap ? (
            <View style={s.legGap}>
              <View style={[s.legGapLine, { backgroundColor: CARD.onCardTrack }]} />
              <Text style={[TXT3.cardNumLbl, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{g.gap}</Text>
              <View style={[s.legGapLine, { backgroundColor: CARD.onCardTrack }]} />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ── A LINHA FINA ──
function Slim({ c, C, onOpen, l }) {
  const AL = a11yLang(l);
  const T = toneOf(C, c.dark ? 'dark' : c.color);
  const a11y = [c.title, c.sub, c.value].filter(Boolean).join('. ');
  const Box = c.open ? TouchableOpacity : View;
  // `longOpen` (a pernoita da Escala: o toque abre os mapas, o toque longo edita o hotel) — dito ao VoiceOver como ação à parte.
  const longP = c.open && c.longOpen ? { onLongPress: () => onOpen(c.longOpen), accessibilityActions: [{ name: 'longpress', label: l('Editar', 'Edit') }], onAccessibilityAction: (e) => { if (e.nativeEvent.actionName === 'longpress') onOpen(c.longOpen); } } : {};
  const props = c.open ? { activeOpacity: 0.85, onPress: () => onOpen(c.open), accessibilityRole: 'button', accessibilityLanguage: AL, accessibilityLabel: a11y, ...longP } : { accessible: true, accessibilityLanguage: AL, accessibilityLabel: a11y };
  return (
    <Box style={[s.slim, { backgroundColor: T.bg }]} {...props}>
      <View style={s.slimT}>
        <Text style={[TXT3.slimTitle, { color: T.fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.title}</Text>
        {c.sub ? <Text style={[TXT3.slimSub, { color: T.sub }]} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE}>{c.sub}</Text> : null}
      </View>
      {c.value ? (c.gain ? <GainChip text={c.value} /> : <Text style={[TXT3.slimVal, { color: T.fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.value}</Text>)
        : c.open ? <View style={[s.go, s.goStatic, { backgroundColor: T.go }]}><Icon name="chevron" size={16} color={T.fg} /></View> : null}
    </Box>
  );
}

// ── LINHAS (as parcelas do mês · os três passos) ──
function Lines({ c, C, onOpen, l }) {
  const AL = a11yLang(l);
  const T = toneOf(C, c.color);
  // Com uma ligação ("Completar", "Como é calculado?") ou linhas que abrem, o cartão NÃO é um botão inteiro: um botão por
  // cima de outro esconde o de dentro ao VoiceOver (revisão independente, 2026-11-11). A ligação é um botão próprio.
  const whole = !!c.open && !c.link && !(c.rows || []).some((r) => r.open);
  const Box = whole ? TouchableOpacity : View;
  const a11y = [c.kind, ...(c.rows || []).map((r) => `${r.k}${r.v ? `: ${r.v}` : ''}`), ...(c.foot || []).map((r) => `${r.k}: ${r.v}`), c.note].filter(Boolean).join('. ');
  const props = whole ? { activeOpacity: 0.85, onPress: () => onOpen(c.open), accessibilityRole: 'button', accessibilityLanguage: AL, accessibilityLabel: a11y } : {};
  const row = (r) => {
    const R = r.open ? TouchableOpacity : View;
    return (
      <R key={r.k} style={s.lineRow} {...(r.open ? { onPress: () => onOpen(r.open), hitSlop: { top: 12, bottom: 12 }, accessibilityRole: 'button', accessibilityLanguage: AL, accessibilityLabel: `${r.k}: ${r.v}` } : {})}>
        <Text style={[TXT3.line, s.lineK, { color: T.fg }]} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE}>{r.k}</Text>
        {r.v ? <Text style={[TXT3.lineVal, { color: T.fg }, r.open ? s.underline : null]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{r.v}</Text> : null}
      </R>
    );
  };
  return (
    <Box style={[s.cd, s.cdMain, { backgroundColor: T.bg }]} {...props}>
      <Text style={[TXT3.kind, { color: T.kind }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.kind}</Text>
      <View style={s.lines} accessible={!whole && !(c.rows || []).some((r) => r.open)} accessibilityLanguage={AL} accessibilityLabel={!whole ? [c.kind, ...(c.rows || []).map((r) => `${r.k}${r.v ? `: ${r.v}` : ''}`)].join('. ') : undefined}>{(c.rows || []).map(row)}</View>
      {c.foot ? <View style={[s.lines, s.foot, { borderTopColor: CARD.rule }]}>{c.foot.map(row)}</View> : null}
      {(c.note || c.link) ? (
        <View style={s.noteRow}>
          {c.note ? <Text style={[TXT3.cardSub, { color: T.sub }]} maxFontSizeMultiplier={MAX_SCALE}>{c.note}</Text> : null}
          {c.link ? (
            <TouchableOpacity onPress={() => onOpen(c.link.open)} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }} accessibilityRole="link" accessibilityLanguage={AL} accessibilityLabel={c.link.label}>
              <Text style={[TXT3.cardSub, s.underline, { color: T.fg }]} maxFontSizeMultiplier={MAX_SCALE}>{c.link.label}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </Box>
  );
}

// ── TEXTO (o que o acordo garante · quando aparecem os serviços) ──
function TextCard({ c, C, onOpen, l }) {
  const AL = a11yLang(l);
  const T = toneOf(C, c.color);
  const Box = c.open ? TouchableOpacity : View;
  const props = c.open ? { activeOpacity: 0.85, onPress: () => onOpen(c.open), accessibilityRole: 'button', accessibilityLanguage: AL, accessibilityLabel: `${c.kind}. ${c.text}` } : { accessible: true, accessibilityLanguage: AL, accessibilityLabel: `${c.kind}. ${c.text}` };
  return (
    <Box style={[s.cd, s.cdMain, { backgroundColor: T.bg }]} {...props}>
      <Text style={[TXT3.kind, { color: T.kind }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.kind}</Text>
      <Text style={[TXT3.text, { color: T.fg }]} maxFontSizeMultiplier={MAX_SCALE}>{c.text}</Text>
    </Box>
  );
}

export function HomeCards({ cards, C, onOpen, l }) {
  return (cards || []).map((c) => {
    const k = `${c.t}-${c.id}`;
    if (c.t === 'card') return <BigCard key={k} c={c} C={C} onOpen={onOpen} l={l} />;
    if (c.t === 'slim') return <Slim key={k} c={c} C={C} onOpen={onOpen} l={l} />;
    if (c.t === 'lines') return <Lines key={k} c={c} C={C} onOpen={onOpen} l={l} />;
    if (c.t === 'text') return <TextCard key={k} c={c} C={C} onOpen={onOpen} l={l} />;
    return null;
  });
}

// Medidas do esboço (390 × 844): topo 0 20 32 · pílulas 38 · folha com raio 32 e 12 de margem · cartão raio 24, 16 de margem.
const s = StyleSheet.create({
  top: { paddingHorizontal: SPACE.lgPlus, paddingBottom: SPACE.xxl },
  // A fila tem SEMPRE a altura do sino (44): trocar o sino pela pílula "Exemplo · sair" (38) fazia a página saltar 6 pt (iPhone, 2026-11-11).
  pills: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingTop: SPACE.sm, paddingBottom: SPACE.lg, minHeight: 44 + SPACE.sm + SPACE.lg },
  pill: { height: 38, paddingHorizontal: SPACE.lg, borderRadius: RADIUS.pill, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderWidth: 1.5, flexShrink: 0 },
  pillOut: { backgroundColor: 'transparent' },
  pillDot: { width: 7, height: 7, borderRadius: RADIUS.pill },
  grow: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'stretch', gap: SPACE.lg, marginTop: SPACE.xs },
  l1Row: { flexDirection: 'row', alignItems: 'baseline' },
  side: { borderLeftWidth: 1.5, paddingLeft: SPACE.lg, justifyContent: 'center', gap: SPACE.md, flexShrink: 1, minWidth: 0 },
  was: { textDecorationLine: 'line-through', opacity: 0.5 },

  cd: { borderRadius: RADIUS.xxl, padding: SPACE.lg, gap: SPACE.md, position: 'relative' },
  cdMain: { gap: SPACE.md },
  cdTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACE.md },
  cdHead: { flex: 1, minWidth: 0 },
  cdTitle: { marginTop: SPACE.xxs },
  goSpace: { width: 36, height: 36 },
  go: { position: 'absolute', top: SPACE.lg, right: SPACE.lg, width: 36, height: 36, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  goStatic: { position: 'relative', top: 0, right: 0 },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md, marginTop: -SPACE.sm, minHeight: 28 },
  subTxt: { flex: 1, minWidth: 0 },
  chip: { height: 28, paddingHorizontal: SPACE.md, borderRadius: RADIUS.pill, backgroundColor: CARD.chip, flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  cdRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: SPACE.sm },
  cdEnd: { flexShrink: 1, minWidth: 0 },
  cdEndR: { alignItems: 'flex-end' },
  dur: { height: 28, paddingHorizontal: SPACE.md, borderRadius: RADIUS.pill, backgroundColor: CARD.dur, alignItems: 'center', justifyContent: 'center', flexShrink: 1 },
  prog: { height: 12, justifyContent: 'center', marginTop: -SPACE.s },
  progTrack: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: RADIUS.pill },
  progFill: { position: 'absolute', left: 0, height: 4, borderRadius: RADIUS.pill },
  progKnob: { position: 'absolute', top: 0, width: 12, height: 12, marginLeft: -SPACE.s, borderRadius: RADIUS.pill, borderWidth: 2.5 },
  act: { height: 44, borderRadius: RADIUS.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, marginTop: SPACE.xxs },
  // B2 · as pernas
  legs: { gap: SPACE.sm },
  legH: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm, marginBottom: SPACE.s },
  fno: { height: 22, paddingHorizontal: SPACE.sm, borderRadius: RADIUS.xs, justifyContent: 'center' },
  leg: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.sm },
  legMid: { flex: 1, minWidth: 0, height: 28, marginBottom: SPACE.sm, alignItems: 'center', justifyContent: 'center' },
  legWire: { position: 'absolute', left: 0, right: 0, height: 1.5, top: 13 },
  legDur: { flexDirection: 'row', gap: SPACE.xs },
  legGap: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.sm },
  legGapLine: { flex: 1, height: 1 },

  slim: { borderRadius: RADIUS.xxl, paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md, minHeight: 56 },
  slimT: { flex: 1, minWidth: 0 },

  lines: { gap: SPACE.sm },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: SPACE.md },
  lineK: { flex: 1, minWidth: 0 },
  foot: { borderTopWidth: 1, paddingTop: SPACE.sm },
  noteRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: SPACE.xs },
  underline: { textDecorationLine: 'underline' },
});
