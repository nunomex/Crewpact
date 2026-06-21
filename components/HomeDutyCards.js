import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, TYPE } from '../data/constants';
import { useTheme } from '../data/appContext';
import { t } from '../data/i18n';

// Três cartões de duty para a Home (avaliação — escolher um, eliminar os outros):
//   • TodayDutyCard      — a duty de HOJE (qualquer tipo)
//   • NextDutyCard       — a PRÓXIMA duty (qualquer tipo), com tipo + paragem
//   • UpcomingDutiesCard — lista das próximas atividades
// Lêem o store `duties` { iso: { kind, route, report_time, sectors, nightStop, deleted } }.

const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const KIND_ICON = { flight: 'airplane', standby_airport: 'time-outline', standby_home: 'home-outline', positioning: 'swap-horizontal', office: 'business-outline', training: 'school-outline' };

const fmtDay = (iso, locale) => {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return iso;
  const s = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// duties não apagadas, de `fromISO` para a frente, ordenadas por data.
const upcoming = (duties, fromISO) => Object.keys(duties || {})
  .filter((iso) => duties[iso] && !duties[iso].deleted && iso >= fromISO)
  .sort()
  .map((iso) => ({ iso, ...duties[iso] }));

const dutyLine = (d, lang) => {
  if (!d.kind || d.kind === 'flight') return d.route || (lang === 'en' ? 'Flight' : 'Voo');
  return t('duties.kind.' + d.kind, lang);
};
const metaLine = (d, lang) => [
  d.report_time ? `Report ${d.report_time}` : null,
  d.sectors ? `${d.sectors} ${t('duties.sectorsShort', lang)}` : null,
].filter(Boolean).join(' · ');

// ── Card 1 — duty de HOJE ─────────────────────────────────────────────────────
export function TodayDutyCard({ duties, lang }) {
  const C = useTheme(); const s = makeStyles(C);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const today = isoOf(new Date());
  const d = duties?.[today];
  const has = d && !d.deleted;
  return (
    <View style={s.card}>
      <Text style={s.eyebrow}>{lang === 'en' ? 'TODAY' : 'HOJE'} · {fmtDay(today, locale)}</Text>
      {has ? (
        <>
          <View style={s.row}>
            <Ionicons name={KIND_ICON[d.kind || 'flight'] || 'ellipse-outline'} size={16} color={C.red} />
            <Text style={s.title} numberOfLines={1}>{dutyLine(d, lang)}</Text>
          </View>
          {metaLine(d, lang) ? <Text style={s.meta} numberOfLines={1}>{metaLine(d, lang)}</Text> : null}
          {d.nightStop ? <Text style={s.night}>🌙 {lang === 'en' ? 'Night stop' : 'Paragem nocturna'}</Text> : null}
        </>
      ) : <Text style={s.empty}>{lang === 'en' ? 'No duty today' : 'Sem duty hoje'}</Text>}
    </View>
  );
}

// ── Card 2 — PRÓXIMA duty (qualquer tipo) ─────────────────────────────────────
export function NextDutyCard({ duties, lang }) {
  const C = useTheme(); const s = makeStyles(C);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const d = upcoming(duties, isoOf(new Date()))[0];
  return (
    <View style={s.card}>
      <Text style={s.eyebrow}>{lang === 'en' ? 'NEXT DUTY' : 'PRÓXIMA DUTY'}</Text>
      {d ? (
        <>
          <View style={s.row}>
            <Ionicons name={KIND_ICON[d.kind || 'flight'] || 'ellipse-outline'} size={16} color={C.red} />
            <Text style={s.title} numberOfLines={1}>{fmtDay(d.iso, locale)} · {dutyLine(d, lang)}</Text>
          </View>
          {metaLine(d, lang) ? <Text style={s.meta} numberOfLines={1}>{metaLine(d, lang)}</Text> : null}
          {d.nightStop ? <Text style={s.night}>🌙 {lang === 'en' ? 'Night stop' : 'Paragem nocturna'}</Text> : null}
        </>
      ) : <Text style={s.empty}>{lang === 'en' ? 'No upcoming duty' : 'Sem duties futuras'}</Text>}
    </View>
  );
}

// ── Card 3 — lista das próximas atividades ────────────────────────────────────
export function UpcomingDutiesCard({ duties, lang, limit = 3 }) {
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
      )) : <Text style={s.empty}>{lang === 'en' ? 'No upcoming duties' : 'Sem duties futuras'}</Text>}
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 16, marginBottom: 13 },
  eyebrow: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.sub, fontFamily: FONT.heavy, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: TYPE.value, fontFamily: FONT.bold, color: C.text, flex: 1 },
  meta: { fontSize: TYPE.label, color: C.sub, fontFamily: FONT.medium, marginTop: 4 },
  night: { fontSize: TYPE.label, color: C.text, fontFamily: FONT.semibold, marginTop: 6 },
  empty: { fontSize: TYPE.sub, color: C.sub, fontFamily: FONT.medium },
  lrow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  lrowBorder: { borderTopWidth: 1, borderTopColor: C.line },
  lday: { fontSize: TYPE.label, fontFamily: FONT.bold, color: C.text, width: 92 },
  ltxt: { fontSize: TYPE.label, color: C.sub, fontFamily: FONT.medium, flex: 1 },
});
