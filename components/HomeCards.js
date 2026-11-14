// O INÍCIO 3.0 "cartões de cor" — as peças que desenham o que data/homeCards.js decide (esboço design/inicio-cartoes.html,
// design-system §14, 2026-11-11). Só apresentação: nenhum número nasce aqui.
//   HomeTop   — a pílula do estado (preta, não se toca) + a de contorno (abre o dia na Escala, 38 à vista e 44 de toque)
//               + o sino; a legenda; o número em DUAS linhas e os dois factos ao lado de um fio.
//   HomeCards — a lista da folha: cartão grande · linha fina · linhas (parcelas, passos) · texto.
// Acessibilidade: o cartão inteiro abre o detalhe (um botão com tudo o que diz); o ícone de partilhar e a barra de ação são
// botões À PARTE (irmãos, não filhos — o VoiceOver chega aos três). O número gigante não cresce com a letra grande (a largura
// é calculada pelas métricas da fonte); os cartões crescem e a folha desliza.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Icon from './Icon';
import useReduceMotion from '../hooks/useReduceMotion';
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

// `line`/`track`: a tinta dos traços (a linha do dia, a barra, os fios das pernas) e a linha de fundo — seguem a tinta do cartão,
// para um cartão neutro à noite (O2) não ficar com traços pretos sobre o escuro.
function toneOf(C, color) {
  if (color === 'dark') return { bg: C.ink, fg: C.sheet, sub: C.darkSub, kind: C.darkSub, go: C.darkGo, line: C.sheet, track: C.darkGo };
  if (color === 'neutral' || !C[color]) return { bg: C.neutral, fg: C.ink, sub: C.neutralSub, kind: C.neutralKind, go: C.neutralGo, line: C.ink, track: C.round };
  return { bg: C[color], fg: CARD.onCard, sub: CARD.onCardSub, kind: CARD.onCardKind, go: CARD.go, line: CARD.onCard, track: CARD.onCardTrack };
}

