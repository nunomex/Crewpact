// ─── Palette ─────────────────────────────────────────────────────────────────
export const C = {
  canvas: "#FFFFFF",
  soft: "#F3F2EF",
  ink: "#191919",
  inkSoft: "#2A2A2A",
  red: "#EA3D2F",
  redSoft: "#FBE3E0",
  line: "#E7E6E2",
  text: "#191919",
  sub: "#9B9B95",
  green: "#1F9E6E",
  greenSoft: "#E2F4EC",
};

// ─── Companies ───────────────────────────────────────────────────────────────
export const COMPANIES = [
  { id: "easyjet-pt", name: "easyJet", code: "EZY", country: "Portugal", active: true },
  { id: "tap-pt", name: "TAP Air Portugal", code: "TAP", country: "Portugal", active: false },
  { id: "ryanair", name: "Ryanair", code: "RYR", country: "Europa", active: false },
];

// ─── Ranks & Contracts ───────────────────────────────────────────────────────
export const RANKS = [
  { id: "fa_1ano", label: "Assistente/Comissário 1.º ano", short: "FA 1.º ano" },
  { id: "fa", label: "Assistente/Comissário de Bordo", short: "Assist./Com." },
  { id: "cm_prob", label: "Chefe de Cabine (período exp.)", short: "Chefe (exp.)" },
  { id: "cm", label: "Chefe de Cabine", short: "Chefe de Cabine" },
];
export const CONTRACTS = [
  { id: "12_12", label: "Tempo inteiro (12/12)" },
  { id: "10_12", label: "Parcial anual 10/12" },
  { id: "8_12", label: "Parcial anual 8/12" },
  { id: "9_3", label: "Intermitente 9/3" },
  { id: "pt", label: "Tempo parcial (fixo/sazonal)" },
];

// ─── Sections ────────────────────────────────────────────────────────────────
export const SECTIONS = [
  { id: "s0", n: 0, title: "Cláusulas" },
  { id: "s1", n: 1, title: "Relações entre as partes" },
  { id: "s2", n: 2, title: "Interoperabilidade" },
  { id: "s3", n: 3, title: "Deveres" },
  { id: "s4", n: 4, title: "Saúde e Segurança" },
  { id: "s5", n: 5, title: "Proteção de Dados" },
  { id: "s6", n: 6, title: "Emprego na easyJet" },
  { id: "s7", n: 7, title: "Formação Profissional" },
  { id: "s8", n: 8, title: "Categorias profissionais" },
  { id: "s9", n: 9, title: "Contrato de trabalho" },
  { id: "s10", n: 10, title: "Remuneração e Benefícios" },
  { id: "s11", n: 11, title: "Férias" },
  { id: "s11b", n: 11.5, title: "Escalas" },
  { id: "s12", n: 12, title: "Faltas e Licenças" },
  { id: "s12b", n: 12.5, title: "Cessação de Contrato" },
  { id: "s13", n: 13, title: "Disposições Finais" },
];

