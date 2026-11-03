// PÁGINAS DE DEFINIÇÃO do Perfil (2026-11-03, esboço design/perfil-v3.html, aprovado pelo Nuno).
// Uma rota ('PerfilPagina', param `kind`) → uma página à Flighty: título, explicação (com a lei), e um de
// dois modelos aprovados:
//   · CARTÕES (os mesmos da configuração, components/OptCard) — tocar GRAVA e volta ao índice; na
//     categoria/contrato/antiguidade há um mês na roda e "Guardar" (são duas escolhas);
//   · ESCOLHA RÁPIDA (pós-voo) ou contador (férias) — grava logo, sem botão.
// As gravações são as de sempre (hooks/usePerfilActions); nenhuma regra nova.
import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { getLocales } from 'expo-localization';
import Pagina from '../components/Pagina';
import OptCard, { itemsOf, norm } from '../components/OptCard';
import PrimaryButton from '../components/PrimaryButton';
import MonthYearWheel from '../components/MonthYearWheel';
import Icon from '../components/Icon';
import { portaTxt as P } from '../components/Porta';
import usePerfilActions, { currentYmNow } from '../hooks/usePerfilActions';
import useReduceMotion from '../hooks/useReduceMotion';
import { AppContext } from '../data/appContext';
import { countryName as countryNameOf, baseCityName } from '../data/countries';
import { companyStartYm } from '../data/crewHistory';
import { select } from '../data/haptics';
import { PELE, PELE_FONT, TXT, SPACE, RADIUS } from '../data/constants';

const BACK_MS = 280;   // o visto aparece e, só depois, volta ao índice