function GainChip({ text }) {
  return (
    <View style={s.chip}><Text style={[TXT3.chip, { color: CARD.gain }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{text}</Text></View>
  );
}

// ── O TOPO ──
// `rightW` = a largura do que está à direita (o sino, 44; ou a pílula "Exemplo · sair").
// compact: só a fila das pílulas (a Escala com um dia aberto — a semana fica em cima e a folha do dia sobe por baixo).
// O TOPO LADO A LADO E IGUAL NAS TRÊS ABAS (L1 de design/topo-lado.html, 2026-11-14): o número em duas linhas à esquerda, no
// tamanho comum (`topGiant` de data/homeCards.js — 62 a 390, 58 a 375), e os factos à direita, com o fio a tinta.
// `titled` (o Início, S2 de design/estados-topo.html, 2026-11-14): o estado deixa de ser a pílula preta e passa a TÍTULO do ecrã
// ("Em voo", "Pernoita", "Folga"), por baixo das pílulas, com o ponto amarelo nos estados ao vivo. A Escala e os Números não têm
// estados e ficam como estavam.
export function HomeTop({ top, C, size, onPill2, right, rightW = 44, l, compact = false, titled = false }) {
  const { width: winW } = useWindowDimensions();
  const AL = a11yLang(l);
  if (!top) return null;
  // As pílulas NUNCA se cortam ("Novem…" no iPhone, 2026-11-11): se as três não cabem numa linha, sai a de contorno
  // (a secundária). Medido com as larguras da Hanken, como o número gigante.
  // A Escala (2026-11-13) usa o mesmo topo sem a pílula preta e com a de contorno como botão do mês (seta ▾ e dica própria).
  const p2W = top.pill2 ? pillWidth(top.pill2.text) + (top.pill2.chevron ? 12 + SPACE.sm : 0) : 0;
  const pillsW = (top.pill && !titled ? pillWidth(top.pill.text, top.pill.live) + SPACE.sm : 0) + (top.pill2 ? p2W + SPACE.sm : 0) + rightW;
  const showP2 = !!top.pill2 && pillsW <= winW - 2 * SPACE.lgPlus;
  const g = top.giant || {};
  const lh = Math.round(size * GIANT_LINE.lh);
  // O aperto entre letras (−0,046 em) também se aplica DEPOIS da última: o iOS mede a caixa ~4 pt mais estreita do que o
  // desenho do último algarismo e, numa linha só, corta-o ("o 8 parece cortado", iPhone 2026-11-11). Devolve-se esse aperto
  // à direita (e tira-se ao espaço antes da unidade, para a distância à vista não mudar).
  const tail = Math.ceil(-size * GIANT.ls);
  const giantStyle = { fontFamily: PELE_FONT.bodyBold, fontSize: size, lineHeight: lh, letterSpacing: size * GIANT.ls, color: C.ink, paddingRight: tail };
  const heroA11y = [top.what, `${g.l1 || ''}${g.unit ? ` ${g.unit}` : ''}`, g.l2 ? `${g.l2}${g.zulu ? `, ${g.zulu.replace(/Z$/, '')} ${l('em UTC', 'UTC')}` : ''}` : null, ...(top.facts || []).map((f) => `${f.tone === 'was' ? l('estava', 'was') + ' ' : ''}${f.v} ${f.l}`)].filter(Boolean).join('. ');
  const P2 = top.pill2 && top.pill2.iso ? TouchableOpacity : View;
  const p2Props = top.pill2 ? (top.pill2.iso ? { onPress: () => onPill2(top.pill2.iso), activeOpacity: 0.7, hitSlop: { top: 6, bottom: 6, left: 4, right: 4 },
    accessibilityRole: 'button', accessibilityLanguage: AL, accessibilityLabel: top.pill2.text, accessibilityHint: top.pill2.hint || l('Abre este dia na Escala', 'Opens this day in the Roster') } : { accessible: true, accessibilityLanguage: AL, accessibilityLabel: top.pill2.text }) : {};
  // T2 (design/estados-s2.html, 2026-11-14): no Início o estado é o TÍTULO, na fila de cima ao lado das Notificações; a pílula do dia
  // (ou do voo) passa para a linha da frase, à direita, mais pequena — continua a abrir o dia na Escala.
  const head = titled && top.pill && !compact;
  return (
    <View style={[s.top, compact ? s.topCompact : null]}>
      <View style={s.pills}>
        {head ? (
          <View style={s.titleWrap} accessible accessibilityRole="header" accessibilityLanguage={AL} accessibilityLabel={top.pill.live ? `${top.pill.text}, ${l('agora', 'now')}` : top.pill.text}>
            <Text style={[TXT3.stateTitle, s.titleTxt, { color: C.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.15}>{top.pill.text}</Text>
            {/* o ponto "ao vivo" com o aro de tinta de dia (S2, design/cores-decisoes.html): o amarelo sozinho dava 1,33:1 sobre a secretária */}
            {top.pill.live ? <View style={[s.stateDot, { backgroundColor: BRAND.signal }, C.liveRing ? [s.stateDotRing, { borderColor: C.liveRing }] : null]} /> : null}
          </View>
        ) : null}
        {top.pill && !titled ? (
          <View style={[s.pill, { backgroundColor: C.ink, borderColor: C.ink }]} accessible accessibilityLanguage={AL} accessibilityLabel={top.pill.text}>
            {top.pill.live ? <View style={[s.pillDot, { backgroundColor: BRAND.signal }]} /> : null}
            <Text style={[TXT3.pill, { color: C.desk }]} numberOfLines={1} allowFontScaling={false}>{top.pill.text}</Text>
          </View>
        ) : null}
        {showP2 && !head ? (
          <P2 style={[s.pill, s.pillOut, { borderColor: C.ink }]} {...p2Props}>
            <Text style={[TXT3.pill, { color: C.ink }]} numberOfLines={1} allowFontScaling={false}>{top.pill2.text}</Text>
            {top.pill2.chevron ? <Icon name="chevron" rot={90} size={12} color={C.ink} /> : null}
          </P2>
        ) : null}
        <View style={s.grow} />
        {right}
      </View>
      {compact ? null : head && top.pill2 ? (
        <View style={s.whatRow}>
          <Text style={[TXT3.what, s.whatTxt, { color: C.soft }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>{top.what}</Text>
          <P2 style={[s.pillSm, { borderColor: C.ink }]} {...p2Props}>
            <Text style={[TXT3.pill, { color: C.ink }]} numberOfLines={1} allowFontScaling={false}>{top.pill2.text}</Text>
            {top.pill2.iso ? <Icon name="chevron" size={11} color={C.ink} /> : null}
          </P2>
        </View>
      ) : <Text style={[TXT3.what, { color: C.soft }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>{top.what}</Text>}
      {compact ? null : <View style={s.hero} accessible accessibilityLanguage={AL} accessibilityLabel={heroA11y}>
        <View style={{ marginTop: -Math.round(size * GIANT_LINE.trim), marginBottom: -Math.round(size * GIANT_LINE.trim) }}>
          <View style={s.l1Row}>
            <Text style={giantStyle} numberOfLines={1} allowFontScaling={false}>{g.l1}</Text>
            {g.unit ? <Text style={[TXT3.unit, { marginLeft: GIANT.unitGap - tail, color: C.ink }]} numberOfLines={1} allowFontScaling={false}>{g.unit}</Text> : null}
          </View>
          {g.l2 && g.zulu ? (
            // A hora UTC do report ao lado do sítio, na letra dos factos (a) de design/meteo-topo.html) — como a unidade na 1.ª linha.
            <View style={[s.l1Row, { marginTop: -Math.round(size * (GIANT_LINE.lh - GIANT_LINE.lead)) }]}>
              <Text style={[giantStyle, { color: g.l2Grey ? C.grey : C.ink }]} numberOfLines={1} allowFontScaling={false}>{g.l2}</Text>
              <Text style={[TXT3.fact, { marginLeft: GIANT.zuluGap - tail, color: C.ink }]} numberOfLines={1} allowFontScaling={false}>{g.zulu}</Text>
            </View>
          ) : g.l2 ? (
            <Text style={[giantStyle, { color: g.l2Grey ? C.grey : C.ink, marginTop: -Math.round(size * (GIANT_LINE.lh - GIANT_LINE.lead)) }]} numberOfLines={1} allowFontScaling={false}>{g.l2}</Text>
          ) : null}
        </View>
        {top.facts && top.facts.length ? (
          <View style={[s.side, { borderLeftColor: C.ink }]}>
            {top.facts.map((f) => (
              <View key={`${f.v}-${f.l}`}>
                {f.ic ? (
                  // o tempo: o ícone à frente do valor (GIANT.factIc + factIcGap entram na largura medida)
                  <View style={s.factIcRow}>
                    <Icon name={f.ic} size={GIANT.factIc} color={C.ink} />
                    <Text style={[TXT3.fact, s.factIcV, { color: C.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false}>{f.v}</Text>
                  </View>
                ) : (
                <Text style={[TXT3.fact, { color: f.tone === 'gain' ? C.gainOut : C.ink }, f.tone === 'was' ? s.was : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false}>{f.v}</Text>
                )}
                <Text style={[TXT3.factLbl, { color: C.soft }]} numberOfLines={1} allowFontScaling={false}>{f.l}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>}
    </View>
  );
}

// ── O CARTÃO GRANDE ──
function BigCard({ c, C, onOpen, l }) {
  const AL = a11yLang(l);
  const T = toneOf(C, c.color);
  const legsA11y = Array.isArray(c.legs) ? c.legs.map((g) => [g.fno, `${g.a.l} ${g.a.v}`, g.dur, `${g.b.l} ${g.b.v}`, g.z, g.gap].filter(Boolean).join(', ')) : [];
  const lineA11y = c.line ? [c.line.stops ? c.line.stops.join(', ') : null, ...c.line.pts.map((x) => `${x.l} ${x.v}`)].filter(Boolean).join(', ') : null;
  const a11y = [c.kind, c.title, c.cities, c.flightNo, c.sub, c.gain && `${c.gainLbl || ''} ${c.gain}`.trim(), lineA11y, c.quiet && `${c.quiet.l}, ${c.quiet.sub}, ${c.quiet.r.k} ${c.quiet.r.v}`, ...legsA11y, c.a && `${c.a.l} ${c.a.v}`, c.dur, c.b && `${c.b.l} ${c.b.v}`].filter(Boolean).join('. ');
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
            {/* `swatch` (O2): um cartão de tipo que não é o principal fica neutro, com o quadradinho da sua cor antes do rótulo */}
            {c.swatch && C[c.swatch] ? (
              <View style={s.kindRow}>
                <View style={[s.swatch, { backgroundColor: C[c.swatch] }]} />
                <Text style={[TXT3.kind, s.kindTxt, { color: T.kind }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.kind}</Text>
              </View>
            ) : <Text style={[TXT3.kind, { color: T.kind }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.kind}</Text>}
            <Text style={[TXT3.cardTitle, s.cdTitle, { color: T.fg }]} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE}>{c.title}</Text>
            {c.cities ? <Text style={[TXT3.cardSub, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.cities}</Text> : null}
          </View>
          <View style={s.goSpace} />
        </View>
        {c.line ? (
          // O CARTÃO DO VOO E3 (design/cartoes-c2.html E3 + cartoes-e3.html V2 + cartoes-limite.html L2): o nº do voo e o per diem com o
          // nome · o dia pela ordem em que acontece · o limite numa linha discreta (quando está dentro).
          <>
            {c.sub ? <Text style={[TXT3.cardSub, { color: T.sub }]} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE}>{c.sub}</Text> : null}
            {(c.flightNo || c.gain) ? (
              <View style={s.e3Badges}>
                {c.flightNo ? (
                  <View style={[s.fnoBadge, { backgroundColor: T.go }]}>
                    <Icon name="plane" size={12} color={T.fg} />
                    <Text style={[TXT3.badge, { color: T.fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.flightNo}</Text>
                  </View>
                ) : <View />}
                {c.gain ? (
                  <View style={s.e3Gain}>
                    {c.gainLbl ? <Text style={[TXT3.cardNumLbl, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.gainLbl}</Text> : null}
                    <GainChip text={c.gain} />
                  </View>
                ) : null}
              </View>
            ) : null}
            <DayLine line={c.line} T={T} />
            {c.quiet ? (
              // duas filas fixas: em cima o veredicto (e o repouso na véspera) e a margem; em baixo o PSV, em pequeno
              <View style={[s.quiet, { borderTopColor: CARD.rule }]}>
                <View style={s.quietRow}>
                  <Text style={[TXT3.dur, s.quietL, { color: T.fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.quiet.rest ? `${c.quiet.l} · ${c.quiet.rest}` : c.quiet.l}</Text>
                  <Text style={[TXT3.cardSub, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>
                    {`${c.quiet.r.k} `}<Text style={[TXT3.lineVal, { color: T.fg }]}>{c.quiet.r.v}</Text>
                  </Text>
                </View>
                <Text style={[TXT3.cardSub, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.quiet.sub}</Text>
              </View>
            ) : null}
          </>
        ) : (c.sub || c.gain) ? (
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
            <View style={[s.progTrack, { backgroundColor: T.track }]} />
            <View style={[s.progFill, { width: `${c.pct}%`, backgroundColor: T.line }]} />
            <View style={[s.progKnob, { left: `${c.pct}%`, backgroundColor: T.line, borderColor: T.bg }]} />
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

// ── A LINHA DO DIA (o cartão do voo E3) ──
// Os pontos em posições fixas — 4: 0 · 30 · 70 · 100 % (report · parte · chega · fim; o meio é dos voos); 3: 0 · 50 · 100;
// 2: as pontas. A parte preta é o voo (da partida à última chegada). Com 3 sítios ou mais (V2), um traço por voo, com uma folga em
// cada escala, e os aeroportos por cima. Os números não crescem com a letra (como os do topo): a linha tem de caber.
// 4 pontos: 0 · 30 · 70 · 100 % — a 25 % o report e a partida ficavam a ~5 pt um do outro a 390 e ~2 pt a 375 (medido, 2026-11-14).
const LINE_POS = { 2: [0, 100], 3: [0, 50, 100], 4: [0, 30, 70, 100] };
const LINE_BOX = 76;   // a caixa centrada de cada ponto do meio (largura; o texto centra-se nela)
function DayLine({ line, T }) {
  const pts = line.pts || [];
  const pos = LINE_POS[pts.length] || pts.map((_, i) => (pts.length > 1 ? (100 * i) / (pts.length - 1) : 0));
  const mids = pts.map((x, i) => (!x.end ? i : -1)).filter((i) => i >= 0);
  const a = mids.length ? pos[mids[0]] : (line.stops ? 30 : null);
  const b = mids.length ? pos[mids[mids.length - 1]] : (line.stops ? 70 : null);
  const stops = line.stops || null;
  const k = stops ? stops.length - 1 : 1;
  const at = (i) => a + ((b - a) * i) / k;
  const segs = a == null || b == null || b <= a ? [] : (stops ? Array.from({ length: k }, (_, i) => [at(i), at(i + 1), i > 0, i < k - 1]) : [[a, b, false, false]]);
  return (
    <View style={s.dl} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {stops ? (
        <View style={s.dlCodes}>
          {stops.map((c, i) => (
            <View key={`${c}-${i}`} style={[s.dlBox, { left: `${at(i)}%`, transform: [{ translateX: -LINE_BOX / 2 }] }]}>
              <Text style={[TXT3.kind, { color: T.kind }]} numberOfLines={1} allowFontScaling={false}>{c}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={s.dlPts}>
        {/* a linha e os voos atrás dos pontos (centrados no ponto de 14: a linha a 6, os voos a 5) */}
        <View style={[s.dlTrack, { backgroundColor: T.track }]} />
        {segs.map(([x0, x1, gl, gr], i) => (
          <View key={i} style={[s.dlSegBox, { left: `${x0}%`, width: `${x1 - x0}%` }]}>
            <View style={[s.dlSeg, gl ? s.dlGapL : null, gr ? s.dlGapR : null, { backgroundColor: T.line }]} />
          </View>
        ))}
        {pts.map((x, i) => {
          const first = i === 0, last = i === pts.length - 1;
          const place = first ? s.dlFirst : last ? s.dlLast : [s.dlBox, { left: `${pos[i]}%`, transform: [{ translateX: -LINE_BOX / 2 }] }];
          return (
            <View key={`${x.l}-${i}`} style={[s.dlPt, place]}>
              <View style={[s.dlDot, x.end ? { backgroundColor: T.bg, borderColor: T.line } : { backgroundColor: T.line, borderColor: T.bg }]} />
              <Text style={[TXT3.fact, { color: T.fg }]} numberOfLines={1} allowFontScaling={false}>{x.v}</Text>
              <Text style={[TXT3.cardNumLbl, { color: T.sub }]} numberOfLines={1} allowFontScaling={false}>{x.l}</Text>
            </View>
          );
        })}
      </View>
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
          {(g.fno || g.z || g.dh) ? (
            <View style={s.legH}>
              {/* DH = perna de posicionamento: não conta como setor (ORO.FTL.215(a)) — o Detalhe antigo marcava-a e o cartão também. */}
              {(g.fno || g.dh) ? <View style={[s.fno, { backgroundColor: T.go }]}><Text style={[TXT3.kind, { color: T.fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{[g.fno, g.dh ? 'DH' : null].filter(Boolean).join(' · ')}</Text></View> : <View />}
              {g.z ? <Text style={[TXT3.cardNumLbl, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{g.z}</Text> : null}
            </View>
          ) : null}
          <View style={s.leg}>
            <View style={s.cdEnd}>
              <Text style={[TXT3.cardNum, { color: T.fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{g.a.v}</Text>
              <Text style={[TXT3.cardNumLbl, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{g.a.l}</Text>
            </View>
            <View style={s.legMid}>
              <View style={[s.legWire, { backgroundColor: T.track }]} />
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
              <View style={[s.legGapLine, { backgroundColor: T.track }]} />
              <Text style={[TXT3.cardNumLbl, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{g.gap}</Text>
              <View style={[s.legGapLine, { backgroundColor: T.track }]} />
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
  const a11y = [c.kind, c.title, c.sub, c.valueLbl && c.value ? `${c.valueLbl} ${c.value}` : c.value].filter(Boolean).join('. ');
  const Box = c.open ? TouchableOpacity : View;
  // `longOpen` (a pernoita da Escala: o toque abre os mapas, o toque longo edita o hotel) — dito ao VoiceOver como ação à parte.
  const longP = c.open && c.longOpen ? { onLongPress: () => onOpen(c.longOpen), accessibilityActions: [{ name: 'longpress', label: l('Editar', 'Edit') }], onAccessibilityAction: (e) => { if (e.nativeEvent.actionName === 'longpress') onOpen(c.longOpen); } } : {};
  const props = c.open ? { activeOpacity: 0.85, onPress: () => onOpen(c.open), accessibilityRole: 'button', accessibilityLanguage: AL, accessibilityLabel: a11y, ...longP } : { accessible: true, accessibilityLanguage: AL, accessibilityLabel: a11y };
  return (
    <Box style={[s.slim, { backgroundColor: T.bg }, c.dashed ? [s.slimDashed, { borderColor: C.neutralKind }] : null]} {...props}>
      {/* `ring` (a Escala, P1): o anel do tipo num disco branco à frente — liga a cor do dia no mês a este serviço */}
      {c.ring ? <View style={s.ringLead}><View style={[s.ringIn, { borderColor: c.ring }]} /></View> : null}
      {/* `mark` (mapa B): o ✕ de um aviso fora do limite, num disco à frente — a cor não é o único sinal */}
      {c.mark ? <View style={s.ringLead}><Text style={[TXT3.badge, { color: CARD.onCard }]} allowFontScaling={false}>{c.mark}</Text></View> : null}
      {/* `swatch` (O2): uma linha de tipo que não é a principal fica neutra, com o quadradinho da sua cor à frente */}
      {c.swatch && C[c.swatch] ? <View style={[s.swatchLead, { backgroundColor: C[c.swatch] }]} /> : null}
      <View style={s.slimT}>
        {c.kind ? <Text style={[TXT3.kind, { color: T.kind }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.kind}</Text> : null}
        <Text style={[TXT3.slimTitle, { color: T.fg }]} numberOfLines={c.kind ? 2 : 1} maxFontSizeMultiplier={MAX_SCALE}>{c.title}</Text>
        {c.sub ? <Text style={[TXT3.slimSub, { color: T.sub }]} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE}>{c.sub}</Text> : null}
      </View>
      {c.value ? (c.gain ? <GainChip text={c.value} /> : c.valueLbl ? (
        // a hora à direita com o que é por baixo ("05:40" · "report"), como numa agenda (B3 afinada)
        <View style={s.slimValBox}>
          <Text style={[TXT3.fact, { color: T.fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.value}</Text>
          <Text style={[TXT3.cardNumLbl, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.valueLbl}</Text>
        </View>
      ) : <Text style={[TXT3.slimVal, { color: T.fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.value}</Text>)
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

// ── W1 · A VERIFICAÇÃO (antes do report; design/calma-uau.html W1, escolhida pelo Nuno a 2026-11-14) ──
// Três sinais — Voo · Avião · Aeroporto — numa linha neutra; o que cada um diz vem pronto de data/homeCards.js. O anel DESENHA-SE
// quando o sinal passa a certo: o traço de um SVG, que só o thread JS anima (motion §2: useNativeDriver false "quando a propriedade
// obriga", como a largura das barras); 700 ms out(cubic), escalonados 180 ms (§3, dados a crescer); o visto assenta a seguir (220 ms).
// Só anima quando um sinal PASSA a certo (ao montar, ou com dado novo) — nunca a cada abertura; com os movimentos reduzidos aparece
// já fechado (§5). Sem dados ou por ver: o anel a tracejado, sem visto. A cor é a tinta do cartão (sem verde: dentro sem cor).
const ACircle = Animated.createAnimatedComponent(Circle);
const APath = Animated.createAnimatedComponent(Path);
const RING_R = 9.5;
const RING_C = 2 * Math.PI * RING_R;
const TICK_L = 13;   // o comprimento do visto (M7.6 12.4 l3 3 l5.8 -6.2 ≈ 4,2 + 8,5)
function CheckRing({ ok, T, i, reduce }) {
  const start = ok === true && !reduce ? 0 : 1;
  const ring = React.useRef(new Animated.Value(start)).current;
  const tick = React.useRef(new Animated.Value(start)).current;
  const was = React.useRef(false);
  React.useEffect(() => {
    if (ok !== true) { was.current = false; return undefined; }
    if (was.current) return undefined;
    was.current = true;
    if (reduce) { ring.setValue(1); tick.setValue(1); return undefined; }
    ring.setValue(0); tick.setValue(0);
    const anim = Animated.sequence([
      Animated.delay(250 + i * 180),
      Animated.timing(ring, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(tick, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]);
    anim.start();
    // se a animação for interrompida (o cartão sai, os movimentos reduzidos ligam a meio), fica no fim — nunca meio anel
    return () => { anim.stop(); ring.setValue(1); tick.setValue(1); };
  }, [ok, reduce, i, ring, tick]);
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" style={s.ckRing}>
      <Circle cx={12} cy={12} r={RING_R} fill="none" stroke={ok === true ? T.track : T.kind} strokeWidth={2} strokeDasharray={ok === true ? undefined : '2.5 3.2'} />
      {ok === true ? (
        <>
          <ACircle cx={12} cy={12} r={RING_R} fill="none" stroke={T.line} strokeWidth={2.2} strokeLinecap="round" transform="rotate(-90 12 12)"
            strokeDasharray={`${RING_C} ${RING_C}`} strokeDashoffset={ring.interpolate({ inputRange: [0, 1], outputRange: [RING_C, 0] })} />
          <APath d="M7.6 12.4l3 3 5.8-6.2" fill="none" stroke={T.line} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={`${TICK_L} ${TICK_L}`} strokeDashoffset={tick.interpolate({ inputRange: [0, 1], outputRange: [TICK_L, 0] })} />
        </>
      ) : null}
    </Svg>
  );
}
function Checks({ c, C, l }) {
  const AL = a11yLang(l);
  const T = toneOf(C, c.color);
  const reduce = useReduceMotion();
  const a11y = [c.title, ...(c.items || []).map((x) => `${x.k}: ${x.v}`), c.seen].filter(Boolean).join('. ');
  // `plain` (a folga, F2): os três sinais pousam na folha, sem caixa, por baixo da voz — alinhados com o texto dos cartões
  return (
    <View style={c.plain ? s.ckPlain : [s.ck, { backgroundColor: T.bg }]} accessible accessibilityLanguage={AL} accessibilityLabel={a11y}>
      {c.title || c.seen ? (
        <View style={s.ckHead}>
          <Text style={[TXT3.slimTitle, s.ckTitle, { color: T.fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.title}</Text>
          {c.seen ? <Text style={[TXT3.cardNumLbl, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.seen}</Text> : null}
        </View>
      ) : null}
      <View style={s.ckRow}>
        {(c.items || []).map((x, i) => (
          <View key={x.k} style={s.ckItem}>
            <CheckRing ok={x.ok} T={T} i={i} reduce={reduce} />
            <View style={s.ckTxt}>
              <Text style={[TXT3.checkK, { color: T.fg }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={MAX_SCALE}>{x.k}</Text>
              <Text style={[TXT3.slimSub, { color: T.sub }]} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE}>{x.v}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── E2 · "A ESCALA MUDOU" COM O QUÊ E QUANDO (design/escala-mudou.html E2, escolhida pelo Nuno a 2026-11-14) ──
// O cartão âmbar com o "!": em cima o tipo, quantas e "lido às"; uma linha por alteração (o dia grande à esquerda, o que mudou com o
// antes riscado e o novo a cheio, o pormenor por baixo; o cancelado riscado); "e mais N"; a barra "Rever e aceitar". O cartão inteiro
// é um botão que abre a revisão (a barra é o sinal dela). Os textos vêm prontos de data/homeCards.js.
function Changes({ c, C, onOpen, l }) {
  const AL = a11yLang(l);
  const T = toneOf(C, c.color);
  const rowsA11y = (c.rows || []).map((r) => [`${r.wd} ${r.day}`, r.k, r.old && r.v ? l(`de ${r.old} para ${r.v}`, `from ${r.old} to ${r.v}`) : null, r.sub].filter(Boolean).join(', '));
  const a11y = [c.kind, c.title, c.seen, ...rowsA11y, c.more ? l(`e mais ${c.more}`, `and ${c.more} more`) : null, c.action && c.action.note].filter(Boolean).join('. ');
  return (
    <TouchableOpacity style={[s.chg, { backgroundColor: T.bg }]} activeOpacity={0.85} onPress={() => onOpen(c.open)}
      accessibilityRole="button" accessibilityLanguage={AL} accessibilityLabel={a11y} accessibilityHint={l('Abre a revisão', 'Opens the review')}>
      <View style={s.chgHead}>
        {c.mark ? <View style={s.ringLead}><Text style={[TXT3.badge, { color: CARD.onCard }]} allowFontScaling={false}>{c.mark}</Text></View> : null}
        <View style={s.chgHeadT}>
          <Text style={[TXT3.kind, { color: T.kind }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.kind}</Text>
          <Text style={[TXT3.slimTitle, { color: T.fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.title}</Text>
        </View>
        {c.seen ? <Text style={[TXT3.cardNumLbl, s.chgSeen, { color: T.sub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.seen}</Text> : null}
      </View>
      <View style={[s.chgList, { backgroundColor: CARD.go }]}>
        {(c.rows || []).map((r, i) => (
          <View key={`${r.day}-${i}`} style={[s.chgRow, i > 0 ? [s.chgRowRule, { borderTopColor: CARD.onCardTrack }] : null]}>
            <View style={s.chgDay}>
              <Text style={[TXT3.fact, { color: T.fg }]} allowFontScaling={false}>{r.day}</Text>
              <Text style={[TXT3.kind, { color: T.kind }]} allowFontScaling={false}>{r.wd}</Text>
            </View>
            <View style={s.chgTxt}>
              <Text style={[TXT3.lineVal, { color: T.fg }]} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE}>
                {r.k}{r.old ? ' ' : ''}{r.old ? <Text style={[s.chgOld, { color: T.sub }]}>{r.old}</Text> : null}{r.v ? ` ${r.v}` : ''}
              </Text>
              {r.sub ? <Text style={[TXT3.slimSub, r.struck ? s.chgOld : null, { color: T.sub }]} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE}>{r.sub}</Text> : null}
            </View>
          </View>
        ))}
        {c.more ? <Text style={[TXT3.slimSub, s.chgMore, { color: T.sub }]} maxFontSizeMultiplier={MAX_SCALE}>{l(`e mais ${c.more}`, `and ${c.more} more`)}</Text> : null}
      </View>
      {c.action ? (
        <View style={[s.chgAct, { backgroundColor: CARD.act }]}>
          <Text style={[TXT3.act, { color: CARD.onCard }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.action.label}</Text>
          {c.action.note ? <Text style={[TXT3.cardNumLbl, { color: CARD.onCardSub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.action.note}</Text> : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ── V2 · A VOZ (design/voz.html V2 + design/folga-1-2.html F2, escolhidas pelo Nuno a 2026-11-14) ──
// Uma frase na folha, sem caixa, por cima dos cartões: o negrito grande e a cauda mais leve, na letra da app (o bilhete manuscrito do
// v6 traduzido para o 3.0). A que leva a algum lado (o marco → os Números) toca-se e leva ›; as outras ficam quietas.
function Voice({ c, C, onOpen, l }) {
  const AL = a11yLang(l);
  const body = (
    <>
      <Text style={[TXT3.voiceB, { color: C.ink }]} maxFontSizeMultiplier={MAX_SCALE}>{c.bold}</Text>
      {c.tail || c.open ? <Text style={[TXT3.voiceT, { color: C.soft }]} maxFontSizeMultiplier={MAX_SCALE}>{`${c.tail || ''}${c.open ? ' ›' : ''}`}</Text> : null}
    </>
  );
  const label = [c.bold, c.tail].filter(Boolean).join(' ');
  return c.open ? (
    <TouchableOpacity style={s.voice} activeOpacity={0.7} onPress={() => onOpen(c.open)} accessibilityRole="button" accessibilityLanguage={AL} accessibilityLabel={label}>{body}</TouchableOpacity>
  ) : (
    <View style={s.voice} accessible accessibilityLanguage={AL} accessibilityLabel={label}>{body}</View>
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
    if (c.t === 'checks') return <Checks key={k} c={c} C={C} l={l} />;
    if (c.t === 'changes') return <Changes key={k} c={c} C={C} onOpen={onOpen} l={l} />;
    if (c.t === 'voice') return <Voice key={k} c={c} C={C} onOpen={onOpen} l={l} />;
    // o cabeçalho de secção (o próximo serviço noutro dia: "Amanhã · quinta 12") — mais ar por cima, junto da linha de baixo
    if (c.t === 'hdr') return <Text key={k} style={[TXT3.pill, s.hdr, { color: C.soft }]} accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.text}</Text>;
    return null;
  });
}

// Medidas do esboço (390 × 844): topo 0 20 32 · pílulas 38 · folha com raio 32 e 12 de margem · cartão raio 24, 16 de margem.
const s = StyleSheet.create({
  top: { paddingHorizontal: SPACE.lgPlus, paddingBottom: SPACE.xxl },
  topCompact: { paddingBottom: SPACE.lg },
  // W1 · a verificação: o título e o "visto" numa fila; os três sinais lado a lado, o anel à esquerda do nome
  ck: { borderRadius: RADIUS.xxl, paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg, gap: SPACE.sm },
  ckHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: SPACE.sm },
  ckTitle: { flexShrink: 1 },
  ckRow: { flexDirection: 'row', gap: SPACE.sm },
  ckItem: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.s, minWidth: 0 },
  ckTxt: { flex: 1, minWidth: 0 },
  ckRing: { marginTop: SPACE.xxs },
  ckPlain: { paddingHorizontal: SPACE.lg, paddingBottom: SPACE.sm, gap: SPACE.sm },
  // V2 · a voz: na folha, alinhada com o texto dos cartões (como o cabeçalho de secção)
  voice: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.xs, paddingBottom: SPACE.sm, gap: SPACE.xxs },
  // E2 · as alterações da escala: o cabeçalho com o "!"; a lista num fundo branco translúcido; o dia numa coluna; a barra no fundo
  chg: { borderRadius: RADIUS.xxl, paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg, gap: SPACE.sm },
  chgHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  chgHeadT: { flex: 1, minWidth: 0 },
  chgSeen: { alignSelf: 'flex-start', marginTop: SPACE.xxs },
  chgList: { borderRadius: RADIUS.lg, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs },
  chgRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.s },
  chgRowRule: { borderTopWidth: StyleSheet.hairlineWidth },
  chgDay: { width: 32, alignItems: 'center' },
  chgTxt: { flex: 1, minWidth: 0 },
  chgOld: { textDecorationLine: 'line-through' },
  chgMore: { paddingVertical: SPACE.s },
  chgAct: { minHeight: 44, borderRadius: RADIUS.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm, paddingHorizontal: SPACE.lg },
  // A fila tem SEMPRE a altura do sino (44): trocar o sino pela pílula "Exemplo · sair" (38) fazia a página saltar 6 pt (iPhone, 2026-11-11).
  pills: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingTop: SPACE.sm, paddingBottom: SPACE.lg, minHeight: 44 + SPACE.sm + SPACE.lg },
  pill: { height: 38, paddingHorizontal: SPACE.lg, borderRadius: RADIUS.pill, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderWidth: 1.5, flexShrink: 0 },
  pillOut: { backgroundColor: 'transparent' },
  pillDot: { width: 7, height: 7, borderRadius: RADIUS.pill },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, flexShrink: 1, minWidth: 0 },
  titleTxt: { flexShrink: 1 },
  whatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm },
  whatTxt: { flex: 1, minWidth: 0 },
  pillSm: { height: 30, paddingHorizontal: SPACE.md, borderRadius: RADIUS.pill, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: SPACE.xs, flexShrink: 0 },
  stateDot: { width: 10, height: 10, borderRadius: RADIUS.pill },
  stateDotRing: { width: 14, height: 14, borderWidth: 2 },   // o aro por fora: o amarelo continua com 10 por dentro
  grow: { flex: 1 },
  l1Row: { flexDirection: 'row', alignItems: 'baseline' },
  // o número à esquerda e os factos à direita, com o fio (16 entre eles — GIANT.gap; 16 de recuo — GIANT.sidePad). 12 por baixo da
  // frase (E2 de design/topo-frase.html, 2026-11-14): com 4, no iPhone os pés do "p"/"g"/"ç" ficavam a ~5 pt dos algarismos (o iOS
  // corta por cima a linha de 1,1 em e o número sobe); com 12 ficam ~13, e por cima da frase continuam ~20 até às pílulas.
  hero: { flexDirection: 'row', alignItems: 'stretch', gap: SPACE.lg, marginTop: SPACE.md },
  side: { borderLeftWidth: 1.5, paddingLeft: SPACE.lg, justifyContent: 'center', gap: SPACE.md, flexShrink: 1, minWidth: 0 },
  was: { textDecorationLine: 'line-through', opacity: 0.5 },

  cd: { borderRadius: RADIUS.xxl, padding: SPACE.lg, gap: SPACE.md, position: 'relative' },
  cdMain: { gap: SPACE.md },
  cdTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACE.md },
  cdHead: { flex: 1, minWidth: 0 },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  kindTxt: { flexShrink: 1 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  swatchLead: { width: 12, height: 12, borderRadius: 4 },
  cdTitle: { marginTop: SPACE.xxs },
  goSpace: { width: 36, height: 36 },
  go: { position: 'absolute', top: SPACE.lg, right: SPACE.lg, width: 36, height: 36, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  goStatic: { position: 'relative', top: 0, right: 0 },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md, marginTop: -SPACE.sm, minHeight: 28 },
  subTxt: { flex: 1, minWidth: 0 },
  factIcRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },   // = GIANT.factIcGap
  // o cartão do voo E3
  e3Badges: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md, marginTop: -SPACE.xs },
  fnoBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs, paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xxs, borderRadius: RADIUS.sm },
  e3Gain: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  quiet: { borderTopWidth: 1, paddingTop: SPACE.sm, gap: SPACE.xxs },
  quietRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: SPACE.sm },
  quietL: { flex: 1, minWidth: 0 },
  dl: { marginTop: SPACE.xxs },
  dlCodes: { height: 16, marginBottom: SPACE.xxs },
  dlBox: { position: 'absolute', top: 0, width: LINE_BOX, alignItems: 'center' },
  dlTrack: { position: 'absolute', left: 7, right: 7, top: 6, height: 2 },
  dlSegBox: { position: 'absolute', top: 5, height: 4 },
  dlSeg: { flex: 1, borderRadius: 2 },
  dlGapL: { marginLeft: SPACE.xs },
  dlGapR: { marginRight: SPACE.xs },
  dlPts: { height: 54 },
  dlPt: { position: 'absolute', top: 0, gap: SPACE.xxs },
  dlFirst: { left: 0, alignItems: 'flex-start' },
  dlLast: { right: 0, alignItems: 'flex-end' },
  dlDot: { width: 14, height: 14, borderRadius: RADIUS.pill, borderWidth: 3 },
  slimDashed: { borderWidth: 1.5, borderStyle: 'dashed' },
  slimValBox: { alignItems: 'flex-end', flexShrink: 0 },
  hdr: { paddingHorizontal: SPACE.lg, marginTop: SPACE.sm, marginBottom: -SPACE.xs },
  factIcV: { flexShrink: 1 },
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
  ringLead: { width: 30, height: 30, borderRadius: RADIUS.pill, backgroundColor: CARD.chip, alignItems: 'center', justifyContent: 'center', marginLeft: -SPACE.xs },
  ringIn: { width: 18, height: 18, borderRadius: RADIUS.pill, borderWidth: 3.5 },

  lines: { gap: SPACE.sm },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: SPACE.md },
  lineK: { flex: 1, minWidth: 0 },
  foot: { borderTopWidth: 1, paddingTop: SPACE.sm },
  noteRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: SPACE.xs },
  underline: { textDecorationLine: 'underline' },
});
