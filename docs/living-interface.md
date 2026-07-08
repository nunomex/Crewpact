# Living Interface — Design System v2

> **O coração da app.** O Início não mostra funcionalidades — acompanha o dia operacional
> do tripulante. Um motor determinístico calcula o estado; a interface veste-o.
> Este documento é a LEI: os estados, a pele, a navegação e as regras.
> Mockup canónico: `design/pele-tipografica-final.html` (+ `design/living-interface.html`,
> as 8 fichas demonstradas ao vivo).
> Decidido com o utilizador em 2026-07-03, peça a peça. Nada aqui é sugestão.
>
> **v2 (2026-07-08):** alinhado com a realidade construída — a pele foi PORTADA a RN
> (todas as abas) e o **Início real já corre o motor adaptativo** (§9, estado da
> implementação). Duas decisões posteriores ao v1 substituem o que ele dizia:
> **o FAB voltou** (princípio 7) e a **navegação ficou estática** (§4).

---

## 1 · Princípios (as leis de sangue)

1. **Estrutura fixa, conteúdo adaptativo.** As zonas do ecrã nunca mudam de sítio;
   o que muda é o que cada zona mostra. (O falhanço dos menus adaptativos do Office
   2000 não se repete aqui.)
2. **1 principal + 2 secundários.** Nunca dashboard. Nunca cinco cartões.
3. **O porquê a uma linha.** Nenhum número sem a sua explicação a um olhar de
   distância. Auditável como os motores.
4. **Ruído zero / a app afasta-se.** Na folga e nas férias, a app baixa a voz.
   O silêncio também é informação.
5. **Determinístico, sem AI.** O estado é uma função pura dos dados
   (`crewState()`), golden-testável como os motores FTL/AE. Cada cartão sabe
   responder "porque estou a ver isto?".
6. **Sem mascotes, sem fotos.** O carácter vem da tipografia e da cor.
7. **Criação é contextual — e o FAB é o atalho, não a casa.** Toda a ação de
   criação tem casa contextual visível (Serviço → tocar num dia da Escala ·
   Extra → estados certos + Estatísticas · Simulação → estados + INFO). Se um
   estado deixar uma ação sem porta a um toque, é bug de design.
   *(v2 — decisão revista 2026-07-04: o FAB **existe** como lançador de acesso
   rápido em qualquer aba — mini-FABs Pesquisar·Serviço·Simulação·Extra — porque
   a Pesquisa não tinha casa contextual e o acesso-em-qualquer-aba provou valor;
   as casas contextuais FICAM, o FAB é o caminho rápido, nunca o único.)*

---

## 2 · O motor (Context Engine)

Função pura, sem rede, golden-testável:

```
crewState({ now, duties, dayLog, live, inbound, airportStats, wx,
            validades, aeEvents, rosterDiff, profile })
  → { estado, principal, secundarios[2], porque, tone }
```

- **O estado dá o cartão principal; a fila de prioridades dá os secundários.**
  (Híbrido: máquina de estados + prioridades — os estados sobrepõem-se na vida
  real; a fila compõe.)
- **Um estado só existe se for detetável** com dados que a app tem. Sem GPS,
  sem meteo-como-gatilho, sem eventos de check-in (não existem fontes).

### Tabela de prioridades (secundários)

| Situação | Prioridade |
|---|---|
| Validade expira ≤ 7 dias | 100 |
| Disrupção ao vivo (cancelado / PSV over) | 95 |
| Report < 2 h | 90 |
| Escala mudou (diff por confirmar) | 85 |
| Janela de standby ativa | 85 |
| Em voo | 80 |
| Pós-voo (fecho do dia) | 75 |
| Pernoita fora (hotel/amanhã) | 70 |
| Véspera (repouso/alarme) | 65 |
| Fecho do mês (total + extras) | 50 |
| Validade ≤ 30 dias | 45 |
| Estatísticas / mês | 20 |
| Folga / férias (calma) | 10 |

### Eventos que reavaliam o estado (todos reais, já emitidos hoje)

tick de relógio (1 min) · diff do sync/import da escala · transições do voo ao
vivo (scheduled → en-route → landed) · limiares do inbound (`inboundGap ≥ 15 min`)
e do aeroporto (`airportDisruption`) · validade a cruzar 90/60/30/7 dias · evento
AE registado · virar de dia/mês · início de bloco de férias/doença · sign-off
registado.

