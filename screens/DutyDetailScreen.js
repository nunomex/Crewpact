import React, { useContext, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, FONT, GUTTER } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import DutyFormSheet from '../components/DutyFormSheet';
import PrimaryButton from '../components/PrimaryButton';
import Eyebrow from '../components/Eyebrow';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme, isoDay, toZulu } from '../data/appContext';
import { computeDuty, fatigueFromDuty } from '../ftl';
import { sectorDistanceNM } from '../data/airports';
import { roleEurFor } from '../data/perdiem';
import { nightStopStation, hotelMapsUrl, hotelTelUrl } from '../data/hotels';
import { createDayShare, legsForShare } from '../data/shareDay';
import HotelSheet from '../components/HotelSheet';
import { legZulu } from '../data/zulu';

const minToHhmm = (min) => { if (!min) return ''; const h = Math.floor(min / 60), m = min % 60; return `${h}:${String(m).padStart(2, '0')}`; };
const clkMin = (str) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(str || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };

// Detalhe de um serviço (read-only) — abre ao TOCAR numa duty na Escala. Mostra tudo
// (rota, horas+Zulu, FDP/PSV, serviço, repouso, fadiga, setores, per-diem, fonte) SEM
// editar; "Editar" abre o DutyFormSheet partilhado (montado aqui, opção autossuficiente).
// Tudo derivado do motor FTL (computeDuty/fatigueFromDuty) e do motor AE (ae.perDiem) —
// a duty NÃO guarda FDP nem per-diem. Degrada quando faltam dados (sem block-on, etc.).
export default function DutyDetailScreen({ route, navigation }) {
  const ctxAll = useContext(AppContext);
  const { lang, duties, ae, crewCategory, crewAt, removeDuty } = ctxAll;
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState(false);
  const [hotelOpen, setHotelOpen] = useState(false);   // folha "Hotel da pernoita" (registar/editar)
  const [sharing, setSharing] = useState(false);       // "Partilhar chegada" — link temporário p/ a família

  const date = route.params?.date;
  const duty = date ? duties[date] : null;
  // Voltar: se houve edição, devolve à Escala um sinal p/ re-acender o realce da linha editada.
  const goBack = () => {
    if (edited) navigation.navigate('EscalaMain', { flashDuty: date, flashTs: Date.now() });
    else navigation.goBack();
  };
  // Partilhar a CHEGADA do dia com a família (Flighty→crew): cria um link temporário
  // (Edge `share-day`, expira em 24 h) que abre no browser SEM app — a última perna do
  // dia com a ETA real. Só as legs deste dia saem do telemóvel — nunca a escala.
  const shareArrival = async () => {
    if (sharing) return;
    const legs = legsForShare(duty);
    if (!legs.length) return;
    select(); setSharing(true);
    const res = await createDayShare({ date, legs });
    setSharing(false);
    if (!res) {
      Alert.alert(l('Sem ligação', 'No connection'), l('Não consegui criar o link agora — tenta outra vez com rede.', 'Could not create the link — try again when online.'));
      return;
    }
    try {
      // iOS: o URL vai à parte (link "a sério" → o WhatsApp gera o cartão de pré-visualização;
      // embutido no texto via share sheet, salta-o). Android ignora `url` → fica no texto.
      const txt = l(`A minha chegada de hoje (${legs[legs.length - 1].dep}→${legs[legs.length - 1].arr}), em direto:`, `My arrival today (${legs[legs.length - 1].dep}→${legs[legs.length - 1].arr}), live:`);
      await Share.share(Platform.OS === 'ios' ? { message: txt, url: res.url } : { message: `${txt} ${res.url}` });
    } catch { /* cancelado */ }
  };
  // Apagar SÓ nos manuais (calendário/PDF cancelam-se pela fonte) — confirmação destrutiva.
  const confirmDelete = () => {
    Alert.alert(t('duties.delTitle', lang), t('duties.delMsg', lang), [
      { text: t('common.cancel', lang), style: 'cancel' },
      { text: t('duties.delConfirm', lang), style: 'destructive', onPress: () => { select(); removeDuty && removeDuty(date); navigation.goBack(); } },
    ]);
  };

  if (!duty || duty.deleted) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <DetailTopBar onBack={() => navigation.goBack()} backLabel={t('common.back', lang)} />
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

  // ── Motor FTL (só com report; campos "realizados" só com block-on) ── Duty hours incluem o
  // serviço pós-voo: sign-off REAL (fim − último on) ou o débrief do perfil (ORO.FTL.235c).
  // Débrief SÓ em voo (ORO.FTL.235c: sign-off após o último on-block) — num não-voo o fim É o fim.
  const pf = !isFlight ? 0 : (duty.signOff && duty.block_on)
    ? (() => { const on = clkMin(duty.block_on), so = clkMin(duty.signOff); return (on == null || so == null) ? (ctxAll.postFlightMin || 0) : (so >= on ? so - on : so + 1440 - on); })()
    : (ctxAll.postFlightMin || 0);
  // Passa os CASOS ESPECIAIS gravados (205c/205g/225 + discrição 205f) e o crew — sem eles o
  // detalhe mostrava um teto errado p/ serviços aumentados/adiados (divergia da folha do dia).
  const spD = duty.special || {};
  const d = duty.report_time
    ? computeDuty({ state: 'acc', report: duty.report_time, end: duty.block_on || null, sectors: duty.sectors || 0, postFlightMin: pf,
        isPilot: ctxAll.isPilot, augmented: spD.augmented || null, delayedFrom: spD.delayedFrom || null, preStandby: spD.preStandby || null, discretion: !!spD.discretion })
    : null;
  const fat = (d && hasEnd) ? fatigueFromDuty(d) : null;
  // Standby de aeroporto COM alojamento (225(e)) não é PSV → a tabela não o julga; com a
  // discrição 205(f) declarada, o excesso dentro da margem é LEGAL (só além dela é over).
  const sbAccD = kind === 'standby_airport' && !!duty.accommodation;
  const over = sbAccD ? false : !!(d && d.fdp && (d.discretion ? d.discretion.over : d.fdp.over));

  // ── Per-diem (motor AE) — só voo, piloto AE, rota completa (todos os setores conhecidos) ──
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
  // Valor € da pernoita (Art. 39) — piloto por categoria, cabine €46 fixos; index=1 como o per-diem.
  const nsEur = (duty.nightStop && ae && ae.nightStop && catD) ? ae.nightStop(catD) : null;

  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const fmtDate = (iso) => {
    const dt = new Date(`${iso}T00:00:00`); if (isNaN(dt)) return iso;
    const str = dt.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  const fmtEur0 = (n) => { if (n == null) return '—'; const [i, d] = Number(n).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`; };
  const legs = Array.isArray(duty.legs) ? duty.legs : [];
  const firstLeg = legs[0] || null, lastLeg = legs[legs.length - 1] || null;
  const tv = (hhmm) => { const z = toZulu(date, hhmm); return z ? `${hhmm}  ·  ${z}Z` : hhmm; };
  // Block off/on com Zulu AUTORITATIVA (do 1.º/último setor): autoritativa → fuso do aeroporto → dispositivo.
  const tvL = (hhmm, leg, which) => { const z = legZulu(date, leg, which) || toZulu(date, hhmm); return z ? `${hhmm}  ·  ${z}Z` : hhmm; };
  const routeStr = stations.length > 1 ? stations.join(' → ') : (duty.route || l('Voo', 'Flight'));
  const headMain = isFlight
    ? routeStr
    : (duty.block_on && duty.block_on !== duty.report_time ? `${duty.report_time} – ${duty.block_on}` : (duty.report_time || '—'));
  const stripeColor = (!d || !hasEnd) ? C.lineStrong : (over ? C.red : C.green);
  const sources = { manual: l('Manual', 'Manual'), calendar: l('Calendário', 'Calendar'), pdf: 'PDF' };

  // Fadiga — cores acessíveis (espelha HomeScreen)
  const fatBg = (b) => b === 'high' ? C.redSoft : b === 'elevated' ? C.warnSoft : b === 'low' ? C.greenSoft : C.soft;
  const fatDotC = (b) => b === 'high' ? C.red : b === 'elevated' ? C.warn : b === 'low' ? C.green : C.sub;
  const fatTxtC = (b) => b === 'high' ? C.redText : b === 'elevated' ? C.warnText : b === 'low' ? C.greenText : C.sub;
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

  const fatPill = fat ? (
    <View style={[s.fatPill, { backgroundColor: fatBg(fat.band) }]}>
      <View style={[s.fatDot, { backgroundColor: fatDotC(fat.band) }]} />
      <Text style={[s.fatTxt, { color: fatTxtC(fat.band) }]}>{fatLabel(fat.band)}</Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <DetailTopBar onBack={goBack} backLabel={t('common.back', lang)} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        {/* Cabeçalho — risca: verde dentro do limite, vermelha se exceder, neutra sem dados */}
        <View style={[s.headerCard, { borderLeftColor: stripeColor }]}>
          <Eyebrow>
            {(isFlight ? l('Voo', 'Flight') : t('duties.kind.' + kind, lang))} · {fmtDate(date)}{date === todayISO ? ` · ${l('hoje', 'today')}` : ''}
          </Eyebrow>
          <Text style={s.answer} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>{headMain}</Text>
          {duty.dirty ? (
            <View style={s.pendRow}><View style={s.pendDot} /><Text style={s.pendTxt}>{t('duties.pending', lang)}</Text></View>
          ) : null}
        </View>

        <Text style={s.sectionTitle}>{l('HORÁRIO', 'SCHEDULE')}</Text>
        <Panel rows={[
          duty.report_time && { k: l('Apresentação', 'Report'), v: tv(duty.report_time) },
          duty.block_off && { k: l('Block off', 'Block off'), v: tvL(duty.block_off, firstLeg, 'off') },
          duty.block_on && { k: l('Block on', 'Block on'), v: tvL(duty.block_on, lastLeg, 'on') },
          duty.signOff && { k: l('Fim de serviço', 'Sign-off'), v: tv(duty.signOff) },
          duty.flight_minutes && { k: 'Block hours', v: minToHhmm(duty.flight_minutes) },
          (d && d.dutyPeriodStr) && { k: 'Duty hours', v: d.dutyPeriodStr },
        ]} />

        {/* Setores — off/on de cada setor (read-only). Soma dos block = Block hours. */}
        {isFlight && Array.isArray(duty.legs) && duty.legs.length ? (
          <>
            <Text style={s.sectionTitle}>{l('SETORES', 'SECTORS')}</Text>
            <Panel rows={duty.legs.map((lg) => {
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

        {/* Partilhar chegada — só voos com nº de voo (o link vive 24 h; a família abre no browser). */}
        {isFlight && legsForShare(duty).length ? (
          <TouchableOpacity style={s.shareRow} activeOpacity={0.85} onPress={shareArrival} disabled={sharing}
            accessibilityRole="button" accessibilityLabel={l('Partilhar chegada com alguém', 'Share arrival with someone')}>
            <Ionicons name="paper-plane-outline" size={15} color={C.brand} />
            <Text style={s.shareRowTxt}>{sharing ? l('a criar o link…', 'creating the link…') : l('partilhar chegada com alguém', 'share arrival with someone')}</Text>
          </TouchableOpacity>
        ) : null}

        {d ? (
          <>
            <Text style={s.sectionTitle}>{l('FTL · SEGURANÇA', 'FTL · SAFETY')}</Text>
            <Panel rows={[
              (hasEnd && d.fdp.actualFdpStr) && { k: sbAccD ? l('Duração', 'Duration') : l('FDP realizado', 'Actual FDP'), v: d.fdp.actualFdpStr, color: over ? C.redText : null },
              (!sbAccD && d.fdp.maxFdpStr) && { k: l('PSV máx (FDP)', 'FDP max'), v: d.fdp.maxFdpStr },
              // Standby com alojamento (225(e)): não é PSV — a tabela 205 não o julga.
              sbAccD && { k: l('PSV', 'FDP'), v: l('não se aplica — standby (225)', 'not applicable — standby (225)') },
              // Discrição 205(f) declarada: dentro da margem é LEGAL (reportável); só além é excesso.
              (spD.discretion && d.discretion) && { k: l('Discrição 205(f)', 'Discretion 205(f)'),
                v: d.discretion.over
                  ? l(`ACIMA da margem (máx c/ discrição ${d.discretion.maxStr})`, `BEYOND the margin (max w/ discretion ${d.discretion.maxStr})`)
                  : l(`usada — dentro da margem (até ${d.discretion.maxStr}) · reportável`, `used — within the margin (up to ${d.discretion.maxStr}) · reportable`),
                color: d.discretion.over ? C.redText : C.warnText },
              (over && d.fdp.excessStr) && { k: l('Excesso', 'Excess'), v: d.fdp.excessStr, color: C.redText },
              (hasEnd && d.rest && d.rest.restStr) && { k: l('Repouso mínimo após', 'Min rest after'), v: d.rest.restStr },
              fat && { k: l('Fadiga', 'Fatigue'), node: fatPill },
            ]} />
          </>
        ) : null}

        {/* ── Pernoita: hotel da estação (catálogo pessoal, por IATA) — mapas + ligar.
            Só em dias com 🌙; toque longo edita; sem registo → convite discreto. ── */}
        {duty.nightStop ? (() => {
          const st = nightStopStation(duty, ctxAll.base);
          const h = st ? (ctxAll.hotels || {})[st] : null;
          return (
            <>
              <Text style={s.sectionTitle}>{l('PERNOITA', 'NIGHT STOP')}{st ? ` · ${st}` : ''}</Text>
              {h ? (
                <TouchableOpacity style={s.hotelRow} activeOpacity={0.85}
                  onPress={() => { select(); Linking.openURL(hotelMapsUrl(h.name, st, Platform.OS)).catch(() => {}); }}
                  onLongPress={() => { select(); setHotelOpen(true); }}
                  accessibilityRole="button" accessibilityLabel={`${l('Hotel', 'Hotel')} ${h.name}`}
                  accessibilityHint={l('Toque abre os mapas · toque longo edita', 'Tap opens maps · long press edits')}>
                  <Text style={{ fontSize: 17 }}>🏨</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.hotelName} numberOfLines={1}>{h.name}</Text>
                    {h.note ? <Text style={s.hotelNote} numberOfLines={1}>{h.note}</Text> : null}
                  </View>
                  <View style={s.hotelPill}><Text style={s.hotelPillTxt}>🗺 {l('Mapas', 'Maps')}</Text></View>
                  {h.phone ? (
                    <TouchableOpacity style={[s.hotelPill, s.hotelPillCall]} hitSlop={6}
                      onPress={() => { select(); Linking.openURL(hotelTelUrl(h.phone)).catch(() => {}); }}
                      accessibilityRole="button" accessibilityLabel={l('Ligar ao hotel', 'Call the hotel')}>
                      <Text style={[s.hotelPillTxt, { color: C.greenText }]}>📞 {l('Ligar', 'Call')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.hotelAdd} activeOpacity={0.8} onPress={() => { select(); setHotelOpen(true); }}
                  accessibilityRole="button">
                  <Text style={s.hotelAddTxt}>＋ {l('adicionar hotel desta pernoita', 'add this night stop’s hotel')}</Text>
                </TouchableOpacity>
              )}
            </>
          );
        })() : null}

        <Text style={s.sectionTitle}>{l('PAGAMENTO · DETALHES', 'PAY · DETAILS')}</Text>
        <Panel rows={[
          (perDiem != null) && { k: l('Per-diem (AE)', 'Per diem'), v: `+${fmtEur0(perDiem)}`, color: C.greenText },
          duty.sectors && { k: l('Setores', 'Sectors'), v: String(duty.sectors) },
          duty.nightStop && { k: l('Paragem nocturna', 'Night stop'), v: nsEur != null ? `+${fmtEur0(nsEur)}` : l('Sim', 'Yes'), color: nsEur != null ? C.greenText : null },
          // Papel desempenhado (instr €/dia · uprank €/setor · CCLT/CTI €/dia) — € pela lei via roleEurFor.
          (() => {
            const role = duty.role || (duty.instructor ? 'instr' : null);
            if (!role || !ae) return null;
            const eur = roleEurFor(ae, catD, role, duty.sectors);
            const def = (ae.ADDITIONAL_ROLES || []).find((r) => r.id === role);
            const lbl = (def && def.label && (def.label[lang] || def.label.pt)) || role;
            return { k: lbl, v: eur > 0 ? `+${fmtEur0(eur)}` : l('sem prestação no AE', 'no AE item'), color: eur > 0 ? C.greenText : null };
          })(),
          duty.dayOffWorked && { k: l('Folga publicada trabalhada', 'Worked published day off'), v: duty.dayOffWorked === 'ddo' ? 'DDO' : duty.dayOffWorked === 'wfly' ? 'WFLY' : 'IDO', color: C.warnText },
          duty.kind === 'office' && duty.officeType === 'ofc8' && { k: l('Dia de escritório', 'Office day'), v: l('Dia inteiro (OFC8) · 3 setores', 'Full day (OFC8) · 3 sectors') },
          duty.source && { k: l('Fonte', 'Source'), v: sources[duty.source] || duty.source },
        ]} />

        {/* Outros períodos de serviço do MESMO dia (a EASA conta por serviço — 210/245). Lista
            compacta (horário + PSV); o detalhe rico e o repouso entre serviços vivem na folha do dia. */}
        {Array.isArray(duty.extra) && duty.extra.length ? (
          <>
            <Text style={s.sectionTitle}>{l('OUTROS SERVIÇOS NESTE DIA', 'OTHER SERVICES THIS DAY')}</Text>
            <Panel rows={duty.extra.map((sv, i) => {
              const rr = sv.report_time ? computeDuty({ state: 'acc', report: sv.report_time, end: sv.block_on || null, sectors: sv.sectors || 0, postFlightMin: (!sv.kind || sv.kind === 'flight') ? (ctxAll.postFlightMin || 0) : 0 }) : null;
              const lbl = (!sv.kind || sv.kind === 'flight') ? (sv.route || l('Voo', 'Flight')) : t('duties.kind.' + sv.kind, lang);
              const psv = (rr && rr.fdp.actualFdpStr) ? rr.fdp.actualFdpStr : null;
              return { k: `${i + 2}. ${lbl}`, v: `${sv.report_time || '—'} → ${sv.block_on || '—'}${psv ? `  ·  PSV ${psv}` : ''}` };
            })} />
            <Text style={s.foot}>{l('Os serviços do dia somam nos 28 dias (210). Vê o repouso entre eles na folha do dia.', 'The day’s services sum over 28 days (210). See the rest between them in the day detail.')}</Text>
          </>
        ) : null}

        <PrimaryButton onPress={() => { select(); setEditing(true); }} icon="create-outline" radius="lg" elevated style={{ marginTop: 22 }} label={l('Editar serviço', 'Edit duty')} />

        {isManual ? (
          <TouchableOpacity style={s.delBtn} activeOpacity={0.8} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={16} color={C.redText} />
            <Text style={s.delTxt}>{l('Apagar serviço', 'Delete duty')}</Text>
          </TouchableOpacity>
        ) : (
          /* Importado → não há Apagar (a fonte manda) e DIZEMOS porquê + o caminho certo
             (antes era um beco: o botão desaparecia sem uma palavra). O caminho depende da
             FONTE: PDF não tem botão Sincronizar — reimporta-se o PDF atualizado. */
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

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: GUTTER },

  headerCard: { backgroundColor: C.soft2, borderWidth: 1, borderColor: C.line, borderLeftWidth: 4, borderRadius: RADIUS.lg, padding: 16, paddingLeft: 13, marginTop: 6 },
  answer: { fontSize: 26, fontFamily: FONT.display, letterSpacing: -0.4, color: C.text, lineHeight: 31, marginTop: 6 },
  pendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11 },
  pendDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.warn || C.sub },
  pendTxt: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.4, textTransform: 'uppercase', color: C.sub },

  sectionTitle: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 1.2, textTransform: 'uppercase', color: C.sub, marginTop: 22, marginBottom: 10 },
  panel: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.line },
  rowFirst: { borderTopWidth: 0 },
  rowK: { flex: 1, fontSize: TYPE.sub, fontFamily: FONT.medium, color: C.sub },
  rowV: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.text, fontVariant: ['tabular-nums'], textAlign: 'right' },
  rowVZ: { fontSize: 11, fontFamily: FONT.bold, color: C.brand, fontVariant: ['tabular-nums'], textAlign: 'right', marginTop: 2, letterSpacing: 0.2 },

  fatPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3 },
  fatDot: { width: 7, height: 7, borderRadius: 99 },
  fatTxt: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.3, textTransform: 'uppercase' },

  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, marginTop: 10 },
  delTxt: { color: C.redText, fontSize: TYPE.sub, fontFamily: FONT.semibold },

  muted: { fontSize: TYPE.sub, color: C.sub, lineHeight: 19 },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: 14, paddingHorizontal: 2 },

  // Pernoita — hotel da estação (mapas + ligar; tracejado = convite a registar)
  hotelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 11 },
  hotelName: { fontSize: 13.5, fontFamily: FONT.bold, color: C.text },
  hotelNote: { fontSize: 11, fontFamily: FONT.medium, color: C.sub, marginTop: 2 },
  hotelPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.infoSoft, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 7 },
  hotelPillCall: { backgroundColor: C.greenSoft },
  hotelPillTxt: { fontSize: 11.5, fontFamily: FONT.heavy, color: C.brand },
  hotelAdd: { borderWidth: 1.5, borderColor: C.brand, borderStyle: 'dashed', borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  hotelAddTxt: { fontSize: 12.5, fontFamily: FONT.bold, color: C.brand },
  // "Partilhar chegada" — pill discreta debaixo dos setores (mesma família do hotelAdd)
  shareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderColor: C.brand, borderStyle: 'dashed', borderRadius: RADIUS.lg, paddingVertical: 11, marginTop: 2, marginBottom: 12 },
  shareRowTxt: { fontSize: 12.5, fontFamily: FONT.bold, color: C.brand },
});
