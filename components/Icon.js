// CrewPact · Sistema de Ícones — PORTE RN da fonte única `design/icons.js`.
// Os paths são os MESMOS do canon (SÓLIDOS, grelha 24, fill=currentColor); render via
// `SvgXml` do react-native-svg (já instalado) → 1:1 com os mockups, sem redesenhar.
//
//   <Icon name="lock" />                     (20px, ink)
//   <Icon name="chevron" rot={90} />         (chevron ⌄)
//   <Icon name="bell" size={18} color={C.yellow} />
//
// `color` alimenta o currentColor (amarelo sobre placa preta, ink sobre papel).
// Nome inválido → quadrado laranja visível (erro que se vê, não falha silenciosa).
import React from 'react';
import { SvgXml } from 'react-native-svg';

const PLANE = 'M21 16v-2l-8-5V3.5C13 2.7 12.33 2 11.5 2S10 2.7 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';

// Cada valor é a marcação INTERNA do <svg> (um ou mais <path>). fill herdado (currentColor).
const ICONS = {
  // ── base ──
  plane:   '<path d="' + PLANE + '"/>',
  cal:     '<path d="M7 2h2.6v3H7V2zm7.4 0H17v3h-2.6V2zM4 5h16v3.6H4V5zm0 5h16v10a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 20V10zm3.4 3v2.8h2.8V13H7.4zm5 0v2.8h2.8V13h-2.8z"/>',
  stats:   '<path d="M4 12.5h3.8V20H4v-7.5zM10.1 5.5h3.8V20h-3.8V5.5zM16.2 9.5H20V20h-3.8V9.5z"/>',
  clock:   '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1.3 4.4v5l4.1 2.5-1.3 2.1-5-3V6.4h2.2z"/>',
  bed:     '<path d="M3 6h3.2v7H3V6zm0 8h18v5h-2.6v-2.2H5.6V19H3v-5zm5-4.6h8.6A4.4 4.4 0 0 1 21 13.8H8V9.4z"/>',
  share:   '<path d="M17 3a2.8 2.8 0 1 1-2.6 3.8L8.6 10a2.8 2.8 0 0 1 0 4l5.8 3.2A2.8 2.8 0 1 1 13.6 19l-5.8-3.3a2.8 2.8 0 1 1 0-7.4l5.8-3.2A2.8 2.8 0 0 1 17 3z"/>',
  fam:     '<path d="M9 4.5A2.8 2.8 0 1 1 9 10a2.8 2.8 0 0 1 0-5.5zm8 1.6a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6zM3 20c0-3.6 2.7-5.9 6-5.9s6 2.3 6 5.9H3zm13.4 0c0-2.4 1-4.1 3.1-4.1 1.8 0 3 1.4 3.2 4.1h-6.3z"/>',
  wallet:  '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h12A2.5 2.5 0 0 1 20 6.5V8h1v8h-1v1.5A2.5 2.5 0 0 1 17.5 20h-12A2.5 2.5 0 0 1 3 17.5v-11zM15 10.4a1.6 1.6 0 0 0 0 3.2h6v-3.2h-6z"/>',
  doc:     '<path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7.4 1.8V8h4.2l-4.2-4.2zM7.4 12h9.2v1.9H7.4V12zm0 4h7v1.9h-7V16z"/>',
  moon:    '<path d="M14.2 3a9.2 9.2 0 1 0 6.6 15.6A10.6 10.6 0 0 1 14.2 3z"/>',
  sun:     '<path d="M12 7.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6zM11 2h2v3.2h-2V2zm0 16.8h2V22h-2v-3.2zM2 11h3.2v2H2v-2zm16.8 0H22v2h-3.2v-2zM4.6 6 6 4.6 8.3 6.9 6.9 8.3 4.6 6zm11.1 11.1 1.4-1.4 2.3 2.3-1.4 1.4-2.3-2.3zm2.3-12.5L19.4 6l-2.3 2.3-1.4-1.4 2.3-2.3zM4.6 18l2.3-2.3 1.4 1.4L6 19.4 4.6 18z"/>',
  alert:   '<path d="M12 2 1.4 21h21.2L12 2zm-1.1 8.6h2.2v4.6h-2.2v-4.6zm0 6h2.2v2.2h-2.2v-2.2z"/>',
  home:    '<path d="M12 3l9.2 8.2h-2.5V21h-4.9v-6.4h-3.6V21H5.3v-9.8H2.8L12 3z"/>',
  gauge:   '<path d="M12 5a10 10 0 0 0-10 10.4h3.4A6.6 6.6 0 0 1 14 9.3l2.5-2.6A9.9 9.9 0 0 0 12 5zm7.4 3.3-6.1 5a2 2 0 1 0 2 2.1l5.4-5.7a10 10 0 0 0-1.3-1.4zM18.6 15.4h3.3c0-.5 0-1-.1-1.5l-3.3.7c.1.3.1.5.1.8z"/>',
  plus:    '<path d="M10.4 4h3.2v6.4H20v3.2h-6.4V20h-3.2v-6.4H4v-3.2h6.4V4z"/>',
  tower:   '<path d="M11 2h2v3h3l-1 5h1.6L18 21h-2.4l-.7-4H9.1l-.7 4H6l1.4-11H9L8 5h3V2zm-.7 9 .5-4h2.4l.5 4h-3.4z"/>',

  // ── setas ──
  'arrow-r':    '<path d="M3 10.6h11.2V6.6L21 12l-6.8 5.4v-4H3v-2.8z"/>',
  'arrow-u':    '<path d="M10.6 21V9.8H6.6L12 3l5.4 6.8h-4V21h-2.8z"/>',
  'arrow-diag': '<path d="M6.2 19.4 4.6 17.8 14.9 7.5H8.4V5.2H18.8V15.6h-2.3V9.1L6.2 19.4z"/>',
  'arrow-dots': '<path d="M2.4 10.9h2.4v2.2H2.4v-2.2zm4.4 0h2.4v2.2H6.8v-2.2zm4.4 0h2.4v2.2h-2.4v-2.2zm4.3-2.5L21 12l-4.9 3.6V8.4z"/>',
  brackets:     '<path d="M4 4h5.2v2.3H6.3v2.9H4V4zm10.8 0H20v5.2h-2.3V6.3h-2.9V4zM4 14.8h2.3v2.9h2.9V20H4v-5.2zm13.7 0H20V20h-5.2v-2.3h2.9v-2.9z"/>',

  // ── aeroporto (ISO 7001) ──
  departs:    '<g transform="rotate(45 12 12)"><path d="' + PLANE + '"/></g><path d="M3 19.2h12v1.7H3z"/>',
  arrivs:     '<g transform="rotate(135 12 12)"><path d="' + PLANE + '"/></g><path d="M9 19.2h12v1.7H9z"/>',
  gate:       '<path d="M5 3h5v2H7v14h3v2H5z"/><path d="M14 3h5v18h-5v-2h3V5h-3z"/><path d="M12 8l3.6 3.6h-2.4V17h-2.4v-5.4H8.4z"/>',
  passport:   '<path fill-rule="evenodd" d="M6 2h11a1.6 1.6 0 0 1 1.6 1.6v16.8A1.6 1.6 0 0 1 17 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm5.5 4.4a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zM8 15.8h7v1.8H8z"/>',
  transfer:   '<path d="M4.6 9.4A8 8 0 0 1 18 7.2V5h2.4v6.4H14V9h2.5A5.6 5.6 0 0 0 6.9 10.3zM19.4 14.6A8 8 0 0 1 6 16.8V19H3.6v-6.4H10V15H7.5a5.6 5.6 0 0 0 9.6 1z"/>',
  info:       '<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.1 4.6h2.2v2.2h-2.2zm0 3.6h2.2V17h-2.2z"/>',
  medical:    '<path d="M9.2 3h5.6v6.2H21v5.6h-6.2V21H9.2v-6.2H3V9.2h6.2z"/>',
  shuttle:    '<path fill-rule="evenodd" d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5V15.5a1.4 1.4 0 0 1-1 1.35v1.15a1.1 1.1 0 0 1-2.2 0v-1.15H7.2v1.15a1.1 1.1 0 0 1-2.2 0V16.85A1.4 1.4 0 0 1 4 15.5zM6.2 7.2v4h4.9v-4zm6.7 0v4h4.9v-4zM7.6 12.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zm8.8 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z"/>',
  ticket:     '<path d="M3 7A1.5 1.5 0 0 1 4.5 5.5h15A1.5 1.5 0 0 1 21 7v2.2a1.9 1.9 0 0 0 0 3.6V15a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 15v-2.2a1.9 1.9 0 0 0 0-3.6z"/>',
  restricted: '<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM6.6 10.9h10.8v2.2H6.6z"/>',

  // ── UI chrome ──
  chevron:  '<path d="M8.5 4.8 15.7 12l-7.2 7.2-2.1-2.1L11.4 12 6.4 6.9z"/>',
  close:    '<path d="M6.4 4.9 12 10.5l5.6-5.6 1.5 1.5L13.5 12l5.6 5.6-1.5 1.5L12 13.5l-5.6 5.6-1.5-1.5L10.5 12 4.9 6.4z"/>',
  back:     '<path d="M4 12 11 5l2 2-3.5 3.5H20v3H9.5L13 17l-2 2z"/>',
  search:   '<path fill-rule="evenodd" d="M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.3 4.3-2 2-4.3-4.3A7.5 7.5 0 1 1 10.5 3zm0 2.6a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8z"/>',
  trash:    '<path d="M9 2.5h6l1 1.5h4V6.5H4V4h4z"/><path d="M6 8h12l-1 12.2a1.8 1.8 0 0 1-1.8 1.6H8.8A1.8 1.8 0 0 1 7 20.2z"/>',
  edit:     '<path d="M4 16.6 15 5.6l2.9 2.9L6.9 19.5 3 20.5z"/><path d="M16.3 4.3l1.6-1.6a1.4 1.4 0 0 1 2 0l1.4 1.4a1.4 1.4 0 0 1 0 2l-1.6 1.6z"/>',
  check:    '<path d="M9.3 15.7 5 11.4l2-2 2.3 2.3 7.7-7.7 2 2z"/>',
  ellipsis: '<path d="M4 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>',
  mail:     '<path fill-rule="evenodd" d="M2.5 5.5h19A1.5 1.5 0 0 1 23 7v10a1.5 1.5 0 0 1-1.5 1.5h-19A1.5 1.5 0 0 1 1 17V7a1.5 1.5 0 0 1 1.5-1.5zm2.8 2L12 12.4 18.7 7.5z"/>',
  lock:     '<path fill-rule="evenodd" d="M6.5 9.5V8a5.5 5.5 0 0 1 11 0v1.5H19v11H5v-11h1.5zm2.5 0h6V8a3 3 0 0 0-6 0v1.5z"/>',
  bell:     '<path d="M12 2.2a2.1 2.1 0 0 0-2.1 2.1v.5A6 6 0 0 0 6 10.4V15l-1.8 1.8v1.3h15.6v-1.3L18 15v-4.6a6 6 0 0 0-3.9-5.6v-.5A2.1 2.1 0 0 0 12 2.2zM9.8 19.5a2.2 2.2 0 0 0 4.4 0z"/>',
  download: '<path d="M10.7 3h2.6v8.2h3.2L12 16.4l-4.5-5.2h3.2z"/><path d="M4.5 18.5h15V21h-15z"/>',
  pin:      '<path fill-rule="evenodd" d="M12 2a7 7 0 0 0-7 7c0 4.8 7 12.5 7 12.5S19 13.8 19 9a7 7 0 0 0-7-7zm0 4.4A2.6 2.6 0 1 1 12 11.6 2.6 2.6 0 0 1 12 6.4z"/>',
  phone:    '<path d="M6.6 3h2.2l2 4.6-2.3 1.5a11.5 11.5 0 0 0 5.4 5.4l1.5-2.3 4.6 2v2.2c0 1.6-1.4 2.9-3 2.6A16 16 0 0 1 4 6c-.3-1.6 1-3 2.6-3z"/>',
  bulb:     '<path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8V16.5h7.6V14.3A6.5 6.5 0 0 0 12 2.5z"/><path d="M9 18h6v1.3a1.7 1.7 0 0 1-1.7 1.7h-2.6A1.7 1.7 0 0 1 9 19.3z"/>',
  logout:   '<path d="M4 3h9v2.4H6.4v13.2H13V21H4z"/><path d="M15.6 7.4 20.2 12l-4.6 4.6-1.7-1.7 1.7-1.7H9v-2.4h6.6l-1.7-1.7z"/>',

  // ── extras do canon ──
  eye:    '<path fill-rule="evenodd" d="M12 5C5.8 5 1.8 11.2 1.6 11.6a.7.7 0 0 0 0 .8C1.8 12.8 5.8 19 12 19s10.2-6.2 10.4-6.6a.7.7 0 0 0 0-.8C22.2 11.2 18.2 5 12 5zm0 2.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8z"/><path d="M12 9.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z"/>',
  user:   '<path d="M12 3.4a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4zM4.8 20.2c0-4 3.2-6.6 7.2-6.6s7.2 2.6 7.2 6.6a.8.8 0 0 1-.8.8H5.6a.8.8 0 0 1-.8-.8z"/>',
  faceid: '<path d="M3 3.8A.8.8 0 0 1 3.8 3H8v2.2H5.2V8H3V3.8zM16 3h4.2a.8.8 0 0 1 .8.8V8h-2.2V5.2H16V3zM3 16h2.2v2.8H8V21H3.8a.8.8 0 0 1-.8-.8V16zm15.8 0H21v4.2a.8.8 0 0 1-.8.8H16v-2.2h2.8V16z"/><path d="M8.5 8.8h1.7v3.4H8.5zm5.3 0h1.7v3.4h-1.7zM8.6 14.8a3.7 3.7 0 0 0 6.8 0l-1.8-.7a1.9 1.9 0 0 1-3.2 0z"/>',
  sync:   '<path d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"/>',
  play:   '<path d="M7 4.5v15l13-7.5z"/>',
  pause:  '<path d="M6.5 4.5h4v15h-4zm7 0h4v15h-4z"/>',
  book:   '<path d="M6 2h13a1 1 0 0 1 1 1v14H6.5A2.5 2.5 0 0 0 4 20.5V4a2 2 0 0 1 2-2zm2 4v2h9V6H8z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v2a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 20.5z"/>',
  globe:  '<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 7h-3.1a15 15 0 0 0-1.3-4.2A8 8 0 0 1 18.9 9zM12 4c.8 0 1.9 1.9 2.4 5H9.6C10.1 5.9 11.2 4 12 4zM9.5 4.8A15 15 0 0 0 8.2 9H5.1a8 8 0 0 1 4.4-4.2zM4.3 11h3.4a17 17 0 0 0 0 2H4.3a8 8 0 0 1 0-2zm5.4 0h4.6a15 15 0 0 1 0 2H9.7a15 15 0 0 1 0-2zm6.6 0h3.4a8 8 0 0 1 0 2h-3.4a17 17 0 0 0 0-2zM5.1 15h3.1a15 15 0 0 0 1.3 4.2A8 8 0 0 1 5.1 15zm4.5 0h4.8c-.5 3.1-1.6 5-2.4 5s-1.9-1.9-2.4-5zm6.2 0h3.1a8 8 0 0 1-4.4 4.2 15 15 0 0 0 1.3-4.2z"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.4 9.2-8 11-4.6-1.8-8-6-8-11V5l8-3z"/>',
  theme:  '<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2v16a8 8 0 0 0 0-16z"/>',
  rank:   '<path d="M4 5.5h16v2.4H4zm0 4.3h16v2.4H4zm0 4.3h16v2.4H4zm0 4.3h16v2.4H4z"/>',
  heart:  '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>',
  minus:  '<path d="M4 10.4h16v3.2H4z"/>',
};

const MISSING = '<path fill="#E8482C" d="M2 2h20v20H2z"/><path fill="#fff" d="M11 6h2v7h-2zm0 9h2v2h-2z"/>';

export const ICON_NAMES = Object.keys(ICONS);

function Icon({ name, size = 20, color = '#141414', rot = 0, style }) {
  let inner = ICONS[name];
  if (inner == null) inner = MISSING;
  if (rot) inner = '<g transform="rotate(' + rot + ' 12 12)">' + inner + '</g>';
  const xml = '<svg viewBox="0 0 24 24" fill="currentColor">' + inner + '</svg>';
  return <SvgXml xml={xml} width={size} height={size} color={color} style={style} />;
}

export default React.memo(Icon);
