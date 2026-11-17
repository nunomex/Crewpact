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
// `sheet` (32) = a folha da direção 3.0 "cartões de cor" (design-system §14, 2026-11-11).
export const RADIUS = { xs: 8, sm: 10, md: 14, lg: 16, xl: 22, xxl: 24, sheet: 32, pill: 99 };
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

// ─── O TEMA SEGUE O IPHONE (modo noite N3, escolhido pelo Nuno a 2026-11-14; construído a 2026-11-17) ───────────────
// Cada paleta tem DUAS versões em bruto (o dia e a noite, cores escritas — leem-nas os testes, os cartões de partilha, o PDF) e
// uma versão VIVA, que é a que os ecrãs usam: no iOS, cada cor viva é uma `DynamicColorIOS` — o próprio iOS troca o claro pelo
// escuro quando o iPhone muda, também nas folhas de estilo fixas (`StyleSheet.create`), sem a app voltar a desenhar. Fora do iOS
// (o Android ainda não está montado; os testes no Node) a cor viva é a do dia.
//   • `PELE` · `BRAND` · `MONEY` · `CARD.auto` — vivas (os ecrãs).   • `PELE_DAY` · `PELE_DARK` · `CARD.day` · `CARD.night` — em bruto.
//   • As peças que precisam da cor ESCRITA (animar uma cor, comparar, desenhar à mão) leem a paleta em bruto pelo gancho
//     `useDark()` (hooks/useDark.js): o Início, a barra de abas, o sino.
// O `require` fica num try: no Node (os testes) não há react-native, e a paleta viva cai na do dia.
const RN = (() => { try { return require('react-native'); } catch (e) { return null; } })();
const DYN = !!(RN && RN.Platform && RN.Platform.OS === 'ios' && typeof RN.DynamicColorIOS === 'function');
// Uma cor viva a partir das duas em bruto. `null` à noite (o aro do "ao vivo", que de noite não existe) passa a transparente.
export const dyn = (light, dark) => {
  if (dark === null) dark = 'transparent';
  if (!DYN || typeof light !== 'string' || typeof dark !== 'string' || light === dark) return light;
  return RN.DynamicColorIOS({ light, dark });
};
// A paleta viva: chave a chave, o dia e a noite (a chave que a noite não tem fica a do dia).
export function skin(day, dark) {
  const o = {};
  for (const k of Object.keys(day)) o[k] = dyn(day[k], k in dark ? dark[k] : day[k]);
  return Object.freeze(o);
}

