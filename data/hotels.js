// Hotéis de pernoita — catálogo pessoal POR ESTAÇÃO (a companhia usa o mesmo hotel em
// cada destino; regista-se uma vez, reutiliza-se sempre). Módulo PURO.
// Forma: { [IATA]: { name, phone?, note? } } — LOCAL no dispositivo (cp_hotels_<uid>);
// "onde durmo" não precisa de viajar para servidor nenhum (RGPD-leve).
//
// SEM GPS nem APIs de lugares: a ESCALA já diz onde vais dormir (a estação deriva da
// rota/setores, como o endsAwayReliable do motor); os mapas abrem por DEEP LINK do sistema.

// Estação da pernoita de um serviço: o ÚLTIMO aeroporto real (legs > rota) quando é
// diferente da base. null = não derivável (ex. pernoita manual sem rota → a folha pergunta).
export const nightStopStation = (duty, base) => {
  if (!duty) return null;
  const b = String(base || '').trim().toUpperCase();
  let last = (Array.isArray(duty.legs) && duty.legs.length) ? duty.legs[duty.legs.length - 1].arr : null;
  if (!last && duty.route) { const aps = String(duty.route).split(/[^A-Za-z]+/).filter(Boolean); last = aps[aps.length - 1]; }
  if (!last) return null;
  last = String(last).trim().toUpperCase();
  return (b && last === b) ? null : last;
};

// Deep link dos mapas (nome + estação na pesquisa). iOS → Apple Maps; resto → Google Maps.
export const hotelMapsUrl = (name, station, os = 'ios') => {
  const q = encodeURIComponent([name, station].filter(Boolean).join(' '));
  return os === 'ios' ? `http://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
};

// Deep link do telefone (só dígitos e +).
export const hotelTelUrl = (phone) => `tel:${String(phone || '').replace(/[^+\d]/g, '')}`;
