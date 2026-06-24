import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, TYPE, RADIUS } from '../data/constants';
import { useTheme } from '../data/appContext';
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

export function UpcomingDutiesCard({ duties, lang, limit = 4 }) {
  const C = useTheme(); const s = makeStyles(C);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const list = upcoming(duties, isoOf(new Date())).slice(0, limit);
  return (
    <View style={s.card}>
      <Text style={s.eyebrow}>{lang === 'en' ? 'UPCOMING' : 'PRÓXIMAS ATIVIDADES'}</Text>
      {list.length ? list.map((d, i) => (
        <View key={d.iso} style={[s.lrow, i > 0 && s.lrowBorder]}>
          <Ionicons name={KIND_ICON[d.kind || 'flight'] || 'ellipse-outline'} size={14} color={C.sub} />
          <Text style={s.lday}>{fmtDay(d.iso, locale)}</Text>
          <Text style={s.ltxt} numberOfLines={1}>{dutyLine(d, lang)}{d.report_time ? ` · ${d.report_time}` : ''}{d.nightStop ? ' · 🌙' : ''}</Text>
        </View>
      )) : <Text style={s.empty}>{lang === 'en' ? 'No upcoming duties' : 'Sem atividades futuras'}</Text>}
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 16, marginBottom: 13 },
  eyebrow: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.sub, fontFamily: FONT.heavy, marginBottom: 6 },
  empty: { fontSize: TYPE.sub, color: C.sub, fontFamily: FONT.medium, paddingVertical: 4 },
  lrow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  lrowBorder: { borderTopWidth: 1, borderTopColor: C.line },
  lday: { fontSize: TYPE.label, fontFamily: FONT.bold, color: C.text, width: 92 },
  ltxt: { fontSize: TYPE.label, color: C.sub, fontFamily: FONT.medium, flex: 1 },
});
