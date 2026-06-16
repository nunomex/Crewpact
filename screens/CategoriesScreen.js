import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C as _C, RADIUS, TYPE, RANKS, CONTRACTS, CONTRACT_NOTE, PAY_NUM, RANK_ROW, POSITIONING, SALARY, SECTOR_TABLE, DATA_VERSION, companyContent } from '../data/constants';

// Fração da base anual aplicável por tipo de contrato (12/12 = inteiro).
const CONTRACT_FACTOR = { '12_12': 1, '10_12': 10 / 12, '8_12': 8 / 12, '9_3': 9.75 / 12, pt: null };

// Modalidades de tempo parcial (Cláusula 80): fração da base anual e dias de férias.
const PT_MODES = [
  { id: 'fix50', label: { pt: 'Fixo 50%', en: 'Fixed 50%' },    factor: 0.5,     leave: 13 },
  { id: 'fix75', label: { pt: 'Fixo 75%', en: 'Fixed 75%' },    factor: 0.75,    leave: 19 },
  { id: 'saz50', label: { pt: 'Sazonal 50%', en: 'Seasonal 50%' }, factor: 8 / 12,  leave: 17 },
  { id: 'saz75', label: { pt: 'Sazonal 75%', en: 'Seasonal 75%' }, factor: 10 / 12, leave: 21 },
];
import { CLAUSES } from '../data/clauses';
import ScreenHeader from '../components/ScreenHeader';
import { Stepper, Seg } from '../components/Stepper';
import { ResultBlock } from '../components/CalcCard';
import { FTL_ARTICLES } from '../data/ftl';

// Artigos calculáveis (205/210/235) → calculadora respetiva.
const FTL_CALC_ARTICLES = FTL_ARTICLES.filter(a => a.psv || a.limits || a.rest);
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t, tx, txv } from '../data/i18n';
import { AppContext, useTheme } from '../App';

const fmtEur = (n) => n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const num = (s) => parseFloat(String(s).replace(',', '.')) || 0;
const L = (lang) => (pt, en) => (lang === 'en' ? en : pt);

function Calc({ title, children }) {
  const C = useTheme();
  const cs = makeCs(C);
  const [open, setOpen] = useState(false);
  return (
    <View style={cs.calc}>
      <TouchableOpacity style={cs.calcHead} activeOpacity={0.7} onPress={() => setOpen(o => !o)}>
        <Text style={cs.calcTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.sub} />
      </TouchableOpacity>
      <View style={[cs.calcBody, { display: open ? 'flex' : 'none' }]}>{children}</View>
    </View>
  );
}
function Result({ value, foot }) {
  return <ResultBlock value={value} foot={foot} valueSize={26} />;
}

// ─── Calculadoras ────────────────────────────────────────────────────────────
function CalcSectors({ ns, lang }) {
  const l = L(lang);
  const [q, setQ] = useState({ s: 0, m: 0, l: 0, x: 0 });
  const m = { s: 0.8, m: 1.2, l: 1.5, x: 2.5 };
  const total = (q.s * m.s + q.m * m.m + q.l * m.l + q.x * m.x) * ns;
  return (
    <Calc title={l('Setores voados', 'Sectors flown')}>
      <Stepper label={l('Curtos (0,8× NS)', 'Short (0.8× NS)')}        value={q.s} setValue={(v) => setQ({ ...q, s: v })} />
      <Stepper label={l('Médios (1,2× NS)', 'Medium (1.2× NS)')}       value={q.m} setValue={(v) => setQ({ ...q, m: v })} />
      <Stepper label={l('Longos (1,5× NS)', 'Long (1.5× NS)')}         value={q.l} setValue={(v) => setQ({ ...q, l: v })} />
      <Stepper label={l('Extra longos (2,5× NS)', 'Extra long (2.5× NS)')} value={q.x} setValue={(v) => setQ({ ...q, x: v })} />
      <Result value={fmtEur(total)} foot={l(`Setor nominal (NS) = ${fmtEur(ns)}`, `Nominal sector (NS) = ${fmtEur(ns)}`)} />
    </Calc>
  );
}