// ─── Pele nova (2026) — branco·preto·amarelo, plana, hairline ────────────────
// Adicionada AO LADO da paleta antiga (não a substitui): porta-se ecrã a ecrã, os
// ecrãs por converter continuam a usar PALETTE_LIGHT. Cores 1:1 com `design/*.html`.
// (2026-11-17) Esta é a pele do DIA, em bruto; os ecrãs usam a `PELE` viva, mais abaixo, que troca para a `PELE_DARK` à noite.
export const PELE_DAY = {
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
  // Início v6 (2026-11-03, medidos no esboço design/inicio-v6.html): o cinzento sobre o `soft` dava 4,03
  // e o verde 3,92 → tons de TEXTO próprios para os secundários e as pílulas calmas (5,84 · 5,64).
  greyOnSoft: '#5E5E57', okText: '#0B6E43',
  // Detalhe do serviço v2 (2026-11-08, medidos no esboço design/detalhe-servico.html): o laranja de TEXTO ("Por indicar", o
  // selo "Incerto") — 5,51 sobre o warnSoft (o warn vivo falha AA < 18 px) — e o tom das setas e das bordas das opções, 3,74
  // sobre o papel (componentes tocáveis pedem 3:1; o #A8A69E dava 2,44).
  warnText: '#9A4508', affordance: '#86847D',
  plate: '#141414',   // a placa do painel de partidas (ao vivo) — de dia é a tinta
  // A PLACA ESCURA (2026-11-17, N3): o que é SEMPRE escuro com letra branca por cima — os avisos que flutuam (Toast, Tip), o
  // resultado das calculadoras, os cartões escuros da Informação. De dia é a tinta; à noite NÃO inverte como a tinta (que passa a
  // clara): sobe um degrau acima da folha, para se destacar dela. O que se TOCA a tinta (botões, escolhas) inverte — é a `ink`.
  slab: '#141414', onSlab: '#FFFFFF', onSlabSub: '#8F8F88',   // a letra sobre a placa (a secundária: 5,6:1 de dia)
  // O interruptor LIGADO (2026-11-17): de dia a tinta; à noite a tinta é clara e a bolinha branca sumia nela (1,1:1) — passa a um
  // cinzento médio (a bolinha 3,2:1; o desligado fica no fio, escuro). A bolinha é sempre branca.
  toggle: '#141414',
};
// A pele da NOITE (o modo escuro do iPhone, N3 — 2026-11-17): a mesma gramática, nas superfícies da noite do 3.0 (`CARD.night`):
// o papel é a folha (#1F222A), o suave é o neutro (#2A2E38), a tinta é a clara. Os estados sobem de luz para se lerem no escuro.
// Medido (WCAG 2.1, sobre o papel #1F222A): tinta 14,21 · cinzento 6,30 (sobre o suave 5,68) · âmbar 7,34 (sobre o seu suave 5,43) ·
// vermelho 6,4 (sobre o seu suave 4,9) · verde 5,79 · a tinta sobre a marcação amarela 8,23 · o branco a 60 % sobre a placa 5,09.
// O guardião (`npm run test:design`) volta a medir tudo isto a cada teste.
export const PELE_DARK = {
  paper: '#1F222A', ink: '#F4F2ED', ghost: '#30343D', grey: 'rgba(244,242,237,0.62)', line: '#383C46',
  soft: '#2A2E38', soft2: '#30343E', yellow: '#FFB800',
  ok: '#46C98A', warn: '#EDA03A', red: '#F08A7E', info: '#24313D',
  okSoft: 'rgba(70,201,138,0.14)', warnSoft: 'rgba(237,160,58,0.16)', redSoft: 'rgba(240,138,126,0.16)', yellowSoft: 'rgba(255,184,0,0.12)',
  okSoftLine: 'rgba(70,201,138,0.35)', warnSoftLine: 'rgba(237,160,58,0.35)', redSoftLine: 'rgba(240,138,126,0.35)',
  placeholder: 'rgba(244,242,237,0.40)',
  onInk: '#1F222A', onInkSub: '#5E5E57', onInkFaint: '#3A3A36',
  greyOnSoft: 'rgba(244,242,237,0.66)', okText: '#46C98A',
  warnText: '#EDA03A', affordance: 'rgba(244,242,237,0.5)',
  plate: '#18212D',
  slab: '#383D48', onSlab: '#FFFFFF', onSlabSub: 'rgba(255,255,255,0.62)',   // 5,25:1 sobre a placa da noite
  toggle: '#8E929C',
};
// A pele VIVA — a que os ecrãs usam (no iOS troca sozinha com o iPhone).
export const PELE = skin(PELE_DAY, PELE_DARK);
// A PLACA do painel de partidas (Início v6, estados ao vivo): é sempre escura, de dia e de noite, por isso
// os tons por cima dela são os do escuro. Medidos (2026-11-03, dia · noite): rótulos 7,25 · 6,37 · hora amarela
// 10,62 · 9,36 · pílula verde 6,29 · 5,40 · laranja 5,29 · 4,64 · vermelha 5,78 · 5,07 (o #E57368 dava 4,04 à noite).
export const PLATE = {
  day:   { bg: '#141414', fg: '#FFFFFF', sub: '#A3A39B', rule: 'rgba(255,255,255,0.14)', ruleFaint: 'rgba(255,255,255,0.08)', track: 'rgba(255,255,255,0.16)' },
  night: { bg: '#18212D', fg: '#F4F2ED', sub: 'rgba(244,242,237,0.62)', rule: 'rgba(255,255,255,0.14)', ruleFaint: 'rgba(255,255,255,0.08)', track: 'rgba(255,255,255,0.16)' },
  ok: '#46C98A', okBg: 'rgba(70,201,138,0.18)',
  warn: '#F08A3C', warnBg: 'rgba(240,138,60,0.20)',
  red: '#EC857B', redBg: 'rgba(229,115,104,0.16)',
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
  greyOnSoft: 'rgba(244,242,237,0.62)', okText: '#46C98A',
  plate: '#18212D',
};
// ─── Cor de MARCA por PAPÉIS (Design System 2.0 · edições por sindicato, 2026-11-02) ───────────
// A pele (papel, tinta, ghost, estados ok/warn/red) é IGUAL para todos. Uma edição (SNPVAC · SPAC)
// troca SÓ este objeto. Nunca escrever `PELE.yellow` nem '#FFB800' fora daqui — o guardião
// (`npm run test:design`) falha. Valores medidos para cada edição em design/edicoes-sindicatos.html.
//   signal — sinais SEM texto: pontos, barras, réguas, sublinhados, bordas de seleção (≥3:1 com o fundo)
//   marker — FUNDO de marcação com TINTA por cima: bilhete, pílula Desfazer, vistos (tinta sobre ele ≥4,5)
//   onDark — a marca SOBRE PLACA PRETA ou no tema noturno: texto, ícones, spinners (≥4,5 sobre tinta)
//   action — cor do que se TOCA (fundo do botão principal). Na base é a TINTA; nas edições, o azul.
//   panel  — a HORA e as linhas do painel de partidas do Início (v6). FIXA no amarelo em TODAS as edições
//            (convenção dos painéis de aeroporto, 10,6:1 sobre a placa · 9,4 à noite) — decisão do Nuno,
//            opção 2, 2026-11-03. Só se usa sobre a placa escura.
//   onAction — o ícone e o indicador de espera DENTRO do botão principal (2026-11-17): de dia, a marca sobre a tinta; à noite o
//            botão inverte (claro) e o amarelo não se leria nele (1,6:1) — passa à letra do botão.
// À noite (N3, 2026-11-17): a marcação desce a um amarelo baço (a tinta clara por cima, 8,23:1) — um amarelo cheio do tamanho de
// uma pílula encandeia às 04:00; o botão principal inverte como a tinta. Os sinais e o painel ficam (já se veem no escuro).
export const BRAND_DAY = {
  signal: '#FFB800',
  marker: '#FFB800',
  onDark: '#FFB800',
  action: '#141414',
  onAction: '#FFB800',
  panel: '#FFB800',
};
export const BRAND_DARK = { marker: 'rgba(255,184,0,0.24)', action: '#F4F2ED', onAction: '#1F222A' };
export const BRAND = skin(BRAND_DAY, BRAND_DARK);
// Referência para as edições (só se ligam com autorização escrita de cada sindicato — docs/decisoes.md):
// SNPVAC { signal:'#005EB8', marker:'#C7DCEF', onDark:'#6FAAE3', action:'#005EB8', onAction:'#FFFFFF', panel:'#FFB800' }
// SPAC   { signal:'#0097D4', marker:'#C7E8F6', onDark:'#0097D4', action:'#0077A8', onAction:'#FFFFFF', panel:'#FFB800' }

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

