import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C as _C, RADIUS, TYPE, FONT } from '../data/constants';
import Eyebrow from './Eyebrow';
import { t } from '../data/i18n';
import { useTheme } from '../App';

// Invólucro de calculadora. Por defeito estático (eyebrow + caixa).
// Com `collapsible`, vira acordeão (fechado se `defaultOpen={false}`).
export function CalcCard({ title = 'CALCULADORA', children, style, collapsible = false, defaultOpen = true }) {
  const C = useTheme();
  const c = makeC(C);
  const [open, setOpen] = useState(defaultOpen);
  if (collapsible) {
    return (
      <View style={[c.acc, style]}>
        <TouchableOpacity style={c.accHead} activeOpacity={0.7} onPress={() => setOpen(o => !o)}>
          <Ionicons name="calculator-outline" size={13} color={C.red} />
          <Eyebrow>{title}</Eyebrow>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.sub} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        {open && <View style={c.accBody}>{children}</View>}
      </View>
    );
  }
  return (
    <View style={style}>
      <View style={c.head}>
        <Ionicons name="calculator-outline" size={13} color={C.red} />
        <Eyebrow>{title}</Eyebrow>
      </View>
      <View style={c.inner}>{children}</View>
    </View>
  );
}

// Bloco de resultado (caixa preta, número a vermelho).
// API flexível: `lines` (multi-linha [{label,val}]) OU `label`+`value` (linha única).
// `audit` (opcional) torna o resultado auditável: estado + secção expansível
// "Como foi calculado" (regra, entradas, fórmula/passos, resultado, justificação).
export function ResultBlock({ label = 'TOTAL', value, foot, lines, valueSize = TYPE.display, audit, lang = 'pt' }) {
  const C = useTheme();
  const c = makeC(C);
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
          <View style={[c.validDot, { backgroundColor: valid.ok ? C.green : C.red }]} />
          <Text style={[c.validTxt, { color: valid.ok ? C.green : C.red }]}>{valid.label}</Text>
        </View>
      ) : null}

      {foot ? <Text style={c.resFoot}>{foot}</Text> : null}

      {audit ? (
        <>
          <TouchableOpacity style={c.auditToggle} activeOpacity={0.7} onPress={() => setOpen(o => !o)}>
            <Text style={c.auditToggleTxt}>{t('audit.how', lang)}</Text>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color="rgba(255,255,255,0.6)" />
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
                <Text style={[c.auditV, { color: C.red }]}>{audit.result}</Text>
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

const makeC = (C) => StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  inner: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.md, padding: 14 },
  acc: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.card },
  accHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accBody: { marginTop: 12 },
  result: { marginTop: 12, backgroundColor: C.ink, borderRadius: 12, padding: 14 },
  resLabel: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontFamily: FONT.semibold, textTransform: 'uppercase' },
  resVal: { color: C.red, fontFamily: FONT.medium, marginTop: 2 },
  resFoot: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 8, lineHeight: 16 },

  validRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  validDot: { width: 7, height: 7, borderRadius: 4 },
  validTxt: { fontSize: TYPE.micro, fontFamily: FONT.bold, letterSpacing: 0.3, textTransform: 'uppercase' },

  auditToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 10 },
  auditToggleTxt: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: 'rgba(255,255,255,0.85)' },
  auditBody: { marginTop: 4 },
  auditHd: { fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)', fontFamily: FONT.bold, textTransform: 'uppercase', marginTop: 14, marginBottom: 5 },
  auditRule: { fontSize: TYPE.sub, fontFamily: FONT.bold, color: '#fff' },
  auditText: { fontSize: TYPE.micro, color: 'rgba(255,255,255,0.7)', lineHeight: 17, marginTop: 3 },
  auditKv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 3 },
  auditK: { fontSize: TYPE.micro, color: 'rgba(255,255,255,0.6)', flex: 1 },
  auditV: { fontSize: TYPE.micro, fontFamily: FONT.semibold, color: '#fff' },
  auditFormula: { fontSize: TYPE.sub, fontFamily: FONT.medium, color: '#fff', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  auditStep: { fontSize: TYPE.micro, color: 'rgba(255,255,255,0.7)', lineHeight: 18, marginTop: 4 },
  auditResult: { marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 8 },
});
