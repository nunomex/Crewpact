// Cabeçalho canónico da PELE nova — a ÚNICA fonte da anatomia de topo que todos os ecrãs
// partilham (para o fantasma/herói nunca mais divergir entre ecrãs):
//   avatar↖ (ou ‹voltar) + ações + sino↗  ·  eyebrow  ·  FANTASMA (Barlow) + palavra  ·  régua ink
// SEM padding horizontal próprio → herda o GUTTER do contentor de cada ecrã (16 na família · 22 no Info).
// Slots para os casos especiais: `word` pode ser um NÓ (o botão-mês animado da Escala), `wordTrailing`
// (nav ‹› das Estatísticas), `kick` (subtítulo das Validades), `actions` (sincronizar da Escala).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import NotificationsBell from './NotificationsBell';
import { PELE as P, PELE_FONT as F } from '../data/constants';

// Estilo da PALAVRA — exportado para os ecrãs que constroem um `word` personalizado (Escala)
// reutilizarem exatamente o mesmo tamanho (44), sem o re-duplicarem e voltar a divergir.
export const peleWord = { fontFamily: F.display, fontSize: 44, letterSpacing: -0.5, color: P.ink };

export default function PeleHeader({
  eyebrow, ghost, word, wordTrailing, kick,
  initials = '?', onAvatar,
  onBack,                    // se dado → botão ‹voltar em vez do avatar (ecrãs empurrados, ex.: Validades)
  left,                      // nó à ESQUERDA quando não há voltar/avatar (ex.: o sino do Perfil-aba)
  actions,                   // nó à direita, ANTES do sino (ex.: sincronizar/importar da Escala)
  bell = false,              // renderiza o sino real (NotificationsBell) — abre a central de notificações
  size = 'root',             // escala do herói: 'root' (130, abas/topo) · 'detail' (104, empurrados/pessoais)
  rule = true,               // desenha a régua (hr) sob o herói (off quando há algo ENTRE o herói e a régua)
  night = false,             // tema NOTURNO da Living Interface: o disco ink do avatar sumia no papel escuro
  reserveTop = false,        // reserva a ALTURA da linha de topo mesmo sem ações — as abas ficam
                             // todas com o herói à mesma cota (sem isto o herói "saltava" entre abas)
  eyebrowTop = false,        // ABAS (2026-07-10, user): o eyebrow sobe para a LINHA DE TOPO, à
                             // esquerda (o padrão da saudação do Início) — a linha deixa de ser
                             // espaço morto e as ações (sino) vivem à direita. Empurrados: fica
                             // como está (o ‹ voltar é dono do lado esquerdo).
  reserveKick = false,       // reserva a LINHA DO KICK vazia (simétrico do reserveTop): o herói
                             // alinha ao fundo, e sem kick a PALAVRA descia ~24pt face às outras
                             // abas (Escala usa-o — o resumo do mês já faz de kick abaixo da régua)
}) {
  // Linha de topo (avatar/‹voltar + ações + sino) é OPCIONAL: só aparece se o ecrã pedir algo dela.
  // Assim a Escala pode usar só o herói (dentro do gesto de swipe do mês), com a linha de topo à parte.
  const hasTopContent = !!(onBack || onAvatar || bell || actions || left);
  const eybUp = !!(eyebrowTop && eyebrow);
  const showTop = hasTopContent || reserveTop || eybUp;
  const Z = SIZES[size] || SIZES.root;
  const hasHero = ghost != null || word != null;   // herói aparece se houver fantasma OU palavra
  return (
    <View>
      {showTop ? (
      <View style={[s.hdr, (!hasTopContent || eybUp) && s.hdrRes]}>
        {/* Slot esquerdo: ‹voltar > avatar (SÓ com onAvatar — antes renderizava um disco
            morto "?" quando ninguém o pedia) > nó `left` (ex.: sincronizar da Escala) >
            eyebrow-no-topo (abas) > nada. */}
        {onBack
          ? <TouchableOpacity style={s.bk} onPress={onBack} hitSlop={6} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Voltar"><Icon name="back" size={18} color={P.ink} /></TouchableOpacity>
          : onAvatar
            ? <TouchableOpacity style={[s.av, night ? s.avNight : null]} onPress={onAvatar} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Perfil"><Text style={s.avTxt}>{initials}</Text></TouchableOpacity>
            : left || null}
        {eybUp ? <Text style={[s.eyb, s.eybTop]} numberOfLines={1}>{eyebrow}</Text> : null}
        <View style={{ flex: 1 }} />
        {actions}
        {bell ? <NotificationsBell /> : null}
      </View>
      ) : null}

      {hasHero ? (
        <>
          {eyebrow && !eybUp ? <Text style={s.eyb} numberOfLines={1}>{eyebrow}</Text> : null}
          <View style={[s.hero, { minHeight: Z.heroMinH }]}>
            {ghost != null ? <Text style={[s.ghost, { fontSize: Z.ghostSize, lineHeight: Z.ghostLH, top: Z.ghostTop }]} numberOfLines={1} allowFontScaling={false}>{ghost}</Text> : null}
            <View style={s.mrow}>
              {typeof word === 'string' ? <Text style={[s.word, { fontSize: Z.wordSize }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} allowFontScaling={false}>{word}</Text> : word}
              {wordTrailing}
            </View>
            {kick != null
              ? (typeof kick === 'string' ? <Text style={s.kick} numberOfLines={1}>{kick}</Text> : kick)
              : reserveKick ? <Text style={s.kick} numberOfLines={1}>{' '}</Text> : null}
          </View>
          {rule ? <View style={s.hr} /> : null}
        </>
      ) : null}
    </View>
  );
}

// Duas escalas DELIBERADAS do herói (a "régua da casa") — não valores soltos por ecrã:
//   root = ecrãs de topo/abas (fala mais alto) · detail = ecrãs empurrados/pessoais (mais calmo).
// A hierarquia faz-se pelo ‹voltar + eyebrow (à Apple), o tamanho é só o reforço.
// lineHeight do fantasma com FOLGA para diacríticos (2026-07-10: o ^ de "MÊS" era cortado
// pela caixa de linha 132≈130) — o top compensa metade da folga extra, o desenho não mexe.
const SIZES = {
  root:   { heroMinH: 108, ghostSize: 130, ghostLH: 158, ghostTop: -29, wordSize: 44 },
  detail: { heroMinH: 96,  ghostSize: 104, ghostLH: 126, ghostTop: -24, wordSize: 40 },
};

const s = StyleSheet.create({
  hdr: { flexDirection: 'row', alignItems: 'center', paddingTop: 12 },
  // Linha reservada VAZIA (reserveTop): 12 de padding + 36 do disco (sino/avatar) = 48, a
  // mesma cota das filas reais — o herói não salta entre abas.
  hdrRes: { minHeight: 48 },
  av: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.ink, alignItems: 'center', justifyContent: 'center' },
  avNight: { backgroundColor: 'rgba(244,242,237,0.14)' },   // disco claro-translúcido sobre o papel noturno; iniciais amarelas ficam
  avTxt: { color: P.yellow, fontFamily: F.bodyHeavy, fontSize: 14 },
  bk: { width: 34, height: 34, borderRadius: 11, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center' },
  eyb: { fontSize: 11, fontFamily: F.bodyHeavy, letterSpacing: 1.4, textTransform: 'uppercase', color: P.grey, marginTop: 8 },
  // Eyebrow NA linha de topo (abas): sem o marginTop do de baixo, encolhe antes das ações.
  eybTop: { marginTop: 0, flexShrink: 1 },
  hero: { position: 'relative', minHeight: 108, marginTop: 2, justifyContent: 'flex-end', paddingBottom: 8 },
  // right 14 (era 2): o fantasma recua à esquerda p/ dar espaço ao rótulo rodado da margem.
  ghost: { position: 'absolute', right: 14, top: -29, fontFamily: F.display, fontSize: 130, lineHeight: 158, letterSpacing: -4, color: P.ghost },
  mrow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  word: peleWord,
  kick: { fontFamily: F.bodyBold, fontSize: 12.5, color: P.grey, marginTop: 6 },
  hr: { height: 1.5, backgroundColor: P.ink, marginTop: 6, marginBottom: 14 },
});