export default function PerfilPaginaScreen({ route, navigation }) {
  const kind = route?.params?.kind;
  const ctx = useContext(AppContext);
  const { lang, ae, company, crewCategory, crewContract, crewFleet, crewHistory, postFlightMin, postFlightSource,
    vacationDaysYear, vacationSource, employment, aeCovered, serviceStart, base, bases, countries, lifestyle,
    instructorRated, lockEnabled, remindersOn, toggleReminders, setLang, baseHistory, companyHistory, homeBaseAt, companyAt } = ctx;
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const A = usePerfilActions();
  const reduce = useReduceMotion();
  const goBack = () => navigation.goBack();
  const back = { onBack: goBack, backLabel: l('Voltar', 'Back') };
  // Cartões que gravam ao tocar e voltam ao índice um instante depois (o visto vê-se).
  const pick = (fn, stay = false) => { select(); fn(); if (!stay) setTimeout(goBack, reduce ? 120 : BACK_MS); };
  // Estado das páginas com mais de uma escolha (todos os hooks no topo — regra do React).
  const startYm = serviceStart ? String(serviceStart).slice(0, 7) : '';
  const [selCrew, setSelCrew] = useState(kind === 'contrato' ? (crewContract || '12/12') : kind === 'frota' ? (crewFleet || 'NB') : crewCategory);
  const [from, setFrom] = useState(currentYmNow());
  const [ym, setYm] = useState(startYm);
  const [query, setQuery] = useState('');
  // Base e vínculo em dois passos (linha do tempo do contrato, esboço design/linha-do-tempo.html, aprovado):
  // a lista → "desde quando?" (mudei a partir de um mês · sempre foi assim).
  const [pickedVal, setPickedVal] = useState(null);   // tocado na lista (mostra o visto)
  const [nextVal, setNextVal] = useState(null);       // o do 2.º passo
  const [chgMode, setChgMode] = useState('moved');    // 'moved' | 'fix'
  const [chgFrom, setChgFrom] = useState(currentYmNow());
  const ymLabel = (v) => {
    const m = /^(\d{4})-(\d{2})$/.exec(String(v || '').slice(0, 7));
    return m ? new Date(+m[1], +m[2] - 1, 1).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { month: 'long', year: 'numeric' }) : '';
  };
  const prevYm = (v) => { const [y, mo] = String(v).split('-').map(Number); return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`; };
  const baseName = (code) => { const b = (bases || []).find((x) => x.code === code); return b ? baseCityName(code, b.city, lang) : code; };

  // ── Categoria / contrato — effective-dated: cartões + mês + Guardar ──
  if (kind === 'categoria' || kind === 'contrato') {
    if (!ae) return <Pagina {...back} title={l('Sem acordo modelado', 'No modelled agreement')} lead={l('A tua companhia ainda não tem o acordo de empresa modelado.', 'Your airline’s agreement is not modelled yet.')} />;
    const isCat = kind === 'categoria';
    const current = isCat ? crewCategory : (crewContract || '12/12');
    const items = isCat ? itemsOf(ae.CATEGORIES, ae.categoryLabel, lang) : itemsOf(ae.CONTRACTS, ae.contractLabel, lang);
    // Só os períodos da companhia ATUAL (depois de uma mudança, as categorias da antiga não são destas).
    const coStartC = companyStartYm(companyHistory);
    const hist = (crewHistory || []).filter((p, i, a) => p.from >= coStartC || !a.some((x) => x.from > p.from && x.from <= coStartC))
      .map((p) => `${isCat ? (ae.categoryLabel ? ae.categoryLabel(p.category, lang) : p.category) : (ae.contractLabel ? ae.contractLabel(p.contract, lang) : p.contract)} ${l('desde', 'since')} ${ymLabel(p.from)}`).join(' · ');
    const save = () => {
      const ok = A.applyCrew(isCat ? selCrew : crewCategory, isCat ? (crewContract || '12/12') : selCrew, from);
      if (ok) goBack();
    };
    return (
      <Pagina {...back}
        title={isCat ? l('A tua categoria', 'Your rank') : l('O teu contrato', 'Your contract')}
        lead={isCat
          ? l('O AE paga por categoria. Uma promoção conta a partir do mês em que aconteceu: os meses antes ficam como estavam.', 'The agreement pays by rank. A promotion counts from the month it happened: earlier months stay as they were.')
          : l('Meses de trabalho por ano: o AE escala o salário com isto. A mudança conta a partir do mês que escolheres.', 'Working months per year: the agreement scales your pay with this. The change counts from the month you pick.')}
        footer={<PrimaryButton label={isCat ? l('Guardar a promoção', 'Save the promotion') : l('Guardar o contrato', 'Save the contract')} onPress={save} disabled={!selCrew || selCrew === current} />}>
        {items.map((it) => (
          <OptCard key={it.id} code={it.code} label={it.label} reduce={reduce}
            sel={selCrew === it.id && it.id !== current} tag={it.id === current ? l('atual', 'current') : null}
            onPress={() => { select(); setSelCrew(it.id); }} />
        ))}
        <Text style={[P.label, s.gap]}>{l('A partir de que mês?', 'From which month?')}</Text>
        <MonthYearWheel value={from} onChange={setFrom} lang={lang} monthsAhead={12} />
        {hist ? <Text style={[P.foot, s.gap]}>{l('Histórico: ', 'History: ')}{hist}</Text> : null}
      </Pagina>
    );
  }

  // ── Frota — com datas (linha da categoria, 2026-11-03): o modelo da categoria (cartões + mês + Guardar) ──
  if (kind === 'frota') {
    if (!ae || !Array.isArray(ae.FLEETS)) return <Pagina {...back} title={l('A tua frota', 'Your fleet')} lead={l('O acordo da tua companhia não distingue frotas.', 'Your airline’s agreement does not distinguish fleets.')} />;
    const current = crewFleet || 'NB';
    const items = itemsOf(ae.FLEETS, ae.fleetLabel, lang);
    const fLbl = (f) => (ae.fleetLabel ? ae.fleetLabel(f, lang) : f);
    const coStartF = companyStartYm(companyHistory);
    const hist = (crewHistory || []).filter((p, i, a) => p.from >= coStartF || !a.some((x) => x.from > p.from && x.from <= coStartF))
      .filter((p, i, a) => i === 0 || (p.fleet || null) !== (a[i - 1].fleet || null))
      .map((p) => `${fLbl(p.fleet || current)} ${l('desde', 'since')} ${ymLabel(p.from)}`).join(' · ');
    const save = () => { A.saveFleet(selCrew, from); goBack(); };
    return (
      <Pagina {...back} title={l('A tua frota', 'Your fleet')}
        lead={l('Wide-body ou narrow-body: muda o per-diem (no AE da TAP, quem é wide-body recebe sempre a tarifa WB). A mudança conta a partir do mês que escolheres.', 'Wide-body or narrow-body: it changes the per diem (in the TAP agreement, wide-body always gets the WB rate). The change counts from the month you pick.')}
        footer={<PrimaryButton label={l('Guardar a frota', 'Save the fleet')} onPress={save} disabled={!selCrew || selCrew === current} />}>
        {items.map((it) => (
          <OptCard key={it.id} code={it.code} label={it.label} reduce={reduce}
            sel={selCrew === it.id && it.id !== current} tag={it.id === current ? l('atual', 'current') : null}
            onPress={() => { select(); setSelCrew(it.id); }} />
        ))}
        <Text style={[P.label, s.gap]}>{l('A partir de que mês?', 'From which month?')}</Text>
        <MonthYearWheel value={from} onChange={setFrom} lang={lang} monthsAhead={12} />
        {hist ? <Text style={[P.foot, s.gap]}>{l('Histórico: ', 'History: ')}{hist}.</Text> : null}
      </Pagina>
    );
  }

  // ── Antiguidade — roda de mês e ano + Guardar ──
  if (kind === 'inicio') {
    const coName = company?.name || l('companhia', 'airline');
    const save = () => {
      // Mês e ano chegam (o prémio de permanência salta por ANOS). Mesmo mês → guarda o dia que lá estava.
      A.saveServiceStart(ym === startYm ? serviceStart : `${ym}-01`);
      goBack();
    };
    return (
      <Pagina {...back}
        title={l(`Na ${coName} desde`, `With ${coName} since`)}
        lead={l('A antiguidade paga o prémio de permanência: sem ela, o salário sai incompleto. Mês e ano chegam.', 'Seniority pays the loyalty bonus: without it, your pay is incomplete. Month and year are enough.')}
        footer={<PrimaryButton label={l('Guardar', 'Save')} onPress={save} disabled={!/^\d{4}-\d{2}$/.test(ym) || ym === startYm} />}>
        <MonthYearWheel value={startYm || null} onChange={setYm} lang={lang} />
        <Text style={[P.foot, s.gap]}>{l('Roda ou toca no mês e no ano em que entraste.', 'Spin or tap the month and year you joined.')}</Text>
      </Pagina>
    );
  }

  // ── 2.º passo, partilhado pela base e pelo vínculo — "desde quando?" (mudei · sempre foi assim) ──
  // cfg: { name, lead, segMoved, segFix, beforeLbl, beforeName, hist, fixWhat, fixCount, saveLabel, onSave }
  const renderDesde = (cfg) => {
    const moved = chgMode === 'moved';
    const coStart = companyStartYm(companyHistory);
    const save = () => { cfg.onSave(moved ? { from: chgFrom } : {}); goBack(); };
    const backToList = () => { setNextVal(null); setPickedVal(null); };
    return (
      <Pagina key="desde" onBack={backToList} backLabel={l('Voltar à lista', 'Back to the list')}
        title={l(`${cfg.name}, desde quando?`, `${cfg.name}, since when?`)} lead={cfg.lead}
        footer={<PrimaryButton label={cfg.saveLabel} onPress={save} disabled={moved && !/^\d{4}-\d{2}$/.test(chgFrom)} />}>
        <View style={s.seg} accessibilityRole="radiogroup">
          {[['moved', cfg.segMoved], ['fix', cfg.segFix]].map(([id, lbl]) => {
            const on = chgMode === id;
            return (
              <TouchableOpacity key={id} style={[s.segItem, on && s.segOn]} onPress={() => { select(); setChgMode(id); }}
                accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={lbl}>
                <Text style={[s.segTxt, on && s.segTxtOn]}>{lbl}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {moved ? (
          <>
            <Text style={[P.label, s.gap]}>{l('A partir de que mês?', 'From which month?')}</Text>
            <MonthYearWheel value={chgFrom} onChange={setChgFrom} lang={lang} monthsAhead={0} />
            {cfg.beforeName && cfg.beforeName !== cfg.name ? (
              <Text style={[P.foot, s.gap]}>{l('Até ', 'Until ')}{ymLabel(prevYm(chgFrom))}{cfg.beforeLbl}<Text style={P.strong}>{cfg.beforeName}</Text>.</Text>
            ) : null}
            {cfg.hist ? <Text style={[P.foot, s.small]}>{l('Histórico: ', 'History: ')}{cfg.hist}.</Text> : null}
          </>
        ) : (
          <View style={s.src}>
            <Icon name="clock" size={16} color={PELE.ink} />
            <Text style={s.srcTxt}>
              {coStart === '2000-01'
                ? l(`Corrige ${cfg.fixWhat} de todos os meses. ${cfg.fixCount}`, `Fixes ${cfg.fixWhat} for every month. ${cfg.fixCount}`)
                : <>{l(`Corrige ${cfg.fixWhat} desde que entraste na ${company?.name || 'companhia'}, em `, `Fixes ${cfg.fixWhat} since you joined ${company?.name || 'the airline'}, in `)}<Text style={P.strong}>{ymLabel(coStart)}</Text>. {cfg.fixCount}</>}
            </Text>
          </View>
        )}
      </Pagina>
    );
  };
  // Tocar noutro valor da lista: o visto e, um instante depois, o 2.º passo. O atual volta ao Perfil.
  const pickNext = (val, current) => {
    if (val === current) { goBack(); return; }
    select(); setPickedVal(val);
    setTimeout(() => { setChgMode('moved'); setChgFrom(currentYmNow()); setNextVal(val); }, reduce ? 120 : BACK_MS);
  };

  // ── Base, 2.º passo ──
  if (kind === 'base' && nextVal) {
    const name = baseName(nextVal);
    return renderDesde({
      name, lead: l('O repouso, as pernoitas e a Auditoria usam a base de cada mês.', 'Rest, night stops and the Audit use the base of each month.'),
      segMoved: l('Mudei de base', 'I moved base'), segFix: l('Sempre foi esta', 'It always was'),
      beforeLbl: l(' a tua base fica ', ' your base stays '), beforeName: (() => { const b = homeBaseAt(prevYm(chgFrom)); return b ? baseName(b) : null; })(),
      hist: (baseHistory || []).filter((p) => p && p.base).map((p) => `${baseName(p.base)} ${l('desde', 'since')} ${ymLabel(p.from)}`).join(' · '),
      fixWhat: l('a base', 'the base'), fixCount: l('Os meses antigos também passam a contar com esta base.', 'Earlier months also count with this base.'),
      saveLabel: l('Guardar a base', 'Save the base'), onSave: (opt) => A.saveBase(nextVal, opt),
    });
  }

  // ── Vínculo — com datas (linha da companhia, 2026-11-03): a lista → "desde quando?" ──
  const EMP = [
    { id: 'employee', label: l('Empresa', 'Employee'), sub: l('contrato direto com a companhia', 'direct contract with the airline') },
    { id: 'agency', label: l('Agência', 'Agency'), sub: l('contratado por uma agência', 'hired through an agency') },
    { id: 'independent', label: l('Independente', 'Independent'), sub: l('por conta própria', 'self-employed') },
  ];
  const empLabel = (id) => (EMP.find((x) => x.id === id) || EMP[0]).label;
  if (kind === 'vinculo' && nextVal) {
    const name = empLabel(nextVal);
    const coStartV = companyStartYm(companyHistory);
    return renderDesde({
      name, lead: l('O vínculo decide se o acordo de empresa conta no salário de cada mês. Os limites FTL aplicam-se sempre.', 'Your employment decides whether the company agreement counts in each month’s pay. FTL limits always apply.'),
      segMoved: l('Mudei de vínculo', 'It changed'), segFix: l('Sempre foi assim', 'It always was'),
      beforeLbl: l(' o teu vínculo fica ', ' your employment stays '), beforeName: empLabel(companyAt(prevYm(chgFrom)).employment || employment),
      hist: (companyHistory || []).filter((p) => p && p.from >= coStartV)
        .map((p) => `${empLabel(p.employment || employment)} ${l('desde', 'since')} ${ymLabel(p.from)}`).join(' · '),
      fixWhat: l('o vínculo', 'your employment'), fixCount: l('Os meses antigos também passam a contar assim.', 'Earlier months also count this way.'),
      saveLabel: l('Guardar o vínculo', 'Save'), onSave: (opt) => A.saveEmployment(nextVal, opt),
    });
  }
  if (kind === 'vinculo') {
    const current = employment || 'employee';
    return (
      <Pagina key="lista" {...back} title={l('Vínculo', 'Employment')}
        lead={l('Decide se o acordo de empresa te abrange no pagamento. Os limites FTL aplicam-se sempre.', 'Decides whether the company agreement covers your pay. FTL limits always apply.')}>
        {EMP.map((it) => (
          <OptCard key={it.id} label={it.label} sub={it.sub} reduce={reduce}
            sel={pickedVal === it.id && it.id !== current} tag={it.id === current ? l('atual', 'current') : null}
            onPress={() => pickNext(it.id, current)} />
        ))}
      </Pagina>
    );
  }

  // ── Base — pesquisa + o país do telemóvel primeiro + nomes em português ──
  if (kind === 'base') {
    const deviceCC = getLocales?.()[0]?.regionCode || null;
    const cName = (cc) => countryNameOf(cc, lang, countries);
    const q = norm(query.trim());
    const by = {};
    for (const b of bases.filter((x) => x.airline_id === company?.id)) {
      const name = baseCityName(b.code, b.city, lang);
      if (q && !norm(b.code).includes(q) && !norm(name).includes(q) && !norm(b.city).includes(q)) continue;
      (by[b.country_code] = by[b.country_code] || []).push({ ...b, name });
    }
    const groups = Object.keys(by)
      .sort((a, z) => (a === deviceCC ? -1 : z === deviceCC ? 1 : cName(a).localeCompare(cName(z))))
      .map((cc) => ({ cc, items: by[cc].sort((x, y) => x.name.localeCompare(y.name)) }));
    return (
      <Pagina key="lista" {...back} title={l('A tua base', 'Your base')}
        lead={l('O descanso legal depende dela: 12 h na base e 10 h fora (ORO.FTL.235). As ajudas de custo e as pernoitas contam fora dela.', 'Legal rest depends on it: 12 h at base and 10 h away (ORO.FTL.235). Per diems and night stops count away from it.')}>
        <View style={s.search}>
          <Icon name="search" size={16} color={PELE.grey} />
          <TextInput value={query} onChangeText={setQuery} style={s.searchInput}
            placeholder={l('Procurar cidade ou código', 'Search city or code')} placeholderTextColor={PELE.placeholder}
            autoCorrect={false} autoCapitalize="none" returnKeyType="search" clearButtonMode="while-editing"
            accessibilityLabel={l('Procurar base', 'Search base')} />
        </View>
        {groups.map((g) => (
          <View key={g.cc}>
            <Text style={[P.label, s.grp]}>{cName(g.cc)}</Text>
            {g.items.map((b) => (
              <OptCard key={b.code} code={b.code} label={b.name} sub={b.seasonal ? l('base sazonal', 'seasonal base') : null}
                sel={pickedVal === b.code && b.code !== base} tag={b.code === base ? l('atual', 'current') : null} reduce={reduce}
                onPress={() => pickNext(b.code, base)} />
            ))}
          </View>
        ))}
        {!groups.length ? <Text style={P.foot}>{query.trim() ? l(`Nenhuma base com "${query.trim()}".`, `No base matches "${query.trim()}".`) : l('Catálogo de bases indisponível (sem ligação?).', 'Base catalogue unavailable (offline?).')}</Text> : null}
      </Pagina>
    );
  }

  // ── Serviço pós-voo — escolha rápida (à Flighty), com a fonte à vista ──
  if (kind === 'posvoo') {
    const om = postFlightSource === 'om';
    return (
      <Pagina {...back} title={l('Serviço pós-voo', 'Post-flight duty')}
        lead={l('O tempo de serviço depois dos calços: relatórios, desembarque, briefing final. Conta para o repouso e para os limites de 7, 14 e 28 dias. Não conta para o PSV.', 'Duty time after on-blocks: reports, disembarkation, final briefing. It counts towards rest and the 7, 14 and 28-day limits. It does not count towards the FDP.')}>
        {om ? (
          <Text style={s.big}>{postFlightMin} min</Text>
        ) : (
          <View style={s.seg} accessibilityRole="radiogroup">
            {[0, 15, 30, 45].map((m) => {
              const on = (postFlightMin || 0) === m;
              return (
                <TouchableOpacity key={m} style={[s.segItem, on && s.segOn]} onPress={() => { select(); A.savePostFlight(m); }}
                  accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${m} min`}>
                  <Text style={[s.segTxt, on && s.segTxtOn]}>{m}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <Text style={[P.foot, s.small]}>{l('minutos, só nos serviços de voo', 'minutes, flight duties only')}</Text>
        <View style={s.src}>
          {postFlightSource === 'assumed' ? <View style={[s.dot, { backgroundColor: PELE.warn }]} /> : null}
          <Text style={s.srcTxt}>
            {om ? <Text style={P.strong}>{l('Do Manual de Operações. ', 'From the Operations Manual. ')}</Text>
              : postFlightSource === 'assumed' ? <Text style={P.strong}>{l('Assumido. ', 'Assumed. ')}</Text>
                : <Text style={P.strong}>{l('Definido por ti. ', 'Set by you. ')}</Text>}
            {om ? l('A tua companhia publica este valor; por isso não se muda aqui.', 'Your airline publishes this value, so it is not changed here.')
              : l('A tua companhia define este tempo no Manual de Operações. Se souberes o valor, escolhe-o: passa a ser teu.', 'Your airline sets this time in its Operations Manual. If you know it, pick it: it becomes yours.')}
          </Text>
        </View>
      </Pagina>
    );
  }

  // ── Férias por ano — contador, grava a cada toque ──
  if (kind === 'ferias') {
    const n = vacationDaysYear ?? 22;
    const srcTxt = vacationSource === 'ae' ? l('Do acordo de empresa da tua companhia (BTE).', 'From your airline’s company agreement (BTE).')
      : vacationSource === 'law-first' ? l('Ano de admissão: proporcional (art. 239.º do Código do Trabalho).', 'First year: pro-rated (art. 239 Labour Code).')
        : vacationSource === 'user' ? l('Definido por ti.', 'Set by you.')
          : l('Mínimo legal (art. 238.º do Código do Trabalho).', 'Legal minimum (art. 238 Labour Code).');
    const step = (d) => { select(); A.saveVacDays(n + d); };
    return (
      <Pagina {...back} title={l('Férias por ano', 'Leave per year')}
        lead={l('Os dias de férias a que tens direito num ano. Alimenta o saldo que a app mostra quando registas férias.', 'The leave days you are entitled to in a year. It feeds the balance the app shows when you log leave.')}>
        <View style={s.stepper}>
          <TouchableOpacity style={s.stepBtn} onPress={() => step(-1)} disabled={n <= 1} accessibilityRole="button" accessibilityLabel={l('Menos um dia', 'One day less')}>
            <Text style={s.stepTxt}>−</Text>
          </TouchableOpacity>
          <Text style={s.stepVal} accessibilityLiveRegion="polite">{n} {l('dias', 'days')}</Text>
          <TouchableOpacity style={s.stepBtn} onPress={() => step(1)} disabled={n >= 99} accessibilityRole="button" accessibilityLabel={l('Mais um dia', 'One day more')}>
            <Text style={s.stepTxt}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={s.src}><Text style={s.srcTxt}>{srcTxt}</Text></View>
      </Pagina>
    );
  }

  // ── Escolhas em cartões que gravam ao tocar ──
  const CHOICE = {
    ppy: () => ({
      title: l('Tipo de PPY', 'PPY type'),
      lead: l('Nos contratos sazonais (PPY), o PPY sazonal recebe a retenção e o de estilo de vida não (art. 66.9 do AE).', 'On seasonal (PPY) contracts, seasonal PPY gets the retention and lifestyle PPY does not (art. 66.9).'),
      items: [{ id: false, label: l('Sazonal', 'Seasonal'), sub: l('recebe a retenção', 'gets the retention') }, { id: true, label: l('Estilo de vida', 'Lifestyle'), sub: l('sem retenção', 'no retention') }],
      value: !!lifestyle, save: A.saveLifestyle,
    }),
    instrutor: () => ({
      title: l('Qualificação de instrutor', 'Instructor rating'),
      lead: l('Destrava o papel de instrutor nos serviços, para qualquer categoria (art. 42.º do AE).', 'Unlocks the instructor role on duties, for any rank (art. 42).'),
      items: [{ id: true, label: l('Sim', 'Yes') }, { id: false, label: l('Não', 'No') }],
      value: !!instructorRated, save: A.saveInstructor,
    }),
    abrangido: () => ({
      title: l('Abrangido pelo AE', 'Covered by the agreement'),
      lead: l('O acordo de empresa aplica-se a quem é filiado no sindicato ou aderiu ao acordo (art. 496.º e 497.º do Código do Trabalho). Se não, a app calcula só o FTL.', 'The agreement applies to union members or those who joined it (art. 496 and 497 Labour Code). If not, the app only computes FTL.'),
      items: [{ id: true, label: l('Sim', 'Yes'), sub: l('o salário pelo AE', 'pay by the agreement') }, { id: false, label: l('Não', 'No'), sub: l('só os limites FTL', 'FTL limits only') }],
      value: aeCovered !== false, save: A.saveAeCovered,
    }),
    idioma: () => ({
      title: l('Idioma', 'Language'), lead: l('O idioma da app. Segue o do telemóvel até escolheres aqui.', 'The app language. It follows your phone until you choose here.'),
      items: [{ id: 'pt', label: 'Português' }, { id: 'en', label: 'English' }], value: lang, save: setLang,
    }),
    lembretes: () => ({
      title: l('Lembretes', 'Reminders'), lead: l('Avisos sobre validades a expirar, o próximo serviço e alterações à escala.', 'Alerts about expiring documents, your next duty and roster changes.'),
      items: [{ id: true, label: l('Ligados', 'On') }, { id: false, label: l('Desligados', 'Off') }], value: !!remindersOn, save: toggleReminders,
    }),
    bloqueio: () => ({
      title: l('Bloqueio com Face ID', 'Face ID lock'),
      lead: l('A app abre com a tua cara (ou o código do telemóvel). Se alguém pegar no teu telemóvel, não vê a tua escala nem o teu salário.', 'The app opens with your face (or your phone passcode). If someone picks up your phone, they cannot see your roster or pay.'),
      items: [{ id: true, label: l('Ligado', 'On') }, { id: false, label: l('Desligado', 'Off') }], value: !!lockEnabled, save: A.toggleLock, stay: true,
    }),
  };
  const c = CHOICE[kind] ? CHOICE[kind]() : null;
  if (!c) return <Pagina {...back} title={l('Página não encontrada', 'Page not found')} />;
  return (
    <Pagina {...back} title={c.title} lead={c.lead}>
      {c.items.map((it) => (
        <OptCard key={String(it.id)} code={it.code} label={it.label} sub={it.sub} sel={c.value === it.id} reduce={reduce}
          onPress={() => (c.value === it.id ? goBack() : pick(() => c.save(it.id), !!c.stay))} />
      ))}
    </Pagina>
  );
}

