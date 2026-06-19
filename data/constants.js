// ─── Palette ─────────────────────────────────────────────────────────────────
// Paleta clara (default). As superfícies escuras (ink) usam os tokens onDark*,
// que são iguais nas duas paletas — por isso os cartões pretos não mudam.
export const PALETTE_LIGHT = {
  canvas: "#FFFFFF",
  card: "#FFFFFF",   // superfície de cartão (= canvas no claro; elevada no escuro)
  soft: "#F3F2EF",
  ink: "#191919",
  inkSoft: "#2A2A2A",
  red: "#EA3D2F",
  redSoft: "#FBE3E0",
  // Cores semânticas — evitar reutilizar `red` para tudo.
  danger: "#EA3D2F",
  info: "#2E6BE6",       // azul — sinal neutro de relevância
  infoSoft: "#E4ECFB",
  warn: "#E8932B",       // âmbar — aviso/aproximação ao limite
  warnSoft: "#FBEAD2",
  line: "#E7E6E2",
  text: "#191919",
  sub: "#6B6B66", // cinzento secundário (≈ 5:1 sobre branco — passa WCAG AA)
  subLight: "#9B9B95", // antigo tom claro: usar só em fundos escuros/decorativo
  // Tons sobre fundo escuro (ink).
  onDark: "#FFFFFF",
  onDarkSub: "rgba(255,255,255,0.6)", // texto secundário sobre fundo preto
  onDarkFaint: "rgba(255,255,255,0.5)", // rótulos discretos sobre preto
  hairlineOnDark: "rgba(255,255,255,0.12)", // separadores/realces sobre preto
  scrim: "rgba(0,0,0,0.4)", // fundo de overlay de modais
  green: "#1F9E6E",
  greenSoft: "#E2F4EC",
};

// Paleta escura — superfícies elevadas sobre canvas, texto quase branco. onDark*
// mantêm-se (as superfícies ink continuam escuras nos dois modos).
export const PALETTE_DARK = {
  canvas: "#141414",
  card: "#1E1E1E",
  soft: "#232323",
  ink: "#242424",
  inkSoft: "#2E2E2E",
  red: "#FF5547",
  redSoft: "#3A1F1C",
  danger: "#FF5547",
  info: "#5B8DEF",
  infoSoft: "#1B2A4A",
  warn: "#F0A949",
  warnSoft: "#3A2E1A",
  line: "#2C2C2C",
  text: "#F2F2F2",
  sub: "#9A9A94",
  subLight: "#6F6F6A",
  onDark: "#FFFFFF",
  onDarkSub: "rgba(255,255,255,0.6)",
  onDarkFaint: "rgba(255,255,255,0.5)",
  hairlineOnDark: "rgba(255,255,255,0.12)",
  scrim: "rgba(0,0,0,0.6)",
  green: "#2BB587",
  greenSoft: "#14302A",
};

export const PALETTES = { light: PALETTE_LIGHT, dark: PALETTE_DARK };

// Default exportado — usado por ecrãs ainda não convertidos (modo claro) e por
// código a nível de módulo. Os ecrãs convertidos usam o hook useTheme().
export const C = PALETTE_LIGHT;

// ─── Design tokens ─────────────────────────────────────────────────────────────
export const RADIUS = { xs: 8, sm: 10, md: 14, lg: 16, xl: 22, xxl: 24, pill: 99 };
export const SPACE  = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
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
