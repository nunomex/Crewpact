# Living Interface — v3

> **O coração da app.** O Início não mostra funcionalidades: acompanha o dia operacional do tripulante. Um motor determinístico
> decide o estado; outro decide o que vai para onde; o ecrã só desenha.
> Este documento é a lei da Living Interface. Os números e o desenho fino vivem noutros sítios (secção 9); aqui ficam os
> princípios, a anatomia, os estados e as regras.
>
> **v3 (2026-11-14)** — reescrita a partir do código. A v2 (julho) descrevia a pele tipográfica (o número fantasma, a palavra
> condensada, a barra do polegar, o FAB, o bilhete manuscrito) — nada disso existe no Início 3.0 "cartões de cor". O que morreu
> está na secção 8, com a data e o que o substituiu.

---

## 1 · Princípios

1. **Estrutura fixa, conteúdo adaptativo.** O topo e a folha nunca mudam de sítio; o que muda é o que cada zona mostra.
2. **1 principal + 2 secundários.** Nunca um painel de controlo, nunca cinco cartões. Quando há mais, ganha a prioridade (secção 3.4).
3. **O porquê a um olhar.** Nenhum número sem a sua explicação: os números do topo com conta e lei estão sublinhados e abrem a
   folha com a conta desenhada e o artigo (Q3, secção 3.2).
4. **A app afasta-se — e a calma prova-se.** Na folga, nas férias e na baixa, a app baixa a voz. O silêncio também é
   informação, mas só depois de verificado: antes do report, "Tudo a horas" com o voo, o avião e o aeroporto; na folga, a
   Escala, as Validades e o Mês — os avisos que estão calados (W1).
5. **Determinístico, sem AI.** O estado e cada cartão são funções puras dos dados, com golden (secção 9). Cada cartão sabe
   responder "porque estou a ver isto?".
6. **Sem mascotes, sem fotos.** O carácter vem da tipografia e da cor dos cartões.
7. **A app só lê o calendário e calcula** (regra do Nuno, 2026-11-14). Criar serviços à mão morreu; editar é corrigir o que foi
   importado; nada entra sem o "sim" do tripulante (detetar → confirmar → gravar). À mão, só a Simulação (o botão "Simular" da
   barra de abas) e os dados do Perfil (hotel, validades).
8. **Tudo é do tripulante (2026-11-04).** Cada elemento passa as cinco perguntas:
   1. **Ajuda-o a decidir, agir ou ficar tranquilo agora?** Se não, sai.
   2. **Na língua dele** — report, calços, PSV, pernoita, folga — nunca a da app.
   3. **Serve o piloto e a cabine, cada um no seu** (artigos do acordo de cada um; o RDP só da cabine; a discrição 205(f) só dos
      pilotos). O que é igual para os dois (FTL, repouso) diz-se igual.
   4. **Não repete** o que já está no ecrã.
   5. **Honesto:** separa o facto da estimativa e nunca inventa. Sem um dado, cala-se ou diz "sem dados"; quando a lei não fecha um
      número, mostra as duas pontas e porquê.
9. **A cor tem um significado** (o mapa B e "O padrão da cor", `docs/design-system.md` §14): frio = a escala (voo, terra,
   repouso), quente = olhar (âmbar com "!", vermelho com "✕"), dentro sem cor, incerto neutro, verde só no dinheiro; a cor nunca vai
   sozinha.

---

## 2 · O motor

Dois motores puros, sem rede nem React, com golden:

- **`data/crewState.js` — o estado.** `crewState({ now, hour, todayISO, flight, cdMin, deviated, inboundLate, calendarConnected,
  todayDuty, base, events, hasAe })` → `{ state, … }`. Golden `test:crewstate`.
- **`data/homeCards.js` — o que vai para onde.** `homeCards(H)` → `{ state, top, cards, why, credit, caption }`. O ecrã
  (`screens/HomeScreen.js`) junta os dados do dia em `H` (o voo, o ao vivo, o tempo, o mês, os avisos, a voz, os três sinais, as
  alterações da escala) e o motor decide os textos e a ordem. Golden `test:homecards`.

### Os estados e a precedência

