import React, { useContext, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PELE, PELE_FONT, GUTTER } from '../data/constants';
import Icon from '../components/Icon';
import PeleSide from '../components/PeleSide';
import PeleHeader from '../components/PeleHeader';
import DutyFormSheet from '../components/DutyFormSheet';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, isoDay, toZulu } from '../data/appContext';
import { computeDuty, fatigueFromDuty } from '../ftl';
import { sectorDistanceNM } from '../data/airports';
import { roleEurFor } from '../data/perdiem';
import { nightStopStation, hotelMapsUrl, hotelTelUrl } from '../data/hotels';
import HotelSheet from '../components/HotelSheet';
import { legZulu } from '../data/zulu';

const minToHhmm = (min) => { if (!min) return ''; const h = Math.floor(min / 60), m = min % 60; return `${h}:${String(m).padStart(2, '0')}`; };
const clkMin = (str) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(str || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };

// Detalhe de um serviço (read-only) — o "Ver tudo" da folha do dia. Fiel a design/detalhe-servico.html:
// herói (rota + FANTASMA=FDP + estado FTL) + painéis Horário·Setores·FTL/Segurança·Pernoita·Pagamento.
// Tudo derivado dos motores (computeDuty/fatigueFromDuty + ae.perDiem) — a duty NÃO guarda FDP/per-diem.
// "Editar" abre o DutyFormSheet partilhado; apagar SÓ nos manuais (a fonte manda nos importados).
export default function DutyDetailScreen({ route, navigation }) {
  const ctxAll = useContext(AppContext);
  const { lang, duties, ae, crewAt, removeDuty } = ctxAll;
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState(false);
  const [hotelOpen, setHotelOpen] = useState(false);   // folha "Hotel da pernoita" (registar/editar)

  const date = route.params?.date;
  const duty = date ? duties[date] : null;
  const goBack = () => {
    if (edited) navigation.navigate('EscalaMain', { flashDuty: date, flashTs: Date.now() });
    else navigation.goBack();
  };
  const confirmDelete = () => {
    Alert.alert(t('duties.delTitle', lang), t('duties.delMsg', lang), [
      { text: t('common.cancel', lang), style: 'cancel' },
      { text: t('duties.delConfirm', lang), style: 'destructive', onPress: () => { select(); removeDuty && removeDuty(date); navigation.goBack(); } },
    ]);
  };

  const BackBtn = () => (
    <View style={s.topbar}>
      <TouchableOpacity style={s.bk} onPress={goBack} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('common.back', lang)}>
        <Icon name="back" size={18} color={PELE.ink} />
      </TouchableOpacity>
    </View>
  );

  if (!duty || duty.deleted) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <BackBtn />
        <View style={{ padding: GUTTER }}>
          <Text style={s.muted}>{l('Serviço não encontrado.', 'Duty not found.')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const kind = duty.kind || 'flight';
  const isFlight = kind === 'flight';
  const isManual = !duty.source || duty.source === 'manual';
  const todayISO = isoDay();
  const hasEnd = !!(duty.report_time && duty.block_on);

  // ── Motor FTL (só com report; realizados só com block-on) — débrief SÓ em voo (ORO.FTL.235c). ──
  const pf = !isFlight ? 0 : (duty.signOff && duty.block_on)
    ? (() => { const on = clkMin(duty.block_on), so = clkMin(duty.signOff); return (on == null || so == null) ? (ctxAll.postFlightMin || 0) : (so >= on ? so - on : so + 1440 - on); })()
    : (ctxAll.postFlightMin || 0);
  const spD = duty.special || {};
  const d = duty.report_time
    ? computeDuty({ state: 'acc', report: duty.report_time, end: duty.block_on || null, sectors: duty.sectors || 0, postFlightMin: pf,
        isPilot: ctxAll.isPilot, augmented: spD.augmented || null, delayedFrom: spD.delayedFrom || null, preStandby: spD.preStandby || null, discretion: !!spD.discretion })
    : null;
  const fat = (d && hasEnd) ? fatigueFromDuty(d) : null;
  const sbAccD = kind === 'standby_airport' && !!duty.accommodation;
  const over = sbAccD ? false : !!(d && d.fdp && (d.discretion ? d.discretion.over : d.fdp.over));

  // ── Per-diem (motor AE) — só voo, piloto AE, rota completa ──
  const stations = String(duty.route || '').split(/[^A-Za-z]+/).map((x) => x.toUpperCase()).filter(Boolean);
  const catD = crewAt(date).category;   // categoria EM VIGOR no mês desta duty (effective-dated)
  let perDiem = null;
  if (ae && catD && isFlight && stations.length >= 2) {
    const dists = []; let ok = true;
    for (let i = 0; i + 1 < stations.length; i++) {
      const nm = sectorDistanceNM(stations[i], stations[i + 1]);
      if (nm == null) { ok = false; break; }
      dists.push(nm);
    }
    if (ok && dists.length) perDiem = ae.perDiem(catD, dists, 1, ctxAll.crewFleet);
  }
  const nsEur = (duty.nightStop && ae && ae.nightStop && catD) ? ae.nightStop(catD) : null;

  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const fmtDate = (iso) => {
    const dt = new Date(`${iso}T00:00:00`); if (isNaN(dt)) return iso;
    const str = dt.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  const fmtEur0 = (n) => { if (n == null) return '—'; const [i, dd] = Number(n).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${dd}` : `${g},${dd} €`; };
  const legs = Array.isArray(duty.legs) ? duty.legs : [];
  const firstLeg = legs[0] || null, lastLeg = legs[legs.length - 1] || null;
  const tv = (hhmm) => { const z = toZulu(date, hhmm); return z ? `${hhmm}  ·  ${z}Z` : hhmm; };
  const tvL = (hhmm, leg, which) => { const z = legZulu(date, leg, which) || toZulu(date, hhmm); return z ? `${hhmm}  ·  ${z}Z` : hhmm; };
  const routeStr = stations.length > 1 ? stations.join(' → ') : (duty.route || l('Voo', 'Flight'));
  const headMain = isFlight
    ? routeStr
    : (duty.block_on && duty.block_on !== duty.report_time ? `${duty.report_time} – ${duty.block_on}` : (duty.report_time || '—'));
  const sources = { manual: l('Manual', 'Manual'), calendar: l('Calendário', 'Calendar'), pdf: 'PDF' };

  // ── Herói (mockup): fantasma = FDP realizado (ou duty hours); kick = nº de voo · setores · pernoita ──
  const heroGhost = (d && hasEnd && d.fdp && d.fdp.actualFdpStr) || (d && d.dutyPeriodStr) || '';
  const nSec = legs.length || (duty.sectors || 0);
  const secLbl = nSec ? `${nSec} ${nSec === 1 ? l('setor', 'sector') : l('setores', 'sectors')}` : null;
  const kickParts = [
    (firstLeg && firstLeg.flightNo) ? firstLeg.flightNo : null,
    secLbl,
    duty.nightStop ? l('pernoita', 'night stop') : null,
  ].filter(Boolean);
  // Pílula de estado FTL (verde dentro / vermelho excede / neutra sem dados de fim).
  const statusPill = (!d || !hasEnd)
    ? { tone: 'neutral', txt: l('sem dados de fim', 'no end data') }
    : over
      ? { tone: 'red', txt: l('Excede o limite FTL', 'Exceeds FTL limit') }
      : { tone: 'ok', txt: l('Dentro do limite FTL', 'Within FTL limit') };

  // Fadiga — cores da pele
  const fatBg = (b) => b === 'high' ? PELE.redSoft : b === 'elevated' ? PELE.warnSoft : b === 'low' ? PELE.okSoft : PELE.soft;
  const fatDotC = (b) => b === 'high' ? PELE.red : b === 'elevated' ? PELE.warn : b === 'low' ? PELE.ok : PELE.grey;
  const fatTxtC = (b) => b === 'high' ? PELE.red : b === 'elevated' ? PELE.warn : b === 'low' ? PELE.ok : PELE.grey;
  const fatLabel = (b) => t('duties.fatigue' + b.charAt(0).toUpperCase() + b.slice(1), lang);

  // Painel de linhas — aceita {k,v,color} ou {k,node}; ignora falsy; 1ª linha sem risca de topo.
  const Panel = ({ rows }) => {
    const items = rows.filter(Boolean);
    if (!items.length) return null;
    return (
      <View style={s.panel}>
        {items.map((it, i) => (
          <View key={i} style={[s.row, i === 0 && s.rowFirst]}>
            <Text style={s.rowK} numberOfLines={2}>{it.k}</Text>
            {it.node || <Text style={[s.rowV, it.color ? { color: it.color } : null]} numberOfLines={1}>{it.v}</Text>}
          </View>
        ))}
      </View>
    );
  };
  const Sec = ({ icon, children }) => (
    <View style={s.sec}><Icon name={icon} size={13} color={PELE.grey} /><Text style={s.secTxt}>{children}</Text></View>
  );

  const fatPill = fat ? (
    <View style={[s.fatPill, { backgroundColor: fatBg(fat.band) }]}>
      <View style={[s.fatDot, { backgroundColor: fatDotC(fat.band) }]} />
      <Text style={[s.fatTxt, { color: fatTxtC(fat.band) }]}>{fatLabel(fat.band)}</Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PeleSide label={(isFlight ? l('VOO', 'FLIGHT') : String(t('duties.kind.' + kind, lang) || '')).toUpperCase()} accent={((firstLeg && firstLeg.flightNo) || (isFlight ? routeStr : '')).toUpperCase()} />
      <BackBtn />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        {/* Herói — eyebrow + fantasma(FDP) + rota + kick + pílula de estado */}
        <PeleHeader
          size="detail" rule={false}
          eyebrow={`${isFlight ? l('Voo', 'Flight') : t('duties.kind.' + kind, lang)} · ${fmtDate(date)}${date === todayISO ? ` · ${l('hoje', 'today')}` : ''}`}
          ghost={heroGhost || undefined}
          word={headMain}
          kick={kickParts.length ? kickParts.join(' · ') : undefined}
        />
        <View style={s.stbar}>
          <View style={[s.pill, statusPill.tone === 'red' ? s.pillRed : statusPill.tone === 'ok' ? s.pillOk : s.pillNeutral]}>
            {statusPill.tone === 'ok' ? <Icon name="check" size={12} color={PELE.ok} /> : statusPill.tone === 'red' ? <Icon name="alert" size={12} color={PELE.red} /> : null}
            <Text style={[s.pillTxt, { color: statusPill.tone === 'red' ? PELE.red : statusPill.tone === 'ok' ? PELE.ok : PELE.grey }]}>{statusPill.txt}</Text>
          </View>
          {duty.dirty ? <View style={s.pendRow}><View style={s.pendDot} /><Text style={s.pendTxt}>{t('duties.pending', lang)}</Text></View> : null}
        </View>
        <View style={s.hr} />

        <Sec icon="clock">{l('Horário', 'Schedule')}</Sec>
        <Panel rows={[
          duty.report_time && { k: l('Apresentação', 'Report'), v: tv(duty.report_time) },
          duty.block_off && { k: l('Block off', 'Block off'), v: tvL(duty.block_off, firstLeg, 'off') },
          duty.block_on && { k: l('Block on', 'Block on'), v: tvL(duty.block_on, lastLeg, 'on') },
          duty.signOff && { k: l('Fim de serviço', 'Sign-off'), v: tv(duty.signOff) },
          duty.flight_minutes && { k: 'Block hours', v: minToHhmm(duty.flight_minutes) },
          (d && d.dutyPeriodStr) && { k: 'Duty hours', v: d.dutyPeriodStr },
        ]} />

        {/* Setores — off/on de cada setor (read-only). Soma dos block = Block hours. */}
        {isFlight && legs.length ? (
          <>
            <Sec icon="plane">{l('Setores', 'Sectors')}</Sec>
            <Panel rows={legs.map((lg) => {
              const zo = legZulu(date, lg, 'off'), zn = legZulu(date, lg, 'on');
              return {
                k: `${lg.flightNo ? `${lg.flightNo} · ` : ''}${lg.dep || '?'}→${lg.arr || '?'}`,
                node: (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.rowV}>{`${lg.off || '—'} → ${lg.on || '—'}`}</Text>
                    {(zo || zn) ? <Text style={s.rowVZ}>{`${zo || '—'} → ${zn || '—'}Z`}</Text> : null}
                  </View>
                ),
              };
            })} />
          </>
        ) : null}


        {d ? (
          <>
            <Sec icon="gauge">{l('FTL · Segurança', 'FTL · Safety')}</Sec>
            <Panel rows={[
              (hasEnd && d.fdp.actualFdpStr) && { k: sbAccD ? l('Duração', 'Duration') : l('FDP realizado', 'Actual FDP'), v: d.fdp.actualFdpStr, color: over ? PELE.red : null },
              (!sbAccD && d.fdp.maxFdpStr) && { k: l('PSV máx (FDP)', 'FDP max'), v: d.fdp.maxFdpStr },
              sbAccD && { k: l('PSV', 'FDP'), v: l('não se aplica — standby (225)', 'not applicable — standby (225)') },
              (spD.discretion && d.discretion) && { k: l('Discrição 205(f)', 'Discretion 205(f)'),
                v: d.discretion.over
                  ? l(`ACIMA da margem (máx c/ discrição ${d.discretion.maxStr})`, `BEYOND the margin (max w/ discretion ${d.discretion.maxStr})`)
                  : l(`usada — dentro da margem (até ${d.discretion.maxStr}) · reportável`, `used — within the margin (up to ${d.discretion.maxStr}) · reportable`),
                color: d.discretion.over ? PELE.red : PELE.warn },
              (over && d.fdp.excessStr) && { k: l('Excesso', 'Excess'), v: d.fdp.excessStr, color: PELE.red },
              (hasEnd && d.rest && d.rest.restStr) && { k: l('Repouso mínimo após', 'Min rest after'), v: d.rest.restStr },
              fat && { k: l('Fadiga', 'Fatigue'), node: fatPill },
            ]} />
          </>
        ) : null}

        {/* Pernoita — hotel da estação (catálogo pessoal, por IATA) — mapas + ligar. */}
        {duty.nightStop ? (() => {
          const st = nightStopStation(duty, ctxAll.base);
          const h = st ? (ctxAll.hotels || {})[st] : null;
          return (
            <>
              <Sec icon="bed">{l('Pernoita', 'Night stop')}{st ? ` · ${st}` : ''}</Sec>
              {h ? (
                <TouchableOpacity style={s.hotel} activeOpacity={0.85}
                  onPress={() => { select(); Linking.openURL(hotelMapsUrl(h.name, st, Platform.OS)).catch(() => {}); }}
                  onLongPress={() => { select(); setHotelOpen(true); }}
                  accessibilityRole="button" accessibilityLabel={`${l('Hotel', 'Hotel')} ${h.name}`}
                  accessibilityHint={l('Toque abre os mapas · toque longo edita', 'Tap opens maps · long press edits')}>
                  <View style={s.hotelIc}><Icon name="bed" size={19} color={PELE.ink} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.hotelName} numberOfLines={1}>{h.name}</Text>
                    {h.note ? <Text style={s.hotelNote} numberOfLines={1}>{h.note}</Text> : null}
                  </View>
                  <View style={s.hotelActs}>
                    <View style={s.hpillMap}><Icon name="pin" size={12} color="#2C6E8F" /><Text style={s.hpillMapTxt}>{l('Mapas', 'Maps')}</Text></View>
                    {h.phone ? (
                      <TouchableOpacity style={s.hpillCall} hitSlop={6}
                        onPress={() => { select(); Linking.openURL(hotelTelUrl(h.phone)).catch(() => {}); }}
                        accessibilityRole="button" accessibilityLabel={l('Ligar ao hotel', 'Call the hotel')}>
                        <Icon name="phone" size={12} color={PELE.ok} /><Text style={s.hpillCallTxt}>{l('Ligar', 'Call')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.hotelAdd} activeOpacity={0.8} onPress={() => { select(); setHotelOpen(true); }} accessibilityRole="button">
                  <Text style={s.hotelAddTxt}>＋ {l('adicionar hotel desta pernoita', 'add this night stop’s hotel')}</Text>
                </TouchableOpacity>
              )}
            </>
          );
        })() : null}

        <Sec icon="wallet">{l('Pagamento · detalhes', 'Pay · details')}</Sec>
        <Panel rows={[
          (perDiem != null) && { k: l('Per-diem (AE)', 'Per diem'), v: `+${fmtEur0(perDiem)}`, color: PELE.ok },
          duty.sectors && { k: l('Setores', 'Sectors'), v: String(duty.sectors) },
          duty.nightStop && { k: l('Paragem nocturna', 'Night stop'), v: nsEur != null ? `+${fmtEur0(nsEur)}` : l('Sim', 'Yes'), color: nsEur != null ? PELE.ok : null },
          (() => {
            const role = duty.role || (duty.instructor ? 'instr' : null);
            if (!role || !ae) return null;
            const eur = roleEurFor(ae, catD, role, duty.sectors);
            const def = (ae.ADDITIONAL_ROLES || []).find((r) => r.id === role);
            const lbl = (def && def.label && (def.label[lang] || def.label.pt)) || role;
            return { k: lbl, v: eur > 0 ? `+${fmtEur0(eur)}` : l('sem prestação no AE', 'no AE item'), color: eur > 0 ? PELE.ok : null };
          })(),
          duty.dayOffWorked && { k: l('Folga publicada trabalhada', 'Worked published day off'), v: duty.dayOffWorked === 'ddo' ? 'DDO' : duty.dayOffWorked === 'wfly' ? 'WFLY' : 'IDO', color: PELE.warn },
          duty.kind === 'office' && duty.officeType === 'ofc8' && { k: l('Dia de escritório', 'Office day'), v: l('Dia inteiro (OFC8) · 3 setores', 'Full day (OFC8) · 3 sectors') },
          duty.source && { k: l('Fonte', 'Source'), v: sources[duty.source] || duty.source, color: PELE.grey },
        ]} />

        {/* Outros períodos de serviço do MESMO dia (210/245) — lista compacta. */}
        {Array.isArray(duty.extra) && duty.extra.length ? (
          <>
            <Sec icon="ellipsis">{l('Outros serviços neste dia', 'Other services this day')}</Sec>
            <Panel rows={duty.extra.map((sv, i) => {
              const rr = sv.report_time ? computeDuty({ state: 'acc', report: sv.report_time, end: sv.block_on || null, sectors: sv.sectors || 0, postFlightMin: (!sv.kind || sv.kind === 'flight') ? (ctxAll.postFlightMin || 0) : 0 }) : null;
              const lbl = (!sv.kind || sv.kind === 'flight') ? (sv.route || l('Voo', 'Flight')) : t('duties.kind.' + sv.kind, lang);
              const psv = (rr && rr.fdp.actualFdpStr) ? rr.fdp.actualFdpStr : null;
              return { k: `${i + 2}. ${lbl}`, v: `${sv.report_time || '—'} → ${sv.block_on || '—'}${psv ? `  ·  PSV ${psv}` : ''}` };
            })} />
            <Text style={s.foot}>{l('Os serviços do dia somam nos 28 dias (210). Vê o repouso entre eles na folha do dia.', 'The day’s services sum over 28 days (210). See the rest between them in the day detail.')}</Text>
          </>
        ) : null}

        <TouchableOpacity onPress={() => { select(); setEditing(true); }} activeOpacity={0.9} style={s.editBtn} accessibilityRole="button" accessibilityLabel={l('Editar serviço', 'Edit duty')}>
          <Icon name="edit" size={16} color={PELE.yellow} />
          <Text style={s.editTxt}>{l('Editar serviço', 'Edit duty')}</Text>
        </TouchableOpacity>

        {isManual ? (
          <TouchableOpacity style={s.delBtn} activeOpacity={0.8} onPress={confirmDelete}>
            <Icon name="trash" size={16} color={PELE.red} />
            <Text style={s.delTxt}>{l('Apagar serviço', 'Delete duty')}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={s.foot}>{duty.source === 'pdf'
            ? l('Importado de um PDF — para o remover, importa na Escala o PDF atualizado da escala; os cancelados aparecem na revisão para confirmares.', 'Imported from a PDF — to remove it, import the updated roster PDF in the roster tab; cancellations show up in the review for you to confirm.')
            : l('Importado do calendário — para o remover, corrige na fonte (eCrew) e toca Sincronizar na Escala; os cancelados aparecem na revisão para confirmares.', 'Imported from the calendar — to remove it, fix it at the source (eCrew) and tap Sync in the roster; cancellations show up in the review for you to confirm.')}</Text>
        )}

        <Text style={s.foot}>{t('common.ftlEstimate', lang)}</Text>
      </ScrollView>

      {/* Edição (opção autossuficiente) — o form partilhado; ao guardar, o context atualiza-se e o ecrã reflete. */}
      <DutyFormSheet visible={!!editing} date={date} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setEdited(true); }} />
      {/* Hotel da pernoita — registar/editar o hotel desta estação (catálogo pessoal). */}
      <HotelSheet visible={hotelOpen} onClose={() => setHotelOpen(false)} station={duty && duty.nightStop ? nightStopStation(duty, ctxAll.base) : null} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  topbar: { flexDirection: 'row', paddingHorizontal: GUTTER, paddingTop: 8 },
  bk: { width: 36, height: 36, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 2 },

  stbar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
  pillOk: { backgroundColor: PELE.okSoft },
  pillRed: { backgroundColor: PELE.redSoft },
  pillNeutral: { backgroundColor: PELE.soft },
  pillTxt: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  pendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pendDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: PELE.warn },
  pendTxt: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.4, textTransform: 'uppercase', color: PELE.grey },
  hr: { height: 1.5, backgroundColor: PELE.ink, marginTop: 12 },

  // Secções + painéis
  sec: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 20, marginBottom: 9 },
  secTxt: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase', color: PELE.grey },
  panel: { borderWidth: 1, borderColor: PELE.line, borderRadius: 16, backgroundColor: PELE.paper, paddingHorizontal: 15 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: PELE.line },
  rowFirst: { borderTopWidth: 0 },
  rowK: { flex: 1, fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey },
  rowV: { fontSize: 12.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink, fontVariant: ['tabular-nums'], textAlign: 'right' },
  rowVZ: { fontSize: 10.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, fontVariant: ['tabular-nums'], textAlign: 'right', marginTop: 2, letterSpacing: 0.2 },

  fatPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  fatDot: { width: 7, height: 7, borderRadius: 99 },
  fatTxt: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.3, textTransform: 'uppercase' },


  // Hotel da pernoita
  hotel: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: PELE.line, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 11 },
  hotelIc: { width: 38, height: 38, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  hotelName: { fontSize: 13.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  hotelNote: { fontSize: 10.5, fontFamily: PELE_FONT.body, color: PELE.grey, marginTop: 1 },
  hotelActs: { flexDirection: 'row', gap: 7, marginLeft: 'auto' },
  hpillMap: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PELE.info, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  hpillMapTxt: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, color: '#2C6E8F' },
  hpillCall: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PELE.okSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  hpillCallTxt: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ok },
  hotelAdd: { borderWidth: 1.5, borderColor: PELE.line, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  hotelAddTxt: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },

  // Ações
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: PELE.ink, borderRadius: 14, paddingVertical: 15, marginTop: 22 },
  editTxt: { fontSize: 14, fontFamily: PELE_FONT.bodyBold, color: PELE.paper },
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, marginTop: 10 },
  delTxt: { color: PELE.red, fontSize: 13, fontFamily: PELE_FONT.bodyBold },

  muted: { fontSize: 13, color: PELE.grey, lineHeight: 19 },
  foot: { fontSize: 10.5, fontFamily: PELE_FONT.body, color: PELE.grey, lineHeight: 16, marginTop: 14, paddingHorizontal: 2 },
});