function CalcPositioning({ rankRow, lang }) {
  const l = L(lang);
  const OPTS = [{ id: 0, label: l('Curto', 'Short') }, { id: 1, label: l('Médio', 'Medium') }, { id: 2, label: l('Longo', 'Long') }, { id: 3, label: l('Extra', 'Extra') }];
  const [idx, setIdx] = useState(1);
  const [n, setN] = useState(1);
  const unit = num(POSITIONING.rows[rankRow].v[idx]);
  return (
    <Calc title={l('Posicionamento', 'Positioning')}>
      <Seg options={OPTS} value={idx} setValue={setIdx} />
      <Stepper label={l('Nº de posicionamentos', 'No. of positionings')} value={n} setValue={setN} min={1} />
      <Result value={fmtEur(unit * n)} foot={`${OPTS[idx].label}: ${fmtEur(unit)} (${DATA_VERSION.payRef})`} />
    </Calc>
  );
}

function CalcPerEvent({ title, unitLabel, unit, foot, start = 1 }) {
  const [n, setN] = useState(start);
  return (
    <Calc title={title}>
      <Stepper label={unitLabel} value={n} setValue={setN} />
      <Result value={fmtEur(unit * n)} foot={foot} />
    </Calc>
  );
}

function CalcStandby({ ns, lang }) {
  const l = L(lang);
  const med = 1.2 * ns;
  const OPTS = [
    { id: 'cs', label: l('Chamado ≤3:59', 'Called ≤3:59'), med: 0 },
    { id: 'cl', label: l('Chamado >4h', 'Called >4h'), med: 1 },
    { id: 'ns', label: l('Não cham. ≤3:59', 'Not called ≤3:59'), med: 1 },
    { id: 'nl', label: l('Não cham. >4h', 'Not called >4h'), med: 2 },
  ];
  const [v, setV] = useState('cl');
  const o = OPTS.find(x => x.id === v);
  return (
    <Calc title={l('Assistência no aeroporto', 'Airport standby')}>
      <Seg options={OPTS} value={v} setValue={setV} />
      <Result value={o.med ? fmtEur(o.med * med) : '0,00 €'} foot={o.med ? l(`${o.med} setor médio (1,2× NS). Não inclui per diem.`, `${o.med} medium sector (1.2× NS). Excludes per diem.`) : l('Só per diem.', 'Per diem only.')} />
    </Calc>
  );
}

function CalcCash({ base, factor, contractLabel, lang }) {
  const cs = makeCs(useTheme());
  const l = L(lang);
  if (!base) return <Calc title={l('Abono para falhas', 'Cash handling allowance')}><Text style={cs.na}>{l('Depende do salário mínimo nacional.', 'Depends on the national minimum wage.')}</Text></Calc>;
  const effBase = factor != null ? base * factor : base;
  const annual = effBase * 0.05;
  const note = factor != null && factor < 1
    ? l(`Base efetiva ${contractLabel}: ${fmtEur(effBase)} (de ${fmtEur(base)}).`, `Effective base ${contractLabel}: ${fmtEur(effBase)} (from ${fmtEur(base)}).`)
    : factor == null
      ? l('Contrato parcial: ajustar à percentagem do teu contrato.', 'Part-time contract: adjust to your contract percentage.')
      : null;
  return (
    <Calc title={l('Abono para falhas', 'Cash handling allowance')}>
      <View style={cs.line}><Text style={cs.lineLbl}>{l('Anual (5% da base)', 'Annual (5% of base)')}</Text><Text style={cs.lineVal}>{fmtEur(annual)}</Text></View>
      <View style={[cs.line, cs.lineDiv]}><Text style={cs.lineLbl}>{l('Mensal (÷12)', 'Monthly (÷12)')}</Text><Text style={cs.lineVal}>{fmtEur(annual / 12)}</Text></View>
      {note ? <Text style={cs.cashNote}>{note}</Text> : null}
    </Calc>
  );
}

