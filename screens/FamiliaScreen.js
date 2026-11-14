// FAMÍLIA — página própria (2026-11-03, fase 2 do Perfil, modelo de página aprovado em design/perfil-v3.html).
// Modelo B (de sempre): partilhar UM voo com uma pessoa — link ao vivo (24 h) + a imagem do voo, num só
// envio — com registo local das partilhas. Os nomes ficam só contigo (não aparecem no link).
// O que mudou: a tira de cartões e a pílula "+N" do Perfil deram lugar a uma lista (uma pessoa por linha,
// com a última partilha) e "Adicionar pessoa" no fundo. As janelas (pessoa · escolher voo · registo ·
// remover) e o cartão de envio vieram do SettingsScreen com a lógica intacta; estilos na escala.
import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import Pagina from '../components/Pagina';
import CenterDialog from '../components/CenterDialog';
import PrimaryButton from '../components/PrimaryButton';
import FlightShareCard from '../components/FlightShareCard';
import Icon from '../components/Icon';
import { portaTxt as P } from '../components/Porta';
import useFamilyLinks from '../hooks/useFamilyLinks';
import { getFamilyShares, addFamilyShare, removeFamilyShare, removeFamilySharesForPerson } from '../data/familyShares';
import { AppContext, isoDay } from '../data/appContext';
import { legZulu } from '../data/zulu';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { PELE, PELE_FONT, TXT, SPACE, RADIUS } from '../data/constants';

// As iniciais do círculo ("Mãe" → M, "João Carlos" → JC): uma só regra, em data/profileCards.js (o Perfil usa a mesma).
import { familyInitials } from '../data/profileCards';

