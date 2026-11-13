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
  // Início v6 (2026-11-03, medidos no esboço design/inicio-v6.html): o cinzento sobre o `soft` dava 4,03
  // e o verde 3,92 → tons de TEXTO próprios para os secundários e as pílulas calmas (5,84 · 5,64).
  greyOnSoft: '#5E5E57', okText: '#0B6E43',
  // Detalhe do serviço v2 (2026-11-08, medidos no esboço design/detalhe-servico.html): o laranja de TEXTO ("Por indicar", o
  // selo "Incerto") — 5,51 sobre o warnSoft (o warn vivo falha AA < 18 px) — e o tom das setas e das bordas das opções, 3,74
  // sobre o papel (componentes tocáveis pedem 3:1; o #A8A69E dava 2,44).
  warnText: '#9A4508', affordance: '#86847D',
  plate: '#141414',   // a placa do painel de partidas (ao vivo) — de dia é a tinta
};
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
export const BRAND = {
  signal: '#FFB800',
  marker: '#FFB800',
  onDark: '#FFB800',
  action: '#141414',
  panel: '#FFB800',
};
// Referência para as edições (só se ligam com autorização escrita de cada sindicato — docs/decisoes.md):
// SNPVAC { signal:'#005EB8', marker:'#C7DCEF', onDark:'#6FAAE3', action:'#005EB8', panel:'#FFB800' }
// SPAC   { signal:'#0097D4', marker:'#C7E8F6', onDark:'#0097D4', action:'#0077A8', panel:'#FFB800' }

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
// O texto sobre os cartões de cor é sempre a tinta #141414 (também à noite: as cores descem um tom).
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
    flight: '#6DBEFA', ground: '#C3A1BE', rest: '#B4C2A2', alert: '#F0854A', stop: '#EC7A6C',
    grey: 'rgba(20,20,20,0.5)',          // a 2.ª linha do número quando QUALIFICA ("estimado", "livre") — 3,24 (texto muito grande pede 3)
    gainOut: '#0B6E43',                   // ganho FORA de uma pílula branca (o facto "+96,90 €" do pós-voo) — 5,64
    tabSub: '#5E5E57', tabOn: '#FFFFFF', round: 'rgba(127,127,127,0.22)', caption: '#77776F',
    neutralSub: 'rgba(20,20,20,0.82)', neutralKind: 'rgba(20,20,20,0.8)', neutralGo: 'rgba(127,127,127,0.2)',
    darkSub: 'rgba(255,255,255,0.82)', darkGo: 'rgba(255,255,255,0.2)',   // a linha fina ESCURA (a ação principal: ligar, ler a escala)
  },
  night: {
    desk: '#14161B', ink: '#F4F2ED', soft: 'rgba(244,242,237,0.7)', sheet: '#1F222A', neutral: '#2A2E38',
    flight: '#58AFEC', ground: '#B592B0', rest: '#A3B490', alert: '#EE7C40', stop: '#DC6B5E',
    grey: 'rgba(244,242,237,0.5)', gainOut: '#7BE3B0',
    tabSub: 'rgba(244,242,237,0.62)', tabOn: 'rgba(244,242,237,0.16)', round: 'rgba(127,127,127,0.22)', caption: 'rgba(244,242,237,0.62)',
    neutralSub: 'rgba(244,242,237,0.82)', neutralKind: 'rgba(244,242,237,0.8)', neutralGo: 'rgba(127,127,127,0.2)',
    darkSub: 'rgba(31,34,42,0.82)', darkGo: 'rgba(31,34,42,0.15)',       // à noite a linha "escura" inverte: tinta clara, letra da folha
  },
  // Sobre os cartões de COR (voo · terra · repouso · atenção · passa), de dia e de noite:
  onCard: '#141414', onCardSub: 'rgba(20,20,20,0.82)', onCardKind: 'rgba(20,20,20,0.8)', onCardTrack: 'rgba(20,20,20,0.18)',
  chip: '#FFFFFF', gain: '#0B6E43',                     // o que um serviço RENDE: verde numa pílula branca, em qualquer cartão
  go: 'rgba(255,255,255,0.55)', act: 'rgba(255,255,255,0.62)', dur: 'rgba(255,255,255,0.85)',
  rule: 'rgba(127,127,127,0.3)',                        // o fio por cima do pé das parcelas
  badgeFg: '#141414',
};
// O DINHEIRO nos ecrãs que ainda seguem a 2.0 (os da 3.0 usam CARD.gain/gainOut): o verde é SÓ do que se ganha (+€),
// nunca "está tudo bem" nem "toca aqui" — regra dura do guardião (o verde da PELE fica fora das páginas). 6,31 na folha.
export const MONEY = { gain: '#0B6E43', gainSoft: '#E7F3EC', gainNight: '#46C98A' };
// Texto da direção 3.0 — Hanken Grotesk em tudo (decisão do Nuno, 2026-11-11). Tamanhos da escala (§9); o número gigante (86)
// fica fora dela, no TUNE do Início. Os TXT da 2.0 não mudam (a Hanken é mais larga e partia os ecrãs antigos).
export const TXT3 = {
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
