import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, TYPE, RANKS, CONTRACTS, CONTRACT_NOTE, PAY_NUM, RANK_ROW, POSITIONING, SALARY, SECTOR_TABLE, DATA_VERSION } from '../data/constants';

// Fração da base anual aplicável por tipo de contrato (12/12 = inteiro).
const CONTRACT_FACTOR = { '12_12': 1, '10_12': 10 / 12, '8_12': 8 / 12, '9_3': 9.75 / 12, pt: null };

// Modalidades de tempo parcial (Cláusula 80): fração da base anual e dias de férias.
// Sazonal = N meses a X% + 4 meses (verão) a 100%.
const PT_MODES = [
  { id: 'fix50', label: 'Fixo 50%',     factor: 0.5,       leave: 13 },
  { id: 'fix75', label: 'Fixo 75%',     factor: 0.75,      leave: 19 },
  { id: 'saz50', label: 'Sazonal 50%',  factor: 8 / 12,    leave: 17 },
  { id: 'saz75', label: 'Sazonal 75%',  factor: 10 / 12,   leave: 21 },
];
import { CLAUSES } from '../data/clauses';
import ScreenHeader from '../components/ScreenHeader';
import { Stepper, Seg } from '../components/Stepper';
import { ResultBlock } from '../components/CalcCard';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { AppContext } from '../App';

const fmtEur = (n) => n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const num = (s) => parseFloat(String(s).replace(',', '.')) || 0;

function Calc({ title, children }) {
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
function CalcSectors({ ns }) {
  const [q, setQ] = useState({ s: 0, m: 0, l: 0, x: 0 });
  const m = { s: 0.8, m: 1.2, l: 1.5, x: 2.5 };
  const total = (q.s * m.s + q.m * m.m + q.l * m.l + q.x * m.x) * ns;
  return (
    <Calc title="Setores voados">
      <Stepper label="Curtos (0,8× NS)"        value={q.s} setValue={(v) => setQ({ ...q, s: v })} />
      <Stepper label="Médios (1,2× NS)"        value={q.m} setValue={(v) => setQ({ ...q, m: v })} />
      <Stepper label="Longos (1,5× NS)"        value={q.l} setValue={(v) => setQ({ ...q, l: v })} />
      <Stepper label="Extra longos (2,5× NS)"  value={q.x} setValue={(v) => setQ({ ...q, x: v })} />
      <Result value={fmtEur(total)} foot={`Setor nominal (NS) = ${fmtEur(ns)}`} />
    </Calc>
  );
}

function CalcPositioning({ rankRow }) {
  const OPTS = [{ id: 0, label: 'Curto' }, { id: 1, label: 'Médio' }, { id: 2, label: 'Longo' }, { id: 3, label: 'Extra' }];
  const [idx, setIdx] = useState(1);
  const [n, setN] = useState(1);
  const unit = num(POSITIONING.rows[rankRow].v[idx]);
  return (
    <Calc title="Posicionamento">
      <Seg options={OPTS} value={idx} setValue={setIdx} />
      <Stepper label="Nº de posicionamentos" value={n} setValue={setN} min={1} />
      <Result value={fmtEur(unit * n)} foot={`${OPTS[idx].label}: ${fmtEur(unit)} (${DATA_VERSION.payRef})`} />
    </Calc>
  );
}

function CalcPerEvent({ title, unitLabel, unit, foot, start = 1 }) {
  const [n, setN] = useState(start);
  return (
    <Calc title={title}>
      <Stepper label={unitLabel} value={n} setValue={setN} />
      <Result value={fmtEur(unit * n)} foot={foot || `Unitário: ${fmtEur(unit)}`} />
    </Calc>
  );
}

function CalcStandby({ ns }) {
  const med = 1.2 * ns;
  const OPTS = [
    { id: 'cs', label: 'Chamado ≤3:59', med: 0 },
    { id: 'cl', label: 'Chamado >4h', med: 1 },
    { id: 'ns', label: 'Não cham. ≤3:59', med: 1 },
    { id: 'nl', label: 'Não cham. >4h', med: 2 },
  ];
  const [v, setV] = useState('cl');
  const o = OPTS.find(x => x.id === v);
  return (
    <Calc title="Assistência no aeroporto">
      <Seg options={OPTS} value={v} setValue={setV} />
      <Result value={o.med ? fmtEur(o.med * med) : '0,00 €'} foot={o.med ? `${o.med} setor médio (1,2× NS). Não inclui per diem.` : 'Só per diem.'} />
    </Calc>
  );
}

function CalcCash({ base, factor, contractLabel }) {
  if (!base) return <Calc title="Abono para falhas"><Text style={cs.na}>Depende do salário mínimo nacional.</Text></Calc>;
  const effBase = factor != null ? base * factor : base;
  const annual = effBase * 0.05;
  const note = factor != null && factor < 1
    ? `Base efetiva ${contractLabel}: ${fmtEur(effBase)} (de ${fmtEur(base)}).`
    : factor == null
      ? 'Contrato parcial: ajustar à percentagem do teu contrato.'
      : null;
  return (
    <Calc title="Abono para falhas">
      <View style={cs.line}><Text style={cs.lineLbl}>Anual (5% da base)</Text><Text style={cs.lineVal}>{fmtEur(annual)}</Text></View>
      <View style={[cs.line, cs.lineDiv]}><Text style={cs.lineLbl}>Mensal (÷12)</Text><Text style={cs.lineVal}>{fmtEur(annual / 12)}</Text></View>
      {note ? <Text style={cs.cashNote}>{note}</Text> : null}
    </Calc>
  );
}

function CalcLanguage() {
  const [n, setN] = useState(1);
  const total = n <= 0 ? 0 : 350 + (n - 1) * 50;
  return (
    <Calc title="Domínio de língua estrangeira">
      <Stepper label="Línguas (além de EN/PT)" value={n} setValue={setN} min={0} max={6} />
      <Result value={fmtEur(total)} foot="3.ª língua: 350 €; cada adicional: +50 €. Por ano." />
    </Calc>
  );
}

function CalcWfly({ base }) {
  const [n, setN] = useState(1);
  if (!base) return <Calc title="Trabalho em dia de descanso (WFLY)"><Text style={cs.na}>Depende do salário mínimo nacional.</Text></Calc>;
  const unit = base * 0.01;
  return (
    <Calc title="Trabalho em dia de descanso (WFLY)">
      <Stepper label="Dias trabalhados" value={n} setValue={setN} min={1} />
      <Result value={fmtEur(unit * n)} foot={`1% da base anual = ${fmtEur(unit)} / dia`} />
    </Calc>
  );
}

function CalcCommission() {
  const [sales, setSales] = useState(0);
  return (
    <Calc title="Comissões (Bistro / Boutique)">
      <View style={cs.stepRow}>
        <Text style={cs.stepLabel}>Total de vendas (€)</Text>
        <TextInput value={String(sales)} keyboardType="numeric" selectTextOnFocus
          onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); setSales(isNaN(n) ? 0 : n); }}
          style={[cs.stepInput, { width: 90 }]} />
      </View>
      <Result value={fmtEur(sales * 0.10)} foot="10% do total de vendas do voo (a dividir pela tripulação)." />
    </Calc>
  );
}