export default function FamiliaScreen({ navigation }) {
  const { user, duties, lang } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const { links: famLinks, reload: reloadFamily, create: createFamily, confirmRevoke: revokeFamily } = useFamilyLinks();
  const family = Array.isArray(famLinks) ? famLinks : [];

  const [famAddOpen, setFamAddOpen] = useState(false);
  const [famLabel, setFamLabel] = useState('');
  const [famBusy, setFamBusy] = useState(false);
  const [famView, setFamView] = useState(null);        // pessoa selecionada → opções
  const [famPick, setFamPick] = useState(false);       // dentro das opções: modo "escolher voo"
  const [sendCard, setSendCard] = useState(null);      // voo + pessoa → FlightShareCard
  const [famShares, setFamShares] = useState([]);      // registo local das partilhas
  useEffect(() => {
    getFamilyShares(user?.id).then(setFamShares);
    return navigation.addListener('focus', reloadFamily);
  }, [navigation, reloadFamily, user?.id]);

  const fmtFamDate = (iso) => { const d = new Date(`${iso}T00:00:00`); return isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'short' }); };
  // Voos de HOJE (legs da duty de hoje) — o que se pode partilhar.
  const todayFlights = (() => {
    const d = duties[isoDay()];
    if (!d || (d.kind && d.kind !== 'flight')) return [];
    return Array.isArray(d.legs) ? d.legs.filter((lg) => lg && (lg.flightNo || lg.flight)) : [];
  })();
  const openSendFlight = (person, lg, dateISO) => {
    if (!person || !lg) return;
    const date = dateISO || isoDay();
    const dep = String(lg.dep || '').toUpperCase(), arr = String(lg.arr || '').toUpperCase();
    const fno = String(lg.flightNo || lg.flight || '').toUpperCase().replace(/\s+/g, '');
    // Duração = hora-bloco (on − off em Zulu, fusos certos via legZulu; trata a viragem de dia).
    const toMin = (z) => { const m = /^(\d{1,2}):(\d{2})$/.exec(z || ''); return m ? (+m[1] * 60 + +m[2]) : null; };
    const om = toMin(legZulu(date, lg, 'off')), nm = toMin(legZulu(date, lg, 'on'));
    const blockMin = (om != null && nm != null) ? ((nm - om + 1440) % 1440) : null;
    const duration = blockMin ? `${Math.floor(blockMin / 60)}H${String(blockMin % 60).padStart(2, '0')}` : '';
    setFamView(null); setFamPick(false);
    setTimeout(() => setSendCard({
      personId: person.id, personLabel: person.label,
      dep, arr, depTime: lg.off || '', arrTime: lg.on || '',
      flightNo: fno, route: `${dep} → ${arr}`, date, dateLabel: fmtFamDate(date), sectors: 1, duration,
      legs: [{ flight: fno, dep, arr }],
    }), 320);   // fecha a janela antes de abrir o cartão (evita janela-sobre-janela no iOS)
  };
  const onFlightSent = async () => {
    const c = sendCard; if (!c || !user?.id) return;
    const next = await addFamilyShare(user.id, {
      personId: c.personId, personLabel: c.personLabel, flightNo: c.flightNo, route: c.route,
      dep: c.dep, arr: c.arr, depTime: c.depTime, arrTime: c.arrTime, date: c.date, dateLabel: c.dateLabel,
      sectors: c.sectors, legs: c.legs, sharedAt: Date.now(),
    });
    setFamShares(next);
  };
  const submitFamAdd = async () => {
    if (famBusy) return;
    const lbl = famLabel.trim();
    if (!lbl) return;
    setFamBusy(true);
    const created = await createFamily(lbl);
    setFamBusy(false);
    if (!created) { Alert.alert(l('Sem ligação', 'No connection'), l('Não consegui adicionar a pessoa agora — tenta com rede.', 'Could not add the person — try when online.')); return; }
    success();
    setFamAddOpen(false); setFamLabel('');
  };
  const lastShare = (pid) => famShares.filter((sh) => sh.personId === pid).sort((a, b) => (b.sharedAt || 0) - (a.sharedAt || 0))[0];
  const personShares = famShares.filter((sh) => sh.personId === famView?.id);

  return (
    <>
      <Pagina onBack={() => navigation.goBack()} backLabel={l('Voltar', 'Back')} title={l('Família', 'Family')}
        lead={l('Partilha a chegada ao vivo de um voo com quem te espera: um link ao vivo, válido 24 horas, e a imagem do voo. Os nomes ficam só contigo — não aparecem no link.',
          'Share a flight’s live arrival with whoever is waiting for you: a live link, valid for 24 hours, and the flight image. Names stay with you — they are not on the link.')}
        footer={<PrimaryButton label={l('Adicionar pessoa', 'Add person')} onPress={() => { select(); setFamLabel(''); setFamAddOpen(true); }} />}>
        {todayFlights.length ? (
          <View style={s.today}>
            <Icon name="plane" size={16} color={PELE.ink} />
            <Text style={s.todayTxt}>{l('Hoje tens voo: toca numa pessoa para lhe partilhares a chegada.', 'You fly today: tap a person to share your arrival.')}</Text>
          </View>
        ) : null}
        {famLinks === null ? <Text style={P.foot}>{l('A carregar…', 'Loading…')}</Text>
          : famLinks === false ? <Text style={P.foot}>{l('Sem ligação — a lista volta quando houver rede.', 'Offline — the list comes back when you are online.')}</Text>
            : !family.length ? <Text style={P.body}>{l('Ainda não tens ninguém. Adiciona quem costuma esperar por ti no aeroporto.', 'No one yet. Add whoever usually waits for you at the airport.')}</Text>
              : family.map((lk) => {
                const last = lastShare(lk.id);
                const sub = last ? `${l('Último', 'Last')}: ${last.flightNo} · ${last.dateLabel}` : l('Ainda nada partilhado', 'Nothing shared yet');
                return (
                  <TouchableOpacity key={lk.id} style={s.person} activeOpacity={0.7} onPress={() => { select(); setFamView(lk); }}
                    accessibilityRole="button" accessibilityLabel={`${lk.label}, ${sub}`}>
                    <View style={s.fav}><Text style={s.favTxt} allowFontScaling={false}>{familyInitials(lk.label)}</Text></View>
                    <View style={s.pTxt}>
                      <Text style={s.pName} numberOfLines={1}>{lk.label}</Text>
                      <Text style={s.pSub} numberOfLines={1}>{sub}</Text>
                    </View>
                    <Icon name="chevron" size={14} color={PELE.placeholder} />
                  </TouchableOpacity>
                );
              })}
      </Pagina>

      {/* Adicionar pessoa */}
      <CenterDialog visible={famAddOpen} onClose={() => { if (!famBusy) setFamAddOpen(false); }}
        title={l('Adicionar pessoa', 'Add person')} closeLabel={t('common.close', lang)}>
        <View style={s.dlg}>
          <Text style={s.fieldLabel}>{l('Nome (só para ti — não aparece no link)', 'Name (just for you — not shown on the link)')}</Text>
          <TextInput style={s.famInput} value={famLabel} onChangeText={setFamLabel} placeholder={l('ex.: Mãe', 'e.g.: Mom')} placeholderTextColor={PELE.placeholder} autoFocus maxLength={40} returnKeyType="done" onSubmitEditing={submitFamAdd} />
          <PrimaryButton onPress={submitFamAdd} loading={famBusy} label={l('Adicionar', 'Add')} style={s.dlgBtn} />
          <Text style={s.famHint}>{l('Depois, na pessoa, escolhes um voo do dia e envias-lhe o link ao vivo e a imagem — fica registado.', 'Then, from the person, you pick a day’s flight and send them the live link and image — it stays on record.')}</Text>
        </View>
      </CenterDialog>

      {/* Pessoa (modelo B): partilhar um voo (link 24 h + imagem) · registo · remover */}
      <CenterDialog visible={!!famView} onClose={() => { setFamView(null); setFamPick(false); }}
        title={famView?.label || l('Pessoa', 'Person')} closeLabel={t('common.close', lang)}>
        <View style={s.dlg}>
          {famPick ? (
            <>
              <Text style={s.fieldLabel}>{l('Escolhe o voo de hoje', 'Pick today’s flight')}</Text>
              {todayFlights.length ? todayFlights.map((lg, i) => {
                const fno = String(lg.flightNo || lg.flight || '').toUpperCase();
                return (
                  <TouchableOpacity key={i} style={s.flightRow} activeOpacity={0.85} onPress={() => openSendFlight(famView, lg)} accessibilityRole="button">
                    <View style={s.flightIc}><Icon name="plane" size={15} color={PELE.ink} /></View>
                    <View style={s.pTxt}>
                      <Text style={s.flightNo}>{fno || l('Voo', 'Flight')}</Text>
                      <Text style={s.flightRt}>{(lg.dep || '?')} → {(lg.arr || '?')}{lg.off ? `  ·  ${lg.off}` : ''}</Text>
                    </View>
                    <Icon name="chevron" size={14} color={PELE.placeholder} />
                  </TouchableOpacity>
                );
              }) : <Text style={s.famHint}>{l('Hoje não há voo para partilhar.', 'No flight to share today.')}</Text>}
              <TouchableOpacity onPress={() => setFamPick(false)} style={s.famBack} hitSlop={8} accessibilityRole="button">
                <Text style={s.famBackTxt}>{l('‹ Voltar', '‹ Back')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <PrimaryButton glyph="share" label={l('Partilhar um voo', 'Share a flight')} onPress={() => setFamPick(true)} disabled={!todayFlights.length} />
              {!todayFlights.length ? <Text style={s.famHint}>{l('Sem voo hoje — partilhas quando tiveres um voo no dia.', 'No flight today — share when you have one.')}</Text> : null}

              <Text style={[s.fieldLabel, s.gap]}>{l('Partilhas', 'Shares')}</Text>
              {personShares.length ? personShares.map((sh) => (
                <View key={sh.id} style={s.shareRow}>
                  <View style={s.pTxt}>
                    <Text style={s.shareTop} numberOfLines={1}>{sh.flightNo} · {sh.route}</Text>
                    <Text style={s.shareSub}>{sh.dateLabel}</Text>
                  </View>
                  <TouchableOpacity hitSlop={8} onPress={() => openSendFlight(famView, { dep: sh.dep, arr: sh.arr, off: sh.depTime, on: sh.arrTime, flightNo: sh.flightNo }, sh.date)} accessibilityRole="button" accessibilityLabel={l('Reenviar', 'Resend')}>
                    <Icon name="share" size={16} color={PELE.ink} />
                  </TouchableOpacity>
                  <TouchableOpacity hitSlop={8} onPress={async () => { const next = await removeFamilyShare(user?.id, sh.id); setFamShares(next); }} accessibilityRole="button" accessibilityLabel={l('Apagar registo', 'Delete record')}>
                    <Icon name="trash" size={16} color={PELE.red} />
                  </TouchableOpacity>
                </View>
              )) : <Text style={s.famHint}>{l('Ainda nada partilhado com esta pessoa.', 'Nothing shared with this person yet.')}</Text>}

              <TouchableOpacity onPress={() => { const p = famView; revokeFamily(p, () => { setFamView(null); removeFamilySharesForPerson(user?.id, p?.id).then(setFamShares); }); }}
                style={s.famRevoke} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={l('Remover pessoa', 'Remove person')}>
                <Icon name="trash" size={16} color={PELE.red} />
                <Text style={s.famRevokeTxt}>{l('Remover pessoa', 'Remove person')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </CenterDialog>

      {/* Enviar um voo a uma pessoa (imagem + link ao vivo, 1 envio) */}
      <FlightShareCard visible={!!sendCard} onClose={() => setSendCard(null)} onSent={onFlightSent}
        personLabel={sendCard?.personLabel} dep={sendCard?.dep} arr={sendCard?.arr}
        depTime={sendCard?.depTime} arrTime={sendCard?.arrTime} flightNo={sendCard?.flightNo}
        dateLabel={sendCard?.dateLabel} sectors={sendCard?.sectors} duration={sendCard?.duration} date={sendCard?.date} legs={sendCard?.legs} />
    </>
  );
}

const s = StyleSheet.create({
  gap:      { marginTop: SPACE.lg },
  // Hoje há voo — uma faixa suave a dizer o que fazer
  today:    { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, backgroundColor: PELE.soft, borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: SPACE.lg },
  todayTxt: { ...TXT.footnote, color: PELE.ink, flex: 1 },
  // Uma pessoa por linha (a mesma família do cartão de opção)
  person:   { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 64, paddingHorizontal: SPACE.md, paddingVertical: SPACE.md, borderWidth: 2, borderColor: PELE.line, borderRadius: RADIUS.md, marginBottom: SPACE.sm, backgroundColor: PELE.paper },
  fav:      { width: 40, height: 40, borderRadius: 999, backgroundColor: PELE.ink, alignItems: 'center', justifyContent: 'center' },
  favTxt:   { fontFamily: PELE_FONT.display, fontSize: 17, color: PELE.paper },
  pTxt:     { flex: 1, minWidth: 0 },
  pName:    { ...TXT.callout, color: PELE.ink },
  pSub:     { ...TXT.footnote, color: PELE.grey, marginTop: SPACE.xxs },
  // Janelas
  dlg:      { padding: SPACE.lgPlus },
  dlgBtn:   { marginTop: SPACE.md },
  fieldLabel: { ...TXT.bodyStrong, color: PELE.ink, marginBottom: SPACE.s },
  famInput: { borderWidth: 1.5, borderColor: PELE.line, borderRadius: RADIUS.md, paddingHorizontal: SPACE.md, paddingVertical: SPACE.md, fontSize: 15, fontFamily: PELE_FONT.bodyMed, color: PELE.ink, backgroundColor: PELE.paper },
  famHint:  { ...TXT.footnote, color: PELE.grey, marginTop: SPACE.md },
  flightRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1.5, borderColor: PELE.line, borderRadius: RADIUS.md, paddingHorizontal: SPACE.md, paddingVertical: SPACE.md, marginTop: SPACE.sm },
  flightIc: { width: 32, height: 32, borderRadius: 999, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  flightNo: { ...TXT.bodyStrong, color: PELE.ink },
  flightRt: { ...TXT.footnote, color: PELE.grey },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.lg, paddingVertical: SPACE.md, borderBottomWidth: 1, borderBottomColor: PELE.line },
  shareTop: { ...TXT.bodyStrong, color: PELE.ink },
  shareSub: { ...TXT.caption, color: PELE.grey },
  famBack:  { marginTop: SPACE.md, paddingVertical: SPACE.s },
  famBackTxt: { ...TXT.bodyStrong, color: PELE.grey },
  famRevoke: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, marginTop: SPACE.lg, paddingVertical: SPACE.md },
  famRevokeTxt: { ...TXT.bodyStrong, color: PELE.red },
});