---

## 3 · A pele (tipográfica final)

### Tokens

| Token | Valor | Papel |
|---|---|---|
| `paper` | `#FFFFFF` | fundo — o branco É a pele |
| `ink` | `#141414` | texto, chip, pílula ativa |
| `ghost` | `#E2E1DC` | o número fantasma do hero |
| `grey` | `#77776F` | secundário |
| `line` | `#ECEAE4` | hairlines |
| `yellow` | `#FFB800` | **marca** — acentos cirúrgicos, dígitos no chip preto, sublinhado ativo |
| `ok` | `#118A55` | confirmado / a tempo |
| `warn` | `#E86A10` | alarme (laranja — NUNCA o amarelo) |
| `warnSoft` | `#FBEAD9` | fundo da faixa de alerta |

**Regras de cor:** o amarelo NUNCA é texto sobre branco (é placa, dígito sobre
preto, ou sublinhado). O alarme é laranja/vermelho — nas zonas de alarme o
amarelo-marca sai de cena. Verde = facto confirmado. € sempre com 2 casas.

### Tipografia

- **Display / números**: Barlow Condensed 600–700, `tabular-nums`, tracking
  negativo nos gigantes.
- **Texto / rótulos**: Hanken Grotesk 500–800 (a fonte da app).
- **Hierarquia é tipográfica** — zero caixas no hero; hairlines separam zonas.

### Anatomia do Início (as zonas, de cima para baixo — FIXAS)

0. **Topo canónico** (`PeleHeader`): avatar↖ + sino↗ — igual em todos os
   ecrãs-aba. *(v2: decidido em perfil-acesso/perfil-sino, já construído.)*
1. **Greet** (12px grey) + **rótulo rodado** (`PeleSide`) na margem direita
   (identidade do momento: "EJU7625 · 2 SETORES").
2. **Faixa de alerta** — slot FIXO; só existe quando há alarme; laranja; nunca
   noutro sítio.
3. **Hero** — número **fantasma** gigante à direita (mockup 190px; no RN real
   170, `adjustsFontSizeToFit` — afinar no device) + **palavra condensada** 56px
   sobreposta + **kick** (o porquê, com acentos amarelos) + seta amarela.
   Na disrupção a palavra fica laranja. *(O Início fala mais alto que a régua
   130 dos outros ecrãs — exceção deliberada, como o Perfil 150.)*
4. **hr** (1.5px ink).
5. **Zona do meio — ADAPTATIVA** (mesmo slot, conteúdos diferentes):
   - dias de voo → **horas gigantes coloridas pelo estado** (verde a tempo /
     laranja derrapou **com a antiga rasurada ao lado**) — sistema Flighty;
   - folga → **agenda com tracinhos** alinhada à direita (próximos serviços);
   - onboarding → o passo único + dica.
5b. **Voz do estado** *(v2.1, 2026-07-09 — "fundos vivos" camada 1)* — frase calma a
   dois tons (negrito ink + cauda cinzenta) nos estados CALMOS: "**descansa — está
   tudo em dia.** aproveita o sol, 27° lá fora." Catálogo CURADO determinístico
   (`data/stateVoice.js`, golden `test:voice`) — sem AI; variante pelo tempo/hora;
   a mesma frase o dia todo, roda no dia seguinte. Disrupção NÃO tem voz (quando
   aperta, só operacional). Acompanha um **HALO** — brilho radial suave e fixo
   atrás do fantasma (SVG RadialGradient), tom pelo tempo (âmbar-sol · azul-chuva ·
   azul-noite) — só nos estados calmos. Camadas 2 (noturno véspera/pernoita) e 3
   (full-bleed) exploradas em `design/fundos-vivos.html`; o full-bleed contradiz o
   princípio 6 e ficou de fora salvo decisão contrária.
6. **Util** — micro-texto utilitário ("Hoje · G-UZHB já em LIS · PSV máx 13:00").
7. **Datarow** — dígitos amarelos 54px (per-diem/mês/PSV proj) + **donut** 52px
   (PSV % / mês % — laranja quando crítico).