function CalcLanguage({ lang }) {
  const l = L(lang);
  const [n, setN] = useState(1);
  const total = n <= 0 ? 0 : 350 + (n - 1) * 50;
  return (
    <Calc title={l('Domínio de língua estrangeira', 'Foreign language proficiency')}>
      <Stepper label={l('Línguas (além de EN/PT)', 'Languages (besides EN/PT)')} value={n} setValue={setN} min={0} max={6} />
      <Result value={fmtEur(total)} foot={l('3.ª língua: 350 €; cada adicional: +50 €. Por ano.', '3rd language: €350; each additional: +€50. Per year.')} />
    </Calc>
  );
}

function CalcWfly({ base, lang }) {
  const cs = makeCs(useTheme());
  const l = L(lang);
  const [n, setN] = useState(1);
  if (!base) return <Calc title={l('Trabalho em dia de descanso (WFLY)', 'Working on a day off (WFLY)')}><Text style={cs.na}>{l('Depende do salário mínimo nacional.', 'Depends on the national minimum wage.')}</Text></Calc>;
  const unit = base * 0.01;
  return (
    <Calc title={l('Trabalho em dia de descanso (WFLY)', 'Working on a day off (WFLY)')}>
      <Stepper label={l('Dias trabalhados', 'Days worked')} value={n} setValue={setN} min={1} />
      <Result value={fmtEur(unit * n)} foot={l(`1% da base anual = ${fmtEur(unit)} / dia`, `1% of annual base = ${fmtEur(unit)} / day`)} />
    </Calc>
  );
}

function CalcCommission({ lang }) {
  const cs = makeCs(useTheme());
  const l = L(lang);
  const [sales, setSales] = useState(0);
  return (
    <Calc title={l('Comissões (Bistro / Boutique)', 'Commissions (Bistro / Boutique)')}>
      <View style={cs.stepRow}>
        <Text style={cs.stepLabel}>{l('Total de vendas (€)', 'Total sales (€)')}</Text>
        <TextInput value={String(sales)} keyboardType="numeric" selectTextOnFocus
          onChangeText={(tval) => { const n = parseInt(tval.replace(/[^0-9]/g, ''), 10); setSales(isNaN(n) ? 0 : n); }}
          style={[cs.stepInput, { width: 90 }]} />
      </View>
      <Result value={fmtEur(sales * 0.10)} foot={l('10% do total de vendas do voo (a dividir pela tripulação).', '10% of the flight sales total (shared among the crew).')} />
    </Calc>
  );
}

function CalcCount({ lang }) {
  const l = L(lang);
  const [work, setWork] = useState(0);
  const [off, setOff] = useState(0);
  return (
    <Calc title={l('Dias de trabalho e folga', 'Work and days off')}>
      <Stepper label={l('Dias de trabalho', 'Work days')} value={work} setValue={setWork} />
      <Stepper label={l('Dias de folga', 'Days off')} value={off} setValue={setOff} />
      <ResultBlock label={l('TOTAL DE DIAS', 'TOTAL DAYS')} value={work + off} valueSize={26}
        foot={l(`${work} trabalho · ${off} folga. (Sem pagamento direto associado.)`, `${work} work · ${off} off. (No direct payment associated.)`)} />
    </Calc>
  );
}