function CalcCount() {
  const [work, setWork] = useState(0);
  const [off, setOff] = useState(0);
  return (
    <Calc title="Dias de trabalho e folga">
      <Stepper label="Dias de trabalho" value={work} setValue={setWork} />
      <Stepper label="Dias de folga" value={off} setValue={setOff} />
      <ResultBlock label="TOTAL DE DIAS" value={work + off} valueSize={26}
        foot={`${work} trabalho · ${off} folga. (Sem pagamento direto associado.)`} />
    </Calc>
  );
}

// ─── Ecrã ────────────────────────────────────────────────────────────────────
export default function CategoriesScreen({ navigation }) {
  const { profile } = useContext(AppContext);
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
  const contractLabel = isPT ? ptModeObj.label : (contractObj?.label || '');

  const openClause = (number) => {
    const clause = CLAUSES.find(c => c.number === number);
    if (clause) navigation.navigate('AE/FTL', { screen: 'Detail', params: { clause } });
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} keyboardShouldPersistTaps="handled">
        <ScreenHeader eyebrow="CALCULADORAS" title="Cálculos" style={{ margin: 0, marginBottom: 12 }} />

        {/* A tua categoria */}
        <View style={s.meCard}>
          <View style={s.meTop}>
            <Text style={s.meEyebrow}>A TUA CATEGORIA</Text>
            {contractObj && <View style={s.contractPill}><Text style={s.contractTxt}>{contractObj.label}</Text></View>}
          </View>
          <Text style={s.meTitle}>{rankObj.label}</Text>
          <View style={s.meRow}>
            <View style={s.meCell}><Text style={s.meLbl}>Setor nominal</Text><Text style={s.meVal}>{SECTOR_TABLE.rows[rankRow].v[2]}</Text></View>
            <View style={s.meCell}><Text style={s.meLbl}>Base anual</Text><Text style={s.meVal}>{SALARY.rows[rankRow].v[2]}</Text></View>
          </View>
          <Text style={s.meNote}>As calculadoras usam os valores da tua categoria{contractObj ? ` · ${CONTRACT_NOTE[profile.contract] || ''}` : ''}</Text>
        </View>

        {isPT && (
          <View style={cs.calc}>
            <Text style={cs.calcTitle}>Modalidade de tempo parcial</Text>
            <Seg options={PT_MODES.map(m => ({ id: m.id, label: m.label }))} value={ptMode} setValue={setPtMode} />
            <View style={cs.line}><Text style={cs.lineLbl}>Base anual aplicável</Text><Text style={cs.lineVal}>{Math.round(ptModeObj.factor * 100)}%</Text></View>
            <View style={[cs.line, cs.lineDiv]}><Text style={cs.lineLbl}>Dias de férias</Text><Text style={cs.lineVal}>{ptModeObj.leave}</Text></View>
            <Text style={cs.cashNote}>{ptMode.startsWith('saz') ? '8 meses a tempo parcial + 4 meses (verão) a tempo inteiro.' : 'Percentagem aplicada todo o ano.'}</Text>
          </View>
        )}

        {/* Setores e deslocações */}
        <Text style={s.group}>SETORES E DESLOCAÇÕES</Text>
        <CalcSectors ns={ns} />
        <CalcPositioning rankRow={rankRow} />
        <CalcStandby ns={ns} />

        {/* Pagamentos por evento */}
        <Text style={s.group}>PAGAMENTOS POR EVENTO</Text>
        <CalcPerEvent title="Pernoitas" unitLabel="Noites fora da base" unit={46} foot="46 € por noite (Anexo I)." />
        <CalcPerEvent title="Trabalho em terra" unitLabel="Dias em terra" unit={3 * ns} foot={`3 setores nominais = ${fmtEur(3 * ns)} / dia.`} />
        <CalcPerEvent title="Pagamento por dia de férias" unitLabel="Dias de férias" unit={2 * ns} foot={`2 setores nominais = ${fmtEur(2 * ns)} / dia.`} />
        <CalcPerEvent title="Alterações de escala — SNC" unitLabel="Eventos SNC" unit={20} foot="20 € por evento qualificável." />
        <CalcPerEvent title="Irregularidade de escala — RDP" unitLabel="Eventos RDP" unit={Math.max(ns, rdpFloor)} foot={`1 setor nominal (mín. ${rdpFloor} € para a tua categoria).`} />
        <CalcPerEvent title="Trabalhar num dia de descanso (DDO)" unitLabel="Dias DDO" unit={115} foot="115 € por dia (todas as categorias)." />
        <CalcPerEvent title="Dia de descanso infringido (IDO)" unitLabel="Dias IDO" unit={140} foot="140 € por dia (todas as categorias)." />
        <CalcWfly base={base} />
        <CalcCommission />

        {/* Mensais / anuais */}
        <Text style={s.group}>MENSAIS / ANUAIS</Text>
        <CalcCash base={base} factor={factor} contractLabel={contractLabel} />
        <CalcLanguage />

        {/* Funções adicionais */}
        <Text style={s.group}>FUNÇÕES ADICIONAIS</Text>
        <CalcPerEvent title="CCLT — Tripulante Verificador de Linha" unitLabel="Dias de treino" unit={25} foot="25 € por dia de treino." />
        <CalcPerEvent title="Instrutor CTI-Flexi" unitLabel="Serviços" unit={4 * nsCM} foot={`4 setores nominais (Chefe de Cabine) = ${fmtEur(4 * nsCM)}.`} />
        <CalcPerEvent title="Pagamento por dias de recrutamento" unitLabel="Dias" unit={4 * nsCM} foot={`4 setores nominais (Chefe de Cabine) = ${fmtEur(4 * nsCM)}.`} />

        {/* Outros */}
        <Text style={s.group}>OUTROS</Text>
        <CalcCount />

        <TouchableOpacity style={s.link} activeOpacity={0.8} onPress={() => openClause(33)}>
          <Ionicons name="document-text-outline" size={16} color={C.red} />
          <Text style={s.linkTxt}>Cláusula 33 — Categorias e progressão</Text>
          <Ionicons name="chevron-forward" size={15} color={C.line} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <Text style={s.foot}>Valores ilíquidos do Anexo I ({DATA_VERSION.payRef}). Estimativas para apoio — prevalece sempre o AE e o processamento oficial.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  calc: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, backgroundColor: C.canvas },
  calcHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calcTitle: { flex: 1, fontSize: TYPE.body, fontWeight: '600', color: C.text, paddingRight: 8 },
  calcBody: { marginTop: 12 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  lineDiv: { borderTopWidth: 1, borderTopColor: C.line },
  lineLbl: { fontSize: 13, color: C.sub },
  lineVal: { fontSize: TYPE.value, fontFamily: 'monospace', fontWeight: '700', color: C.text },
  na: { fontSize: 13, color: C.sub },
  cashNote: { fontSize: 11, color: C.sub, marginTop: 10, lineHeight: 16 },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { padding: 16 },
  meCard: { borderWidth: 1.5, borderColor: C.ink, borderRadius: RADIUS.lg, padding: 16, marginBottom: 16, backgroundColor: C.canvas },
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
});