const s = StyleSheet.create({
  gap:      { marginTop: SPACE.lg },
  grp:      { marginTop: SPACE.md },
  small:    { marginTop: SPACE.sm },
  search:   { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, height: 44, borderRadius: 999, backgroundColor: PELE.soft, paddingHorizontal: SPACE.lg, marginBottom: SPACE.sm },
  searchInput: { flex: 1, fontSize: 15, fontFamily: PELE_FONT.body, color: PELE.ink },
  big:      { ...TXT.numLg, color: PELE.ink },
  // Escolha rápida (Flighty · Unidades): pílula suave com o escolhido em papel.
  seg:      { flexDirection: 'row', height: 40, borderRadius: 999, backgroundColor: PELE.soft, padding: SPACE.xs },
  segItem:  { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  segOn:    { backgroundColor: PELE.paper },
  segTxt:   { ...TXT.bodyStrong, fontSize: 14, color: PELE.grey },
  segTxtOn: { color: PELE.ink },
  // Fonte do valor (assumido · do OM · teu)
  src:      { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.s, backgroundColor: PELE.soft, borderRadius: RADIUS.md, padding: SPACE.md, marginTop: SPACE.lg },
  dot:      { width: 8, height: 8, borderRadius: 999, marginTop: SPACE.s },
  srcTxt:   { ...TXT.footnote, color: PELE.ink, flex: 1 },
  // Contador das férias
  stepper:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: PELE.line, borderRadius: RADIUS.md, padding: SPACE.sm },
  stepBtn:  { width: 44, height: 44, borderRadius: 999, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  stepTxt:  { ...TXT.title, color: PELE.ink },
  stepVal:  { ...TXT.title, color: PELE.ink },
});
