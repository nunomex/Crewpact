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
    standbyAirport: /\b(A?SBY|STBY|STANDBY|RESERVE|RESERVA)\b/i,    // standby aeroporto
    positioning:    /\b(DH|DHD|DEADHEAD|POS|PSN)\b/i,               // posicionamento/deadhead
    training:       /\b(SIM|TRG|RECURRENT|CBT|GS)\b/i,              // formação/simulador
    office:         /\b(GND|GROUND|OFFICE|OFC|ADMIN)\b/i,           // terra/escritório
    dayOff:         /\bFTGD\b|D\/O|\bRDO\b|\bANL\b|\bVAC\b|\bLVE\b/i, // folga/fadiga/férias (não é duty → não importa)
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
