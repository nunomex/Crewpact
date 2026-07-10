import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import Eyebrow from './Eyebrow';
import { PELE as P, PELE_NIGHT as N, PELE_FONT as F } from '../data/constants';
import { t } from '../data/i18n';

// Invólucro de calculadora. Por defeito estático (eyebrow + caixa).
// Com `collapsible`, vira acordeão (fechado se `defaultOpen={false}`).
// PELE-FICADO por dentro (2026-07-10), API intacta.
export function CalcCard({ title = 'CALCULADORA', children, style, collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (collapsible) {
    return (
      <View style={[c.acc, style]}>
        <TouchableOpacity style={c.accHead} activeOpacity={0.7} onPress={() => setOpen(o => !o)}>
          <Icon name="gauge" size={13} color={P.ink} />
          <Eyebrow>{title}</Eyebrow>
          <Icon name="chevron" rot={open ? -90 : 90} size={14} color={P.grey} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        {open && <View style={c.accBody}>{children}</View>}
      </View>
    );
  }
  return (
    <View style={style}>
      <View style={c.head}>
        <Icon name="gauge" size={13} color={P.ink} />
        <Eyebrow>{title}</Eyebrow>
      </View>
      <View style={c.inner}>{children}</View>
    </View>
  );
}

// Bloco de resultado (placa ink, número a AMARELO — o amarelo da pele vive nos totais).
// API flexível: `lines` (multi-linha [{label,val}]) OU `label`+`value` (linha única).
// `audit` (opcional) torna o resultado auditável: estado + secção expansível
// "Como foi calculado" (regra, entradas, fórmula/passos, resultado, justificação).
// Estados ok/erro sobre a placa usam os tons NOTURNOS (luminosidade p/ fundo escuro).
export function ResultBlock({ label = 'TOTAL', value, foot, lines, valueSize = 30, audit, lang = 'pt' }) {
  const [open, setOpen] = useState(false);
  const data = lines || [{ label, val: value }];
  const valid = audit?.valid;
  return (
    <View style={c.result}>
      {data.map((ln, i) => (
        <View key={i} style={{ marginTop: i ? 10 : 0 }}>
          <Text style={c.resLabel}>{ln.label}</Text>
          <Text style={[c.resVal, { fontSize: valueSize }]}>{ln.val}</Text>
        </View>
      ))}

      {valid ? (
        <View style={c.validRow}>
          <View style={[c.validDot, { backgroundColor: valid.ok ? N.ok : N.red }]} />
          <Text style={[c.validTxt, { color: valid.ok ? N.ok : N.red }]}>{valid.label}</Text>
        </View>
      ) : null}

      {foot ? <Text style={c.resFoot}>{foot}</Text> : null}

      {audit ? (
        <>
          <TouchableOpacity style={c.auditToggle} activeOpacity={0.7} onPress={() => setOpen(o => !o)}>
            <Text style={c.auditToggleTxt}>{t('audit.how', lang)}</Text>
            <Icon name="chevron" rot={open ? -90 : 90} size={13} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          {open ? (
            <View style={c.auditBody}>
              <Text style={c.auditHd}>{t('audit.rule', lang)}</Text>
              <Text style={c.auditRule}>{audit.rule.ref} · {audit.rule.name}</Text>
              <Text style={c.auditText}>{audit.rule.summary}</Text>

              <Text style={c.auditHd}>{t('audit.inputs', lang)}</Text>
              {audit.inputs.map((it, i) => (
                <View key={i} style={c.auditKv}>
                  <Text style={c.auditK}>{it.label}</Text>
                  <Text style={c.auditV}>{it.value}</Text>
                </View>
              ))}

              <Text style={c.auditHd}>{t('audit.calc', lang)}</Text>
              {audit.formula ? <Text style={c.auditFormula}>{audit.formula}</Text> : null}
              {(audit.steps || []).map((st, i) => <Text key={i} style={c.auditStep}>· {st}</Text>)}

              <View style={[c.auditKv, c.auditResult]}>
                <Text style={c.auditK}>{t('audit.result', lang)}</Text>
                <Text style={[c.auditV, { color: P.yellow }]}>{audit.result}</Text>
              </View>

              {audit.why ? (
                <>
                  <Text style={c.auditHd}>{t('audit.why', lang)}</Text>
                  <Text style={c.auditText}>{audit.why}</Text>
                </>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const c = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  inner: { borderWidth: 1, borderColor: P.line, borderRadius: 14, padding: 14 },
  acc: { borderWidth: 1, borderColor: P.line, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: P.paper },
  accHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accBody: { marginTop: 12 },
  result: { marginTop: 12, backgroundColor: P.ink, borderRadius: 14, padding: 14 },
  resLabel: { fontSize: 10, letterSpacing: 2, color: P.onInkSub, fontFamily: F.bodyHeavy, textTransform: 'uppercase' },
  resVal: { color: P.yellow, fontFamily: F.display, marginTop: 2, fontVariant: ['tabular-nums'] },
  resFoot: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: F.bodyMed, marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 8, lineHeight: 16 },

  validRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  validDot: { width: 7, height: 7, borderRadius: 4 },
  validTxt: { fontSize: 10, fontFamily: F.bodyHeavy, letterSpacing: 0.3, textTransform: 'uppercase' },

  auditToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 10 },
  auditToggleTxt: { fontSize: 12, fontFamily: F.body, color: 'rgba(255,255,255,0.85)' },
  auditBody: { marginTop: 4 },
  auditHd: { fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.6)', fontFamily: F.bodyHeavy, textTransform: 'uppercase', marginTop: 14, marginBottom: 5 },
  auditRule: { fontSize: 12, fontFamily: F.bodyBold, color: '#FFFFFF' },
  auditText: { fontSize: 11, fontFamily: F.bodyMed, color: 'rgba(255,255,255,0.7)', lineHeight: 17, marginTop: 3 },
  auditKv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 3 },
  auditK: { fontSize: 11, fontFamily: F.bodyMed, color: 'rgba(255,255,255,0.7)', flex: 1 },
  auditV: { fontSize: 11, fontFamily: F.body, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  auditFormula: { fontSize: 12, fontFamily: F.bodyMed, color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontVariant: ['tabular-nums'] },
  auditStep: { fontSize: 11, fontFamily: F.bodyMed, color: 'rgba(255,255,255,0.7)', lineHeight: 18, marginTop: 4 },
  auditResult: { marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 8 },
});
