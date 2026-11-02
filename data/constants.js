// ─── Palette (LEGADO EXTINTO 2026-07-10) ─────────────────────────────────────
// O tema antigo morreu: zero consumidores de PALETTE_*/useTheme/FONT. Mantém-se
// SÓ este bloco de paletas como referência histórica de cores (não importar).
// A pele viva é PELE/PELE_NIGHT/PELE_FONT, mais abaixo.
const PALETTE_LIGHT = {
  canvas: "#FFFFFF",
  card: "#FFFFFF",   // superfície de cartão (= canvas no claro; elevada no escuro)
  soft: "#F2F2F0",
  soft2: "#FAFAF9",  // superfície alternativa subtil (linhas zebra, fundos de campo)
  ink: "#1B1B1B",
  inkSoft: "#2A2A2A",
  red: "#F5402C",       // vermelho da marca (alinhado ao mockup + splash)
  redSoft: "#FDE9E4",
  redDark: "#E0341F",   // estado pressionado de ações primárias
  // Cores semânticas — evitar reutilizar `red` para tudo.
  danger: "#F5402C",
  info: "#2E6BE6",       // azul — sinal neutro de relevância
  infoSoft: "#E4ECFB",
  brand: "#1F4E79",      // azul-instrumento (Flight Deck) — IDENTIDADE (logo/idcard); distinto do info
  warn: "#E8932B",       // âmbar — aviso/aproximação ao limite
  warnSoft: "#FBEAD2",
  line: "#ECECEA",
  text: "#1B1B1B",
  sub: "#6B6B66", // cinzento secundário (≈ 5:1 sobre branco — passa WCAG AA)
  subLight: "#7A7A73", // rótulos discretos (escurecido p/ contraste AA — antes #97978F falhava)
  // Tons sobre fundo escuro (ink).
  onDark: "#FFFFFF",
  onDarkSub: "rgba(255,255,255,0.7)", // texto secundário sobre fundo preto
  onDarkFaint: "rgba(255,255,255,0.6)", // rótulos discretos sobre preto
  hairlineOnDark: "rgba(255,255,255,0.12)", // separadores/realces sobre preto
  scrim: "rgba(0,0,0,0.4)", // fundo de overlay de modais
  green: "#1F9E6E",
  greenSoft: "#E2F4EC",
  lineStrong: "#D4D4D1", // risca/separador neutro, mais visível que `line` (risca lateral do Hoje D2)
  // Cores de TEXTO acessível (≥4.5:1) — usar em texto <18px; as vivas (red/warn/green)
  // ficam só para fills ≥3px e números display ≥24px. (Flight Deck — pass sénior.)
  redText: "#C9331F", warnText: "#9A6B1E", greenText: "#2A7A5C",
};

// Paleta escura — superfícies elevadas sobre canvas, texto quase branco. onDark*
// mantêm-se (as superfícies ink continuam escuras nos dois modos).
const PALETTE_DARK = {
  canvas: "#141414",
  card: "#1E1E1E",
  soft: "#232323",
  soft2: "#1A1A1A",  // superfície alternativa subtil (par escuro de soft2)
  ink: "#242424",
  inkSoft: "#2E2E2E",
  red: "#FF5547",       // vermelho mais claro/saturado para fundos escuros
  redSoft: "#3A1F1C",
  redDark: "#E84A3D",   // estado pressionado (escuro)
  danger: "#FF5547",
  info: "#5B8DEF",
  infoSoft: "#1B2A4A",
  brand: "#2C6097",      // par escuro do brand (mais claro p/ não desaparecer no canvas #141414)
  warn: "#F0A949",
  warnSoft: "#3A2E1A",
  line: "#2C2C2C",
  text: "#F2F2F2",
  sub: "#9A9A94",
  subLight: "#8A8A84", // par escuro clareado p/ contraste no card #1E1E1E
  onDark: "#FFFFFF",
  onDarkSub: "rgba(255,255,255,0.7)",
  onDarkFaint: "rgba(255,255,255,0.6)",
  hairlineOnDark: "rgba(255,255,255,0.12)",
  scrim: "rgba(0,0,0,0.6)",
  green: "#2BB587",
  greenSoft: "#14302A",
  lineStrong: "#3E3E3E", // par escuro da risca neutra
  // Texto acessível no escuro (sobre card #1E1E1E) — alvos calibrados, verificar no device.
  redText: "#FF6B5E", warnText: "#E2A24E", greenText: "#5FC2A0",
};

// (PALETTES/C — exports extintos; as constantes acima ficam locais, sem uso.)
void PALETTE_LIGHT; void PALETTE_DARK;