// ─── Direção 3.0 · CARTÕES DE COR (decidida 2026-11-11, design-system §14; esboço design/inicio-cartoes.html) ─────────
// Aplica-se ecrã a ecrã: só os ecrãs migrados (o Início, a barra de abas) leem CARD/TXT3; o resto segue PELE/TXT (2.0).
// O MAPA DAS CORES (design-system §14, escolhido pelo Nuno a 2026-11-13: B "frio e quente"; esboço design/cores.html).
// Cada cor tem UMA tarefa e os nomes dizem a tarefa, não a cor. FRIO = a escala (o tipo): flight = voo (céu) · ground =
// serviço em terra (lilás-rosado) · rest = repouso e pernoita (salva) · neutral = ausências, dinheiro e o resto. QUENTE = olha
// para isto: alert = perto do limite, falta um dado, pede uma ação (laranja, sempre com "!" e a palavra) · stop = passa o
// limite (vermelho, sempre com "✕" e a palavra). Dentro do limite não tem cor (cockpit escuro); incerto é neutro e tracejado.
// O verde é só do dinheiro que se ganha (CARD.gain, MONEY). O amarelo da marca é só do "ao vivo" (painel, ponto da pílula).
// O texto sobre os cartões de cor é a tinta #141414; à noite (N3, 2026-11-17) os de TIPO passam ao tom fundo com a letra clara
// (`onFill*`) e os avisos ficam vivos, com a tinta escura (`onCard*`).
// O TOM (escolhido pelo Nuno a 2026-11-13, tom 2 de design/cores.html §4, procurado entre milhares de tons frios): céu vivo
// #6DBEFA + lilás-rosado #C3A1BE. Medido (ΔE normal · deuteranopia · protanopia; < ~15 confunde-se de relance): voo × atenção
// 97 · 92 · 80 (a areia dava 33 · 12 · 16) · voo × terra 37 · 31 · 23 · pior par de todos repouso × passa 19. Tinta sobre voo
// 9,12 · terra 8,04 · repouso 9,81 · atenção 7,16 · passa 6,64; a linha a 82 % ≥ 5,07 e o rótulo a 80 % ≥ 4,91 (noite).
// Contraste medido (WCAG 2.1, 2026-11-11): linha pequena (82 %) ≥ 5,09 em todas as cores, de dia e de noite · rótulo do cartão
// a 80 % ≥ 4,8 (a 72 % do esboço o laranja dava 4,35 — corrigido) · abas inativas #5E5E57 = 5,68 sobre o neutro (o #77776F do
// esboço dava 3,93 — corrigido) · ganho #0B6E43 na pílula branca 6,31 · à noite o ganho fora das pílulas é #7BE3B0 (11,6).
export const CARD = {
  day: {
    desk: '#E3E1DB', ink: '#141414', soft: '#3A3A36', sheet: '#FFFFFF', neutral: '#F1EFEA',
    flight: '#6DBEFA', ground: '#C3A1BE', rest: '#B4C2A2', alert: '#F2A33A', stop: '#EC7A6C',   // S2 (2026-11-14): o laranja #F0854A passou a âmbar — ΔE 32,5 para o vermelho em deuteranopia (era 19,7); o texto 6,32:1
    liveRing: '#141414',                  // S2: o aro de tinta do ponto "ao vivo" (o amarelo sozinho dava 1,33:1 sobre a secretária; o aro 14,1:1)
    grey: 'rgba(20,20,20,0.5)',          // a 2.ª linha do número quando QUALIFICA ("estimado", "livre") — 3,24 (texto muito grande pede 3)
    gainOut: '#0B6E43',                   // ganho FORA de uma pílula branca (o facto "+96,90 €" do pós-voo) — 5,64
    tabSub: '#5E5E57', tabOn: '#FFFFFF', round: 'rgba(127,127,127,0.22)', caption: '#77776F',
    neutralSub: 'rgba(20,20,20,0.82)', neutralKind: 'rgba(20,20,20,0.8)', neutralGo: 'rgba(127,127,127,0.2)',
    darkSub: 'rgba(255,255,255,0.82)', darkGo: 'rgba(255,255,255,0.2)',   // a linha fina ESCURA (a ação principal: ligar, ler a escala)
    // O FUNDO de um cartão de tipo (N3, 2026-11-17): de dia é a própria cor; à noite desce ao tom fundo (abaixo). `flight`/`ground`/
    // `rest` ficam a cor VIVA, de dia e de noite, para os sinais pequenos (o quadradinho, o anel do dia na Escala, as barras) — um
    // sinal no tom fundo não se via no escuro (1,5:1). A letra sobre o fundo de tipo: `onFill*` (de dia, a tinta dos cartões).
    flightFill: '#6DBEFA', groundFill: '#C3A1BE', restFill: '#B4C2A2',
    onFill: '#141414', onFillSub: 'rgba(20,20,20,0.82)', onFillKind: 'rgba(20,20,20,0.8)', onFillTrack: 'rgba(20,20,20,0.18)',
    onFillGo: 'rgba(255,255,255,0.55)', onFillDur: 'rgba(255,255,255,0.85)', onFillAct: 'rgba(255,255,255,0.62)',
    // Uma superfície POR CIMA de um cartão neutro, com a tinta do modo por cima (o botão do hotel, o selo "real"): de dia o branco;
    // à noite um degrau acima do neutro (no escuro, o que está por cima é mais claro). A pílula do dinheiro (`chip`) fica branca.
    raised: '#FFFFFF',
  },
  night: {
    desk: '#14161B', ink: '#F4F2ED', soft: 'rgba(244,242,237,0.7)', sheet: '#1F222A', neutral: '#2A2E38',
    flight: '#58AFEC', ground: '#B592B0', rest: '#A3B490', alert: '#EDA03A', stop: '#DF7366',   // S2: âmbar da noite (era #EE7C40) — ΔE 33,2 para o vermelho em deuteranopia; o texto 6,13:1
    liveRing: null,                       // à noite o amarelo já se vê sozinho (10,4:1) — sem aro   // o vermelho noturno era #DC6B5E: o texto ficava a 4,38:1 (o guardião das cores, 2026-11-14)
    grey: 'rgba(244,242,237,0.5)', gainOut: '#7BE3B0',
    tabSub: 'rgba(244,242,237,0.62)', tabOn: 'rgba(244,242,237,0.16)', round: 'rgba(127,127,127,0.22)', caption: 'rgba(244,242,237,0.62)',
    neutralSub: 'rgba(244,242,237,0.82)', neutralKind: 'rgba(244,242,237,0.8)', neutralGo: 'rgba(127,127,127,0.2)',
    darkSub: 'rgba(31,34,42,0.82)', darkGo: 'rgba(31,34,42,0.15)',       // à noite a linha "escura" inverte: tinta clara, letra da folha
    // N3 (design/modo-noite.html, escolhida pelo Nuno a 2026-11-14): os cartões de tipo no tom fundo — azul-noite, ameixa, musgo —
    // com a letra clara; os avisos (âmbar, vermelho) ficam vivos, com a tinta escura. Medido: a letra a 80 % sobre o tom fundo
    // 5,91 (voo) · 6,91 (terra) · 6,55 (repouso); a 100 % 8,20 · 9,75 · 9,16. O fundo das pílulas e da seta: branco a 16 %.
    flightFill: '#1F4B6E', groundFill: '#4B3550', restFill: '#36452F',
    onFill: '#F4F2ED', onFillSub: 'rgba(244,242,237,0.8)', onFillKind: 'rgba(244,242,237,0.8)', onFillTrack: 'rgba(244,242,237,0.25)',
    onFillGo: 'rgba(255,255,255,0.16)', onFillDur: 'rgba(255,255,255,0.16)', onFillAct: 'rgba(255,255,255,0.16)',
    raised: '#363A45',
  },
  // Sobre os cartões de COR (voo · terra · repouso · atenção · passa), de dia e de noite:
  onCard: '#141414', onCardSub: 'rgba(20,20,20,0.82)', onCardKind: 'rgba(20,20,20,0.8)', onCardTrack: 'rgba(20,20,20,0.18)',
  chip: '#FFFFFF', gain: '#0B6E43',                     // o que um serviço RENDE: verde numa pílula branca, em qualquer cartão
  go: 'rgba(255,255,255,0.55)', act: 'rgba(255,255,255,0.62)', dur: 'rgba(255,255,255,0.85)',
  rule: 'rgba(127,127,127,0.3)',                        // o fio por cima do pé das parcelas
  badgeFg: '#141414',
};
// A paleta 3.0 VIVA (2026-11-17): a do dia ou a da noite conforme o iPhone — a dos ecrãs com folhas de estilo fixas. O Início, a
// barra e o sino escolhem a paleta em bruto pelo gancho `useDark()` (animam e comparam cores).
CARD.auto = skin(CARD.day, CARD.night);
// O DINHEIRO nos ecrãs que ainda seguem a 2.0 (os da 3.0 usam CARD.gain/gainOut): o verde é SÓ do que se ganha (+€),
// nunca "está tudo bem" nem "toca aqui" — regra dura do guardião (o verde da PELE fica fora das páginas). 6,31 na folha.
// À noite (2026-11-17) o verde sobe de luz, como o `gainOut` do 3.0: 10,19 sobre o papel da noite.
export const MONEY_DAY = { gain: '#0B6E43', gainSoft: '#E7F3EC', gainNight: '#46C98A' };
export const MONEY_DARK = { gain: '#7BE3B0', gainSoft: 'rgba(123,227,176,0.14)' };
export const MONEY = skin(MONEY_DAY, MONEY_DARK);
// Texto da direção 3.0 — Hanken Grotesk em tudo (decisão do Nuno, 2026-11-11). Tamanhos da escala (§9); o número gigante (86)
// fica fora dela, no TUNE do Início. Os TXT da 2.0 não mudam (a Hanken é mais larga e partia os ecrãs antigos).
export const TXT3 = {
  stateTitle:{ fontFamily: PELE_FONT.bodyHeavy, fontSize: 34, lineHeight: 38, letterSpacing: -0.8 },  // o estado como título do Início (S2, 2026-11-14)
  what:      { fontFamily: PELE_FONT.bodyMed,   fontSize: 15, lineHeight: 20 },                      // a legenda por cima do número
  pill:      { fontFamily: PELE_FONT.bodyBold,  fontSize: 13 },                                      // pílulas do topo
  fact:      { fontFamily: PELE_FONT.bodyBold,  fontSize: 20, lineHeight: 22 },                      // os dois factos ao lado do número
  factLbl:   { fontFamily: PELE_FONT.bodyMed,   fontSize: 11, lineHeight: 15 },
  unit:      { fontFamily: PELE_FONT.bodyBold,  fontSize: 34, letterSpacing: -1 },                   // "dias" · ",50 €" ao lado do gigante
  kind:      { fontFamily: PELE_FONT.bodyHeavy, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },   // tipo do cartão
  cardTitle: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
  cardSub:   { fontFamily: PELE_FONT.bodyMed,   fontSize: 12, lineHeight: 16 },
  cardNum:   { fontFamily: PELE_FONT.bodyBold,  fontSize: 22, lineHeight: 24 },                      // as duas horas do cartão
  cardNumLbl:{ fontFamily: PELE_FONT.bodyMed,   fontSize: 11, lineHeight: 15 },
  chip:      { fontFamily: PELE_FONT.bodyHeavy, fontSize: 14 },                                      // "+45,40 €"
  dur:       { fontFamily: PELE_FONT.bodyBold,  fontSize: 12 },                                      // o selo entre as duas horas
  act:       { fontFamily: PELE_FONT.bodyBold,  fontSize: 14 },                                      // a barra de ação do cartão
  checkK:    { fontFamily: PELE_FONT.bodyBold,  fontSize: 14, lineHeight: 18 },                      // o nome de cada sinal da verificação (W1: Voo · Avião · Aeroporto)
  voiceB:    { fontFamily: PELE_FONT.bodyHeavy, fontSize: 20, lineHeight: 25, letterSpacing: -0.2 },  // a voz (V2): a 1.ª frase, a cheio
  voiceT:    { fontFamily: PELE_FONT.bodyMed,   fontSize: 17, lineHeight: 23 },                      // a voz (V2): a cauda, mais leve
  slimTitle: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 16, lineHeight: 20 },
  slimSub:   { fontFamily: PELE_FONT.bodyMed,   fontSize: 12, lineHeight: 16 },
  slimVal:   { fontFamily: PELE_FONT.bodyHeavy, fontSize: 20 },
  line:      { fontFamily: PELE_FONT.bodyMed,   fontSize: 15, lineHeight: 20 },                      // parcelas e passos
  lineVal:   { fontFamily: PELE_FONT.bodyBold,  fontSize: 15, lineHeight: 20 },
  text:      { fontFamily: PELE_FONT.bodyMed,   fontSize: 14, lineHeight: 20 },                      // cartão de texto (baixa, folga vazia)
  month:     { fontFamily: PELE_FONT.bodyHeavy, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },  // o título do mês na Escala (esboço escala-cartoes, 2026-11-13)
  tab:       { fontFamily: PELE_FONT.bodyBold,  fontSize: 11 },
  badge:     { fontFamily: PELE_FONT.bodyHeavy, fontSize: 11 },
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
