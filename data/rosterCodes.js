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
    training:       /\b(SIM|TRG|RECURRENT|CBT|GS|CEET|CRM|DG|AVSEC|RTW|LPC|OPC)\b|(?<![\d/][\s/]?)\bSEP\b(?!\s?\d)/i,
    office:         /\b(GND|GROUND|OFFICE|OFC|ADMIN|MTG)\b/i,       // terra/escritório/reunião
    // DOWE (folga de fim de semana) é o crítico: sem ele, uma folga era proposta como
    // serviço no import. SICK/MAT/UPL = ausências. GDO (golden day off — folga protegida)
    // e P/T (dia não-trabalhado do part-time) vieram do calendário REAL do founder (2026-07-11).
    dayOff:         /\bFTGD\b|D\/O|\bRDO\b|\bANL\b|\bVAC\b|\bLVE\b|\bDOWE\b|\bSICK\b|\bMAT\b|\bUPL\b|\bGDO\b|\bP\/T\b/i,
  },
  // jet2 / volotea / wizz / hifly → acrescentar aqui (com o diagnóstico).
};

// Códigos da companhia (string slug); default easyJet enquanto não houver outros.
export const codesFor = (company) => ROSTER_CODES[String(company || '').toLowerCase()] || ROSTER_CODES.easyjet;

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
