// ─── Palette ─────────────────────────────────────────────────────────────────
// Paleta clara (default). As superfícies escuras (ink) usam os tokens onDark*,
// que são iguais nas duas paletas — por isso os cartões pretos não mudam.
export const PALETTE_LIGHT = {
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
export const PALETTE_DARK = {
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

export const PALETTES = { light: PALETTE_LIGHT, dark: PALETTE_DARK };

// Default exportado — usado por ecrãs ainda não convertidos (modo claro) e por
// código a nível de módulo. Os ecrãs convertidos usam o hook useTheme().
export const C = PALETTE_LIGHT;

// ─── Design tokens ─────────────────────────────────────────────────────────────
export const RADIUS = { xs: 8, sm: 10, md: 14, lg: 16, xl: 22, xxl: 24, pill: 99 };
export const SPACE  = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
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
};

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
// Famílias Inter (1:1 com o mockup, iguais em iOS+Android). Carregadas no App.js.
// Nos ports usa-se `fontFamily: FONT.<peso>` em vez de `fontWeight` — as fontes
// estáticas não respondem ao fontWeight, a família é que carrega o peso.
export const FONT = {
  regular:  "Inter_400Regular",
  medium:   "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold:     "Inter_700Bold",
  heavy:    "Inter_800ExtraBold",
  // Fonte de DISPLAY (Sistema A "Instrumento", Space Grotesk) — SÓ números grandes + títulos
  // de ecrã. A UI/corpo/rótulos ficam Inter. Carregada no App.js.
  display:     "SpaceGrotesk_600SemiBold",
  displayBold: "SpaceGrotesk_700Bold",
};
// LetterSpacing recomendado para títulos display (negativo = mais apertado/premium).
export const TRACK_DISPLAY = -0.4;
