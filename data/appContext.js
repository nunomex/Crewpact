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

// Paleta ativa (claro/escuro). Ecrãs fazem `const C = useTheme()`.
export const useTheme = () => useContext(AppContext)?.palette || PALETTES.light;
