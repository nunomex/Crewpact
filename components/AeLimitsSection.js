// LIMITES DO ACORDO — a secção dos Números (esboço design/limites-ae.html, ecrã 1, aprovado 2026-11-03;
// referências: lista agrupada do Credit Karma + aviso no topo do YNAB, em referencias/limites/).
// Aviso curto no topo → grupos pelo resultado (Excede · Incerto · Dentro); cada cartão tem a regra e a
// cláusula em pequeno e uma frase que diz o que se passa. O "Dentro" fica numa lista compacta. Tocar abre a
// folha da regra (components/AeLimitSheet). Os números vêm do motor (ae/tapLimits.js); as frases, de
// data/tapLimitsText.js. Nunca "legal": "Dentro / Excede / Incerto".
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { PELE, TXT, SPACE, RADIUS } from '../data/constants';
import { groupRules, describe, summaryFor, ruleTitle, clauseShort } from '../data/tapLimitsText';
import { docFor } from '../ae/tapLimits';
import { select } from '../data/haptics';

export const statusWord = (st, lang) => (lang === 'en'
  ? { excede: 'Exceeds', incerto: 'Uncertain', dentro: 'Within' }[st]
  : { excede: 'Excede', incerto: 'Incerto', dentro: 'Dentro' }[st]);

export function StatusPill({ status, lang }) {
  const tone = status === 'excede' ? s.pillEx : status === 'incerto' ? s.pillIn : s.pillOk;
  const txt = status === 'excede' ? s.pillExT : status === 'incerto' ? s.pillInT : s.pillOkT;
  return <View style={[s.pill, tone]}><Text style={[s.pillT, txt]}>{statusWord(status, lang)}</Text></View>;
}

