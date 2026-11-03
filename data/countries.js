// Nomes localizados + bandeira dos países das bases (tabelas `countries`/`bases`).
// Os ~9 países do seed têm nome PT/EN aqui; fallback = catálogo `countries` (name) ou o ISO.
const NAMES = {
  GB: { pt: 'Reino Unido', en: 'United Kingdom' }, FR: { pt: 'França', en: 'France' },
  IT: { pt: 'Itália', en: 'Italy' }, ES: { pt: 'Espanha', en: 'Spain' },
  PT: { pt: 'Portugal', en: 'Portugal' }, CH: { pt: 'Suíça', en: 'Switzerland' },
  DE: { pt: 'Alemanha', en: 'Germany' }, NL: { pt: 'Países Baixos', en: 'Netherlands' },
  MA: { pt: 'Marrocos', en: 'Morocco' },
};

// Cidades das bases em português (2026-11-03): a tabela `bases` guarda o nome em inglês ("Lisbon",
// "Milan Malpensa"). Chave = código IATA da base. Fora do mapa → o nome da tabela.
const CITY_PT = {
  LIS: 'Lisboa', OPO: 'Porto', FAO: 'Faro',
  AGP: 'Málaga', PMI: 'Palma de Maiorca', ALC: 'Alicante', BCN: 'Barcelona',
  GVA: 'Genebra', BSL: 'Basileia', BER: 'Berlim', AMS: 'Amesterdão', RAK: 'Marraquexe',
  MXP: 'Milão Malpensa', LIN: 'Milão Linate', NAP: 'Nápoles', FCO: 'Roma Fiumicino',
  BOD: 'Bordéus', LYS: 'Lyon', NTE: 'Nantes', NCE: 'Nice', CDG: 'Paris CDG', ORY: 'Paris Orly',
  EDI: 'Edimburgo', LGW: 'Londres Gatwick', LTN: 'Londres Luton', SEN: 'Londres Southend',
};

// Nome da cidade de uma base, localizado. `city` = o nome da tabela (inglês), usado em EN e como recurso.
export const baseCityName = (code, city, lang = 'pt') =>
  (lang === 'pt' && CITY_PT[code]) || city || code || '';

// Nome do país localizado. `catalog` = a tabela `countries` (fallback p/ países fora do mapa).
export const countryName = (cc, lang = 'pt', catalog = []) =>
  NAMES[cc]?.[lang] || (catalog.find((c) => c.code === cc) || {}).name || cc || '';

// Bandeira (regional indicator symbols) a partir do ISO-3166 alpha-2. No iOS mostra a
// bandeira; em alguns Android pode cair para as 2 letras — degradação aceitável (fica ao
// lado do nome do país). '' se o código não tiver 2 letras.
export const countryFlag = (cc) =>
  /^[A-Za-z]{2}$/.test(cc || '')
    ? cc.toUpperCase().replace(/./g, (c) => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    : '';