// ─── Annex I numeric data ─────────────────────────────────────────────────────
export const SALARY = {
  periods: ["Fev 24", "Fev 25", "Nov 25"],
  rows: [
    { rank: "Assist./Com. 1.º ano", v: ["SMN", "SMN", "SMN"] },
    { rank: "Assistente/Comissário", v: ["16 870 €", "18 214 €", "18 852 €"] },
    { rank: "Chefe Cabine (exp.)", v: ["16 930 €", "18 274 €", "18 914 €"] },
    { rank: "Chefe de Cabine", v: ["20 924 €", "22 414 €", "23 198 €"] },
  ],
};
export const SECTOR_TABLE = {
  periods: ["Fev 24", "Fev 25", "Nov 25"],
  rows: [
    { rank: "Assist./Com. 1.º ano", v: ["13,45 €", "13,45 €", "13,45 €"] },
    { rank: "Assistente/Comissário", v: ["19,37 €", "19,96 €", "21,00 €"] },
    { rank: "Chefe Cabine (exp.)", v: ["21,77 €", "22,43 €", "24,00 €"] },
    { rank: "Chefe de Cabine", v: ["26,62 €", "27,41 €", "32,50 €"] },
  ],
};
export const POSITIONING = {
  header: ["Curto", "Médio", "Longo", "Extra"],
  rows: [
    { rank: "FA 1.º ano", v: ["10,76", "16,14", "20,18", "33,63"] },
    { rank: "Assist./Com.", v: ["16,80", "25,20", "31,50", "52,50"] },
    { rank: "Chefe (exp.)", v: ["19,20", "28,80", "36,00", "60,00"] },
    { rank: "Chefe Cabine", v: ["26,00", "39,00", "48,75", "81,25"] },
  ],
};
export const PROFILE_PAY = {
  fa_1ano: { base: "SMN", ns: "13,45 €" },
  fa: { base: "18 852 €", ns: "21,00 €" },
  cm_prob: { base: "18 914 €", ns: "24,00 €" },
  cm: { base: "23 198 €", ns: "32,50 €" },
};
export const NS_PREV = { fa_1ano: 13.45, fa: 19.96, cm_prob: 22.43, cm: 27.41 };
export const NS_NOW  = { fa_1ano: 13.45, fa: 21.0,  cm_prob: 24.0,  cm: 32.5  };
export const PAY_NUM = {
  fa_1ano: { ns: 13.45, base: null },
  fa:      { ns: 21.0,  base: 18852 },
  cm_prob: { ns: 24.0,  base: 18914 },
  cm:      { ns: 32.5,  base: 23198 },
};
export const CONTRACT_NOTE = {
  "12_12": "Valor a tempo inteiro.",
  "10_12": "≈ 10/12 do valor anual, em 14 prestações.",
  "8_12":  "≈ 8/12 do valor anual.",
  "9_3":   "100% na atividade (9 m) · 25% na inatividade (3 m).",
  pt:      "Proporcional à percentagem do contrato parcial.",
};
export const RANK_ROW = { fa_1ano: 0, fa: 1, cm_prob: 2, cm: 3 };
export const BOND_REPAY = [900,900,900,900,900,900,900,750,600,450,300,150,0];
export const SECTOR_OPTS = [
  { id: "short", label: "Curto",  mult: 0.8 },
  { id: "medium",label: "Médio",  mult: 1.2 },
  { id: "long",  label: "Longo",  mult: 1.5 },
  { id: "extra", label: "Extra",  mult: 2.5 },
];
export const STANDBY_OPTS = [
  { id: "fly_short",  label: "Chamado · ≤3:59", med: 0 },
  { id: "fly_long",   label: "Chamado · >4h",   med: 1 },
  { id: "nofly_short",label: "Não cham. · ≤3:59",med: 1 },
  { id: "nofly_long", label: "Não cham. · >4h",  med: 2 },
];
export const CALC = {
  32:  { kind: "bond" },
  34:  { kind: "count", unit: "Setores como Upranker", per: { type: "eur", value: 16.27 } },
  50:  { kind: "base", compute: "monthly" },
  53:  { kind: "sector" },
  54:  { kind: "base", compute: "cash" },
  56:  { kind: "count", unit: "Noites fora da base", per: { type: "eur", value: 46 } },
  57:  { kind: "positioning" },
  58:  { kind: "standby" },
  60:  { kind: "count", unit: "Dias de férias", per: { type: "ns", mult: 2 } },
  63:  { kind: "base", compute: "bonus" },
  65:  { kind: "language" },
  66:  { kind: "count", unit: "Eventos SNC", per: { type: "eur", value: 20 } },
  67:  { kind: "count", unit: "Eventos RDP", per: { type: "ns", mult: 1 }, note: "Floor: 18€ (FA) / 23€ (CM)." },
  68:  { kind: "count2", items: [{ label: "Dias DDO (115€)", value: 115 }, { label: "Dias IDO (140€)", value: 140 }] },
  70:  { kind: "count", unit: "Dias em terra", per: { type: "ns", mult: 3 } },
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const NOTIFS = [
  { id: 1, tag: "ESCALA",    time: "há 2 h",    title: "Escala de julho publicada",
    body: "A tua escala de julho já está disponível. Verifica os standbys atribuídos." },
  { id: 2, tag: "AE",        time: "ontem",      title: "Acordo atualizado — versão 3",
    body: "Foram refletidos os valores de Nov 2025 do Anexo I (setor nominal e posicionamento)." },
  { id: 3, tag: "PAGAMENTO", time: "há 3 dias",  title: "Novas tarifas em vigor",
    body: "Setor nominal da tua categoria passou a 32,50 €. Confere a cláusula 53." },
  { id: 4, tag: "GDO",       time: "há 5 dias",  title: "GDO de 24/08 confirmado",
    body: "O teu dia de descanso garantido foi aceite no sistema (cláusula 77)." },
  { id: 5, tag: "SINDICATO", time: "há 1 sem",   title: "Reunião trimestral SNPVAC–easyJet",
    body: "Resumo disponível: roster forum, dotação e cobertura de standby." },
];