// ─── Design tokens ─────────────────────────────────────────────────────────────
export const RADIUS = { xs: 8, sm: 10, md: 14, lg: 16, xl: 22, xxl: 24, pill: 99 };
// Espaço (Design System 2.0, 2026-11-02): grelha de 4 com dois meios-passos (2 e 6) para o miúdo.
// As chaves antigas (xs/sm/md/lg/xl) mantêm o valor — nada do que já existe muda.
// Fora da escala: 1 (hairline) e valores negativos de sobreposição deliberada.
export const SPACE  = { xxs: 2, xs: 4, s: 6, sm: 8, md: 12, lg: 16, lgPlus: 20, xl: 24, xxl: 32, xxxl: 40 };
// Escala de elevação (sombra). Cor ink-azulada para profundidade; usa-se por
// spread no estilo: ...SHADOW.md. As sombras de marca (glow vermelho do FAB/roda/
// cartões) e a do dock são próprias (afinadas à mão) e ficam FORA desta escala.
export const SHADOW = {
  sm: { shadowColor: '#14161A', shadowOffset: { width: 0, height: 4 },  shadowOpacity: 0.12, shadowRadius: 12, elevation: 5 },
  md: { shadowColor: '#14161A', shadowOffset: { width: 0, height: 8 },  shadowOpacity: 0.22, shadowRadius: 20, elevation: 10 },
  lg: { shadowColor: '#14161A', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.22, shadowRadius: 28, elevation: 16 },
  xl: { shadowColor: '#14161A', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.24, shadowRadius: 32, elevation: 18 },
};
// Gutter horizontal padrão dos ecrãs de conteúdo.
export const GUTTER = 16;
// Escala tipográfica (px). Mínimo 11 para texto informativo (acessibilidade).
export const TYPE = {
  eyebrow: 11,   // rótulos discretos (letterSpacing 1.5–2)
  micro: 12,     // dados densos (tabelas, rodapés)
  label: 13,
  sub: 14,       // subtítulos / valores de linha
  body: 15,
  value: 16,
  lg: 17,        // títulos de folha / botões
  title: 20,     // título de cabeçalho
  heading: 22,   // título de cartão/ecrã
  display: 26,   // números grandes
  hero: 30,      // título de onboarding
  // números e títulos condensados (Barlow) — Design System 2.0
  num: 24,       // número em linha / cartão
  numMd: 28,
  numLg: 34,     // número herói
  numXl: 44,
};
// Acima de 48 é FANTASMA/decorativo (tamanho determinístico no TUNE, fora da escala por desenho).
export const TYPE_DECORATIVE_MIN = 48;

// Pesos tipográficos. O mockup usa a fonte de sistema (SF Pro Display no iOS /
// Roboto no Android) com peso 600 nos títulos/números grandes ("display") e
// letterSpacing apertado. Sem fonte custom — só pesos consistentes. Os ports de
// ecrã passam de pesos avulsos ('300'/'700') para estes tokens.
export const WEIGHT = {
  regular: "400",
  medium: "500",
  semibold: "600",  // títulos de ecrã/cartão + números grandes (display do mockup)
  bold: "700",
  heavy: "800",     // eyebrows/badges (rótulos densos em maiúsculas)
};
// (FONT/TRACK_DISPLAY — Inter + Space Grotesk — EXTINTOS 2026-07-10: o tema antigo
// morreu e as famílias saíram do useFonts. A pele usa PELE_FONT abaixo.)

