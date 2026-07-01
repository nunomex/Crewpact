// "Validades & Documentos" (feature premium, v1) — catálogo de itens por função +
// cálculo de ESTADO (válido / a expirar / expirado). Módulo PURO (sem React Native),
// testável. As datas vivem no item (`expiry` em ISO 'YYYY-MM-DD'); o estado deriva-se
// dos dias até expirar. Sem lembretes/nuvem aqui — isto é só a lógica.

// Catálogo sugerido por função. `id` estável (chave de persistência); `renewMonths` =
// duração típica de renovação (para a auto-deteção da escala na v2, ainda não usada).
// Núcleo para tripulação de LINHA (cabine + piloto de companhia). SEM ruído de aviação
// geral/privada (Classe 2, LAPL, class ratings SEP/MEP, instrutor). `noExpiry` = documento de
// REFERÊNCIA que não caduca (licença Part-FCL, CCA) → guarda-se o nº, nunca alarma nem lembra.
const PILOT = [
  { id: 'medical',    pt: 'Médico Classe 1',        en: 'Class 1 Medical',        renewMonths: 12 },
  { id: 'licence',    pt: 'Licença (nº)',           en: 'Licence (no.)',          renewMonths: null, noExpiry: true },
  { id: 'typeRating', pt: 'Type rating · OPC/LPC',  en: 'Type rating · OPC/LPC',  renewMonths: 12 },
  { id: 'ir',         pt: 'IR · instrumentos',      en: 'Instrument Rating (IR)', renewMonths: 12 },
  { id: 'lang',       pt: 'Inglês ICAO',            en: 'ICAO English',           renewMonths: 48 },
  { id: 'sep',        pt: 'SEP recorrente',         en: 'SEP recurrent',          renewMonths: 12 },
  { id: 'crm',        pt: 'CRM',                    en: 'CRM',                    renewMonths: 36 },
  { id: 'dg',         pt: 'Dangerous Goods',        en: 'Dangerous Goods',        renewMonths: 24 },
  { id: 'asec',       pt: 'Segurança (ASEC)',       en: 'Aviation Security',      renewMonths: 36 },
  { id: 'faid',       pt: 'Primeiros socorros',     en: 'First Aid',              renewMonths: 36 },
  { id: 'passport',   pt: 'Passaporte',             en: 'Passport',               renewMonths: null },
];
const CABIN = [
  { id: 'medical',    pt: 'Médico',                 en: 'Medical',                renewMonths: 60 },
  { id: 'cca',        pt: 'Atestado de cabine (nº)', en: 'Cabin Crew Attestation (no.)', renewMonths: null, noExpiry: true },
  { id: 'sep',        pt: 'SEP recorrente',         en: 'SEP recurrent',          renewMonths: 12 },
  { id: 'crm',        pt: 'CRM',                    en: 'CRM',                    renewMonths: 36 },
  { id: 'dg',         pt: 'Dangerous Goods',        en: 'Dangerous Goods',        renewMonths: 24 },
  { id: 'asec',       pt: 'Segurança (ASEC)',       en: 'Aviation Security',      renewMonths: 36 },
  { id: 'faid',       pt: 'Primeiros socorros',     en: 'First Aid',              renewMonths: 36 },
  { id: 'passport',   pt: 'Passaporte',             en: 'Passport',               renewMonths: null },
];

// Papéis ADICIONAIS (opt-in no perfil) → documentos próprios com validade. Um instrutor de piloto
// (TRI/TRE, Part-FCL) tem certificado com validade própria (~3 anos). Só entra no catálogo quando
// o perfil tem `instructorRated`. (O instrutor de CABINE — CCI — é hoje só papel de pagamento no
// SNPVAC, sem flag de documento; fica para a fase seguinte. Ver [[validades-documentos]].)
const INSTRUCTOR = { id: 'instructor', pt: 'Instrutor · TRI/TRE', en: 'Instructor · TRI/TRE', renewMonths: 36 };
const CATALOG_ALL = [...PILOT, ...CABIN, INSTRUCTOR];

// Catálogo conforme a FUNÇÃO (piloto/cabine) + PAPÉIS adicionais do perfil (ex. instrutor).
// Default cabine. `opts.instructorRated` acrescenta o certificado de instrutor (só a pilotos).
export const validityCatalog = (isPilot, { instructorRated = false } = {}) => {
  const base = isPilot ? PILOT : CABIN;
  return (isPilot && instructorRated) ? [...base, INSTRUCTOR] : base;
};

// Rótulo de um tipo (do catálogo) no idioma; fallback ao próprio id se for custom.
export const validityLabel = (typeId, isPilot, lang = 'pt') => {
  const def = CATALOG_ALL.find((t) => t.id === typeId);
  return def ? (lang === 'en' ? def.en : def.pt) : typeId;
};

// Tipo que NÃO expira → documento de REFERÊNCIA (sem alarme, sem lembrete): a licença Part-FCL
// é "para sempre" (o que caduca são os ratings), o CCA tem duração ilimitada. Guarda-se o nº.
export const isNoExpiryType = (typeId) => CATALOG_ALL.some((t) => t.id === typeId && t.noExpiry);

// ── Formulário RICO: campos estruturados por tipo + helpers puros ────────────────────────────
// Meses de renovação de um tipo (do catálogo); null se não tiver.
export const renewMonthsForType = (typeId) => (CATALOG_ALL.find((t) => t.id === typeId) || {}).renewMonths || null;