8. **Barra do polegar** — **chip das horas** (preto, dígitos amarelos — a hora
   que manda: report/countdown/nova hora, com rasura) + **ações COM RÓTULO**
   (máx. 3, a primária em preto-cheio, mudam por estado).
9. **Pílula de navegação + FAB** (ver §4).

---

## 4 · Navegação *(v2 — como está construída)*

- **Pílula flutuante** (não barra de largura total): 4 abas — **Início ·
  Números · Escala · INFO** (rótulos finais do port; rotas internas intactas).
  Fundo branco (paper) + hairline + sombra suave; aba ativa em **pastilha ink
  com ícone amarelo** e rótulo branco.
- **ESTÁTICA — sem efeitos de scroll.** *(v2: o minimizar-no-scroll do v1 foi
  construído no port e REMOVIDO a pedido do utilizador — "deixa a nav bar e o
  botão normais, sem efeitos". A pílula e o FAB não encolhem nem desaparecem.)*
- **FAB "+" ink com amarelo** ao lado da pílula (ver princípio 7): speed-dial
  com mini-FABs rotulados (Pesquisar · Serviço · Simulação · Extra). A rotação
  +→× ao abrir mantém-se (é o speed-dial, não efeito de scroll).
- Cabeçalho canónico dos ecrãs-aba: **avatar↖ (iniciais, toca=Perfil) + sino↗
  (círculo soft, badge só com novidade)** — `PeleHeader`; ecrãs empurrados
  trocam o avatar por ‹voltar.

---

## 5 · Os estados (fichas)

> Formato: **Gatilho** (determinístico) · **Hero** · **Meio** · **Chip** ·
> **Ações** · **Desaparece** · **Animação** · **Objetivo**.
> Conteúdo sempre crew-aware: os motores FTL/AE enchem os cartões com os valores
> do perfil (piloto/cabine, companhia, categoria).

### 0 · Onboarding
- **Gatilho:** conta criada, calendário ainda não ligado.
- **Hero:** ghost ✈ · "Olá!" · kick "liga o calendário do telemóvel e o Início ganha vida".
- **Meio:** UM passo — "1 · Ligar o calendário do telemóvel — é daí que a app lê
  a tua escala; essencial" + **dica em placa amarela suave**: "No eCrew, ativa o
  sync para o calendário do telemóvel. Com ele ligado, a escala chega sempre
  atualizada — e a app trabalha sem erros."
- **Chip:** "PASSO 1 · ligar o calendário". **Ações:** Ligar calendário (hot) · Ver exemplo (demo).
- **Desaparece:** TUDO o resto. Identidade NÃO se mostra nem se pergunta — veio do registo.
- **Objetivo:** uma única missão. O vazio nunca pede desculpa: mostra o caminho e prova o valor (dia de exemplo).

### 1 · Folga
- **Gatilho:** sem duty hoje; próximo report > 24 h.
- **Hero (2026-07-09, 2.ª iteração do user):** ghost = **dia da semana CURTO de hoje** ("QUI" — 3 letras, gigante) · "Folga" · kick = SÓ o tempo de hoje ("hoje 18°–27°"). O rótulo lateral dá a coordenada: "FOLGA · 9 JULHO". O próximo serviço SAIU do kick (era redundante com a agenda).
- **Voz (2026-07-09, 7.ª iteração — FINAL do user):** **BILHETE MANUSCRITO em Caveat 25** (`PELE_FONT.hand`, 3.ª família SÓ para a voz; o user testou Sacramento por imagens e voltou à Caveat), marcador amarelo no que importa (`PELE.yellow`+`PELE.ink` fixos — igual de dia e de noite), cauda na mesma caneta em cinza. **O bilhete POUSA LIVRE na página** (user: "como num post-it de lado"): ângulo **-1°…-3°** (teto de contenção — 3 sinais no mesmo elemento, o ângulo cede primeiro) + desvio 0-10px, **determinísticos pelo DIA** (`noteSeed` do todayISO — sem Math.random). Dynamic type capado a 1.2 no bilhete.
- **Ações (2026-07-09):** a folga ficou **SEM ações** (Evento/Simular saíram — o ＋ central da tab bar já os carrega; só o chip fica). A app baixa a voz a sério.
- **Meio:** **título VIVO** da agenda (não "A seguir" morto): o estado do próximo — "EM 45 MIN" · "AMANHÃ · **EM 16 H**" · "EM 3 DIAS" (o tempo a amarelo; fallback "A seguir" se não houver countdown) + agenda c/ tracinhos (2–3 próximos), linhas com **data explícita** "SEX 10 · report 05:40 · 4 setores". **Util:** sincronizada ✓ · repouso em dia · férias X de Y.
- **Datarow:** mês € estimado + donut mês %. **Chip:** "2 DIAS · até ao report".
- **Ações:** Extra (hot) · Simular. **Desaparece:** countdowns, PSV, avisos.
- **Animação:** assenta uma vez; sem refresh. **Objetivo:** silêncio merecido.

### 2 · Véspera
- **Gatilho:** report nas próximas 8–14 h, atravessando a noite.
- **Hero:** ghost = hora do report · "Amanhã" · kick "report 05:30 · repouso mínimo cumprido ✓ (235)".
- **Meio:** horas planeadas (pretas — neutras). **Util:** acordar sugerido · setores · máx PSV.
- **Chip:** countdown p/ o report. **Ações:** Simular · (Hotel se pernoita hoje).
- **Desaparece:** € do mês. **Objetivo:** deitar-se descansado — "está verificado, dorme".

### 3 · Pré-report (e variante 3b · Disrupção)
- **Gatilho:** voo hoje, report − 4 h. **3b:** `inboundGap ≥ 15` ∨ `airportDisruption` ∨ `hasDeviation`.
- **Hero:** ghost = countdown (1:05) · "Report" · kick "às 05:30 · 04:30Z · avião ✓ · aeroporto ✓".
  **3b:** ghost "+25" · "Atenção" (laranja) · kick "a partida pode derrapar ~25 min".
- **3b — faixa de alerta:** "⚠ o teu avião ainda vem a caminho — inbound ~05:10Z · LIS 54% atrasos".
- **Meio:** horas partida→chegada VERDES ("a tempo ✓ · porta 24 · meteo FNC").
  **3b:** LARANJAS com as antigas rasuradas (~~06:40~~ → ~07:05 · projeção).
- **Util:** matrícula em posição · PSV máx. **3b:** PSV projetado (liveFdpVerdict) + margem + discrição 205(f).
- **Datarow:** per-diem de hoje + donut PSV%. **3b:** PSV proj + donut laranja ~97%.
- **Chip:** report (3b: ~~antiga~~ nova hora). **Ações:** Partilhar (hot) · Hotel · Simular.
- **Desaparece:** próximas duties, cards do mês. **3b:** o "✓ a horas" — nunca se afirma o que a rotação desmente.
- **Objetivo:** sair de casa sem surpresas. 3b: minutos de avanço sobre o ops.

### 4 · Em serviço / em voo
- **Gatilho:** entre report e último on-block (janela ao vivo).
- **Hero:** setor ativo · progresso/ETA. **Meio:** perna atual + próxima (turnaround).
- **Util:** PSV real a acumular. **Chip:** ETA. **Ações:** Partilhar chegada (hot).
- **Objetivo:** espelho calmo do voo — e a família vê o mesmo sem perguntar.

### 5 · Pós-voo
- **Gatilho:** último on-block/sign-off do dia registado.
- **Hero:** ghost = duty total · "Fechado ✓" · kick veredicto legal.
- **Meio:** totais (duty c/ débrief · block · setores). **Util:** repouso até HH:MM · amanhã.
- **Datarow:** per-diem do dia + donut. **Chip:** "REPOUSO ATÉ 22:30".
- **Ações:** registar sign-off real (nudge se usou débrief do perfil) · Descanso.
- **Animação:** números finais assentam UMA vez — é história, não live.
- **Objetivo:** fechar o dia com o veredicto e o amanhã preparado.

### 6 · Pernoita fora
- **Gatilho:** nightStop ∧ ends-away ∧ já aterrou.
- **Hero:** "🌙 FNC" · hotel. **Meio:** hotel (mapas/ligar/nota: pickup, pequeno-almoço) + amanhã.
- **Util:** repouso fora-base 10 h (235) · per-diem da noite. **Meteo** da estação (wxDigest).
- **Ações:** Hotel (hot) · Partilhar. **Objetivo:** tudo o que precisas numa cidade que não é a tua, a um toque.

### 7 · Standby
- **Gatilho:** duty standby/reserve com janela ativa.
- **Hero:** janela (06:00–14:00) · "Standby". **Meio:** **"se chamado agora: PSV até HH:MM"** (225/230, recalcula ~15 min).
- **Util:** alojamento (225 e/d) · ADTY pago. **Ações:** Simular (hot).
- **Objetivo:** responder à única pergunta do standby: "até onde me podem levar hoje?".

### 8 · Formação
- **Gatilho:** duty kind training hoje.
- **Meio:** horário; papel pago se aplicável (instrutor/CCLT — do AE respetivo).
- **Objetivo:** dia de treino sem ruído de voo.

### 9 · Escala mudou
- **Gatilho:** diff do sync/import por confirmar (o pontinho azul de hoje, promovido).
- **Hero:** "A tua escala mudou" · N alterações. **Meio:** o que mudou (resumo) + candidatos SNC c/ €.
- **Ações:** Confirmar (hot). **Objetivo:** nada entra na tua vida sem confirmares — deteta→confirma→grava.

### 10 · Documento crítico
- **Gatilho:** validade ≤ N dias (7 = takeover do principal; ≤30 = secundário).
- **Hero:** "Médico expira" · ghost = dias. **Ações:** Renovar/Validades (hot).
- **Objetivo:** nunca voar com papel caducado.

### 11 · Fecho do mês
- **Gatilho:** últimos 3 dias do mês civil.
- **Hero:** total estimado ao cêntimo. **Meio:** decomposição (as parcelas SOMAM — auditável).
- **Util:** extras por registar (nudge). **Ações:** Extra (hot) · Estatísticas.
- **Objetivo:** o mês fecha-se sabendo o que se vai receber e porquê.

### 12 · Férias
- **Gatilho:** hoje dentro de bloco vacDays.
- **Hero:** "🌴" · saldo (ficam 9 de 22). **Desaparece:** quase tudo — afastamento máximo.
- **Objetivo:** a app sabe estar de férias contigo.

### 13 · Doença
- **Gatilho:** evento sickDays hoje.
- **Hero:** tom humano, baixo. **Meio:** o que a lei garante (Art. 48: dias 1–3 por episódio · episódio atual dia N).
- **Desaparece:** tudo o operacional. **Objetivo:** a app baixa a voz e diz só o que protege.

---

## 6 · Movimento & Animação (spec)

**Princípio único: animação é FEEDBACK e SIGNIFICADO, nunca decoração.** Esta é uma
ferramenta operacional usada às 04:00 — movimento gratuito é fricção (atrasa a leitura,
gasta bateria, irrita à 500.ª vez). Toda a animação tem de responder a uma de três
perguntas: "confirmei a ação?", "o que mudou?", "para onde olho?". Se não responde a
nenhuma, não existe.

### As 6 leis do movimento

1. **Feedback/significado, nunca decoração.**
2. **Rápido.** 150–250 ms, curva ease-**out** (desacelera). Nada que faça esperar.
3. **`prefers-reduced-motion` sempre** — via `useReduceMotion` (já no código): tudo cai
   para instantâneo (durações→0, valores no destino, cascata simultânea, crossfade→corte).
   Os **haptics ficam** (não são movimento).
4. **Um momento orquestrado > micro-animações espalhadas.** A entrada escalonada do ecrã
   é o "momento"; o resto está quieto.
5. **Haptic emparelhado com o visual** (já temos `haptics`: `select`/`success`/`warning`).
6. **O teste da 500.ª vez:** se irrita quem abre a app 10×/dia durante meses → corta ou
   torna invisível (mais rápido, mais subtil).

### Tokens de movimento

| Token | Duração | Curva | Uso |
|---|---|---|---|
| `tap` | 100 ms | ease-out | scale 0.97 + opacity ao carregar num alvo |
| `micro` | 150 ms | ease-out | recolorir horas, chip a marcar, hairline |
| `standard` | 220 ms | ease-out | crossfade do hero, entrada de zona, faixa de alerta |
| `stagger` | +50 ms/item | — | atraso entre zonas na entrada do ecrã |
| `settle` | 500 ms | ease-out | `CountUp` de um valor grande (uma vez) |
| `donut` | 700 ms | ease-out | anel a encher à entrada (uma vez) |
| ~~`navbar`~~ | — | — | *(v2: obsoleto — a navegação é estática, ver §4)* |
| `screen` | nativo | React Navigation | push/slide entre ecrãs |

Nunca molas *bouncy* no conteúdo; ease-out sempre. (Uma mola gentil só no *release* de
um botão, se sequer.)

### Catálogo — o que anima, onde

- **Toque** (`tap`): todo o alvo premível — botões, chips, réguas, ações do polegar —
  faz `scale:0.97` + leve escurecer ao pressionar; solta ao largar. + `haptic select`.
- **Entrada do ecrã** (`stagger`): as zonas revelam em cascata de cima para baixo
  (greet → hero → meio → util → polegar), via `useEnter` (já existe). UMA vez ao focar.
- **Transição de estado** (`standard`): o hero (número fantasma + palavra) faz **crossfade**
  + micro-slide 8 px quando `crewState` muda; o resto assenta sem re-animar.
- **Valores** — as **horas** recolorem (`micro`) quando o estado muda (verde↔laranja) e a
  antiga aparece rasurada; o **hero grande** e o **€/per-diem** fazem `CountUp` (`settle`)
  **uma vez** à entrada; o **donut** enche (`donut`) à entrada.
- **Countdown**: atualiza a cada minuto — troca o texto sem animação de contador (só o
  número muda; nada de "roleta"). Estados fechados (pós-voo, folga) assentam UMA vez.
- **Loading** = **skeletons, não spinners** — `Skeleton` (já existe) com shimmer subtil;
  UI otimista onde der (mostrar o valor local enquanto o feed chega).
- **Sucesso** (criar conta, confirmar, gravar): o visto **desenha-se** (~300 ms) +
  `haptic success`. Erro/inválido: shake curtíssimo (2 px, 1×) + `haptic warning`.
- **Faixa de alerta** (disrupção): nasce no sítio fixo com fade+slide (`standard`) — nunca
  "salta"; some com fade quando a condição passa.
- **Ecrãs** (`screen`): transições nativas do React Navigation; não reinventar.

### O que NÃO anima (proibições)

- O **cartão/ecrã inteiro** a cada foco (enjoa, atrasa a leitura).
- Qualquer animação que **atrase o acesso à informação** — o report/PSV aparece já, nunca
  depois de um reveal longo.
- Molas brincalhonas, parallax, partículas, efeitos decorativos, spinners infinitos.
- O **conteúdo** com brilho/vidro (ver decisão Liquid Glass): conteúdo é plano/matte; só o
  chrome do sistema (navbar/sheets) pode brilhar onde o iOS o dá de borla.

### Infraestrutura (já existe — não é dev build)

`react-native-reanimated` (worklets **0.5.1** pinado, SDK 54) · `useEnter` (cascata) ·
`useReduceMotion` (a lei 3) · `Skeleton` (loading) · `CountUp` (settle) · `haptics`
(select/success/warning). Corre em Expo Go. **Timing:** a animação é a camada final de
polish — anima-se os ecrãs NOVOS durante/depois do port, nunca a UI antiga a substituir.

Tema segue o sistema; modo escuro é candidato futuro (ref-1 glow — reports às 04:00).

## 7 · Fora do Início

- **Escala / Números / INFO = referência estável.** Acentos permitidos:
  hoje na grelha, ponto âmbar de mudanças no hub, realce dos limites de hoje. Nada mais.
- **Superfícies irmãs do Living Interface:** a página da família
  (voo.crewpact.app — anel de countdown + avião, dia/noite pela hora, DEPLOYED)
  e a futura Dynamic Island (dev build).
- **Pele portada (v2):** Início · Números · Escala (grelha+hub+detalhe) · INFO ·
  Perfil (bento) · Validades (carteira) · tab bar/FAB/mini-FABs — tudo em RN.
  **Por vestir:** login/splash/criar-conta (mockups fechados, port por fazer) +
  folhas antigas (DutyFormSheet, HotelSheet, RosterImportSheet, CalendarPicker,
  diálogos do Perfil). — *processo: referência dele → adaptação DENTRO desta
  pele, não pele nova.*

## 8 · Apêndice — fonte de cada dado (honestidade)

| Elemento | Fonte | Motor |
|---|---|---|
| Estados/horários | escala (calendário do telemóvel ← sync eCrew) | duties/roster_meta |
| PSV, repouso, limites | motores FTL golden (205/210/225/230/235/245, CS-FTL.1) | `computeDuty`, cumulativos |
| €, per-diem, extras | motores AE golden (BTE/acordos por companhia·função) | `monthlyAe`, `aeEvents` |
| Voo ao vivo, porta, matrícula | AirLabs via Edge `flight-status` | `fetchFlightStatus` |
| Inbound (o teu avião) | AirLabs modo `reg` | `inboundGap` (golden) |
| Aeroporto doente | AirLabs `/schedules` c/ cache 12 min | `airportDisruption` (golden) |
| Meteo | MET Norway (CC-BY, atribuição obrigatória) c/ cache 45 min | `wxDigest` (golden) |
| Validades, hotéis, eventos AE | introdução manual (local, RGPD-leve) | — |
| Localização | **não há GPS** — relógio + escala | — |
| Check-in/boarding/crew | **não existem fontes** — estados excluídos | — |

---

## 9 · Estado da implementação (v2 · 2026-07-08)

> **✅ TESTADO NO DEVICE pelo founder (2026-07-09)** — a sessão de afinação ao vivo do
> próprio dia (navbar nova + ＋ central, folga v2 QUI/rótulo/bilhete manuscrito, título
> vivo da agenda, pílula de novidades, ponto da ativa por baixo) fez de guião: o que
> não estava bem foi corrigido na hora. Re-testes futuros: frase-gatilho "testar os estados".

O Início real (`screens/HomeScreen.js`) **já corre o motor adaptativo**: derivação
`homeState` + anatomia fixa das zonas + banda de alerta com cadeia de prioridades
(materializa a tabela do §2: segurança ILEGAL > limites acima > erro de leitura >
cancelado/desviado > atraso c/ liveVerdict > inbound > registo-atrasado > aeroporto).
A meteo do destino ganhou a UI (célula da chegada); o Partilhar usa o cartão
editorial da família (`FlightShareCard`). Acrescentar um estado é **um ramo nas
derivações** — a arquitetura não muda.

| # | Estado | Situação | Nota |
|---|---|---|---|
| 0 | Onboarding | ✅ construído | passo único calendário + dica eCrew + Ver exemplo (efémero — o re-sync limpa o demo) |
| 1 | Folga | ✅ construído | agenda 3 próximos + € do mês (`monthStats`) + donut do mês |
| 2 | Véspera | ✅ construído (2026-07-09) | report ≤14h + noite (≥18h): countdown no fantasma, "Amanhã", repouso ✓ + acordar ~, horas neutras, chip H:MM; **estreia o TEMA NOTURNO** (PELE_NIGHT + glow de candeeiro; chip inverte) |
| 3 | Pré-report | ✅ construído | countdown H:MM, avião ✓/aeroporto ✓ reais, horas + meteo, per-diem + donut PSV |
| 3b | Disrupção | ✅ construído | banda-causa + "+N Atenção" + horas rasuradas + PSV projetado + chip nova-partida |
| 4 | Em serviço/voo | ✅ construído (2026-07-09) | barra de PROGRESSO do setor ativo (instantes planeados, anda com o tick) + PSV a ACUMULAR no útil ("PSV 05:12 / máx 13:00") + Partilhar; ETA por instantes live fica como refinamento |
| 5 | Pós-voo | ✅ construído (2026-07-09) | duty de hoje TERMINADA → "Fechado" + veredicto legal no kick, DUTY/BLOCK/SETORES (tap→detalhe), per-diem+donut PSV, ações Sign-off/Simular; dívida: "repouso até HH:MM" real (motor 235) por ligar — o útil usa a pergunta do repouso |
| 6 | Pernoita fora | ✅ construído (2026-07-09) | dia fechado FORA da base (nightStopStation) → NOTURNO herdado; fantasma = estação (tempo no expoente), hotel no kick/meio (tap mapas · longo edita · convite sem hotel), útil 10h-235 + € da noite (ae.nightStop) + meteo, chip report amanhã |
| 7 | Standby | ✅ essencial (2026-07-09) | linha "SE CHAMADO → PSV até HH:MM" (report+máx do motor) sob o serviço; útil ainda genérico (alojamento 225 d/e por expor) |
| 8 | Formação | ✅ construído (2026-07-09) | ramo não-voo do "hoje" (tipo+horas) + **papel pago** no útil (instrutor — conta no mês, AE) |
| 9 | Escala mudou | ✅ construído (2026-07-09) | **banda prioritária** no Início ("A tua escala mudou — N por rever", toca→Escala) + hub/ponto âmbar; takeover do herói DESCARTADO (o dia operacional não se esconde; deteta→confirma respeitado) |
| 10 | Documento crítico | ✅ conforme decisão do user (2026-07-09) | linha vermelha AO PÉ DO ESTADO (tocável→porquê); takeover descartado pelo próprio user ("pode ficar ao pé do estado") |
| 11 | Fecho do mês | ✅ construído (2026-07-09) | últimos 3 dias + AE: fantasma=dias que faltam, total € amarelo no kick, PARCELAS que somam no meio (tap→Estatísticas), € do mês + donut, nudge dos extras, ações Extra/Números |
| 12 | Férias | ✅ construído (2026-07-09) | vacDays hoje: fantasma=dias que RESTAM no ano, "ficam 9 de 22 · regressas sexta 18" no kick, halo+tempo, voz "férias a sério."; sem ações (afastamento máximo); véspera ganha no último dia c/ report cedo |
| 13 | Doença | ✅ construído (2026-07-09) | sickDays hoje: dia N do EPISÓDIO (consecutivos, motor), "As melhoras", Art. 48 crew-aware no kick (1-3 pago piloto · cabine regista pagos), tudo operacional em pausa; doença CALA a véspera |

**Auditoria "vida do utilizador" (2026-07-09, pedida pelo user antes do teste):** cada
estado foi revisto pela situação vivida ("o que está na cabeça dele NESTE momento?").
6 correções: véspera e pernoita ganharam o **tempo de amanhã cedo** ("que visto às 4h?" —
`tomorrowMin/Sym` do wxDigest); a doença perdeu o **eco triplo** do dia-N (rótulo → EM PAUSA;
chip → próximo serviço, "quando tenho de estar bom?"); o fecho perdeu o **eco do total**
(kick=nudge; o € vive só na datarow, a manchete da casa; útil audita: voos sem rota/índice
estimado); o standby mostra o **fim da janela** no fantasma quando ela está ativa ("até
quando podem chamar-me?"); a disrupção trocou o per-diem pelo **PSV** na datarow (no stress,
a manchete é segurança, não dinheiro).

**Ordem de construção (valor ÷ custo):** ① Véspera + Pós-voo (dados todos prontos —
é 1 ramo cada) → ② Pernoita como estado → ③ Standby "se chamado" (o motor 225 já
calcula) → ④ Em-voo completo (progresso/ETA — o feed live já existe) → ⑤ Fecho do
mês · Férias · Doença → ⑥ Escala-mudou/Doc-crítico como takeover (hoje já têm voz
pela banda/hub). Formação afina-se com o papel-pago do AE.

**Motor extraído ✅ (2026-07-09):** a promessa do §2 está cumprida — os gatilhos e a
precedência dos 8 estados vivem em **`data/crewState.js`** (puro: `crewState()` +
`dutyEndMs` + `dayClosed`), com **golden `test:crewstate` (28 asserções)** a pinar
cada regra: fecho multi-serviço, serviço que vira a noite, standby sem block_on
nunca fecha o dia, pernoita fora vs base, pós-voo>véspera, disrupção>hoje. O Início
só injeta o dia e veste o resultado. Estados novos entram no motor COM asserção.

---

*v1 · 2026-07-03 · decidido peça a peça com o utilizador. Mockups: pele-tipografica-final.html
(4 estados demonstrados) · living-interface.html (8 fichas ao vivo) · restantes peles arquivadas em design/.*
*v2 · 2026-07-08 · alinhado com a construção real: FAB reposto (princípio 7), navegação
estática (§4), anatomia com PeleHeader/PeleSide (§3), estado da implementação (§9).*