// ─── Pele nova (2026) — branco·preto·amarelo, plana, hairline ────────────────
// Adicionada AO LADO da paleta antiga (não a substitui): porta-se ecrã a ecrã, os
// ecrãs por converter continuam a usar PALETTE_LIGHT. Cores 1:1 com `design/*.html`.
export const PELE = {
  paper: '#FFFFFF', ink: '#141414', ghost: '#E2E1DC', grey: '#77776F', line: '#ECEAE4',
  soft: '#F4F2ED', soft2: '#EFEDE7', yellow: '#FFB800',
  ok: '#118A55', warn: '#E86A10', red: '#C6362B', info: '#EAF2F7',
  // tons suaves de estado (cartões "pintados": Hoje, cartões de domínio da INFO)
  okSoft: '#E7F3EC', warnSoft: '#FBEAD2', redSoft: '#F6E9E6', yellowSoft: '#FBF1D6',
  // bordas dos tons suaves (banda/banners — um degrau acima do soft; eram hex fantasma)
  okSoftLine: '#BFE0CD', warnSoftLine: '#F2CBA5', redSoftLine: '#E7C0BA',
  // placeholder de input (auditoria 2026-07-10: estava hardcoded em 3 ecrãs)
  placeholder: '#B4B0A8',
  // sobre placa PRETA (cartões escuros da carteira · dock · FAB)
  onInk: '#FFFFFF', onInkSub: '#8F8F88', onInkFaint: '#DDDBD3',
};
// Tema NOTURNO da Living Interface (véspera/pernoita — "a app sabe que é noite").
// A MESMA gramática da pele sobre azul-quase-preto: tipografia manda, amarelo-marca
// mantém-se, estados (ok/warn/red) sobem de luminosidade p/ contraste no escuro.
export const PELE_NIGHT = {
  paper: '#0D131C', ink: '#F4F2ED', ghost: 'rgba(255,255,255,0.07)', grey: 'rgba(244,242,237,0.55)',
  line: 'rgba(244,242,237,0.14)', soft: 'rgba(244,242,237,0.08)', soft2: 'rgba(244,242,237,0.12)',
  yellow: '#FFB800',
  ok: '#46C98A', warn: '#F08A3C', red: '#E57368', info: 'rgba(234,242,247,0.12)',
  okSoft: 'rgba(70,201,138,0.14)', warnSoft: 'rgba(240,138,60,0.14)', redSoft: 'rgba(229,115,104,0.14)', yellowSoft: 'rgba(255,184,0,0.12)',
  okSoftLine: 'rgba(70,201,138,0.35)', warnSoftLine: 'rgba(240,138,60,0.35)', redSoftLine: 'rgba(229,115,104,0.35)',
  placeholder: 'rgba(244,242,237,0.38)',
  onInk: '#0D131C', onInkSub: '#8F8F88', onInkFaint: '#3A4250',
};
// Famílias da pele — Barlow Condensed (display/números/fantasma/palavra condensada) +
// Hanken Grotesk (corpo/rótulos). Estáticas: a FAMÍLIA carrega o peso (não o fontWeight).
// Carregadas no App.js via @expo-google-fonts.
export const PELE_FONT = {
  display:     'BarlowCondensed_700Bold',       // fantasma · números grandes · palavra condensada
  displayHeavy:'BarlowCondensed_800ExtraBold',   // display pesado (cartão de partilha, poster)
  displaySemi: 'BarlowCondensed_600SemiBold',
  displayMed:  'BarlowCondensed_500Medium',
  body:        'HankenGrotesk_600SemiBold',      // corpo por defeito
  bodyMed:     'HankenGrotesk_500Medium',
  bodyBold:    'HankenGrotesk_700Bold',
  bodyHeavy:   'HankenGrotesk_800ExtraBold',     // eyebrows/rótulos densos (maiúsculas)
  hand:        'Caveat_600SemiBold',             // MANUSCRITA — só a voz do Início (o bilhete pessoal)
};

// ─── Design System 2.0 (2026-11-02) — estilos de texto com nome ──────────────
// Um estilo = família + tamanho + (altura de linha) + (espaço entre letras). Usa-se por spread:
// `{ ...TXT.body, color: P.ink }`. Substitui as 206 combinações soltas medidas a 2026-11-02.
// Densidade da casa mantida (corpo 13, não o 17 da Apple). Mínimo 11 em TODO o texto informativo.
// Tabela de migração (valor antigo → estilo) em docs/design-system.md §9.
export const TXT = {
  // Hanken Grotesk — corpo e rótulos
  tag:        { fontFamily: PELE_FONT.bodyHeavy, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }, // selos/chips em maiúsculas
  eyebrow:    { fontFamily: PELE_FONT.bodyHeavy, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }, // rótulo de secção (= Eyebrow)
  caption:    { fontFamily: PELE_FONT.bodyMed,   fontSize: 11, lineHeight: 15 },  // notas, fontes, meta
  footnote:   { fontFamily: PELE_FONT.bodyMed,   fontSize: 12, lineHeight: 17 },  // linha secundária
  label:      { fontFamily: PELE_FONT.bodyBold,  fontSize: 12 },                  // rótulo/valor pequeno forte
  body:       { fontFamily: PELE_FONT.bodyMed,   fontSize: 13, lineHeight: 19 },  // corpo
  bodyStrong: { fontFamily: PELE_FONT.bodyBold,  fontSize: 13 },                  // título de linha
  callout:    { fontFamily: PELE_FONT.bodyBold,  fontSize: 15, lineHeight: 20 },  // destaque · botões
  headline:   { fontFamily: PELE_FONT.bodyHeavy, fontSize: 17, lineHeight: 22 },  // título de diálogo
  // Barlow Condensed — títulos e números
  title:      { fontFamily: PELE_FONT.display, fontSize: 22, letterSpacing: -0.2 },  // título de cartão
  titleLg:    { fontFamily: PELE_FONT.display, fontSize: 30, letterSpacing: -0.4 },  // título de folha/página
  num:        { fontFamily: PELE_FONT.display, fontSize: 24, letterSpacing: -0.2 },  // número em linha
  numLg:      { fontFamily: PELE_FONT.display, fontSize: 34, letterSpacing: -0.5 },  // número herói
};

// Botão de ícone (fechar · voltar · ações de cabeçalho) — UM tamanho na app toda.
// 36 visível, redondo, ícone 16; hitSlop completa os 44 pt de toque (HIG).
export const ICON_BTN = { size: 36, icon: 16, hit: 44 };

// Escalas permitidas — lidas pelo guardião `scripts/design.test.js` (fonte única).
export const SCALE = {
  type:   [...new Set(Object.values(TYPE))].sort((a, b) => a - b),
  space:  [0, 1, ...Object.values(SPACE)].sort((a, b) => a - b),
  radius: [0, 2, 4, 6, ...Object.values(RADIUS), 999].sort((a, b) => a - b),
};