// ─── Ecrã ────────────────────────────────────────────────────────────────────
export default function CategoriesScreen({ navigation }) {
  const { profile, lang } = useContext(AppContext);
  const C = useTheme();
  const cs = makeCs(C);
  const s = makeStyles(C);
  const l = L(lang);
  const tabSpace = useTabBarSpace();
  const rank = profile.rank || 'fa';
  const rankObj = RANKS.find(r => r.id === rank) || RANKS[1];
  const rankRow = RANK_ROW[rank] ?? 1;
  const ns = PAY_NUM[rank]?.ns ?? PAY_NUM.fa.ns;
  const base = PAY_NUM[rank]?.base ?? null;
  const nsCM = PAY_NUM.cm.ns;
  const rdpFloor = (rank === 'cm' || rank === 'cm_prob') ? 23 : 18;
  const contractObj = CONTRACTS.find(c => c.id === profile.contract);
  const isPT = profile.contract === 'pt';
  const [ptMode, setPtMode] = useState('fix50');
  const ptModeObj = PT_MODES.find(m => m.id === ptMode);
  const factor = isPT ? ptModeObj.factor : (profile.contract != null ? (CONTRACT_FACTOR[profile.contract] ?? 1) : 1);
  const contractLabel = isPT ? tx(ptModeObj.label, lang) : (txv(contractObj?.label, lang) || '');

  const openClause = (number) => {
    const clause = CLAUSES.find(c => c.number === number);
    if (clause) navigation.navigate('Detail', { clause }); // local à stack de Cálculos
  };

  // Companhias FTL: o separador Cálculos lista os artigos calculáveis como
  // cartões de consulta; tocar abre a calculadora (ecrã FtlCalc).
  const isFtl = companyContent(profile.company) === 'ftl';

  if (isFtl) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} keyboardShouldPersistTaps="handled">
          <ScreenHeader eyebrow={t('calc.eyebrow', lang)} title={t('calc.title', lang)} style={{ margin: 0, marginBottom: 12 }} />

          <Text style={s.group}>{l('CALCULADORAS', 'CALCULATORS')}</Text>
          {FTL_CALC_ARTICLES.map(a => (
            <TouchableOpacity key={a.code} style={s.fcard} activeOpacity={0.8} onPress={() => navigation.navigate('FtlCalc', { code: a.code })}>
              <View style={s.badge}><Text style={s.badgeTxt}>{a.code.replace('ORO.FTL.', '')}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.fcardTitle} numberOfLines={2}>{tx(a.title, lang)}</Text>
                <Text style={s.fcardSub} numberOfLines={2}>{tx(a.sub, lang)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.sub} />
            </TouchableOpacity>
          ))}

          <Text style={s.foot}>{l('Estimativas de apoio (Regulamento UE 83/2014). Confirma sempre na escala e nos limites oficiais.', 'Guidance estimates (Regulation EU 83/2014). Always confirm against the official roster and limits.')}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} keyboardShouldPersistTaps="handled">
        <ScreenHeader eyebrow={t('calc.eyebrow', lang)} title={t('calc.title', lang)} style={{ margin: 0, marginBottom: 12 }} />

        {/* A tua categoria */}
        <View style={s.meCard}>
          <View style={s.meTop}>
            <Text style={s.meEyebrow}>{t('calc.me', lang)}</Text>
            {contractObj && <View style={s.contractPill}><Text style={s.contractTxt}>{txv(contractObj.label, lang)}</Text></View>}
          </View>
          <Text style={s.meTitle}>{txv(rankObj.label, lang)}</Text>
          <View style={s.meRow}>
            <View style={s.meCell}><Text style={s.meLbl}>{l('Setor nominal', 'Nominal sector')}</Text><Text style={s.meVal}>{SECTOR_TABLE.rows[rankRow].v[2]}</Text></View>
            <View style={s.meCell}><Text style={s.meLbl}>{l('Base anual', 'Annual base')}</Text><Text style={s.meVal}>{SALARY.rows[rankRow].v[2]}</Text></View>
          </View>
          <Text style={s.meNote}>{l('As calculadoras usam os valores da tua categoria', 'The calculators use your rank values')}{contractObj && CONTRACT_NOTE[profile.contract] ? ` · ${txv(CONTRACT_NOTE[profile.contract], lang)}` : ''}</Text>
        </View>

        {isPT && (
          <View style={cs.calc}>
            <Text style={cs.calcTitle}>{l('Modalidade de tempo parcial', 'Part-time modality')}</Text>
            <Seg options={PT_MODES.map(m => ({ id: m.id, label: tx(m.label, lang) }))} value={ptMode} setValue={setPtMode} />
            <View style={cs.line}><Text style={cs.lineLbl}>{l('Base anual aplicável', 'Applicable annual base')}</Text><Text style={cs.lineVal}>{Math.round(ptModeObj.factor * 100)}%</Text></View>
            <View style={[cs.line, cs.lineDiv]}><Text style={cs.lineLbl}>{l('Dias de férias', 'Leave days')}</Text><Text style={cs.lineVal}>{ptModeObj.leave}</Text></View>
            <Text style={cs.cashNote}>{ptMode.startsWith('saz') ? l('8 meses a tempo parcial + 4 meses (verão) a tempo inteiro.', '8 part-time months + 4 (summer) full-time months.') : l('Percentagem aplicada todo o ano.', 'Percentage applied all year.')}</Text>
          </View>
        )}

        {/* Setores e deslocações */}
        <Text style={s.group}>{l('SETORES E DESLOCAÇÕES', 'SECTORS & TRAVEL')}</Text>
        <CalcSectors ns={ns} lang={lang} />
        <CalcPositioning rankRow={rankRow} lang={lang} />
        <CalcStandby ns={ns} lang={lang} />

        {/* Pagamentos por evento */}
        <Text style={s.group}>{l('PAGAMENTOS POR EVENTO', 'PER-EVENT PAYMENTS')}</Text>
        <CalcPerEvent title={l('Pernoitas', 'Night stops')} unitLabel={l('Noites fora da base', 'Nights away from base')} unit={46} foot={l('46 € por noite (Anexo I).', '€46 per night (Appendix I).')} />
        <CalcPerEvent title={l('Trabalho em terra', 'Office work')} unitLabel={l('Dias em terra', 'Office days')} unit={3 * ns} foot={l(`3 setores nominais = ${fmtEur(3 * ns)} / dia.`, `3 nominal sectors = ${fmtEur(3 * ns)} / day.`)} />
        <CalcPerEvent title={l('Pagamento por dia de férias', 'Holiday daily allowance')} unitLabel={l('Dias de férias', 'Leave days')} unit={2 * ns} foot={l(`2 setores nominais = ${fmtEur(2 * ns)} / dia.`, `2 nominal sectors = ${fmtEur(2 * ns)} / day.`)} />
        <CalcPerEvent title={l('Alterações de escala — SNC', 'Roster change — SNC')} unitLabel={l('Eventos SNC', 'SNC events')} unit={20} foot={l('20 € por evento qualificável.', '€20 per qualifying event.')} />
        <CalcPerEvent title={l('Irregularidade de escala — RDP', 'Roster disruption — RDP')} unitLabel={l('Eventos RDP', 'RDP events')} unit={Math.max(ns, rdpFloor)} foot={l(`1 setor nominal (mín. ${rdpFloor} € para a tua categoria).`, `1 nominal sector (min €${rdpFloor} for your rank).`)} />
        <CalcPerEvent title={l('Trabalhar num dia de descanso (DDO)', 'Working on a day off (DDO)')} unitLabel={l('Dias DDO', 'DDO days')} unit={115} foot={l('115 € por dia (todas as categorias).', '€115 per day (all ranks).')} />
        <CalcPerEvent title={l('Dia de descanso infringido (IDO)', 'Infringed day off (IDO)')} unitLabel={l('Dias IDO', 'IDO days')} unit={140} foot={l('140 € por dia (todas as categorias).', '€140 per day (all ranks).')} />
        <CalcWfly base={base} lang={lang} />
        <CalcCommission lang={lang} />

        {/* Mensais / anuais */}
        <Text style={s.group}>{l('MENSAIS / ANUAIS', 'MONTHLY / ANNUAL')}</Text>
        <CalcCash base={base} factor={factor} contractLabel={contractLabel} lang={lang} />
        <CalcLanguage lang={lang} />

        {/* Funções adicionais */}
        <Text style={s.group}>{l('FUNÇÕES ADICIONAIS', 'ADDITIONAL ROLES')}</Text>
        <CalcPerEvent title={l('CCLT — Tripulante Verificador de Linha', 'CCLT — Cabin Crew Line Trainer')} unitLabel={l('Dias de treino', 'Training days')} unit={25} foot={l('25 € por dia de treino.', '€25 per training day.')} />
        <CalcPerEvent title={l('Instrutor CTI-Flexi', 'CTI-Flexi Instructor')} unitLabel={l('Serviços', 'Duties')} unit={4 * nsCM} foot={l(`4 setores nominais (Chefe de Cabine) = ${fmtEur(4 * nsCM)}.`, `4 nominal sectors (Cabin Manager) = ${fmtEur(4 * nsCM)}.`)} />
        <CalcPerEvent title={l('Pagamento por dias de recrutamento', 'Recruitment days payment')} unitLabel={l('Dias', 'Days')} unit={4 * nsCM} foot={l(`4 setores nominais (Chefe de Cabine) = ${fmtEur(4 * nsCM)}.`, `4 nominal sectors (Cabin Manager) = ${fmtEur(4 * nsCM)}.`)} />

        {/* Outros */}
        <Text style={s.group}>{l('OUTROS', 'OTHER')}</Text>
        <CalcCount lang={lang} />

        <TouchableOpacity style={s.link} activeOpacity={0.8} onPress={() => openClause(33)}>
          <Ionicons name="document-text-outline" size={16} color={C.red} />
          <Text style={s.linkTxt}>{l('Cláusula 33 — Categorias e progressão', 'Clause 33 — Ranks and progression')}</Text>
          <Ionicons name="chevron-forward" size={15} color={C.line} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <Text style={s.foot}>{l(`Valores ilíquidos do Anexo I (${DATA_VERSION.payRef}). Estimativas para apoio — prevalece sempre o AE e o processamento oficial.`, `Gross values from Appendix I (${DATA_VERSION.payRef}). Estimates for guidance — the CLA and official payroll always prevail.`)}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeCs = (C) => StyleSheet.create({
  calc: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, backgroundColor: C.card },
  calcHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calcTitle: { flex: 1, fontSize: TYPE.body, fontWeight: '600', color: C.text, paddingRight: 8 },
  calcBody: { marginTop: 12 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  lineDiv: { borderTopWidth: 1, borderTopColor: C.line },
  lineLbl: { fontSize: 13, color: C.sub },
  lineVal: { fontSize: TYPE.value, fontFamily: 'monospace', fontWeight: '700', color: C.text },
  na: { fontSize: 13, color: C.sub },
  cashNote: { fontSize: 11, color: C.sub, marginTop: 10, lineHeight: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  stepLabel: { fontSize: TYPE.body, color: C.text, flex: 1, paddingRight: 8 },
  stepInput: { textAlign: 'center', fontFamily: 'monospace', fontSize: 13, backgroundColor: C.soft, borderRadius: 8, paddingVertical: 6, borderWidth: 1, borderColor: C.line, color: C.text },
});

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { padding: 16 },
  meCard: { borderWidth: 1.5, borderColor: C.ink, borderRadius: RADIUS.lg, padding: 16, marginBottom: 16, backgroundColor: C.card },
  meTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  meEyebrow: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.red, fontWeight: '700' },
  contractPill: { backgroundColor: C.soft, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  contractTxt: { fontSize: 11, color: C.ink, fontWeight: '600' },
  meTitle: { fontSize: TYPE.title, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  meRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  meCell: { flex: 1, backgroundColor: C.soft, borderRadius: 12, padding: 12 },
  meLbl: { fontSize: 10, letterSpacing: 0.5, color: C.sub, textTransform: 'uppercase' },
  meVal: { fontSize: 16, fontFamily: 'monospace', fontWeight: '700', color: C.text, marginTop: 3 },
  meNote: { fontSize: 11, color: C.sub, marginTop: 12 },
  group: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontWeight: '700', marginTop: 10, marginBottom: 8, marginLeft: 2 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.md, padding: 14, marginTop: 6, marginBottom: 8 },
  linkTxt: { fontSize: 13, fontWeight: '500', color: C.text },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: 8, paddingHorizontal: 2 },
  fcard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 12, marginBottom: 8, backgroundColor: C.card },
  fcardTitle: { fontSize: TYPE.body, fontWeight: '600', color: C.text, lineHeight: 19 },
  fcardSub: { fontSize: 11, color: C.sub, marginTop: 3, lineHeight: 16 },
  badge: { minWidth: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 13, fontWeight: '700' },
});
