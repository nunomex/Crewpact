// "Validades & Documentos" (feature premium, v1) — catálogo de itens por função +
// cálculo de ESTADO (válido / a expirar / expirado). Módulo PURO (sem React Native),
// testável. As datas vivem no item (`expiry` em ISO 'YYYY-MM-DD'); o estado deriva-se
// dos dias até expirar. Sem lembretes/nuvem aqui — isto é só a lógica.

// Catálogo sugerido por função. `id` estável (chave de persistência); `renewMonths` =
// duração típica de renovação (para a auto-deteção da escala na v2, ainda não usada).
const PILOT = [
  { id: 'medical',    pt: 'Médico Classe 1',       en: 'Class 1 Medical',      renewMonths: 12 },
  { id: 'licence',    pt: 'Licença',               en: 'Licence',              renewMonths: null },
  { id: 'typeRating', pt: 'Type rating · OPC/LPC',  en: 'Type rating · OPC/LPC', renewMonths: 12 },
  { id: 'sep',        pt: 'SEP recorrente',         en: 'SEP recurrent',        renewMonths: 12 },
  { id: 'crm',        pt: 'CRM',                    en: 'CRM',                  renewMonths: 36 },
  { id: 'dg',         pt: 'Dangerous Goods',        en: 'Dangerous Goods',      renewMonths: 24 },
  { id: 'asec',       pt: 'Segurança (ASEC)',       en: 'Aviation Security',    renewMonths: 36 },
  { id: 'faid',       pt: 'Primeiros socorros',     en: 'First Aid',            renewMonths: 36 },
  { id: 'lang',       pt: 'Inglês ICAO',            en: 'ICAO English',         renewMonths: 48 },
  { id: 'passport',   pt: 'Passaporte',             en: 'Passport',             renewMonths: null },
];
const CABIN = [
  { id: 'medical',    pt: 'Médico',                 en: 'Medical',              renewMonths: 60 },
  { id: 'cca',        pt: 'Atestado de cabine (CCA)', en: 'Cabin Crew Attestation', renewMonths: null },
  { id: 'sep',        pt: 'SEP recorrente',         en: 'SEP recurrent',        renewMonths: 12 },
  { id: 'crm',        pt: 'CRM',                    en: 'CRM',                  renewMonths: 36 },
  { id: 'dg',         pt: 'Dangerous Goods',        en: 'Dangerous Goods',      renewMonths: 24 },
  { id: 'asec',       pt: 'Segurança (ASEC)',       en: 'Aviation Security',    renewMonths: 36 },
  { id: 'faid',       pt: 'Primeiros socorros',     en: 'First Aid',            renewMonths: 36 },
  { id: 'passport',   pt: 'Passaporte',             en: 'Passport',             renewMonths: null },
];

// Catálogo conforme a função (piloto/cabine). Default cabine.
export const validityCatalog = (isPilot) => (isPilot ? PILOT : CABIN);

// Rótulo de um tipo (do catálogo) no idioma; fallback ao próprio id se for custom.
export const validityLabel = (typeId, isPilot, lang = 'pt') => {
  const def = [...PILOT, ...CABIN].find((t) => t.id === typeId);
  return def ? (lang === 'en' ? def.en : def.pt) : typeId;
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
