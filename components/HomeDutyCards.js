import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, TYPE, RADIUS } from '../data/constants';
import { useTheme } from '../data/appContext';
import Eyebrow from './Eyebrow';
import { t } from '../data/i18n';

// Card da Home com a lista das PRÓXIMAS ATIVIDADES (qualquer tipo de duty).
// Lê o store `duties` { iso: { kind, route, report_time, nightStop, deleted } }.
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const KIND_ICON = { flight: 'airplane', standby_airport: 'time-outline', standby_home: 'home-outline', positioning: 'swap-horizontal', office: 'business-outline', training: 'school-outline' };

const fmtDay = (iso, locale) => {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return iso;
  const s = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const dutyLine = (d, lang) => (!d.kind || d.kind === 'flight') ? (d.route || (lang === 'en' ? 'Flight' : 'Voo')) : t('duties.kind.' + d.kind, lang);

// duties não apagadas, de hoje para a frente, ordenadas por data.
const upcoming = (duties, fromISO) => Object.keys(duties || {})
  .filter((iso) => duties[iso] && !duties[iso].deleted && iso >= fromISO)
  .sort()
  .map((iso) => ({ iso, ...duties[iso] }));

// `bare` = sem a moldura de card (para EMBEBER dentro do card Serviços, por baixo do
// serviço em destaque). VOO → expande em SETORES (cada setor = um voo: `dep→arr · off · Set i/n`);
// não-voo → uma linha. No serviço em DESTAQUE (`featuredISO`) salta os setores já passados/ativo
// (índice ≤ `activeIdx`); sem setores → salta o duty inteiro (já está no card de cima).
export function UpcomingDutiesCard({ duties, lang, limit = 4, bare = false, featuredISO = null, activeIdx = null }) {
  const C = useTheme(); const s = makeStyles(C);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const days = upcoming(duties, isoOf(new Date()));
  const out = [];
  for (const d of days) {
    const isF = (!d.kind || d.kind === 'flight');
    const legs = (isF && Array.isArray(d.legs)) ? d.legs.filter((lg) => lg && (lg.dep || lg.arr)) : [];
    if (legs.length) {
      legs.forEach((lg, i) => {
        if (d.iso === featuredISO && activeIdx != null && i <= activeIdx) return;   // já passou / é o ativo
        out.push({ key: `${d.iso}-${i}`, iso: d.iso, type: 'sector', dep: lg.dep, arr: lg.arr, off: lg.off, sector: i + 1, total: legs.length, nightStop: !!d.nightStop && i === legs.length - 1 });
      });
    } else {
      if (d.iso === featuredISO) continue;   // voo antigo / não-voo em destaque → já está no card
      out.push({ key: d.iso, iso: d.iso, type: 'duty', kind: d.kind, route: d.route, report_time: d.report_time, nightStop: !!d.nightStop });
    }
  }
  const list = out.slice(0, limit);
  if (bare && !list.length) return null;
  const inner = (
    <>
      <Eyebrow style={{ marginBottom: 6 }}>{lang === 'en' ? 'UPCOMING' : 'PRÓXIMAS ATIVIDADES'}</Eyebrow>
      {list.length ? list.map((e, i) => (
        <View key={e.key} style={[s.lrow, i > 0 && s.lrowBorder]}>
          <Ionicons name={e.type === 'sector' ? 'airplane' : (KIND_ICON[e.kind || 'flight'] || 'ellipse-outline')} size={14} color={C.sub} />
          <Text style={s.lday}>{fmtDay(e.iso, locale)}</Text>
          <Text style={s.ltxt} numberOfLines={1}>{e.type === 'sector'
            ? `${e.dep || '?'}→${e.arr || '?'}${e.off ? ` · ${e.off}` : ''} · ${lang === 'en' ? 'Sec' : 'Set'} ${e.sector}/${e.total}${e.nightStop ? ' · 🌙' : ''}`
            : `${dutyLine(e, lang)}${e.report_time ? ` · ${e.report_time}` : ''}${e.nightStop ? ' · 🌙' : ''}`}</Text>
        </View>
      )) : <Text style={s.empty}>{lang === 'en' ? 'No upcoming duties' : 'Sem atividades futuras'}</Text>}
    </>
  );
  return bare ? <View style={s.bare}>{inner}</View> : <View style={s.card}>{inner}</View>;
}

const makeStyles = (C) => StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 16, marginBottom: 13 },
  bare: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 14, paddingTop: 13 },   // embebido no card Serviços
  empty: { fontSize: TYPE.sub, color: C.sub, fontFamily: FONT.medium, paddingVertical: 4 },
  lrow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  lrowBorder: { borderTopWidth: 1, borderTopColor: C.line },
  lday: { fontSize: TYPE.label, fontFamily: FONT.bold, color: C.text, width: 92 },
  ltxt: { fontSize: TYPE.label, color: C.sub, fontFamily: FONT.medium, flex: 1 },
});
