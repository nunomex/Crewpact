import React, { useContext } from 'react';
import { PALETTES } from './constants';

// Contexto + helpers partilhados, num módulo-FOLHA (não importa o App.js). Os
// ecrãs/componentes importam daqui (não de '../App'), o que QUEBRA o ciclo de
// require App ↔ screens (antes: App→screen→App, ruidoso nos logs). O App.js
// também importa daqui e fornece o valor do Provider.
export const AppContext = React.createContext(null);

// Data local 'YYYY-MM-DD' (componentes locais, não o UTC do toISOString()) — para
// não trocar de dia perto da meia-noite consoante o fuso.
export const isoDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Hora local "HH:MM" (no dia dateISO) → Zulu/UTC "HH:MM". Converte com o fuso do
// dispositivo (com DST). Mostra Zulu+Local em qualquer duty (calendário OU manual).
export const toZulu = (dateISO, hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!dateISO || !m) return null;
  const d = new Date(`${dateISO}T00:00:00`);
  d.setHours(+m[1], +m[2], 0, 0);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

// Paleta ativa (claro/escuro). Ecrãs fazem `const C = useTheme()`.
export const useTheme = () => useContext(AppContext)?.palette || PALETTES.light;