// Deriva a VALIDADE a partir da DATA FEITA + meses de renovação, levando ao FIM DO MÊS (como o
// eCrew regista: "válido até fim do mês de expiração"). null se faltar algo. Puro, UTC.
export const deriveExpiry = (doneISO, months) => {
  if (!doneISO || !months) return null;
  const [y, m, d] = String(doneISO).split('-').map(Number);
  if (!y || !m || !d) return null;
  const base = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(base.getTime())) return null;
  const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months + 1, 0)); // dia 0 = último do mês
  const p = (n) => String(n).padStart(2, '0');
  return `${end.getUTCFullYear()}-${p(end.getUTCMonth() + 1)}-${p(end.getUTCDate())}`;
};

// Que campos o formulário RICO mostra para cada tipo:
//  date       — validade DIRETA (médico, passaporte)        doneDate — DATA FEITA → validade derivada
//  reference  — não expira, só nº (licença/CCA)             number/nationality/aircraft/limitations/level/instrKind — extras
export const fieldsForType = (typeId) => {
  const F = {
    medical:    { date: true, limitations: true, number: true },
    passport:   { date: true, number: true, nationality: true },
    licence:    { reference: true, number: true },
    cca:        { reference: true, number: true },
    lang:       { level: true },
    typeRating: { doneDate: true, aircraft: true },
    ir:         { doneDate: true },
    sep:        { doneDate: true }, crm: { doneDate: true }, dg: { doneDate: true }, asec: { doneDate: true }, faid: { doneDate: true },
    instructor: { doneDate: true, instrKind: true },
  };
  return F[typeId] || { date: true, number: true };
};

// Proficiência linguística (FCL.055): nível 4 = 48 m · nível 5 = 72 m · nível 6 = sem prazo.
export const LANG_LEVELS = [4, 5, 6];
export const langRenewMonths = (level) => (level === 6 ? null : level === 5 ? 72 : 48);

// Tipos de certificado de instrutor/examinador (Part-FCL) — para o piloto escolher qual tem.
export const INSTRUCTOR_KINDS = ['TRI', 'TRE', 'FI', 'SFI'];

// Códigos de limitação médica (Part-MED), crew-aware — os mais comuns na linha (o resto vai na nota).
// Cada código condiciona COMO se opera; a app mostra a dica.
const MED_CODES_PILOT = [
  { code: 'VDL', pt: 'óculos p/ longe + sobresselente', en: 'distance glasses + spare' },
  { code: 'VML', pt: 'multifocais + sobresselente',     en: 'multifocals + spare' },
  { code: 'VNL', pt: 'óculos p/ perto disponíveis',     en: 'reading glasses available' },
  { code: 'OML', pt: 'só multipiloto',                  en: 'multi-pilot only' },
  { code: 'OCL', pt: 'só como copiloto',                en: 'co-pilot only' },
  { code: 'HAL', pt: 'com aparelho auditivo',           en: 'with hearing aid' },
  { code: 'TML', pt: 'validade reduzida',               en: 'time-limited' },
  { code: 'SIC', pt: 'exames médicos extra',            en: 'special medical exams' },
];
const MED_CODES_CABIN = [
  { code: 'CCL', pt: 'só lentes de contacto',           en: 'contact lenses only' },
  { code: 'HAL', pt: 'com aparelho auditivo',           en: 'with hearing aid' },
  { code: 'MCL', pt: 'só tripulação múltipla',          en: 'multi cabin-crew only' },
  { code: 'OAL', pt: 'restrito ao tipo de avião',       en: 'aircraft-type restricted' },
  { code: 'TML', pt: 'validade reduzida',               en: 'time-limited' },
  { code: 'SIC', pt: 'exames médicos extra',            en: 'special medical exams' },
];
export const medCodes = (isPilot) => (isPilot ? MED_CODES_PILOT : MED_CODES_CABIN);
export const medCodeHint = (code, isPilot, lang = 'pt') => {
  const def = [...MED_CODES_PILOT, ...MED_CODES_CABIN].find((c) => c.code === code);
  return def ? (lang === 'en' ? def.en : def.pt) : '';
};

// Estado de um item pela data de validade. warnDays = janela "a expirar" (default 30).
// band: 'valid' (verde) · 'expiring' (âmbar) · 'expired' (vermelho) · 'none' (sem data).
export function validityStatus(expiryISO, ref = new Date(), warnDays = 30) {
  if (!expiryISO) return { band: 'none', days: null };
  const exp = new Date(`${expiryISO}T00:00:00`);
  if (isNaN(exp.getTime())) return { band: 'none', days: null };
  const days = Math.round((exp.getTime() - ref.getTime()) / 86400000);
  const band = days < 0 ? 'expired' : days <= warnDays ? 'expiring' : 'valid';
  return { band, days };
}

// Ordena itens: primeiro os que pedem atenção (expirado → a expirar → válido → sem data),
// e dentro de cada grupo por data mais próxima. Puro (devolve novo array).
export function sortValidities(items = [], ref = new Date()) {
  const RANK = { expired: 0, expiring: 1, valid: 2, none: 3 };
  return [...items].sort((a, b) => {
    const sa = validityStatus(a.expiry, ref), sb = validityStatus(b.expiry, ref);
    const r = (RANK[sa.band] ?? 3) - (RANK[sb.band] ?? 3);
    if (r !== 0) return r;
    if (sa.days == null) return 1;
    if (sb.days == null) return -1;
    return sa.days - sb.days;
  });
}