export default function AeLimitsSection({ result, crewType, lang = 'pt', todayIso = null, onOpen }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  if (!result || !Array.isArray(result.rules) || !result.rules.length) return null;
  const g = groupRules(result, todayIso);
  const doc = docFor(crewType);
  const nEx = g.excede.length, nIn = g.incerto.length;
  const first = g.excede[0] || g.incerto[0] || null;
  const open = (id) => { select(); if (onOpen) onOpen(id); };
  const sumTxt = [
    nEx ? (nEx === 1 ? l('1 excede', '1 exceeds') : l(`${nEx} excedem`, `${nEx} exceed`)) : null,
    nIn ? (nIn === 1 ? l('1 incerto', '1 uncertain') : l(`${nIn} incertos`, `${nIn} uncertain`)) : null,
  ].filter(Boolean).join(' · ');

  const card = (it) => {
    const d = describe(it.id, it.lead, lang, crewType);
    const more = it.count > 1 ? l(` · e mais ${it.count - 1}`, ` · and ${it.count - 1} more`) : '';
    return (
      <TouchableOpacity key={it.id} style={s.card} activeOpacity={0.85} onPress={() => open(it.id)}
        accessibilityRole="button" accessibilityLabel={`${ruleTitle(it.id, lang)}, ${statusWord(it.status, lang)}. ${d.say}`}>
        <View style={s.row1}>
          <Text style={s.cat} numberOfLines={1}>{ruleTitle(it.id, lang)} · {clauseShort(it.id)}</Text>
          <StatusPill status={it.status} lang={lang} />
        </View>
        <Text style={s.say}>{d.say}</Text>
        {d.det || more ? <Text style={s.det}>{d.det}{more}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <Text style={s.eyb}>{l('Limites do acordo', 'Agreement limits')}</Text>
      <Text style={s.sub}>{l(`${doc.doc} (${doc.bte}), a partir da tua escala. Só o médio curso.`, `${doc.doc} (${doc.bte}), from your roster. Medium haul only.`)}</Text>

      {first ? (
        <TouchableOpacity style={[s.sum, nEx ? s.sumEx : s.sumIn]} activeOpacity={0.85} onPress={() => open(first.id)}
          accessibilityRole="button" accessibilityLabel={sumTxt}>
          <View style={[s.sumDot, { backgroundColor: nEx ? PELE.red : PELE.grey }]} />
          <Text style={s.sumTxt}>{sumTxt}</Text>
          <Icon name="chevron" size={14} color={PELE.grey} />
        </TouchableOpacity>
      ) : null}

      {nEx ? <Text style={s.glab}><Text style={s.glabB}>{statusWord('excede', lang)}</Text> · {nEx}</Text> : null}
      {g.excede.map(card)}
      {nIn ? <Text style={s.glab}><Text style={s.glabB}>{statusWord('incerto', lang)}</Text> · {nIn}</Text> : null}
      {g.incerto.map(card)}
      {g.dentro.length ? (
        <>
          <Text style={s.glab}><Text style={s.glabB}>{statusWord('dentro', lang)}</Text> · {g.dentro.length}</Text>
          <View style={s.list}>
            {g.dentro.map((it, i) => (
              <TouchableOpacity key={it.id} style={[s.li, i === g.dentro.length - 1 && s.liLast]} activeOpacity={0.85} onPress={() => open(it.id)}
                accessibilityRole="button" accessibilityLabel={`${ruleTitle(it.id, lang)}, ${statusWord('dentro', lang)}, ${summaryFor(it.rule, lang)}`}>
                <Text style={s.liName} numberOfLines={1}>{ruleTitle(it.id, lang)}</Text>
                <Text style={s.liVal} numberOfLines={1}>{summaryFor(it.rule, lang)}</Text>
                <Icon name="chevron" size={13} color={PELE.ghost} />
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      {/* O que a v1 ainda não avalia: à vista, sem ser "Incerto" (não é o AE que deixa a dúvida). */}
      {g.pendente.lc || g.pendente.semAeroporto ? (
        <>
          <Text style={s.glab}>{l('Ainda não avaliado', 'Not assessed yet')}</Text>
          <View style={s.list}>
            {g.pendente.lc ? (
              <View style={[s.li, !g.pendente.semAeroporto && s.liLast]}>
                <Text style={s.liName} numberOfLines={1}>{l('Longo curso', 'Long haul')}</Text>
                <Text style={s.liVal}>{g.pendente.lc} {g.pendente.lc === 1 ? l('serviço', 'duty') : l('serviços', 'duties')}</Text>
              </View>
            ) : null}
            {g.pendente.semAeroporto ? (
              <View style={[s.li, s.liLast]}>
                <Text style={s.liName} numberOfLines={1}>{l('Aeroporto desconhecido', 'Unknown airport')}</Text>
                <Text style={s.liVal}>{g.pendente.semAeroporto} {g.pendente.semAeroporto === 1 ? l('serviço', 'duty') : l('serviços', 'duties')}</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.pendNote}>
            {g.pendente.lc ? l('A app ainda só avalia o médio curso. ', 'The app only assesses medium haul for now. ') : ''}
            {g.pendente.semAeroporto ? l('Sem a posição de um aeroporto, não se sabe se o voo é de médio curso. ', 'Without an airport position, it cannot tell whether the flight is medium haul. ') : ''}
            {l('Nestes serviços vale a regra europeia, que a app já calcula.', 'In these duties the EU rules apply, which the app already computes.')}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  eyb:   { ...TXT.eyebrow, color: PELE.grey },
  sub:   { ...TXT.footnote, color: PELE.grey, marginTop: SPACE.xs },
  sum:   { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.md, paddingHorizontal: SPACE.md, paddingVertical: SPACE.md, marginTop: SPACE.md },
  sumEx: { backgroundColor: PELE.redSoft },
  sumIn: { backgroundColor: PELE.soft },
  sumDot: { width: 8, height: 8, borderRadius: RADIUS.pill },
  sumTxt: { ...TXT.bodyStrong, color: PELE.ink, flex: 1 },
  glab:  { ...TXT.eyebrow, color: PELE.grey, marginTop: SPACE.lgPlus, marginBottom: SPACE.sm, marginLeft: SPACE.xs },
  glabB: { color: PELE.ink },
  card:  { borderWidth: 1.5, borderColor: PELE.line, borderRadius: RADIUS.lg, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, gap: SPACE.s, marginBottom: SPACE.sm, backgroundColor: PELE.paper },
  row1:  { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  cat:   { ...TXT.tag, color: PELE.grey, flex: 1 },
  say:   { ...TXT.headline, color: PELE.ink },
  det:   { ...TXT.footnote, color: PELE.grey },
  pill:  { borderRadius: RADIUS.pill, paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs },
  pillT: { ...TXT.tag },
  pillEx: { backgroundColor: PELE.redSoft }, pillExT: { color: PELE.red },
  pillIn: { backgroundColor: PELE.soft },    pillInT: { color: PELE.grey },
  pillOk: { backgroundColor: PELE.okSoft },  pillOkT: { color: PELE.ok },
  list:  { borderWidth: 1.5, borderColor: PELE.line, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: PELE.paper },
  li:    { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: 44, paddingHorizontal: SPACE.md, borderBottomWidth: 1, borderBottomColor: PELE.line },
  liLast: { borderBottomWidth: 0 },
  liName: { ...TXT.bodyStrong, color: PELE.ink, flex: 1 },
  liVal: { ...TXT.footnote, color: PELE.grey },
  pendNote: { ...TXT.footnote, color: PELE.grey, marginTop: SPACE.sm, marginHorizontal: SPACE.xs },
});