| Estado | Gatilho |
|---|---|
| `setup` | sem calendário ligado e nada para mostrar |
| `disrupcao` | desvio no NOSSO voo ao vivo, ou o avião que vem buscar-nos atrasado (`inboundGap` ≥ 15 min) |
| `hoje` | o próximo serviço é hoje — com fases no voo: `pre` (antes do report) · `duty` (em terra) · `air` (no ar) · `landed` |
| `pernoita` | o dia de hoje fechou fora da base |
| `posvoo` | o dia de hoje fechou na base (até à meia-noite) |
| `doenca` | evento de baixa hoje |
| `vespera` | report amanhã a 14 h ou menos, já pela noite (a partir das 18:00) |
| `ferias` | evento de férias hoje |
| `fecho` | os últimos 3 dias do mês civil, com o acordo modelado |
| `folga` | o resto (com ou sem serviço marcado) |

**Precedência:** setup > disrupção > hoje > pernoita > pós-voo > baixa > véspera > férias > fecho > folga. A pernoita decide antes
do pós-voo (o mesmo gatilho, mais específico); a baixa cala a véspera; a véspera ganha às férias (o último dia de férias com report
cedo amanhã). Na folga, um documento a caducar em 7 dias ou menos toma o topo (`documento`, decidido no `homeCards`). Um dia com
vários serviços só fecha quando todos acabaram (`dayClosed`).

### De onde vem cada dado

| Dado | Fonte | Onde |
|---|---|---|
| Serviços, horas, rotas | o calendário do telemóvel (a escala que a companhia publica) | `duties`, `roster_meta` |
| As alterações da escala | o diff da última leitura do calendário (com a hora da leitura) | `data/rosterDiff.js` |
| PSV, repouso, limites | os motores FTL (Reg. (UE) 83/2014, CS FTL.1) | `ftl/` (golden `test:ftl`) |
| €, per diem, extras | os motores dos acordos | `ae/` (golden `test:ae`, …) |
| O voo ao vivo | AirLabs, pela Edge `flight-status` (60 s no servidor), 4 h antes da partida | `fetchFlightStatus` |
| O avião que nos vem buscar | AirLabs, modo matrícula | `inboundGap` (golden `test:flightstatus`) |
| O aeroporto | AirLabs, agregado e cacheado 12 min | `airportDisruption` · `airportCalm` |
| O tempo | MET Norway (CC BY 4.0, com o crédito no fim da folha) | `wxAt` (golden `test:wx`) |
| A lei de cada número | o registo da Prova (só artigos conferidos em `fontes/`) | `data/prova.js` (golden `test:prova`) |
| A frase da folga | um catálogo curado, escolhido pelo dia | `data/stateVoice.js` (golden `test:voice`) |
| Localização | não há GPS — o relógio e a escala | — |

---

## 3 · A anatomia do Início 3.0

Dois andares fixos: **o topo** (sobre a secretária) e **a folha** (branca, sobe por cima, com os cartões). Desenho:
`components/HomeCards.js` (`HomeTop`, `HomeCards`); canon visual: `docs/design-system.md` §14.

### 3.1 · O topo (S2 + T2, L1, D3)

- **O título é o estado** ("Dia de voo", "Em voo", "Pernoita", "Folga"…), em grande, na fila de cima, ao lado de
  "Notificações"; nos estados ao vivo leva **o ponto amarelo** (de dia com um aro de tinta — S2 das cores).
- **A frase** ("Report às", "Aterras às", "Próximo serviço daqui a") e, à direita dela, **a pílula do dia ou do voo**
  ("EJU7601 ›", "quarta 11 ›"), que abre esse dia na Escala.
- **O número em duas linhas** — o próximo marco ("05:15 / LIS", "2 dias", "8 h 35" — as durações sempre com "h", D1), no tamanho comum às três abas. A hora UTC
  do report vai ao lado do sítio, só quando é diferente da local.
- **Até três factos** ao lado de um fio. **O tempo é o último facto** (o ícone, a temperatura, a hora que conta: o report, ou a
  chegada) — só com serviço (a app não usa a localização).
