// Códigos de escala POR COMPANHIA. O eCrew/AIMS escreve cada tipo de duty com
// códigos diferentes por operador — mas os KIND são UNIVERSAIS (flight /
// standby_airport / standby_home / positioning / office / training). Só os
// CÓDIGOS (regex) mudam por companhia. Default: easyJet.
//
// Para adicionar um operador: corre o 🔧 diagnóstico (Importar), vê os títulos
// que dão "—" e acrescenta um bloco aqui com os regex desse eCrew.
export const ROSTER_CODES = {
  easyjet: {
    flightNo:       /\b(EZY|EJU|U2)\s?\d{2,4}[A-Z]?\b/i,           // nº de voo easyJet
    standbyHome:    /\b(HSBY|HSTB|HMSBY)\b/i,                       // standby em casa
    standbyAirport: /\b(ADTY|A?SBY|STBY|STANDBY|RESERVE|RESERVA)\b/i, // standby aeroporto (ADTY = o código easyJet, o mesmo do abono AE Anexo I.5)
    positioning:    /\b(DH|DHD|DEADHEAD|POS|PSN)\b/i,               // posicionamento/deadhead
    // Treino (2026-07-11, siglas confirmadas com o founder): SEP/CEET (recorrente de
    // segurança + evacuação) · CRM · DG · AVSEC · RTW (regresso ao serviço) · LPC/OPC
    // (checks de pilotos). ⚠️ "SEP" também é MÊS — e o training testa ANTES do voo no
    // classify → guardas de contexto: não conta colado a dígitos ("01 SEP", "SEP 26",
    // "01/SEP"); o "01Sep" compacto do eCrew nem casa \b (dígito→letra não é fronteira).
    // "SEP" seguido de uma HORA ("SEP 09:00-17:00", "SEP 9h00") é formação; seguido de outro número é data (auditoria A-238).
    training:       /\b(SIM|TRG|RECURRENT|CBTB?|GS|CEET|CRM|DG|AVSEC|RTW|LPC|OPC)\b|(?<![\d/][\s/]?)\bSEP\b(?!\s?\d(?!\d?[:h]\d{2}))/i,   // CBTB? = CBT e a variante CBTB (calendário real do founder)
    office:         /\b(GND|GROUND|OFFICE|OFC[48]?|ADMIN|MTG)\b/i,  // terra/escritório/reunião (OFC[48] = \bOFC\b não casa "OFC8" — letra→dígito não é fronteira)
    // DOWE (folga de fim de semana) é o crítico: sem ele, uma folga era proposta como
    // serviço no import. SICK/MAT/UPL = ausências. GDO (golden day off — folga protegida)
    // e P/T (dia não-trabalhado do part-time) vieram do calendário REAL do founder (2026-07-11).
    dayOff:         /\bFTGD\b|D\/O|\bRDO\b|\bANL\b|\bVAC\b|\bLVE\b|\bDOWE\b|\bSICK\b|\bMAT\b|\bUPL\b|\bGDO\b|\bP\/T\b/i,
  },
  // jet2 / volotea / wizz / hifly → acrescentar aqui (com o diagnóstico).
};

// OS CÓDIGOS DO SUPABASE (2026-11-16; golden scripts/calendar.test.js). A tabela `roster_codes` (supabase/roster-codes.sql — só
// leitura para a app; escreve-a a CrewPact no painel) JUNTA códigos aos de cima, nunca os tira: corrige-se em minutos para todos,
// sem esperar pela revisão da loja. Cada linha é um código como vem na escala ("SBYX", "WD/O" — não uma fórmula: o ponto é um
// ponto) e um tipo; só os da companhia; um tipo que a app não conhece não entra. A cópia guarda-se no telemóvel (data/remoteCodes.js).
const KIND_FIELD = { standby_home: 'standbyHome', standby_airport: 'standbyAirport', positioning: 'positioning', training: 'training', office: 'office', off: 'dayOff' };
const escRe = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function withRemoteCodes(codes, rows = [], airline = 'easyjet') {
  const mine = (rows || []).filter((r) => r && String(r.airline || '').toLowerCase() === airline && KIND_FIELD[r.kind] && String(r.code || '').trim());
  if (!mine.length) return codes;
  const out = { ...codes };
  for (const [kind, field] of Object.entries(KIND_FIELD)) {
    const toks = [...new Set(mine.filter((r) => r.kind === kind).map((r) => String(r.code).trim().toUpperCase()))];
    if (!toks.length) continue;
    // o código inteiro: sem letra, algarismo ou "/" colado de nenhum lado (\b não serve aos códigos com "/")
    const alt = toks.map((t) => `(?<![A-Za-z0-9/])${escRe(t)}(?![A-Za-z0-9/])`).join('|');
    const base = codes[field];
    out[field] = base ? new RegExp(`${base.source}|${alt}`, base.flags) : new RegExp(alt, 'i');
  }
  return out;
}
let REMOTE = [];
let MEMO = new Map();
export const setRemoteCodes = (rows) => { REMOTE = Array.isArray(rows) ? rows : []; MEMO = new Map(); };

// Códigos da companhia (string slug); default easyJet enquanto não houver outros — com os do Supabase por cima, quando os há.
export const codesFor = (company) => {
  const slug = String(company || '').toLowerCase();
  const key = ROSTER_CODES[slug] ? slug : 'easyjet';
  if (!REMOTE.length) return ROSTER_CODES[key];
  if (!MEMO.has(key)) MEMO.set(key, withRemoteCodes(ROSTER_CODES[key], REMOTE, key));
  return MEMO.get(key);
};

// True quando o nº de voo NÃO parece da companhia — SÓ quando TEMOS os códigos dela
// (modelada) E o nº não casa o seu `flightNo`. False se a companhia não está modelada
// (fallback = não arriscar falso-alarme) ou o nº casa. Para o aviso SUAVE do "Detetar"
// no manual (posicionamento noutra companhia é legítimo → o chamador limita a voos operados).
export const flightNoForeign = (fno, company) => {
  const slug = String((company && company.slug) || company || '').toLowerCase();
  const codes = ROSTER_CODES[slug];
  if (!codes || !codes.flightNo) return false;
  return !codes.flightNo.test(String(fno || ''));
};

// Companhias cuja escala a app ainda NÃO sabe ler: sem os códigos do calendário dela, as assistências,
// as reservas e as folgas não são reconhecidas (só os voos, pela rota). A configuração não as deixa
// escolher até termos esses códigos (Nuno, 2026-11-03: "bloquear ... a opção de escolher a TAP até
// termos isso"). Para desbloquear: acrescentar o bloco da companhia ao ROSTER_CODES e tirá-la daqui.
export const ROSTER_PENDING = ['tap'];
export const isRosterPending = (airline) => {
  const s = [airline && airline.id, airline && airline.slug, airline && airline.engine_code, airline && airline.name]
    .filter(Boolean).join(' ').toLowerCase();
  return ROSTER_PENDING.some((k) => new RegExp(`\\b${k}\\b`).test(s));
};