- **Os números com porquê estão sublinhados** a pontilhado (Q3): o "PSV até", a margem no PSV, as horas de 7 dias, o PSV do dia
  fechado. Tocar abre a folha da Prova a começar pela **conta desenhada** — a soma de cima a baixo ("Report 05:15 · + Máximo · 3
  setores 11 h 45 · = PSV até 17:00") ou a barra do limite ("31 h de 60 h · ficam 29 h · de 5 a 11 nov") —, e por baixo a regra, o
  artigo e a fonte oficial. A conta usa os números do próprio serviço e os do motor (o PSV do dia fechado acaba nos calços do último
  setor em funções; a diferença — começou antes do report, o acerto do tempo decorrido — é uma linha da conta).

### 3.2 · A folha e as peças

| Peça | O que é |
|---|---|
| **O cartão do voo (E3)** | o dia pela ordem em que acontece (report → parte → chega → fim) numa linha com um traço por voo e as escalas por cima (V2); as cidades em pequeno; o nº do voo e o per diem; o limite numa linha discreta quando está dentro (o incerto vai num cartão tracejado por cima — L2) |
| **O cartão grande** | os outros serviços e o repouso: o título, as duas horas, o selo do meio, a barra do tempo |
| **A linha fina** | o que é secundário (a pernoita, um aviso, o próximo serviço) |
| **O cabeçalho de secção (B3)** | antes do próximo serviço noutro dia: "Amanhã · quinta 12", "Sábado 14 · daqui a 3 dias" ("A seguir" só no mesmo dia) |
| **A verificação (W1)** | três sinais com um anel que fecha quando o dado chega: antes do report Voo · Avião · Aeroporto ("Tudo a horas · visto 03:33"); na folga, sem caixa, Escala · Validades · O mês |
| **As alterações da escala (E2)** | o cartão âmbar com uma linha por alteração: o dia grande, o que mudou com o antes riscado, "lido às", "Rever e aceitar · nada entra sem ti" |
| **A voz (V2)** | uma frase na folha, sem caixa, na folga, nas férias e na baixa |
| **Linhas e texto** | as parcelas do mês, os três passos da entrada, o que o acordo garante |

### 3.3 · A cor na folha

- **O2 — só o principal cheio:** o primeiro cartão de tipo (o serviço de agora) tem a cor cheia; os outros de tipo ficam neutros
  com **o quadradinho da sua cor**. Os avisos ficam cheios.
- **Os avisos:** âmbar com "!" = olhar (cuidado, falta um dado, pede uma ação); vermelho com "✕" = fora do limite; a informação
  (as férias por gozar) fica neutra.
- **A noite:** a véspera e a pernoita usam a paleta noturna (`CARD.night`) até chegar o modo noite (N3, a seguir o claro/escuro do
  iPhone — por construir).

### 3.4 · A ordem da folha (1 principal + 2)

- **Os avisos que pedem ação passam à frente** da informação (só cabem dois). Os que são sobre o serviço de hoje vão antes do cartão
  dele; os outros, no fim.
- **Com um aviso, o segundo cartão passa a linha fina** (a pernoita, o próximo serviço) — e a calma (W1) sai.
- **A calma ocupa o lugar de um aviso:** antes do report, "Tudo a horas" entra logo a seguir ao cartão do voo e, como um aviso, faz a
  pernoita passar a linha fina.
- **Na folga (F2):** o principal é o aviso que pede ação, ou — sem ele — a calma (a voz e os três sinais); depois o próximo serviço
  numa linha com o dia; depois o 2.º aviso, ou as férias (de novembro em diante, com dias por gozar — CT art. 240.º), ou o mês.
- **Nunca vazio:** num estado com serviço, se a folha fica só com um cartão, junta-se a linha do mês.

---

## 4 · Os estados

> Como estão no código a 2026-11-14 (o retrato de cada um, com os dados de teste: `design/estados-todos.html`, gerado por
> `node scripts/render-estados.js`). Formato: **o título · a frase e o número · os factos · a folha**.

**Bem-vindo** (`setup`) — "Para a app saber o teu dia · Liga a escala" · "Só leitura · nada é alterado" e "Com o teu sim é que se
grava" · os três passos, "Ligar o calendário" (a linha escura), "Importar o PDF", "Ver um exemplo". O modo exemplo diz sempre que é
exemplo ("Exemplo · sair").

**Folga sem serviços** (`folga`, sem nada marcado) — "Sem serviços na escala · Livre hoje" · "Em dia · a tua escala" e a hora da última
leitura · "Quando aparecem", "Ler a escala agora", "Importar o PDF".

**Folga** (`folga`, F2) — "Próximo serviço daqui a · 2 dias" (a menos de 48 h, em horas) · o dia, as horas de 7 dias (sublinhadas), o
tempo do report de amanhã · **a voz e os três sinais** (Escala "lida às", Validades "em dia", O mês "nada por confirmar"), o próximo
serviço numa linha ("Sexta 13 · daqui a 2 dias", o report à direita), as férias ou o mês. Com um aviso (a escala mudou, os
documentos, a auditoria do mês — que corre também na folga), o aviso é o principal e a voz e os sinais calam-se.

**Atenção** (`documento`, na folga, um documento a 7 dias ou menos) — "Certificado médico caduca em · 6 dias / 17 nov" · o último dia
válido, os serviços marcados depois · o cartão âmbar com "Registar a data nova", o próximo serviço.

**Voo amanhã** (`vespera`, noturno) — "Report às · 05:15 LIS" · quanto falta, o "PSV até" (sublinhado), o tempo do report · o cartão do
voo (com o repouso cumprido na linha do limite e o lembrete), a pernoita numa linha.

**Dia de voo** (`hoje`, `pre`) — "Report às · 05:15 LIS" · quanto falta, o "PSV até" (sublinhado), o tempo do report · o cartão do voo,
**"Tudo a horas"** (W1: o voo a horas, o avião já em LIS ou "chega 05:20", o aeroporto normal; sem um dado, "sem dados" e "Voo a horas";
antes das 4 h, "O voo ao vivo às 02:15"), a pernoita numa linha. Com o PSV incerto, o cartão tracejado "O limite de hoje" vai por cima
e a calma sai.

**Em serviço** (`hoje`, `duty`) — "Partida às · 06:15 LIS" · quanto falta, a margem no PSV (sublinhada), o tempo à chegada · o dia de
serviço com o setor ("setor 1 de 3", "a horas"), a pernoita.

**Em voo** (`hoje`, `air`) — "Aterras às · 13:50 LGW" · quanto falta para aterrar, a margem no PSV, o tempo à chegada · o dia de
serviço com a barra do PSV, a pernoita, os avisos.

**Aterrado** (`hoje`, `landed`) — "Aterraste às · 13:50 LGW" · o PSV de hoje, a margem · o dia de serviço, a pernoita.

**Standby, Formação, Posicionamento** (`hoje`, sem voo) — o tipo é o título ("Standby", "Formação") · "A janela fecha às" / "Começa às"
· quanto falta, "PSV até, se chamarem já" (estimado a 1 setor — confirma na Simulação) ou a hora do fim · o cartão de terra (no standby,
a barra da janela e o que rende se não chamarem), o próximo serviço com o cabeçalho do dia.

**Atraso** (`disrupcao`) — "Nova partida às · 07:25 LIS" · a hora da escala riscada, os minutos de atraso · **"Limites com o atraso"**
(âmbar, a projeção do PSV com o atraso, ORO.FTL.205), o dia de serviço com a causa ("o avião ainda vem a caminho"), a pernoita numa linha.

**Pernoita** (`pernoita`, noturno) — "Report amanhã às · 14:05 LGW" · quanto falta, o tempo à hora do report · o repouso fora da base
(o hotel, o mínimo, a barra do repouso), o voo de amanhã numa linha.

**Dia fechado** (`posvoo`) — "PSV de hoje · 8 h 35" (sublinhado) · os ganhos de hoje, as horas de 7 dias, o tempo de amanhã · o repouso
na base ("Descansa", o mínimo, a barra), o próximo serviço ("Próximo serviço · amanhã").

**Fecho do mês** (`fecho`) — "Ganhos brutos de novembro · 2 431,50 € / estimado" (com a base incerta, as duas pontas) · as parcelas que
somam o total ("O recibo da companhia manda. Como é calculado?"), a auditoria do mês (o dinheiro esquecido).

**Férias** (`ferias`) — "Ficam no ano · 12 dias / de 22" · o regresso, estas férias · a voz, o serviço do regresso, o mês.

**Baixa** (`doenca`) — "Dia do episódio · 2 / de 3 pagos" · a voz, o que o acordo garante (o artigo de cada um: pilotos e cabine), o
próximo serviço ("se continuares de baixa, avisa a escala").

---

## 5 · O movimento

O canon é `docs/motion-design-system.md` (os tokens de duração, o contrato dos movimentos reduzidos, o inventário). No Início:

- **O anel da verificação desenha-se** quando o dado chega (700 ms, escalonado; o visto 220 ms); nunca a cada abertura; com os
  movimentos reduzidos aparece fechado.
- **A mudança de estado — o painel de partidas (M2, `design/mudanca-estado.html`, escolhida pelo Nuno a 2026-11-14; no código, por
  ver no iPhone).** Quando o estado muda com o ecrã à vista, o título sai para cima e o novo entra de baixo; no número, só os
  algarismos que mudam rolam (o olho vai direto ao que mudou: às 05:15 o "5" passa a "6" e percebe-se que já não é o report mas a
  partida); a frase e os factos aparecem; os cartões cruzam; quando a cor muda (o dia passa a noite, o voo a repouso), o fundo, a
  folha e o cartão principal passam de uma cor para a outra (260 ms). Nunca ao abrir; com os movimentos reduzidos, a troca é imediata.
  Detalhe em `docs/design-system.md` §14 e no inventário do movimento.
- Nada que atrase a leitura: o report e o PSV aparecem já; sem molas brincalhonas, sem vidro, sem partículas.

---

## 6 · As guias

As regras e os sítios estão em `docs/guias.md` (balões na 1.ª vez, só onde há um sinal que não se adivinha, uma guia de cada vez,
sempre "Saltar"). No Início: **os números sublinhados** (no código, 2026-11-14 — depois das boas-vindas e da dica do ＋); a guia de três
balões (o título do estado, o número, a cor dos cartões) está proposta.

---

## 7 · Fora do Início

- **A Escala** (só o mês, com o dia num círculo; tocar num dia mostra os serviços por baixo; a folha do serviço com o Detalhe inteiro),
  **os Números** e **o Perfil** são referência estável — a mesma linguagem dos cartões, sem estados.
- **A barra de abas:** Início · Escala · Números · Perfil e o botão **"Simular"** (abre a Simulação). Escurece com o Início na véspera e
  na pernoita. O único sinal vivo é o ponto âmbar da Escala (alterações por rever).
- **Superfícies irmãs:** a página da família (voo.crewpact.app) e, no dev build, a Live Activity.

---

## 8 · O que morreu (da v1/v2 para a v3)

| Era | O que era | Substituído por | Quando |
|---|---|---|---|
| v1/v2 | a pele tipográfica: o número fantasma, a palavra condensada, o "kick", a zona "útil", a datarow com o donut, a barra do polegar com o chip e as ações | o Início 3.0 "cartões de cor" (o topo com o número em duas linhas e os factos; a folha com os cartões) | 2026-11-11 |
| v2 | o topo `PeleHeader` (avatar + sino) | o topo 3.0 (`HomeTop`) e, depois, o título do estado + "Notificações" (S2/T2) | 2026-11-11 · 2026-11-14 |
| v2 | a pílula de navegação + o FAB com mini-FABs | a barra de abas "A" com o ＋, e depois o botão "Simular" | 2026-11-11 · 2026-11-14 |
| v2 | criar serviços à mão (o FAB "Serviço", "adicionar à mão" na entrada) | "a app só lê o calendário e calcula" | 2026-11-14 |
| v2 | o bilhete manuscrito (Caveat, inclinado, marcador amarelo; as frases do tempo e do aviso) | a voz V2 (uma frase na folha, na letra da app; sem o tempo nem o aviso) | 2026-11-14 |
| v2 | o halo e os "fundos vivos" | nada (o carácter é a cor dos cartões) | 2026-11 (com o Início v6) |
| v2 | os "nudges" (registar o sign-off, os extras por registar) | o calendário é a fonte; "Registar sign-off" saiu | 2026-11-14 |
| v2 | "✓ a horas" sem verificação | "Tudo a horas" com o voo, o avião e o aeroporto (W1) | 2026-11-14 |
| v2 | a agenda da folga (os próximos serviços em linhas) | o próximo serviço numa linha com o dia (B3/F2); a lista vive na Escala | 2026-11-13 |
| v2 | os avisos como linha por baixo do estado e a pílula vermelha no canto | os avisos como cartões (âmbar "!" / vermelho "✕"); "A escala mudou" com o quê e quando (E2) | 2026-11-13 · 2026-11-14 |
| v2 | a tabela numérica de prioridades | a precedência do `crewState` e a ordem da folha (secção 3.4) | 2026-11-14 |
| v2 | o tema noturno com o "candeeiro" | a paleta `CARD.night` na véspera e na pernoita (até ao modo noite N3) | 2026-11-11 |

---

## 9 · Onde está cada coisa

| O quê | Onde | Golden |
|---|---|---|
| O estado | `data/crewState.js` | `test:crewstate` |
| O que vai para onde (topo, cartões, porquê) | `data/homeCards.js` | `test:homecards` |
| O desenho do Início | `components/HomeCards.js` (`HomeTop`, `BigCard`, `Slim`, `Checks`, `Changes`, `Voice`) | `test:design` (o guardião) |
| A folha da Prova | `components/ProvaSheet.js` · `data/prova.js` | `test:prova` · `test:citacoes` |
| A frase da folga | `data/stateVoice.js` | `test:voice` |
| O voo, o avião, o aeroporto | `data/flightStatus.js` · `data/flightDelay.js` | `test:flightstatus` |
| As alterações da escala | `data/rosterDiff.js` | `test:diff` |
| Todos os estados desenhados a partir do código | `design/estados-todos.html` (`node scripts/render-estados.js`) | — |
| O visual (tokens, peças, a cor) | `docs/design-system.md` §14 | — |
| O movimento | `docs/motion-design-system.md` · a mudança de estado: `hooks/useStateShift.js` + `components/HomeCards.js` (`GiantLine`) | `test:design` (o contrato dos movimentos reduzidos) |
| As guias | `docs/guias.md` | — |
| O guião de teste no iPhone | `docs/verificacao-device.md` ("testar os estados") — **por pôr em dia com a v3** | — |

**Os esboços que mandam** (em `design/`, com o README): `inicio-cartoes.html` (a direção 3.0) · `estados-topo.html` + `estados-s2.html`
(o título) · `cartoes-e3.html` + `cartoes-limite.html` (o cartão do voo e o limite) · `a-seguir-b3.html` (o próximo serviço) ·
`cores-decisoes.html` (G1 · O2 · S2) · `calma-uau.html` (W1) · `escala-mudou.html` (E2) · `folga-1-2.html` (F2) · `voz.html` (V2) ·
`topo-porque-2.html` (Q3) · `mudanca-estado.html` (M2) · `modo-noite.html` (N3, por construir).

---

## 10 · Por fazer

- **O modo noite N3** (a seguir o claro/escuro do iPhone) — a base do tema da app inteira.
- **Tocar em "Avião"** na verificação para a linha da folga do avião (a W2 de `calma-uau.html`).
- **A guia de três balões do Início** (proposta em `docs/guias.md`).
- **Pôr em dia o guião `docs/verificacao-device.md`** com os estados e as peças desta versão.
- **Ver no iPhone** tudo o que é de 2026-11-13 e 2026-11-14 (a lista está em `docs/decisoes.md`, "Ver no iPhone").

---

*v1 · 2026-07-03 · decidido peça a peça (a pele tipográfica). v2 · 2026-07-08 · alinhado com a construção (o FAB, a navegação
estática, o motor `crewState`). v3 · 2026-11-14 · reescrita a partir do código do Início 3.0 "cartões de cor": o título do estado, o
cartão do voo, a cor (G1 · O2 · S2), a calma verificada (W1), as alterações da escala (E2), a folga 1 + 2 (F2), a voz (V2), o porquê dos
números (Q3) e a regra "só o calendário". No mesmo dia, a mudança de estado animada (M2, o painel de partidas).*
