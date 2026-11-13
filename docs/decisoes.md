# CrewPact — Decisões e pendências

Ficheiro vivo. Cada sessão acaba a atualizá-lo (regra 3 do método). As entradas mais recentes em cima.
A história anterior a novembro de 2026 vive na memória do Claude e nos docs de `docs/`; aqui fica o
ponto de situação consolidado a partir de 2 de novembro de 2026.

---

## O QUE FALTA (ler isto primeiro · lista única · atualizada 2026-11-13)

Uma linha por pendência; o pormenor está na entrada indicada entre parênteses (as entradas ficam abaixo, como histórico).
Quando uma coisa se fizer, sai daqui. **Regra do Nuno: "a lei é que manda"** — sem um facto, "incerto" com o que falta; nunca
um valor inventado. A auditoria dos cálculos (blocos 1 a 8b, 300 achados) está feita: `docs/auditoria-calculos.md`.

**Ordem de trabalho (decisão do Nuno, 2026-11-12): uma companhia de cada vez, a easyJet primeiro.** As outras ficam na
app como "em breve" (visíveis, sem acesso) e fazem-se depois, uma a uma. **O lançamento para o mercado só acontece com as
companhias todas prontas.** Até lá, o que é só da TAP, da Hi Fly ou da Ryanair não entra na fila: fica anotado para a vez
delas. Pormenor na entrada "Uma companhia de cada vez", abaixo.

**O NOVO ACORDO DOS PILOTOS DA EASYJET — FEITO a 2026-11-13 (Fable 5.2, sessão própria; gravado no ramo `calculos-repouso-2`, commit `93aea15`, sem push).** É o BTE n.º 29, de
8 de agosto de 2026 (p. 124–156), assinado a 26 de junho de 2026, válido até 31 de janeiro de 2029. Está no motor
(`ae/easyjetSpac.js`), com o de 2023 na linha do tempo; a app deixou de dizer "AE expirado". A lista do que muda, artigo a
artigo, e o que o texto não fecha: `docs/ae-easyjet-pilotos-2026.md`. Pormenor na entrada de 2026-11-13, abaixo.
**O que ficou por fazer deste acordo:**
- **Ver no iPhone:** "Quanto recebo?" e os Números de novembro de 2026 (FO 12/12: base 5 059,26 €; setor nominal 45,60 €;
  paragem noturna 91,20 €; em novembro o subsídio de Natal 5 059,26 €), um mês de 2025 (não pode ter mudado), o contrato
  "Escala fixa 4-4" nas listas do Perfil e da entrada, a Biblioteca (o link abre o BTE n.º 29) e a Prova do per diem.
- **Rubricas novas — já na soma do mês (2.ª parte da sessão, pedida pelo Nuno: "como manda a lei"):** voo doméstico (+ 1 setor
  por aterragem, no per diem; em Portugal certo, no mesmo país estrangeiro só como máximo), turnaround planeado de 90
  minutos ou mais (pelas horas das pernas), SOC e EXPD (evento novo, 2 setores) e LTC (papel novo no voo, 0,33 setor por
  dia). **Ficam de fora, à espera de um dado no perfil:** o acréscimo à base de LTC / TRI / TRE (12,5 / 15 / 17,5 %), o
  comando a 90 %, a recência de inverno (1 %) e a formação longa do 4-4 a 100 %.
- **SNC reforçado (240 €, de abril a outubro) — a lei faz depender de um facto** (a estabilidade de escala do ano
  financeiro encerrado, que a easyJet comunica). O motor já lê o facto (`sncEnhanced`: ativo → 240 €; não ativo → 60 €; por
  saber → 60 € certos, até 240 €) e o detetor já conta as alterações entre 48 e 120 horas quando o regime está ativo.
  **Falta só a pergunta no Perfil** ("O regime reforçado do SNC está ativo em 2026?": sim / não / não sei), a guardar por
  ano e a passar aos cálculos — entra no layout do Perfil. Até lá fica "por saber".
- **Férias:** o acordo não diz em que ano de férias os dias novos começam (27 no 12/12). Até 31 de março de 2027 a app
  conta os do acordo de 2023 e o motor guarda os novos como máximo (`vacationRange`); desde 1 de abril de 2027 conta os
  novos. O máximo e a nota (`VAC_NOTE`; inclui os 18 dias do contrato 8/4 antigo de Faro) ainda não aparecem em nenhum ecrã.
- **DDO / IDO / WFLY a tempo parcial:** o motor dá o certo (a base do contrato) e o máximo (a base a tempo completo:
  `widoMax`, e `max` nos extras do mês); nenhum ecrã mostra o máximo.
- **Só do 4-4 e do comando, por fazer:** o dia RESF dentro da 1.ª folga paga WIDO (Art. 60.º, n.º 10); a formação de mais
  de 4 dias paga 100 % da base (n.os 13 e 14); a promoção a comandante a 90 % (Art. 36.º, n.º 4).
- **Fevereiro a junho de 2026:** a app põe os valores novos no próprio mês; a empresa pagou-os depois, como retroativos.
  O detetor do dinheiro esquecido pode acusar uma falta que já foi paga.
- **Em janeiro de 2027:** pôr o IPC de 2026 (média de 12 meses até dezembro, INE) em `IPC_2027`; até lá os meses desde
  fevereiro de 2027 contam com os valores de 2026 e os Números dizem que falta o IPC.
- **Quando sair a separata do Diário da República**, trocar o link da Biblioteca (hoje aponta para o boletim completo).
- **Para o advogado:** as dúvidas do ponto 8 de `docs/ae-easyjet-pilotos-2026.md` (a 11.ª, a data legal de entrada em vigor, ficou fechada pela lei: artigos 478.º e 519.º do Código do Trabalho, agora em `fontes/pt/`). A questão antiga "DDO/IDO/WFLY:
  a base do contrato ou a da tabela?" continua aberta: o Anexo novo diz "full time FRV", o articulado diz "proporcional".

**SESSÃO SEGUINTE (pedida pelo Nuno a 2026-11-13) — AS REFERÊNCIAS DE LAYOUT E O RESTO DAS PÁGINAS (Opus 5.5, Extra, sessão
própria; é design, não cálculo).** O Nuno pôs em `referencias/Para a app/` 57 imagens (54 JPG e 3 GIF) que escolheu como
referência para o layout das páginas que faltam e para o sistema de desenho. **Enunciado:**
- **Regra do Nuno (2026-11-13): uma só app.** O Início já está feito na direção 3.0 "cartões de cor" (esboço
  `design/inicio-cartoes.html`, regras em `docs/design-system.md` §14, código em `components/HomeCards.js` e
  `data/homeCards.js`). **Essa é a linguagem da app toda.** As imagens servem para a enriquecer e para resolver as páginas
  que faltam DENTRO dela; não trazem um estilo novo. O que se aproveitar de uma imagem traduz-se para os tokens e os
  componentes que já existem (`CARD`, `TXT3`, `TXT`, `SPACE`, `IconButton`, `SheetHeader`, `Porta`); o que só funcionar
  com outro estilo fica de fora, e diz-se porquê. Teste de cada página: posta ao lado do Início, parece a mesma app?
  Um elemento novo (um cartão, um gráfico, um ícone, um movimento) entra primeiro no sistema de desenho, e só depois nas páginas.
- **1 · Ver as imagens uma a uma** (todas; não por amostra) e escrever, para cada uma: o que é (ecrã, componente, ícone,
  animação), o que se pode aproveitar na CrewPact e onde (que página, que componente, que parte do sistema de desenho:
  cor, letra, espaço, cartões, listas, gráficos, ícones, estados vazios, movimento), e o que não serve e porquê. Os GIF
  são movimento: ver com a skill `animacoes`. A referência é inspiração: não se copiam imagens, textos nem marcas.
- **2 · Um índice em `referencias/Para a app/README.md`** (o índice é versionado; as imagens não vão para o GitHub — o
  `.gitignore` já deixa de fora `.jpg`; juntar `.gif` e conferir a maiúscula `.JPG`).
- **3 · Propor o que entra no sistema de desenho** (`docs/design-system.md` §14, direção 3.0 "cartões de cor") e em que
  páginas, por ordem; o Nuno escolhe. Só depois o esboço de cada página, uma de cada vez, com o "sim" antes de construir.
- **4 · As páginas levam consigo o que falta do acordo dos pilotos** (lista de cima): no Perfil, a pergunta do SNC
  reforçado e a qualificação de formação (LTC / TRI / TRE); nos Números, no Início e nos Extras, o "certo e máximo" (SNC,
  DDO/IDO/WFLY a tempo parcial, voo doméstico no estrangeiro); nas férias, o intervalo e a nota; e o "Incerto" (ponto 2 abaixo).
- **Não mexer** nos cálculos nessa sessão: o que for número novo volta ao Fable, com golden primeiro.
- **Estado (2026-11-13, sessão de layout, Opus 5.5):** passo 1 feito e aprovado (as 57 vistas uma a uma, os GIF em
  fotogramas); passo 2 feito: índice `referencias/Para a app/README.md` (a 3416(1) é duplicada da 3416; faltam na pasta
  3427, 3437, 3446, 3458, 3459), ligado de `referencias/README.md`; `.gitignore` com maiúsculas e `.gif` (neste PC o
  `.JPG` só ficava de fora pelo `core.ignorecase`). **Passo 3 escolhido pelo Nuno ("sim"):** A1–A4, B1–B4, B7–B12,
  M1–M4 e a B10 com as cores da origem — escrito em `docs/design-system.md` §14, "Peças escolhidas a 2026-11-13"; B5, B6
  e B13 para depois. Medido ao escrever: o neutro da B10 sobre a folha dá 1,15 (a base desaparece) — resolve-se no esboço
  dos Números. **A Escala:** referências escolhidas (Clue, Qantas, Natural AI, Fi, Weather Channel — em
  `referencias/escala/`, ronda 3, e na coleção do Mobbin); **esboço APROVADO pelo Nuno ("sim", 2026-11-13):**
  `design/escala-cartoes.html` (6 estados medidos; o dia dobrado em mês — régua + uma linha por serviço — e aberto na
  semana; o acerto 9), com as três propostas: a perna com as horas grandes (§14 B2 já corrigido); o iPhone pequeno abre
  na semana; o bloco junta só a rotação com pernoita fora e as férias seguidas. `escala-v3` arquivado.
  **A Escala 3.0 (cartões) esteve no código (2026-11-13) e foi substituída no mesmo dia pela agenda (abaixo):** `data/escalaDay.js` (puro: as células, a
  ordem pela hora, os intervalos do motor só no par certo, a régua, as linhas e os cartões; golden novo `npm run
  test:escala`, 61 casos, no `npm test`) · `components/DayRuler.js` (B3) · `components/HomeCards.js` ganhou as pernas no
  cartão grande (B2) e o toque longo na linha fina · `screens/EscalaScreen.js` refeito (a lógica ficou: importação, SNC,
  pega, mudar de mês, folhas) · token `TXT3.month`. `npm test` verde, guardião sem dívida nova, pacote iOS gera.
  **Acerto 9 corrigido:** os serviços pela hora; a linha entre serviços só com o intervalo do motor atribuído ao par certo
  (o motor ordena pelo report e filtra os intervalos à volta de uma assistência — o ecrã antigo cruzava-os pela posição e
  inventava "repouso ✓" quando faltava um). **Diferenças ao esboço, de propósito:** a Escala fica sempre de dia (a barra de
  abas só escurece no Início; o estado 5 do esboço espera pela noite da app toda) · a pílula entre serviços só aparece com
  o dia aberto (dobrado não cabe) · as pernas mostram-se todas (sai o "+ N setores") · apagar um serviço manual vive no
  Detalhe (sai da folha) · a WOCL desenha-se só num voo que começa na base (o motor não guarda a WOCL no registo do dia; a
  régua usa a constante e o relógio do report) · as janelas (ler a escala, escolher mês) seguem a 2.0 até migrarem.
  **Ver no iPhone:** o mês com as cores e os blocos (3–4, rotações, férias) · tocar num dia e puxar a pega (dobrado →
  aberto) · um dia com assistência e voo chamado (pela hora, sem linha) · um repartido (a pílula com o intervalo) · um
  LIS → BCN com pernoita (a régua acaba no relógio do report; a Zulu na perna) · um voo que passa a meia-noite (o resto no
  dia seguinte) · a WOCL num report antes das 06:00 · um mês sem escala (o estado vazio) · o iPhone pequeno abre na semana
  · a legenda · o VoiceOver numa célula, na régua e na pernoita (toque longo = editar).
  **1.ª foto do iPhone (2026-11-13, 17:31) — corrigido:** a folha do dia não chegava às bordas e os cartões ficavam cortados
  dos dois lados (a zona de deslizar tinha a margem de 16 e cortava a folha; a margem passou para cada peça) · "hoje 2
  serviços" → "hoje · 2 serviços". Bateu certo: blocos 3–4, hoje com contorno, régua (assistência 09–15, voo desde as 18:00,
  o "agora" às 17:31, "acaba às 04:30 de sábado"), as linhas finas. **Por escolher pelo Nuno:** a marca dos dois serviços
  no dia (a 2.ª camada parecia do dia de baixo) — três esboços em `design/escala-dois-servicos.html` (A camada agarrada, já no
  código · B faixa de duas cores · C dois pontos — recomendo C). **Regra nova do Nuno: sempre três esboços para escolher.**
  **O Nuno escolheu C** (dois pontos) — já no código (`cellTwo`, `dots`; a legenda tem "2 serviços no dia"). **E disse: "não
  estou a gostar do layout da página escala. faz 3 novos"** → `design/escala-layouts.html` (Mobbin primeiro): **A · Agenda**
  (o topo do Início com "11 serviços" e os factos; a escala em lista desde hoje; folgas numa linha; a grelha num botão) ·
  **B · O dia em foco** (a tira da semana com as células; o dia aberto por baixo; o mês no título) · **C · O mês em
  miniatura** (os três números, o mês pequeno só com cor, a lista dos dias com serviço). Recomendo A. **O Nuno gosta da A**
  e mandou 9 imagens de `referencias/Para a app/` (3439, 3450–3452, 3454, 3456, 3457, 3460, 3461) → três variantes da A em
  `design/escala-agenda.html`: **A1** o ano em meses (3439: cada mês com o n.º de serviços; o atual com contorno; sem escala a
  tracejado) · **A2** acordeão (3450–3452: hoje aberto, os outros dias numa barra de 52 pt da cor do tipo) · **A3** o mês
  inteiro (3457: o que passou apagado, o que não tem escala a tracejado). **ESCOLHIDO pelo Nuno: A2 (acordeão) + o ano em
  meses da A1.** Sobre apagar os dias passados (A3): medido, a transparência de 45 % deixa o texto a 2,35 e o € a 2,07 (pede
  4,5) e esconde o que conta para o dinheiro e os limites → três maneiras sem apagar em `design/escala-passado.html`: **A** só
  a estrutura ("Já feito" + barras iguais, o € à direita) · **B** a data a cinzento fora da barra + ✓ (6,53) · **C** um tom mais
  claro (passa, mas cria dois tons e um "claro" que também diria "incerto"). Recomendei A. **O Nuno quer diferença à vista
  nos dias passados** ("isto tudo é para ser fácil para o utilizador… ver sempre na perspectiva dele") → o mesmo esboço
  refeito com três maneiras COM diferença: **C** tom mais claro · **D** cinzento com um ponto da cor do tipo (o título
  16,03, o € 6,31) · **E** só o contorno. **ESCOLHIDO: D.**
  **A ESCALA EM AGENDA ESTÁ NO CÓDIGO (2026-11-13, por ver no iPhone; gravado no ramo `calculos-repouso-2`, commit `a2cb836`, sem push):** `data/escalaDay.js` ganhou
  `agendaRows` (as linhas da agenda), `yearMonths` (o ano em meses) e `prettyRoute` (LIS-OPO → LIS → OPO) — golden
  `test:escala` 82 casos · `components/DayBar.js` (a barra do dia, o passado em D, a linha das folgas, a coluna da data) ·
  `components/HomeCards.js` · `HomeTop` aceita o topo sem pílula preta e a de contorno como botão (seta ▾ e dica) ·
  `screens/EscalaScreen.js` refeito: o topo do Início ("11 serviços" + pernoitas + per diem), a agenda numa folha (o mês
  corrente abre em "Hoje"), o ano em meses na pílula, a grelha do mês (B1, com os dois pontos) no botão do calendário. A
  lógica ficou (importação, SNC, hotel, ler a escala, folhas). `npm test` verde, guardião sem dívida nova, pacote iOS gera.
  **Diferenças aos esboços, de propósito:** sem pega (nada se arrasta) · os dias vazios no princípio e no fim do que o
  calendário trouxe dizem "Sem serviços na escala", não "Folga" (a app não sabe se é folga) · no ano em meses, todos os meses
  sem dados dizem "sem escala" (o esboço dizia "por sair" em dezembro — a app não sabe quando sai) · nas barras dos dias que
  vêm, os voos dizem "report HH:MM" (o esboço tinha só a hora de partida) · se a fila do topo não couber, sai o "Hoje" e nunca
  a pílula do mês · re-tocar na aba leva a "Hoje" · a régua das 24 h sai da Escala (fica para o Detalhe do serviço).
  **Ver no iPhone:** abrir a Escala (abre em "Hoje", com o "Já feito" por cima ao deslizar para baixo) · os dias feitos a
  cinzento com o ponto de cor e o € · tocar numa barra (abre no sítio; tocar na data fecha) · as folgas tracejadas · tocar em
  "Novembro 2026 ▾" (o ano em meses) e noutro mês · o botão do calendário (a grelha; tocar num dia leva a agenda até ele) ·
  "Hoje" noutro mês · puxar para ler a escala · um mês sem escala (o estado vazio) · o iPhone pequeno · o VoiceOver numa
  barra.
  **Visto no iPhone pelo Nuno (2026-11-13, noite):** os dois pontos dos dois serviços não se percebem; e o mês (o botão do
  calendário) está escondido e sem legendas. → três esboços para cada em `design/escala-acertos.html`: **1A** pílula "2
  serviços" · **1B** a 2.ª linha com o outro serviço ("e Standby Casa · 09:00–15:00") · **1C** hoje e o próximo serviço
  abertos; **2A** botão "Mês" com nome (folha com a grelha e a legenda) · **2B** "Lista | Mês" no topo da folha (B11; a
  legenda debaixo da grelha, acaba 23 pt abaixo do ecrã) · **2C** a semana sempre à vista + "Ver o mês ›". Recomendo 1B + 2B.
  **ESCOLHIDO pelo Nuno: 1B + 2B — JÁ NO CÓDIGO (2026-11-13, por ver no iPhone; gravado no ramo `calculos-repouso-2`, commit `18328be`, sem push).** **1B:** a barra de um dia
  com dois serviços diz o outro por escrito numa 2.ª linha ("e Assistência em casa · 06:00–12:00"; um voo diz "e LIS → OPO ·
  report 18:00"; com três, "· e mais 1"); os dois pontos saem das barras (ficam na grelha, que tem legenda). O título é o
  serviço principal (o voo manda). `agendaRows` ganhou o campo `also` — golden `test:escala` 87 casos. **2B:** "Lista | Mês"
  no topo da folha, com a peça nova `components/Segmented.js` (B11: a pílula de tinta desliza 220 ms; com movimentos
  reduzidos, salta; leitor de ecrã: separadores). O "Mês" mostra a grelha (B1) e, por baixo, a legenda das cores e dos
  símbolos (voo · destino, serviço em terra, férias · baixa, pernoita fora, 2 serviços no dia, rotação seguida, hoje, por
  sincronizar). Tocar num dia volta à lista com esse dia aberto e a lista vai até ele. Saíram o botão do calendário e a folha
  da grelha. Re-tocar na aba, no Mês, volta à lista em "Hoje". **Diferença ao esboço, de propósito:** o Mês não repete o nome
  do mês (já está no topo). Medido: "Lista/Mês" por escolher 5,68 · escolhido 18,42 · texto da legenda 9,94 · a 2.ª linha
  da barra 7,16 (areia) e 6,92 (lilás). `npm test` verde (37), guardião sem dívida nova, pacote iOS gera.
  **Ver no iPhone:** um dia com dois serviços (a 2.ª linha; cabe sem cortar?) · "Lista | Mês" (a pílula desliza) · o Mês
  com a legenda inteira à vista ou a deslizar · tocar num dia do Mês (volta à lista, aberto, no sítio) · re-tocar na aba no
  Mês · outro mês no Mês · o VoiceOver no seletor e na legenda · com movimentos reduzidos.
  **AS CORES DA APP (2026-11-13, pedido do Nuno: "temos que organizar as cores para tudo… pensar no tipo de app").**
  Contado no código: o verde quer dizer dinheiro ganho, dentro do limite, fadiga baixa, "Ligar" e férias (61 sítios); o
  laranja quer dizer perto do limite, falta informação, "Incerto", por sincronizar e folga trabalhada (52); o vermelho quer
  dizer limite ultrapassado, apagar e erro (91) — **e nos Números a barra fica vermelha aos 90 %, antes de passar o limite,
  com a nota a escrever "Amarelo" pintado a laranja** (`StatsScreen.js` `barColor` e `baptismNote`); há quatro paletas a
  conviver (CARD, PELE, PLATE, o amarelo da marca). Medido: areia (voo) × laranja (atenção) ΔE 33, mas 12 com deuteranopia.
  Enquadramento: a gramática do cockpit (CS-25.1322 — vermelho aviso, âmbar cautela, vermelho/âmbar/amarelo limitados fora
  dos alertas; "cockpit escuro"). → Esboço `design/cores.html`: o mapa (base · tipo · estado — dentro sem cor, perto laranja
  + "!", passa vermelho + "✕", incerto neutro tracejado + "?" · dinheiro — verde só no que se ganha · ação — tinta; amarelo
  só no painel ao vivo) e três maneiras: **A** arrumar os sentidos (as cores dos cartões ficam) · **B** frio e quente (voo
  céu `#8DB4DE`, terra lilás claro `#D9CDEB`, repouso salva; voo × atenção passa a ΔE 68 no pior caso; voo × terra desce a
  14, os dois com o nome escrito) · **C** só o estado tem cor. Recomendei B.
  **ESCOLHIDA pelo Nuno: B — e "podes usar todas as cores que existem, caso seja necessário" (2026-11-13). JÁ NO CÓDIGO (por
  ver no iPhone; por gravar):** o mapa no `docs/design-system.md` §14 (antes das páginas) · tokens com nome de tarefa em
  `data/constants.js` (`CARD.flight/ground/rest/alert/stop` + noite; `MONEY` para as páginas 2.0) · o Início, a Escala e a
  régua do dia na B (goldens `test:homecards` 251 e `test:escala` 87 com os nomes novos) · 22 ficheiros 2.0 com os sentidos
  arrumados: verde só no dinheiro (o "dentro", o "Ligar", os escudos, o "Nova", o Face ID "Ligado", o "abrangido", as
  validades válidas passam a tinta) · incerto neutro e tracejado (Detalhe, Simulação) · folga trabalhada sem laranja · fadiga
  nunca vermelha (é risco, não limite) · Números: vermelho só acima de 100 %, perto aos 85 % (a regra do Início), a nota diz
  "Laranja" · radiação vermelha só acima de 20 mSv (o limite; os 6 mSv são classificação → laranja) · o ícone do medidor da
  segurança deixa de ser vermelho. **Guardião:** regra dura nova — o verde da PELE fora de `constants.js` falha (exceção: o
  medidor da palavra-passe). `npm test` verde, pacote iOS gera.
  **O tom (`design/cores.html` §4, procurado em milhares de tons frios e medido): ESCOLHIDO o tom 2** ("vou pelo que
  recomendas") — céu vivo `#6DBEFA` + lilás-rosado `#C3A1BE` (noite `#58AFEC` · `#B592B0`); voo × terra 37 · 31 · 23, voo ×
  atenção 97 · 92 · 80; mantém "lilás = terra". Já nos tokens. (Tom 1, o do esboço: 21 · 19 · 14; tom 3, petróleo: 27 · 27 · 26.)
  **Fica para a migração de cada página:** os laranjas e vermelhos da 2.0 que sobram, revistos um a um; o amarelo da marca
  como sinal de seleção nas páginas 2.0 (`BRAND.signal/marker`, 44 usos).
  **Visto no iPhone pelo Nuno (2026-11-13): no Mês, a coluna do domingo estava vazia** — a largura do dia ((largura − 6
  espaços) / 7) somava, em vírgula flutuante, uma ponta acima da grelha e o 7.º dia saltava para a linha de baixo (medido:
  acontece em iPhones de 375, 402 e 430 pt). Corrigido: a largura arredonda para baixo ao píxel do ecrã (`EscalaScreen`
  `cellW`); cabe em todos os tamanhos. A grelha do ano (percentagens) não tinha o problema.
  **O Mês (2026-11-13, o Nuno: "não estou a gostar dos desenhos dos números, dos quadrados e de como estão pintados" + "a
  parte das legendas, fazer com um atalho ou de outra maneira, alguma animação")** → esboço `design/escala-mes.html` (Mobbin:
  Lifesum, Structured, Flo, MacroFactor, Clue, Weverse, Ultrahuman): os dias — **A** número limpo + etiqueta da cor com o
  destino (pinta um terço do de hoje) · **B** o dia é um círculo (destino pequeno por baixo) · **C** faixas que juntam os dias
  seguidos, sem códigos; a legenda — **L1** botão "Legenda" com cartão por cima da grelha (200 ms) · **L2** pílulas que
  filtram: tocar acende esses dias e esbate os outros (180 ms) · **L3** aberta na 1.ª vez, depois encolhe para o botão
  (320 ms). Movimento só transform/opacity, a grelha nunca salta, reduzido = sem animação (verificado no esboço). Recomendo
  **A + L2**. **À espera da escolha.**
  **Escolhido pelo Nuno: A + L2** — a construir; feita e testada a parte de dados (`monthCells`: `past`, `twoKind`, o voo
  manda na célula como na Lista; `monthLegend` + `cellMatches` para a legenda que filtra; golden `test:escala` 99), o ecrã em
  pausa (por gravar). **A seguir o Nuno pensou em tirar a Lista da aba** ("se meto só a aparecer o mês… quando carregasse no
  número, abrir e aparecer o dia como a lista, e por baixo… como se fosse o ver tudo" + uma imagem com uma fila de ícones
  redondos que trocam o conteúdo no mesmo sítio) → esboço `design/escala-so-mes.html` (o dia A, L2, a fila de ícones com o
  nome no escolhido e contadores laranja só quando há alguma coisa): **1** o mês encolhe para a semana · **2** o dia numa folha
  por cima do mês · **3** o topo dá lugar. Medido (390 × 844, o número grande no tamanho do `fitGiant`): só a **1** mostra sem
  deslizar a semana, o 1.º cartão e os ícones (o dia começa a 345 pt); na 2 os ícones ficam meio escondidos até puxar a folha;
  na 3 a semana do dia sai de vista. Recomendo **1**. Na imagem fica de fora o degradé com vidro (A4), o avatar e os
  contadores vermelhos. **ESCOLHIDA pelo Nuno: a 1** ("gosto da 1 — achas que faz sentido?"). A minha resposta: faz, com uma
  perda — ler a semana de seguida (a Lista lia "sábado report 09:40, terça 08:00…" sem tocar) — e três condições, já no esboço:
  **deslizar no dia aberto** muda para o seguinte/anterior (folgas incluídas; a semana acompanha) · **os seis ícones com o
  nome por baixo** (a lição dos dois pontinhos; medido: cabem em 366 pt) · a aba **abre no mês fechado** e re-tocar em
  "Escala" volta ao mês; e a secção que abre depende do dia (Limites num dia que vem, Dinheiro num dia feito; o Hotel leva o
  contador com pernoita sem hotel). **E a aba ligada da imagem** (o Nuno: "gosto do ícone ter o seguimento da página… ao
  carregar noutro ele cola no outro"): o ícone escolhido assenta numa aba da mesma cor do painel, com curvas para dentro onde
  o encontra; ao tocar noutro, a aba desliza até ele (240 ms; reduzido = salta). Verificado no esboço: a aba centrada no ícone,
  as pontas sem curva de fora, o deslizar com o rato (13 → 14 → 13), o dia 11 (feito) abre no Dinheiro. **Medido com os nomes:**
  num dia de um serviço os ícones veem-se inteiros (sobram 135–165 pt do painel); num dia cheio (13: assistência + voo +
  pernoita) a fila fica 29 pt abaixo do ecrã. Proposta: o cartão "Pernoita" passa para dentro do ícone Hotel (repetia-o; o
  contador avisa que falta o hotel) — ganha ~60 pt. **APROVADA pelo Nuno ("aprovo e leva a pernoita para dentro do hotel"),
  com as cores da foto: os seis círculos do mesmo neutro da aba e do painel; o escolhido não muda de cor — está ligado pela aba
  e leva um anel fino de tinta.** A pernoita: sai o cartão à parte; fica a lua e "pernoita no Porto" no cartão do voo, e o
  hotel, o repouso até ao report de volta e o contador no ícone Hotel (o Início mantém o cartão salva da pernoita). Medido: no
  dia 13 a fila de ícones fica inteira à vista e sobram 26 pt do painel. **A construir.**
  **Em construção (2026-11-13, por gravar, em pausa):** o corpo do Detalhe separado (`DutyDetailBody` em
  `screens/DutyDetailScreen.js`: sem `section` = o ecrã de sempre; com `section` = só essa parte) · o "Partilhar" numa função
  comum (`data/shareLeg.js`, também no Início) · a Escala só com o mês (desenho A, L2, a semana, o dia; **por serviço**, como o
  Nuno pediu: "carregar em cada serviço e aparecer tudo o que é desse serviço" — a fila de ícones e o painel abrem por baixo da
  linha do serviço tocado). Compila (pacote iOS) e os goldens passam; não visto no iPhone. **Em pausa porque o Nuno perguntou,
  com franqueza, se o tripulante prefere o mês ou a lista** — a minha resposta: os dois no mesmo ecrã (o mês em cima como
  mapa, a lista por baixo com as horas), não um só nem um seletor. **"sim faz"** → esboço `design/escala-mes-lista.html`:
  o mês (A, L2) em cima e a lista por baixo; tocar num dia do mês leva a lista até ele e abre-o; tocar num serviço abre por baixo
  dele tudo o que é desse serviço (os seis ícones com a aba ligada). Três maneiras para o mês ao deslizar — **A** fica sempre
  (o topo numa linha; medido: ~3 dias de lista à vista, 235 pt) · **B** o mês dá lugar à semana fixa (o topo do Início e o mês
  em repouso, só ~1 linha de lista; a deslizar, a semana do dia lido fica fixa e a lista ganha ~614 pt; os dias feitos numa
  linha que se abre) · **C** a semana, e o mês num toque (~8 dias à vista, 519 pt). Recomendo **B** (abrir no mês; afinar no
  iPhone se abre já em "Hoje"). **O Nuno: "podemos ir para o B, mas não achas que está muito confuso?"** — sim: três resumos
  da mesma coisa (o número gigante, o mês, a lista), a cor em dobro, seis ícones a misturar ler com fazer, coisas que mudam
  sozinhas e gestos a disputar o dedo. → esboço `design/escala-b-simples.html`, três níveis de corte: **S1** só o topo (o resumo
  numa linha) · **S2** e a lista calma (linhas brancas com uma faixa da cor; a cor fica no mês) · **S3** tudo (quatro secções —
  Horas, Limites, Dinheiro, Hotel — e "Partilhar o voo" / "Está errado?" em botões no fim do painel). Medido: a lista sobe de
  679 para 556 pt (~205 pt à vista ao abrir, antes 82); blocos de cor em repouso 15 → 13 (a cor está no mês), a ler a lista
  8 → 2. E nos três: deslizar para o lado muda de mês só na grelha. Recomendo **S3**.
  **DECIDIDO pelo Nuno (2026-11-13): "quero que apareça só o mês, e ao carregar no dia abra… um modal com o que tem do dia",
  com voltar ao mês, deslizar para o dia seguinte/anterior, e dentro do dia, com mais de um serviço, tocar e abrir o "ver
  tudo" — que é TUDO o que cada serviço tinha no antigo "Ver tudo" (horário, FTL · Segurança, completar, outros serviços do
  dia, pagamento, pernoita…); sem a fila de ícones nem a aba ligada. Escolhida a janela que recomendei ("avança já").**
  **JÁ NO CÓDIGO (por ver no iPhone; por gravar):** `screens/EscalaScreen.js` — só o mês (o dia A, `monthCells`; a legenda que
  filtra L2, `monthLegend`/`cellMatches`, 180 ms; deslizar para o lado EM CIMA DA GRELHA muda de mês) · tocar num dia abre a
  JANELA nativa do iPhone (`Modal` `presentationStyle="pageSheet"`: sobe até quase ao topo, o mês espreita por trás, puxar para
  baixo fecha) com o cabeçalho (o dia · "hoje" · quantos serviços; ‹ › e ✕ à direita), uma linha por serviço pela hora (a
  pernoita vai na linha do voo) e, no serviço aberto — o único do dia, ou o que se tocar; tocar noutro troca, no aberto fecha —
  o corpo do Detalhe inteiro desse serviço (`DutyDetailBody` com `embedded`: tudo menos o herói; a pílula FTL fica; os outros
  serviços do dia trocam o aberto). Na janela, deslizar para o lado muda de dia (sai 140 ms · entra 200 ms; reduzido = troca
  logo; passa de mês na ponta). "Hoje" (noutro mês) abre hoje; voltar do Detalhe depois de editar abre o dia. A agenda (Lista) e
  o "Lista | Mês" saíram da aba (o `Segmented` fica para os Números). O ecrã do Detalhe continua para os outros caminhos
  (Início, notificações). `data/shareLeg.js` (o "Partilhar" do Início numa função pura). `npm test` verde, guardião sem dívida
  nova, pacote iOS gera.
  **Ver no iPhone:** o mês (o dia A: número limpo + etiqueta; os dias feitos com o ponto; a legenda a filtrar) · deslizar na
  grelha muda de mês · tocar num dia: a janela sobe, o mês por trás · um dia com um serviço (abre já com o Detalhe) e um com
  dois (tocar em cada um) · deslizar para o lado na janela (folgas incluídas; passar de novembro para dezembro) · ‹ › e ✕ ·
  puxar para baixo fecha · dentro do Detalhe: completar um dado, "o calendário está errado?", o hotel (as folhas por cima da
  janela) · VoiceOver na grelha e no cabeçalho. **O esboço que manda:** `design/escala-janela.html` (feito depois de construída, igual ao código).
  **Gravado no ramo `calculos-repouso-2`, commit `e47557e`, sem push.**
  **O "Ver tudo" no layout novo (o Nuno: "o ver tudo está com o layout novo?" — não, era a 2.0):** esboço `design/detalhe-3.html`,
  o mesmo conteúdo e a mesma ordem em três desenhos 3.0, com as peças das imagens do Nuno (`referencias/Para a app/`, §14: B2 a
  perna, B3 a régua das 24 h, B9 a barra do limite, A1 os cêntimos, A2 o ↗ só para fora, B7 a linha com o tipo, M1 a
  continuidade pela cor) e o Mobbin (Qantas, American, Delta, Gojek, Wanderlog, Booking): **A** cartões por tema (a linha fica;
  as pernas no cartão "Horário") · **B** o voo em destaque (o serviço tocado cresce para o cartão de cor com a perna B2; os
  Limites primeiro, com o PSV na barra B9) · **C** lista agrupada (os Ajustes do iPhone). Recomendo **B**. Medido: o "Ver tudo"
  de um voo ocupa 1565 / 1627 / 1134 pt (a janela mostra ~714 — desliza-se nas três). **ESCOLHIDA pelo Nuno: B. JÁ NO CÓDIGO
  (por ver no iPhone; gravado e ENVIADO para o GitHub no ramo `calculos-repouso-2`, commit `8b5c2df`, a 2026-11-13 — o push levou
  os 10 commits que estavam só neste PC, incluindo o acordo dos pilotos `93aea15`):** `DutyDetailBody` no 3.0 — o cartão de cor do serviço (o `dayCards` aberto: todas as pernas
  com a faixa do voo, as duas horas grandes, ✈ e a duração, a Zulu quando difere, o tempo no solo; **DH marcado na faixa**, que o
  cartão não marcava — `components/HomeCards.js` · `Legs`) · os cartões neutros: **Limites · FTL** (o PSV na barra B9 com o que
  falta e as duas pontas quando a lei não fecha; o estado numa linha; calços até às, PSV máximo, repouso mínimo, fadiga, os
  "incertos", os limites do acordo da TAP) · **Completar** (o aviso no laranja; antes do Horário quando falta um dado) ·
  **Horário** (a régua B3 com o dia todo; apresentação, calços, fim, horas) · **Pernoita** (o hotel com "Mapas ↗" e "Ligar"; ou
  guardá-lo) · **Pagamento** (as parcelas e o total com os cêntimos pequenos, só sem intervalos) · **Outros serviços** (a linha
  com o tipo, B7) · "o calendário está errado?" (a linha fina neutra) · apagar (manuais) e as notas. O ecrã do Detalhe (do
  Início) passa à folha branca com o ‹ e sem a faixa lateral PeleSide; as janelas (completar, correção, hotel) seguem a 2.0 até
  migrarem. Na Escala, a linha tocada é substituída pelo cartão de cor (tocar nele fecha). Guardião: −5 na dívida (linha de base
  baixada). `npm test` verde, pacote iOS gera.
  **Ver no iPhone:** abrir um voo de duas pernas (as duas pernas, o tempo no solo) e um com DH · um incerto (a barra com as duas
  pontas) · um que passa (a barra a vermelho) · completar um dado · guardar o hotel e "Mapas ↗" · o total do pagamento · os
  outros serviços (troca o aberto) · o ecrã do Detalhe vindo do Início.
  **Depois (2026-11-13, noite), o Nuno: "gostava do que tivemos — ao carregar no dia, o mês subia para a semana e apareciam os
  serviços" (prefere-o à janela) + "não estou a gostar de como os dias do mês aparecem, em círculos e as cores; vê outros".** →
  esboço `design/escala-semana.html` (o gesto de volta: tocar num dia encolhe o mês para a semana e o dia vem por baixo; ‹ ›,
  deslizar, ✕; tocar num serviço abre o "Ver tudo" B) com três desenhos do dia sem círculos, das imagens 3405 · 3406 · 3462 e
  do Mobbin (Binance, Jobber, Outlook, Google Calendar, Todoist): **Q1** quadrado neutro com o destino e uma fita fina na cor do
  tipo (o hoje um quadrado preto; o mês 356 pt) · **Q2** quadrado cheio num tom suave (céu `#DCEFFD`, lilás `#F0E6EF`; tinta
  ≥ 15:1, mas só 1,2:1 contra a folha) · **Q3** o dia escrito, destino + hora do report (o mês 507 pt; letra 9,5–10, abaixo do
  mínimo de 11). Legenda em pílulas com contagem que filtra (3406). Recomendo **Q1**. **Corrigido o gesto, a seguir (o Nuno: "subia
  um modal, ou assim… e ficava a semana em cima"):** tocar num dia recolhe o topo grande, o mês fica só na semana desse dia e
  **sobe uma folha com pega logo por baixo** (6 pt), com o dia e os serviços; tocar noutro dia da semana troca o dia; ‹ › e
  deslizar mudam de dia (e de semana); a pega ou o ✕ descem a folha (320/300 ms; reduzido = salta).
  **O Nuno perguntou se o tripulante prefere a lista (a A de `escala-layouts.html`) ao mês.** A minha resposta: depende da
  pergunta (a hora do report → lista; folgas, onde dorme, como é o mês, trocas → mês); o "agora e a seguir" já está no Início,
  por isso a Escala é o mês; o que o mês perde (ler os próximos dias seguidos com as horas) vai para o "A seguir" do Início.
  Disse com franqueza que não sou tripulante e propus um teste de 5 min com 2–3 tripulantes.
  **ESCOLHIDO pelo Nuno: "fica o mês. Q1" — JÁ NO CÓDIGO (2026-11-13, por ver no iPhone; gravado e enviado no ramo `calculos-repouso-2`, commit `014afe6`):** `screens/EscalaScreen.js`
  — o dia Q1 (56 pt, `RADIUS.sm`; neutro com o número a 15 e o destino; a fita de 5 pt: a cor do tipo, dois serviços em duas
  (o outro ~31 % à esquerda, um fio entre os dois), a rotação junta as fitas por cima do espaço (os cantos de baixo do lado da
  junção ficam retos), férias e baixa a tracejado, feito = fita `C.round` e número cinzento; hoje = quadrado a tinta, o
  escolhido um contorno). **Tocar num dia:** `HomeTop` ganhou `compact` (só a fila das pílulas), o mês fica só na semana do
  dia, em cima, e sobe a folha do dia por baixo (`Animated` translateY, 320 ms a subir · 300 ms a descer, sem animação com
  movimentos reduzidos; sombra `SHADOW.sm` virada para cima). Na folha: pega (toque = voltar ao mês), o cabeçalho de sempre
  (‹ › ✕), as linhas e o "Ver tudo" B. Tocar noutro dia da semana troca o dia; tocar no dia aberto fecha; **deslizar na semana
  muda de semana** (acrescento meu, o mesmo dia 7 dias depois/antes); **puxar a folha para baixo pela pega ou pelo cabeçalho
  fecha** (como fazia a janela nativa; abaixo de 90 pt ou depressa); tocar num dia a meio da descida faz a folha voltar a subir.
  Saiu a janela `pageSheet` (`Modal`). A legenda das cores (L2) mantém-se; a amostra das férias passou a tracejada. `npm test`
  verde (37), guardião sem dívida nova, `test:escala` 99, pacote iOS gera. **Por fazer:** o botão de voltar do Android não fecha
  a folha (a janela fechava; Android não está montado).
  **Ver no iPhone:** o mês na Q1 (a fita, dois serviços, a rotação junta, férias a tracejado, os dias feitos, hoje a tinta) ·
  tocar num dia (o topo recolhe, a semana em cima, a folha sobe sem saltos) · tocar noutro dia da semana · deslizar na folha
  (dia), na semana (semana) e na grelha (mês) · puxar a folha para baixo e largar a meio (volta) ou em baixo (fecha) · a pega e
  o ✕ · re-tocar na aba com a folha aberta · abrir um serviço e deslizar dentro dele · com movimentos reduzidos · VoiceOver.
  **Os próximos dias no Início (pedido na mesma escolha):** esboço `design/inicio-a-seguir.html` (Mobbin: Outlook, Google
  Calendar, Runna, Structured, Partiful, Polarsteps), dentro das regras do Início (dois cartões grandes, nada se repete, sem
  lista de linhas), em dois estados: **A** dentro do cartão "A seguir", três dias por baixo de um fio (folgas e férias seguidas
  juntam-se) · **B** a semana em quadrados Q1 com a hora do report · **C** cartões pequenos que deslizam. Medido (390 × 844):
  antes do report só a A cabe (sobram 7 pt; B faltam 51, C 59); na folga cabem as três (A 97, B 53, C 46). Recomendei **A**.
  **ESCOLHIDA pelo Nuno: C** ("na A não dá para distinguir esses dias" — os dias herdam a cor do cartão onde estão; antes do
  report a folga, a assistência e a formação ficavam a salva, a cor do repouso: contrariava o mapa das cores). Aceite que antes
  do report a fila fica abaixo da dobra (a folha do Início já desliza; o 1.º cartão vê-se inteiro). **JÁ NO CÓDIGO (por ver no
  iPhone; por gravar), com os três acertos:** título "Próximos dias" (não repete o "A seguir"), cartões de 132 × ≥ 84 pt, até 7
  dias depois de hoje. `data/homeCards.js` — entradas `ahead` (os 7 dias: serviços pela hora + ausência) e `aheadLast` (o último
  dia da escala), saída `{ t:'days' }`: começa depois do que os cartões dizem (o serviço do topo, o seguinte e o que um cartão
  abra), junta folgas, férias e baixa seguidas ("seg 16–17 · 2 dias"), acaba no último dia da escala (vazio depois disso não é
  folga), o 2.º serviço por escrito ("e Standby Casa 09:00"), ida e volta ("LIS → FNC" + "ida e volta"); só com alguma coisa
  além de folgas; não nas férias, baixa, fecho nem configuração; é o último da folha. Golden `test:homecards` 251 → 262.
  `components/HomeCards.js` · `Days` (a fila sai das margens; folga/férias a tracejado sem cor; "Escala ›" abre a Escala).
  `screens/HomeScreen.js` dá os dias (`brief` + `orderServices`); tocar num cartão abre o dia na Escala com a folha subida
  (`escalaDay` → `flashDuty`). `npm test` verde, guardião sem dívida nova, pacote iOS gera.
  **RETIRADO no mesmo dia (o Nuno: "acho que devíamos retirar isto do início"; concordei):** contrariava a regra do Início que
  ele aprovou ("o essencial e dois ou três factos"; "a lista vive na Escala"), ficava abaixo da dobra no estado mais cheio, e a
  Escala já o cobre (tocar num dia abre a folha; deslizar passa de dia). Saiu tudo: `homeCards` (`ahead`/`days`), os 11 casos do
  golden (volta a 251), `Days` em `HomeCards.js` e os dias do `HomeScreen` — esses ficheiros estão iguais ao último commit; só
  fica o `HomeTop compact` da Escala. O esboço `design/inicio-a-seguir.html` fica como registo. Perda aceite: as horas da semana
  só na Escala (um toque por dia).
  **Depois (gravado e enviado em `014afe6`), o Nuno mandou quatro imagens de calendários e perguntou qual serve o mês.** A minha
  resposta: o pocket cal (já é a base da Q1); dos círculos nada (não cabe "LGW" + lua); do "Dec Jan" o título do mês com o
  seguinte a espreitar; do pocket cal a contagem nas pílulas → esboço `design/escala-mes-acertos.html` (Q1 como está · R1 contagem
  · R2 título com o seguinte a espreitar · R3 meses seguidos). **A meio, o Nuno mudou o gesto: "sem subir a folha; aparecer só
  os serviços, e carregando num serviço é que pode abrir uma folha" + "os serviços a aparecer por baixo dos dias do mês, quando
  está selecionado o dia".** Concordei (é o calendário do iPhone e o "Dec Jan"; separa o leve — o dia — do pesado — o serviço),
  com uma condição: caber (topo ~300 + mês 356). → esboço `design/escala-dia-por-baixo.html`: o mês inteiro, o dia escolhido
  com contorno, os serviços por baixo da grelha (no lugar da legenda; ✕ ou tocar outra vez no dia volta à legenda), tocar num
  serviço abre a folha do serviço (o "Ver tudo"; ✕, a pega ou tocar fora fecham). **V1** o topo recolhe ao escolher um dia ·
  **V2** a folha desliza sozinha · **V3** sem o número grande ("Novembro Dezembro" na folha + os números numa linha). Medido
  (390 × 844, o dia 13 com 2 serviços): V1 os 2 à vista, sem deslizar, 6 de 6 semanas · V2 desliza 93 pt, 4 de 6 semanas · V3
  desliza 8 pt, 6 de 6. Recomendei **V1**. **ESCOLHIDA pelo Nuno: V1** — e, com uma imagem (task tracking), "os números podem ser
  em círculos; a linha do círculo pode ser pintada com os serviços, ou o interior; 2 serviços = duas cores, 3 = três, 1 = uma".
  Notas minhas: antes recusou os círculos cinzentos todos iguais — aqui só os dias com serviço têm cor; a cor é a do TIPO (dois
  voos = duas fatias céu com um fio branco); na app desenha-se com o `react-native-svg` que já existe (ícones). → esboço
  `design/escala-circulos.html` (o 18 com 3 serviços): **A** o anel com as cores + o destino por baixo · **B** o interior com as
  cores + o destino · **C** só o anel, sem o destino (a lua no anel). Medido: o 13 (2 serviços) à vista sem deslizar e o mês
  inteiro nos três; o 18 (3) mostra 2 de 3 na A e na B (o 3.º a um pequeno deslize), 3 de 3 na C. Recomendo **A**. Fica de fora
  a rotação junta (os círculos não se ligam). **E a legenda** (o Nuno: "pode estar melhor organizada; mete todas as que existem"):
  no mesmo esboço, 2.ª fila com o círculo A — os 11 sinais, também os que não há no mês (a baixa com 0, mais clara), em quatro
  grupos: Serviços (voo · terra · 2 ou mais) · Ausências (férias · baixa) · No dia (pernoita · por sincronizar) — estes filtram e
  contam — e Os dias (hoje · feito · escolhido · folga), que só explicam; a amostra é o próprio sinal do mês. **L1** em grupos,
  tudo à vista (285 pt; desliza-se 225 até ela) · **L2** uma fila a deslizar (9 de 11 escondidos para o lado) · **L3** um cartão
  "Legenda" em duas colunas (352 pt). Recomendei **L1**. **ESCOLHIDO pelo Nuno: o círculo A; a legenda não — "vê outras opções,
  pesquisa".** Mobbin (calendar key, legendas de calendário, folhas que explicam sinais) → esboço `design/escala-legenda.html`:
  **N1** a chave numa folha (por baixo do mês uma linha "Legenda ›", 64 pt; a folha com uma semana de amostra e os 11 sinais, cada
  um com uma frase e quantos dias tem; tocar acende esses dias e uma pílula preta por cima do mês diz o que está aceso — Fitbit
  "Calendar key", Cal AI "Ring Colors Explained", Strava) · **N2** pequena por baixo do mês, sem caixas, uma linha por grupo (163 pt;
  WHOOP, Ultrahuman) · **N3** o botão ⓘ em cima da grelha que abre um cartão por cima do mês (30 pt; o mês desce 36; Stardust,
  Peerspace). Recomendei **N1**. **O Nuno: "faz tudo menos a legenda ainda; quero mais opções das legendas".**
  **JÁ NO CÓDIGO (2026-11-13, por ver no iPhone; gravado e enviado em `4ed88f5`):** `screens/EscalaScreen.js` — **o círculo A** (react-native-svg, já
  na app pelos ícones: o anel de 38 pt com uma fatia por serviço pela hora — `orderServices` —, na cor do tipo; fio de 5° entre
  fatias; feito = `CARD.rule`; férias/baixa = anel tracejado; hoje = disco a tinta por dentro; escolhido = anel de tinta por fora;
  ponto laranja no anel; o destino e a lua por baixo; a rotação já não se junta) · **a V1**: o mês fica sempre inteiro; tocar num
  dia recolhe o topo (`HomeTop compact`, com LayoutAnimation 260 ms) e põe por baixo da grelha, no lugar da legenda, o cabeçalho
  do dia (✕) e as linhas dos serviços; a folha desliza o mínimo para os mostrar (só desce); escolher um dia repõe o filtro da
  legenda; tocar numa linha abre a **folha do serviço** (`Modal pageSheet`: o título do serviço, o dia, ✕ e o `DutyDetailBody`;
  "outros serviços" troca o serviço na folha; apagar fecha tudo). Saíram a semana sozinha, a folha do dia que subia, ‹ ›, os
  deslizes do dia e da semana. **A legenda NÃO mudou** (pedido do Nuno): continua a L2 (pílulas sem contagem) e as amostras ainda
  são as etiquetas antigas — fica para a escolha. `npm test` verde (37), guardião sem dívida nova, `test:escala` 99, pacote iOS gera.
  **Ver no iPhone:** os anéis (1, 2 e 3 serviços; dois voos no mesmo dia), hoje, feito, férias, o ponto · tocar num dia (o topo
  recolhe sem saltos; os serviços à vista) · tocar noutro dia · ✕ e re-tocar na aba · a folha do serviço (abrir, "outros
  serviços", puxar para baixo) · deslizar o mês para o lado · movimentos reduzidos · VoiceOver.
  **Mais legendas** → esboço `design/escala-legenda-2.html` (Mobbin): **M1** o mês num anel (o resumo por tipo de dia é a legenda:
  anel grande com voo 13 · terra 3 · férias e baixa 2 · folga 12, as linhas acendem; os outros sinais numa linha e "Legenda
  completa" — Buddy, Starling, Plum) · **M2** a legenda guiada (na 1.ª vez, 6 balões sobre os dias verdadeiros; depois "Rever a
  legenda" — Turo, Clue) · **M3** "Mostrar no mês" (um botão abre a folha com cada tipo, a explicação e uma caixa — Partiful).
  Recomendei **M1**. **O Nuno: "gosto da M2"** — avisei que a M2 não tem o filtro (acender os dias) — **e logo a seguir: "fazer
  junção com mais alguma? gosto que esteja no início, mas depois ter outra opção".** → esboço `design/escala-legenda-3.html`: na
  1.ª vez a guiada (os balões sobre os dias verdadeiros; o último ensina a tocar num dia, por isso substitui a dica "Toca num
  dia"); depois **J1** a chave numa folha (N1; a folha ganha "Ver no meu mês", que repete os balões) · **J2** o mês num anel (M1;
  "Rever" e "Legenda completa") · **J3** a pequena por baixo (N2; "Rever a legenda no meu mês"). Recomendo **J2** (responde a
  "quantas folgas tenho?" e acende os dias). Na app, os dias que os balões apontam escolhem-se dos dados do mês (um por sinal que
  exista no mês; só os que existem) — vai para `data/escalaDay.js` com golden. **ESCOLHIDA pelo Nuno: J3** ("eu gosto"; concordei:
  a guiada ensina no próprio mês, a pequena fica completa e acende com um toque; ~165 pt só com o mês em repouso). **E as guias
  para a app toda** (o Nuno: "gosto desses guias para a app toda, na 1.ª vez… mas onde faz sentido"; aprovou as regras e a
  Escala como piloto) → regras e sítios em `docs/guias.md`.
  **JÁ NO CÓDIGO (2026-11-13, por ver no iPhone; gravado e enviado em `4ed88f5`):** `data/escalaDay.js` · `legendTour` (um balão por sinal que exista no
  mês, num dia que vem e nunca hoje; ordem voo · terra · 2 ou mais · pernoita · por sincronizar · férias e baixa · feito, no máximo
  5; no fim "A tinta: hoje. Toca num dia…" sobre hoje) e `legendGroups` (os 4 grupos com todos os sinais; os que não há a 0) —
  golden `test:escala` 99 → 111, escrito antes · `components/GuideBubble.js` (o balão das guias, uma peça só) · `EscalaScreen`:
  a guiada na 1.ª vez com escala (depois das boas-vindas; chave `cp_tour_escala_<uid>`; conta como vista ao acabar, saltar, tocar
  num dia, mudar de mês ou sair da aba; o dia acende com um anel largo; a folha desliza para o balão; o VoiceOver lê-o) — saiu a
  dica "Toca num dia" (`Tip`) · a legenda pequena (uma linha por grupo; amostras = o sinal do mês em SVG; tocar acende, 0 = mais
  claro e não toca; "Os dias" só explicam; "Rever a legenda no meu mês"). `npm test` verde (37), guardião sem dívida nova, pacote
  iOS gera. **Ver no iPhone:** a 1.ª vez (apagar `cp_tour_escala_<uid>` para repetir) — os balões no sítio certo, a seta no dia,
  "Saltar", "Já percebi", o VoiceOver · "Rever a legenda" · a legenda pequena (acender, os 0) · o balão nas duas últimas semanas
  (por cima do dia).
  **Depois (por gravar), o Nuno: "os dias que já passaram deixa as cores normais no mês"** e, a seguir, também o número e o
  destino ("sim, tira") — **os dias feitos ficam iguais aos outros** (substitui a escolha D de antes, "diferença à vista no
  passado"). "Feito" deixou de ser um sinal: saiu da legenda ("Os dias" = Hoje · Escolhido · Folga) e da guiada (o Nuno apanhou
  que a legenda ainda o mostrava). Golden escrito antes: `test:escala` 112. O VoiceOver continua a dizer "feito". Guardião sem
  dívida nova, pacote iOS gera.
  **Ver no iPhone:** o Início (voo a céu, assistência a lilás, o aviso laranja com "!") · a Escala (barras, legenda do Mês, os
  dias feitos com o ponto azul) · o Detalhe de um serviço dentro (sem verde), incerto (pílula tracejada) e com fadiga · os
  Números (barras a tinta, laranja aos 85 %) · as Validades.
  Visto de passagem (de antes): o onboarding diz "brevemente" e o Perfil "Em breve" (i18n
  `onb.soon` existe mas o `OnboardingScreen` escreve à mão) — acertar quando o Perfil e a entrada migrarem.

**O que se faz a seguir (combinado com o Nuno a 2026-11-12, noite):**
1. **Fechar o ramo dos cálculos — a função única está FEITA (2026-11-12, sessão em Fable 5.2; entrada "A série de
   assistências num só sítio", abaixo).** A assistência antes de um voo lê-se de `ftl/standbySeries.js`; o PSV e o repouso
   leem dela. Os 13 casos da 3.ª revisão estão corrigidos, e a 4.ª revisão independente está feita: a propriedade "várias
   entradas = entrada única" confirmada pelos dois revisores (cerca de 25 000 escalas deles, 0 diferenças); o que
   encontraram ficou corrigido, salvo o que está na lista abaixo. As três dúvidas que ficaram (P3, as duas assistências
   no mesmo dia, R8) fecharam-se pela regra do Nuno — "a lei é que está certa" — e estão na entrada. A **5.ª passagem**
   (só sobre o que ninguém tinha revisto) também está feita: nenhum "dentro" nem "certo" falso vindo das correções; o que
   apanhou ficou corrigido. Gravado no ramo `calculos-repouso-2` (commit `8f4bcfb`, mais o dos três pontos da lista que o
   Nuno mandou corrigir) e **passado ao `main` a 2026-11-12**, com push. **Visto no iPhone a 2026-11-13** (grupo 1,
   1.ª linha); o motor está na versão 21. As correções da 5.ª passagem e as dos três pontos têm teste
   mas não foram, elas próprias, revistas por outro. **Quando parar de rever:** quando uma revisão já não encontrar nenhum "dentro" ou "certo" falso num
   cenário que um tripulante da easyJet possa mesmo ter; o resto fica escrito na lista.
2. **Decidir uma vez como se mostra um "Incerto"** (sistema de desenho): onde vai o motivo, quantas linhas, se abre uma
   folha com o texto inteiro, a cor — e o cartão que falta no Início. Foi o que falhou em todas as fotos do iPhone.
3. **Layout, um ecrã de cada vez, na linguagem do Início:** Escala (grelha e folha do dia), Detalhe do serviço, folha de
   importação, e os restantes. Mobbin primeiro e o "sim" do Nuno antes de construir. Os nove acertos vistos no iPhone
   entram como requisito do ecrã a que pertencem (não se remendam antes no desenho antigo: não há utilizadores).
   Sessões em Opus 5.5 (Extra para ecrã novo). O Início ainda não está todo: faltam a disrupção, o aterrado, a hora Zulu,
   o iPhone pequeno, a altura das linhas do número e o movimento.

### 0. Repouso — o que ficou depois da verificação de 2026-11-12 (ramo `calculos-repouso-2`)
A verificação está feita e os dois pontos maiores estão corrigidos (entradas "Verificação do repouso" e "A lei não olha
para a data", "Como diz a lei", "Revisão independente das correções de hoje" e "2.ª revisão independente", abaixo). O
motor está na versão **21**. **O que falta, por ordem:**
1. **Os ecrãs** (grupo 2, 1.ª linha: nove acertos vistos no iPhone; sessão em Opus 5.5). Os que escondem informação
   primeiro: o motivo do "Incerto" cortado no Detalhe e na importação, o veredicto tapado num dia alterado, a linha verde
   "Repouso ✓" inventada na Escala.
2. **Assistência e voo: a app não diz as duas coisas juntas.** Com a assistência a acabar antes da apresentação e o PSV
   entre o máximo reduzido e o inteiro, "Dentro dos limites?" e "Tenho descanso?" dizem os dois "incerto" — mas o dia
   está fora em qualquer leitura (com chamada excede o PSV; sem chamada o repouso é curto). O texto do PSV já o diz; falta
   um veredicto que junte as duas perguntas. (As 16 h de assistência ficaram decididas a 2026-11-12: "Não", com o motivo
   das duas leituras — entrada "Revisão independente", no fim.)
3. **(Para a vez de quem usar reserva.) A reserva entre um serviço e o PSV:** o repouso mede-se através dela ("certo" com 13 h quase todas em reserva), mas a
   reserva não é repouso (ORO.FTL.105(21)) e a FAQ 47645 só fala da reserva sem atribuição. Devia ser "incerto" quando nem
   antes nem depois da reserva há um repouso inteiro. Nenhuma companhia da app usa reserva hoje: pode esperar.
4. **(Para a vez da TAP.) Lei portuguesa — é o DL 25/2022, não o 139/2004** (revogado; `fontes/pt/dl-25-2022.txt`). Só para operadores com
   estabelecimento principal em Portugal (TAP, Hi Fly): o repouso a seguir a um PSV que excedeu os limites aumenta o
   DOBRO do excesso (art. 9.º, b)); o repartido tem condições a mais (art. 8.º); 7 folgas por mês e 96 por ano (art. 11.º,
   n.º 2 — é o "diploma por confirmar" do D11 de `docs/ae-tap-limites.md`). Nada disto está no motor. Entra com a TAP.
5. **Menores:** dois serviços que NÃO são assistência em casa (voo, escritório, assistência no aeroporto) com menos do
   que o mínimo entre eles continuam a ler-se de forma diferente no mesmo dia (um só período de serviço, julga-o o PSV do
   dia) e de um dia para o outro ("curto") — um repartido que passa a meia-noite sai "curto"; o
   `lastArrivalBefore` da aclimatação erra com dados incompletos (uma formação com a rota de um só aeroporto, ou um
   regresso sem apresentação no próprio dia); um serviço sem fim seguido de outro sem apresentação: o Início diz "sem
   dados" e a Simulação "incerto"; depois de a assistência começar, o Início já não mostra o repouso do voo chamado
   durante ela (passa ao serviço seguinte). As noites locais "incertas" sem limite
   de tempo ficam como estão (nenhum texto dá um limite); dois VOOS com as horas sobrepostas no mesmo dia continuam a ler-se como "23 h de repouso"
   entre eles (já era assim; tentei juntá-los e dava pior — revisão independente); com várias bifurcações seguidas
   só se veem as leituras "todas com chamada", "nenhuma" e "só a última"; o motivo mostrado num incerto que junta duas
   leituras pode não ser o exato; o registo dos dias demora mais num ano de escala (128 ms contra 75; sem mudanças 9 ms
   contra 1,5). A app não julga o tempo livre antes de um serviço que não é PSV (FAQ 47610; DL 25/2022, art.
   11.º, n.º 1).
- **No iPhone:** os passos do grupo 1 (as três primeiras linhas) e o passo 16 de `docs/verificacao-calendario.md`, com o
  calendário sintético — por fazer.
   **Das revisões independentes (2.ª a 4.ª), por corrigir — todos "dentro" ou "certo" a mais em cenários raros, já eram
   assim:** (PSV) o serviço no aeroporto SEM alojamento da véspera não se junta ao voo do dia seguinte (21:00–00:00 e voo
   às 00:00: "dentro" com 9:00, são 12:00 desde as 21:00); a assistência seguida de OUTRO serviço (escritório,
   posicionamento sem rota, serviço no aeroporto) e só depois do voo não reduz o PSV; com dois voos no mesmo bloco, cada um com a sua assistência, só conta a do 1.º; o PSV não vê a leitura "chamado na assistência ANTERIOR" quando há duas
   com tempo livre (o repouso vê, e diz "incerto"); um voo sem pernas que passa a noite da mudança de hora mede-se pelo
   relógio. (Repouso) o motivo das 16 h mostra as horas da série inteira e falta quando a assistência vem colada a outra;
   "Repouso até" depois de uma assistência no aeroporto com voo durante ela conta do fim notificado e o "Tenho descanso?"
   do fim do voo; a noite de 25/10 na hora repetida; assistência no aeroporto com dois voos durante ela dá "curto" no 2.º;
   depois de uma assistência (em casa ou no aeroporto) o veredicto passa de "incerto" a "curto" quando o repouso cresce para
   lá do mínimo simples e o mínimo verdadeiro é maior (131 casos em 177 760 na prova "nunca piora"); um voo sem apresentação antes de duas assistências com tempo livre
   dá "curto" sem ver a leitura da 1.ª. **A mais (lado seguro):** voo e escritório
   horas depois no mesmo dia contam o tempo livre do meio para o 210; "escritório cedo + voo de noite" com 10 h ou mais
   pelo meio, lido como um PSV só, passa as 24 h e a conta dá a volta. **Limite da regra da série:** uma entrada de
   assistência que comece depois de uma chamada mas ainda dentro das horas da assistência anterior lê-se como o resto
   dessa (que acabou na apresentação), não como uma assistência nova; uma entrada das 06:00 às 06:00 lê-se como 24 h.
   O repouso com assistências demora cerca do dobro.
- **Sem revisão independente:** as correções feitas depois da 4.ª revisão (lista na entrada de 2026-11-12, "A série de
  assistências num só sítio").
- Gravado e no `main` (2026-11-12); a versão do motor (20) recalcula o registo dos dias no telemóvel.

### 1. Ver no iPhone (conta de teste: easyJet, piloto)
- **Números, novembro — visto ✅ a 2026-11-13:** 9 voos, 43,1 h, os períodos do ORO.FTL.210 e o "1 curto · 2 incertos"
  batem com o motor. **Por decidir pela lei (pergunta nova, fica para o advogado / EASA):** "60 duty hours in any 7
  consecutive days" (ORO.FTL.210(a)) — o texto não diz se os "dias" são dias locais das 00:00 (a única definição que o
  Regulamento dá, ORO.FTL.105(15), e a que a app usa) ou quaisquer 168 horas seguidas; nenhuma FAQ da EASA o esclarece
  (página das FAQ do ORO.FTL consultada a 2026-11-13). A diferença só aparece perto do limite: um período de 168 h a
  começar a meio do dia pode somar mais do que qualquer período de 7 dias locais. A app conta por dias locais e mostra o
  mais carregado dos períodos que contêm o serviço de hoje (o que acaba hoje e o que acaba amanhã, se passa a meia-noite).
- **A série de assistências — visto ✅ a 2026-11-13 (motor v21):** os sete cenários do passo 17 de
  `docs/verificacao-calendario.md` batem (importação e Detalhe). Dessa sessão saíram, já corrigidos e vistos: o motivo do
  "Incerto" e dos "Dois máximos" em texto inteiro no Detalhe; a linha "Assistência antes do voo" a dizer de onde vem a
  redução do máximo; "Da escala · hh:mm" no Completar; o motivo inteiro e sem repetir a palavra na folha de importação;
  o "Split duty" falso entre uma assistência e um voo na folha do dia. **Início, visto ✅:** assistência 09:00–15:00 e voo
  com apresentação às 18:00 no mesmo dia → "Incerto" e "limites incertos · falta se o voo te foi atribuído durante a
  assistência…", sem "repouso cumprido" nem "curto"; corrigido e visto: o cartão "A seguir" mostra o serviço seguinte do
  MESMO dia (saltava para outro dia) e um voo sem apresentação mostra a hora de partida. **Para o desenho do "Incerto"
  (grupo 2):** no Início o motivo corta às duas linhas ("…assistência de ante…") e o topo diz "Incerto · PSV até" sem as
  duas horas. Ficou por ver: os Números de um mês com assistências depois do recálculo.
- **Sessão de 2026-11-11 — visto ✅:** Perfil "Na … desde" com a coluna do dia (os 6 pontos); Escala sem toque longo; Detalhe
  do serviço só de leitura com "do calendário", secção Completar, "Tocou numa folga?" com WFLY + DDO, "O calendário está
  errado?" → horas reais. **Retomar no bloco 3** (dinheiro): Números de um mês SEM serviços (o bloco do dinheiro com a base e, por
  baixo, "Sem escala neste mês" + "Ir para a Escala"); Início "Quanto recebo?" e cartão do mês com o Natal; Números de
  novembro (linha Subsídios, cêntimos) e do ano (férias + Natal, % das 900 h); o mês da entrada (Perfil → novembro de 2026 com
  o dia em "—" → base "incerto"; com o dia 5 → um valor; repor a data).
- **A regra sem exceção (2026-11-12 — nada visto no iPhone):** assistência em casa 14:00–22:00 e voo às 04:00 do dia
  seguinte → "Incerto · 6:00 (mín 12:00)" com o texto da chamada; prolongado, assistência em casa e voo 12 h depois →
  "Incerto (mín. entre 12:00 e 18:00)"; prolongado, escritório e voo 14 h depois → "Incerto (mín. entre 12:00 e 18:00)";
  os textos cabem.
- **Correções da 5.ª revisão do repouso (2026-11-12 — nada visto no iPhone):** com eventos sintéticos — voo com fuso
  (LIS→EWR), assistência no hotel e voo de volta: "Tenho descanso?" sem "noites locais na base" e o "Repouso até" a 10 h ou
  14 h; regresso de EWR, assistência em casa no dia seguinte e voo no outro: "Não · 1 de 2 noites locais na base";
  prolongado, assistência em casa, e ver o cartão do repouso depois dela com as duas pontas ("mín. 16 h–18 h", "no
  máximo", "cumprido entre … e …" — cabe em duas linhas num iPhone pequeno?), o topo da pernoita com "Incerto" e a
  Simulação com "16:00 a 18:00"; um voo sem apresentação,
  assistência em casa e voo: "Incerto — falta a hora de apresentação do serviço de …"; o texto novo do prolongado depois
  de uma assistência ("aumenta 2 h … senão aumenta 4 h") cabe no cartão.
- **Repouso depois do prolongamento, assistência em casa, Estatísticas, partir um serviço em dois, 2 repousos reduzidos
  (2026-11-12, noite, 11 — nada visto no iPhone):** passos 13 a 15 de `docs/verificacao-calendario.md` — Detalhe de um serviço
  com 10 h ou mais em terra entre pernas: "Horas das pernas" com as duas saídas ("As horas estão erradas" / "As horas estão
  certas: são dois serviços") e a apresentação do 2.º; "Tenho descanso?" depois de 14 h de assistência em casa com 13 h de
  repouso ("Sim"; antes "Não"); Números → Corpo com "N curtos · M incertos".
- **Repouso reduzido, assistência + voo, mudança de hora e horas das pernas no Detalhe (2026-11-11, noite, 10 — nada visto no
  iPhone):** passos 10 a 12 de `docs/verificacao-calendario.md` — Detalhe de um serviço com as pernas a não bater certo:
  secção Completar com "Horas das pernas · Não batem certo" em primeiro, a folha com a partida e a chegada de cada perna,
  gravar só quando batem; "Tenho descanso?" com 12 h 30 depois de um serviço de 13 h ("Incerto · 12:30 (mín 13:00)" e o texto
  do repouso reduzido); assistência em casa + voo 10 h 30 depois ("incerto", com o repouso antes da apresentação).
- **Dois serviços no mesmo dia com 10 a 12 h entre eles (2026-11-11, noite, 9 — nada visto no iPhone):** passo 9 de
  `docs/verificacao-calendario.md` — na Escala, a linha entre os dois diz "Incerto · 10:00 entre serviços (mín 12:00 base) →
  serviço repartido ou repouso curto"; no Detalhe e no Início o PSV fica "incerto" (não "excede"), com o que falta.
- **Pernas que não batem certo e perna do meio (2026-11-11, noite, 8 — nada visto no iPhone):** passos 7 e 8 de
  `docs/verificacao-calendario.md` — a volta a sair antes de a ida chegar → o dia ENTRA com "Incerto — falta saber as horas
  certas das pernas… · toca para corrigir", corrigir → o aviso sai; sem corrigir, o dia conta e o Detalhe e o Início dizem
  "incerto" com o máximo do Quadro 2; a pausa pela meia-noite entra sem aviso; mudar só a chegada do 1.º voo de um dia já
  importado → "Perna 1 …→…".
- **Importação e formulário (2026-11-11, nada visto no iPhone):** folha de importação com "Incerto — parte de LIS, mas o
  serviço de 10/3 acabou em LGW" (calendário sintético: pernoita fora e o serviço seguinte a partir da base); corrigir um
  candidato "a corrigir" e ver os avisos dos OUTROS dias mudar; Simulação com Detetar de duas pernas pela meia-noite (a rota
  não inverte) e de um voo com fusos diferentes (Block e Duty hours pelo tempo decorrido); "Registar as horas reais" num voo
  que acaba noutro fuso; corrigir um candidato de um dia que já tinha papel ou alojamento guardados (a correção abre com
  eles; apagar um e confirmar que sai).
- **Detalhe do serviço (v2), o que falta:** a hora REAL ao lado da prevista; repartido sem alojamento (Incerto → Completar →
  folha das 3 opções); cabine com a apresentação dos pilotos; "Faltou um dado" (só aparece num serviço sem apresentação); dia
  com 2 serviços (o 2.º abre o seu Detalhe); DH ("DH ·" e sign-off derivado); estadia de 2 noites; "não se aplica — sem
  setores" (2026-11-08 Editar saiu · BLOCO 4 · BLOCO 6 · BLOCO 1).
- **Início:** "Dentro dos limites?" com 5 setores na 2.ª noite seguida ("Não — 5 setores em noites seguidas") e com uma reserva
  pelo meio ("Incerto"); "Registar o sign-off" → horas reais; serviço noturno pela meia-noite; "incerto" e "dentro, com prolongamento";
  "Tenho descanso?"/"Repouso até"; baixa (conta TAP e conta de cabine, "dia N do episódio"); 9/3 com "incerto"; fecho de novembro
  com o Natal; limites com DH antes, 2 voos no dia e assistência antes; "o que registaste está válido"; repouso depois de um
  repartido; folga sem nada marcado; disrupção e aviso de RDP (precisa de um atraso real); barra de baixo de dia e de noite;
  iPhone pequeno, letra grande, VoiceOver (2026-11-08 · 8b · A LEI É QUE MANDA · BLOCOS 1–7 · 2026-11-02/04).
- **Limites TAP cabine:** com um voo entre fusos pela meia-noite, o "agora" do mês/trimestre/ano e o gráfico dos 7 dias pela
  leitura maior; trimestre com assistência em casa E a hora local — "Entre X e Y" com os dois motivos (2026-11-08 C34).
- **Escala:** sem toque longo, "Ver" nos serviços extra; conta TAP cabine com um voo dos Açores pela meia-noite; alerta de SNC
  com o texto longo (2026-11-08 · BLOCO 7).
- **Simulação:** duas noites com uma folga pelo meio; dia livre e dia com serviço; "Quanto falta aos limites?"; resultado em
  poster; validades (AVSEC a cair num sábado; validades num serviço futuro) (2026-11-08 Os 4 · BLOCO 2 · BLOCO 3).
- **Importação:** o calendário sintético do guião (repartido de 7 h, DH antes e depois, HSBY + voo, dia inteiro com horas,
  formação de 3 dias, aviso ⚠, repouso curto); reimportar com sign-off ("relidos", sem SNC); apagar e reimportar a doença de
  teste; formulário de correção (comandante instrutor, voo depois da meia-noite → DDO/IDO); validades (BLOCO 4 · 5 · 6 · 3).
- **TAP (2026-11-11):** uma rotação de longo curso com as horas das pernas — os dias de A/AC1 e de B/AC2 pela hora de Lisboa
  (Escala, Detalhe, Números); assistência lá fora depois do voo sem apagar a estadia; registar um cancelamento tardio (cabine) e
  uma baixa (o "Quanto recebo?" com a base incerta e o motivo); piloto com menos de 5 dias de per diem (linha Extras com a
  prestação complementar). **easyJet:** Completar → "Tocou numa folga?" com WFLY + DDO e WFLY + IDO; uma formação fora da base
  entre dois posicionamentos (3 noites na cabine); Números de um ano com mudança de companhia (subsídios da antiga e a saída).
- **Números, Estatísticas, "Quanto recebo?":** Natal proporcional da cabine easyJet com "baixa de mais de 30 dias (Cl. 86.ª,
  n.º 2)"; % das 900 h e "faltam h:mm"; meses de 2024/25 e antes de fev-2024; "Extras do
  mês"; subsídios (junho, novembro, abril, 14/14); conta TAP piloto e cabine com o motivo do incerto (BLOCO 1 · 5 · 6 · 8b).
- **Relatórios, Prova, Biblioteca:** o rótulo "Registo pessoal" cabe; PDF 245, CSV, logbook; Prova do PSV, standby e radiação;
  Biblioteca (bónus, ADTY, FTL, valor horário TAP) (8b · BLOCO 1 · BLOCO 7 · 2026-11-08).
- **Disrupção:** 2 alterações ao mesmo serviço (1 candidato); o visto longo cabe; cabine com repouso a bordo e diferença de
  apresentação; repartido com sala (BLOCO 5 · BLOCO 7 · 8b).
- **Perfil e contas:** a coluna do dia no ONBOARDING (no Perfil já foi vista); "Abrangido pelo AE" grava e repõe; TAP piloto (anuidades, formação) e TAP cabine (VS, chefia, tempo
  parcial); configuração (§0c, §0f), Perfil e Família (§0e), linha do tempo (§0g), limites TAP (§0h, kit de longo curso §0i);
  entrada (reenviar código, código errado, palavra-passe, mudar e-mail); reset de palavra-passe e reativar conta apagada; janelas
  com o cabeçalho novo (8b · BLOCO 6 · 2026-11-02/03 · `docs/verificacao-device.md`).
- **Guiões completos:** passeio fino (Prova, Auditoria do mês, radiação, relatórios, SNC/RDP, morph da pílula, Desfazer, marcos,
  hotéis v2); "testar o calendário"; duas contas (quem vê o quê), modo avião, permissões, cópias de segurança (2026-11-02 Ponto
  de situação · `docs/05-verificacao.md`).

### 2. Acertos de código por fazer
- **Ecrãs — o que as fotos do iPhone de 2026-11-12 mostraram (por fazer; são acertos de ecrã: sessão em Opus 5.5):**
  (1) Detalhe do serviço, linha "Incerto": o texto do que falta fica numa só linha e corta ("falta a hora a que a empresa
  te contactou durant…"); o 2.º motivo nunca aparece e a palavra "Incerto" à esquerda desaparece. Com um texto comprido a
  etiqueta da esquerda também se parte ("PS" / "V"). (2) Detalhe: com três aeroportos no título (LIS → TFS → LIS) o título
  fica por cima do número grande cinzento. (3) Detalhe: "FDP realizado" e "PSV máx (FDP)" misturam as duas siglas.
  (4) Detalhe: a etiqueta vertical "VOO · EZY1001" entra na zona da barra de estado — confirmar se é de propósito.
  (5) Detalhe de um voo sem apresentação: a etiqueta diz "SEM DADOS DE FIM" e o que falta é a apresentação. (6) Folha de
  importação: num dia ALTERADO a linha da alteração ocupa o lugar do veredicto — um dia que mudou e passou a exceder entra
  com visto verde e sem "⚠"/"Incerto" (erro silencioso); e chama "On-block" à hora de fim de uma assistência. Num dia
  NOVO a linha do veredicto aparece mas corta às duas linhas ("⚠ repouso antes 9:30 de 12:00 — curto se o voo já estava na
  e…": a 2.ª hipótese, a das 16 h, nunca se lê), e o dia fica com visto verde e "1 prontas" ao lado do "⚠". (7) Início
  3.0: uma resposta "Incerto" (repouso ou limites) não tem cartão — só o primeiro "Não" aparece. Decisão de desenho.
  (9) Escala, folha do dia: quando a assistência se junta ao voo (chamada), a linha entre os dois serviços diz "Repouso
  entre serviços ·  (mín  base) ✓" a verde, com os números em branco — um repouso inventado (`EscalaScreen.js`: sem
  intervalo calculado cai num "repouso ✓" de recurso); e os serviços aparecem pela ordem em que foram guardados (o voo das
  11:00 antes da assistência das 06:00), não pela hora.
  (8) Importação: uma apresentação nas notas a mais de 6 h da partida, no mesmo dia, é aceite (a regra das 6 h só se
  aplica quando a hora cai na véspera): `RP 00:00` num voo das 19:00 deu um PSV de 19 h. Por corrigir com teste (`test:calendar`).
  Visto e certo: o alerta de SNC com o texto longo cabe; a folha de importação diz "⚠ repouso antes 9:30 de 12:00 — curto
  se o voo já estava na e…" no caso das 16 h (os números certos, o texto cortado); o Detalhe do voo depois de uma assistência mostra "Incerto",
  máximo 07:30–11:30 e "Calços até às (garantido) 23:30", como o motor calcula.
- **Companhias "em breve" (2026-11-12, por fazer; tarefa própria, depois de fechar o ramo do repouso):** no onboarding e
  no Perfil só a easyJet se pode escolher; as outras aparecem como "em breve" (não escondidas: quem não vê a sua companhia
  escolhe outra e recebe números errados). O bloqueio fica no catálogo `airlines` da base de dados (abrir uma companhia é
  mudar um valor, sem versão nova da app) — por confirmar como o onboarding lê o catálogo. O código da TAP não se apaga e
  os testes continuam a correr. Mexe em ecrãs: referências do Mobbin primeiro. Por decidir nessa altura: quem veio de
  outra companhia (proposta: deixa pôr a companhia anterior, sem contas de dinheiro nesses meses) e o que acontece às
  contas de teste que já têm TAP.
- **Repouso — o que as correções da 5.ª revisão deixaram (2026-11-12; ramo `calculos-repouso-2`, por gravar e por passar
  ao `main`):** as leituras que a lei não fecha — a assistência em casa, as horas a mais de um voo depois de uma
  assistência ou de um serviço em terra, as noites locais, a chamada durante a assistência — vão para a ANAC e para a
  pergunta aos sindicatos (o esquema de cada companhia, ORO.FTL.225(f)(3)): com a resposta, os "incertos" passam a certos;
  um serviço sem apresentação DENTRO de uma rotação não entra na conta das noites locais (só fecha a rotação se acabar
  na base); o texto do "incerto" do repouso seguinte diz "o repouso anterior ficou abaixo do mínimo" mesmo quando só
  ficou numa das leituras (`ux-copy`).
- **Repouso depois de uma assistência em casa sem chamada — falta o que diz cada companhia (2026-11-11):** a lei não diz
  por que serviço se mede (ORO.FTL.225(f)(3): fixa-o o esquema da companhia) e a app dá "incerto" entre o piso e o mínimo do
  último serviço. Pedir a frase do OM-A da easyJet e da TAP (SPAC/SNPVAC, ou um tripulante) → regra por companhia.
- **Repouso — o que a 4.ª revisão deixou (2026-11-11):** dois serviços com a MESMA hora de apresentação, ou um dentro do
  outro (dados sobrepostos): o "anterior" é o que começa por último, não o que acaba por último — Início, Simulação e
  Estatísticas concordam mas podem medir o repouso do serviço errado (junta-se ao caso dos serviços sobrepostos, abaixo);
  um serviço só com a hora de partida, ou sem horas, não interrompe a recuperação; um serviço sem apresentação que acaba
  depois da meia-noite a menos de 10 h do voo seguinte dá "curto" (no mesmo dia dá "incerto") — decidir com o caso da
  assistência que passa a meia-noite; a nota das Estatísticas ("menos do que o serviço anterior ou 12 h…") não cobre a
  assistência em casa; a lei portuguesa do tempo de trabalho da aviação (a EASA remete para ela na FAQ 47610) não foi vista.
- **Repouso — o que a 3.ª revisão deixou (2026-11-11/12):** partir um serviço em dois quando o 2.º parte no dia seguinte
  (o Detalhe grava um dia de cada vez: hoje só pela importação); a resposta "Não" do "Tenho descanso?" não diz PORQUÊ quando
  o motivo é o repouso reduzido (o 3.º entre recuperações, o 2.º seguido, o PSV seguinte que não cabe) e o conselho "deve
  estender e o PSV seguinte reduz" não serve esses casos — pede textos novos (`ux-copy`); sem NENHUM serviço anterior nos
  dados, o repouso depois de um PSV prolongado assume as +4 h (opção ii) — a opção (i), +2 h, é possível: devia ficar
  incerto entre as duas; um serviço sem apresentação antes do 1.º serviço com apresentação dá vistas diferentes (Início
  "sem dados", Simulação incerto); as Estatísticas de um ano sem recuperações nenhumas demoram segundos (caso extremo; um
  ano normal, 77 ms), e o Processo de carreira paga essa conta sem a usar.
- **Repouso — o que as revisões da noite 11 deixaram (2026-11-12):** as Estatísticas só contam os repousos ENTRE serviços do
  mesmo mês ou ano (o de dia 31 para dia 1 não aparece em nenhum mês; já era assim) — decidir se passa a contar no mês do
  serviço que se segue; a conta dos 2 repousos reduzidos entre recuperações (CS FTL.1.235(c)(5)) olha para trás até 80
  serviços no Início, 2 meses nas Estatísticas e 15 dias na Simulação de um serviço hipotético — podem discordar numa
  escala sem recuperações à vista; depois de um serviço SEM hora de apresentação o repouso fica sempre "incerto", por maior
  que seja (falta um teto certo para o que esse serviço pode ter durado); uma assistência em casa que passa a meia-noite
  antes de um voo de madrugada não se junta ao voo (são de dias diferentes) e dá "curto" — pela GM1 CS FTL.1.225 (b) a
  chamada durante a assistência não pede repouso (já era assim). **2026-11-12:** o "sempre incerto" depois de um serviço
  sem apresentação passou a valer também quando há só assistência em casa entre ele e o voo (antes dava "certo" — E3):
  aparecem mais "incertos" até se pôr a apresentação desse serviço; o teto certo continua por fazer.
- **Pernas e sincronização — o que ficou depois de 2026-11-11 (noites 8 a 10):** o formulário (Simulação e correção) não
  avisa das pernas que não batem certo enquanto se escreve, só o resultado; o repouso reduzido (noite 10): a app não mostra o
  máximo do PSV seguinte já reduzido — só decide se cabe; partir um serviço em dois (noite 11) só no serviço principal do dia,
  não num extra, só no 1.º intervalo de 10 h ou mais, e o 2.º serviço não herda o alojamento nem os casos especiais do 1.º
  (uma sincronização com um registo antigo pode voltar a juntá-los); pernas guardadas FORA DE ORDEM (a 2.ª toda antes da 1.ª) com menos de um repouso para a frente leem-se como um
  intervalo (só à mão: o calendário ordena-as); dois SERVIÇOS do mesmo dia com horas sobrepostas (`restBetweenDuties`) têm a
  mesma conta "+24 h" entre serviços — por ver com um caso real (uma assistência com um voo chamado a meio é legítima); a
  cadeia (`legsChainMs`, `data/zulu.js`) passa para o dia seguinte uma perna com mais de 3 h de sobreposição (voo "depois da
  meia-noite" inventado nesse caso); um dia corrigido na folha reaparece em cada sincronização enquanto o calendário estiver
  errado; um serviço à mão sem pernas passa a "alterado" quando o tempo de voo do calendário difere; a alteração só de pernas
  entra no arquivo sem dizer o que mudou; PDF com pernas fora de ordem; na hora repetida (a noite em que a hora atrasa), sem
  Zulu, uma partida até 2 h antes da chegada pode não se ver; o aviso de OUTROS serviços incertos do mesmo dia (alojamento por
  indicar num extra) não aparece na folha — só o das pernas; o serviço e o voo de um dia de PERNAS erradas contam pelo
  máximo, dados como certos (o PSV e o repouso a seguir é que ficam incertos; nos dias de duas leituras já há o certo e o
  possível, noite 10); quando o dia é ilegal nas duas leituras mostra-se só o "excede" do PSV único (na outra o que
  falha é o repouso entre os dois); as horas entre serviços medem-se pelo relógio do DISPOSITIVO (certo em Portugal; noutro
  fuso com outra mudança de hora pode falhar 1 h nessas duas noites); a pergunta do alojamento no Completar não diz que
  também decide "intervalo ou repouso";
  no Detalhe, "Calços até às" de um PSV incerto sem "(garantido)".
- **Cálculos (à espera do advogado):** na prestação complementar, quanto se desconta ao passar os 50 dias de baixa (n.º 3) e
  se as férias dão a prestação por inteiro — pergunta D27 (até lá: só como máximo); mudar de cabine para piloto na MESMA
  companhia é saída ou continuidade — pergunta D28 (até lá: continuidade).
- **Campos por fazer (com Mobbin):** o DIA da saída de uma companhia (a linha do tempo guarda só o mês: contam-se meses
  inteiros; a coluna do dia já existe no "Na … desde" do Perfil); formação inicial (A-218); subsídio de idioma; exercício efetivo do VE (TAP); datas de
  atividade dos 9/3 e sazonais; reserva na configuração para o pós-voo da Ryanair/Hi Fly e para os números do Manual de Operações
  se os sindicatos não os derem (BLOCO 5 · 6 · 2026-11-08 Manual de Operações).
- **Importação e formulário (o que ficou depois de 2026-11-11):** A-241 (MTG/GND) e R3 (DH marcado só nas notas) precisam de
  uma escala real; R5 (serviço sem apresentação no mesmo PSV repartido); R6, 2.ª parte (o Início e os Números ignoram o máximo
  dos serviços sem apresentação); R7 (um ADTY sem fim paga o garantido sem dizer "incerto" — só em dados antigos: desde o
  bloco 4 fica "a corrigir" e não entra); manual com a saída ligeiramente diferente fica duplicado (R11, parte)
  (BLOCO 4 · 2026-11-11 noite).
- **Simulação:** "Juntar ao dia" (Mobbin primeiro) (BLOCO 2).
- **Desenho — Início "cartões de cor" (2026-11-11): CONSTRUÍDO e meio visto no iPhone** (noite, 6: configuração, folga,
  véspera, hoje, fecho, férias, baixa, documento ✅; noite, 7: em voo, entre setores, pós-voo, pernoita, standby, formação,
  VoiceOver em português ✅). Falta: disrupção (atraso real), aterrado, hora Zulu, iPhone pequeno; afinar a altura das linhas do número
  (`GIANT_LINE`); o movimento (skill `animacoes`); depois levar a linguagem aos outros ecrãs, janelas e menus (um de cada
  vez, com Mobbin) (2026-11-11 noite, 5).
- **Desenho:** modo escuro da app toda (prioridade, projeto próprio) (2026-11-04 tarde); Escala "na linguagem do Início" e a etiqueta de um dia com 2 serviços; Validades e formulário de evento na escala
  DS 2.0; mosaico "NOV · ESTIMADO" sem "bruto"; modelos de e-mail do Supabase com o cabeçalho antigo; cor das notificações
  `#F5402C` no `app.json` (2026-11-02/03/04 · BLOCO 7).
- **Plataforma:** @react-navigation v7 (e apagar a camada `shims/`); "Secure email change" e o modelo de mudar e-mail no
  Supabase; tabelas órfãs `rest_periods` e `user_additional_roles`; pasta `android/` desatualizada (2026-11-02).

### 3. À espera do advogado — `docs/pack-advogado.md` (Word: `docs/pack-advogado.docx`)
- **Acrescentada a 2026-11-11 (noite), D28:** passar de cabine a piloto na mesma companhia (saída ou continuidade).
- **Acrescentadas a 2026-11-11 (D24–D27):** o mês da entrada (÷ 30) e o ano da admissão; o ano da saída (acordo contra CT
  art. 245.º); a "média do pagamento variável" nos subsídios easyJet (que rubricas — sem isso a app só mostra a parte certa); a
  "disponibilidade" na prestação complementar dos pilotos TAP.
- Falta o teu apelido na linha de autor e enviar. Temas: A (entidade, termos, privacidade, art. 9.º, saúde, PDFs, sincronia de
  folgas) · B (licença e marca dos sindicatos) · C (citações) · D1–D23 (dúvidas dos acordos) · E0–E8 (limites TAP/FTL) + anexo
  E-A (perguntas para a ANAC). Depois da resposta: tirar a marca RASCUNHO da política e dos termos, preencher os 【…】, publicar.

### 4. À espera dos sindicatos, da empresa ou de documentos
- **SPAC e SNPVAC** (anexo D-A do pack): os dois números do Manual de Operações (desconto da pausa no repartido; diferença de
  apresentação pilotos/cabine), easyJet e TAP; **e uma pergunta nova (2026-11-11): a companhia tem repouso reduzido
  (ORO.FTL.235(c), com gestão do risco de fadiga)?** — com a resposta, o "incerto" do repouso abaixo do mínimo passa a
  "curto" ou a "repouso reduzido" (por juntar ao pack); deliberações sobre "consecutivos" e as gralhas do BTE da TAP; autorização escrita
  da marca; prova de pertença (2026-11-08 · 2026-11-02/03).
- **Escala real da TAP** com os códigos (desbloqueia a TAP na importação); **recibos** com dias de baixa e o mês do variável;
  códigos SBY/STBY/MTG/GND da easyJet; lista de distâncias do per diem; documentos reais para as Validades (paradas) (BLOCO 4 · 8).

### 5. Pesquisa — `docs/pesquisa-pendente.md`
- **Feita a 2026-11-11** (ver a entrada "Pesquisa" abaixo). Fica: o tipo matinal/tardio da ANAC e da Austro Control (pedir
  por escrito, ou abrir os sites no navegador) e o certificado da Ryanair em Portugal; **o salário mínimo de 2027 — voltar
  a ver no fim de dezembro**; as duas interpretações que a EASA não esclarece (repartido sem alojamento adequado; "7 dias
  consecutivos").
- (lista antiga) Tipo matinal/tardio em Portugal (ARO.OPS.230); tabela geotime do ROV da TAP; salário mínimo de 2027 (`fontes/pt/rmmg.txt`);
  plataforma europeia de litígios (encerrada em 2025?); interpretações da EASA ainda não conferidas.

### 6. Decisões tuas
- **Negócio:** data de lançamento; CI; marca CrewPact (INPI/EUIPO, App Store Connect, `.pt`/`.eu`); ícone (em pausa até aos
  sindicatos); edições por sindicato (login neutro com "Em parceria com…" recomendado); líquido estimado e comparação com o recibo.
- **Produto:** mês do variável ("Ganhos da escala de novembro" ou modo recibo, A-200); aviso "hora da sincronização" no SNC
  (A-085); radiação e estatísticas (A-268/269/275/276); linha do dia de serviço no pré-report; limites de escala de outros acordos
  além da TAP; passkeys e palavras-passe vazadas; prateleira (relógio solar, reconciliação v1.1, sino fase 3, Radar).

### 7. No fim: versão de teste (dev build) e lojas — `docs/dev-build.md`
- Face ID real, PDF por ficheiro, voo ao vivo nativo, compras (RevenueCat), login Apple e Google, widgets, Live Activities, alarme
  (AlarmKit), hotel pelo Apple Maps, passkeys; Android; iPhone pequeno e grande; beta com 2–3 tripulantes no TestFlight;
  declaração de dados nas lojas; Supabase/Resend pagos e limites (e-mails por hora, DMARC).
---

## 2026-11-13 — O novo acordo dos pilotos da easyJet: BTE n.º 29 de 2026 (Fable 5.2, sessão própria)

O enunciado combinado de manhã, feito. **Gravado no ramo `calculos-repouso-2` (commit `93aea15`), sem push.**

**A pergunta de "antes de tudo" respondeu-a o próprio PDF:** é o texto publicado — Boletim do Trabalho e Emprego n.º 29, de
8 de agosto de 2026, p. 124–156, "Revisão global"; assinado em Lisboa a 26 de junho de 2026, depositado a 23 de julho
(n.º 182/2026). É só o dos pilotos. Entra em vigor "na data da sua assinatura" e vale até 31 de janeiro de 2029 (Art. 2.º,
n.º 1); as cláusulas "especificamente designadas" valem desde 1 de fevereiro de 2026 (n.º 2, a)).

1. **Fonte.** `fontes/ae-easyjet/easyjet-spac-2026.pdf` (só neste PC; SHA-256 em `fontes/README.md`) e o `.txt` extraído
   como o de 2023. O PDF foi conferido contra o boletim completo do portal oficial do BTE: o texto das p. 124–156 é igual,
   palavra por palavra. As tabelas do Anexo I (BTE 152–155) e o quadro do Art. 61.º (BTE 142) foram lidos na imagem.
2. **Comparação com 2023:** `docs/ae-easyjet-pilotos-2026.md` (vigência, Anexo I, contratos, regras de pagamento, férias,
   a numeração nova, as cláusulas de escala que não são dinheiro, e o que o texto não fecha).
3. **Golden primeiro:** `scripts/ae-easyjet-2026.test.js` (`npm run test:ae-2026`), 244 asserções — cada número com a
   citação literal na página do BTE, e o motor a dá-lo no mês certo (263 depois da revisão). `npm test` passa a 34 suites.
4. **Código — acrescentar, não substituir.** `TABLE_VERSIONS` ganhou dois degraus: 2026-02-01 (salário base, setor nominal e
   prestação de benefícios — o que o Anexo I designa "A partir de 1 de fevereiro de 2026") e 2026-06-26 (o resto: doença a
   80 %, o máximo de DDO/IDO/WFLY (a base a tempo completo), 14-14 a 53 %, 21-7 a 77 %, o contrato 4-4 a 83 %, o máximo do SNC, a
   retenção em percentagem desde maio de 2027, as rubricas novas). As tabelas resolvem ao mês: as regras de 26 de junho
   contam desde julho; de 26 a 30 de junho ficam as antigas (a menos, nunca a mais). O IPC: 2,3 % de fevereiro de 2025 a
   janeiro de 2026; 1 desde fevereiro de 2026 (os valores novos são finais); 2027 e 2028 à espera do INE, sem mínimo nem
   máximo. Vigência até 2029-01-31; o reconhecimento de expiração (`AE_EXPIRY_ACK`) saiu. Férias pela data: 27 / 25 / 23 /
   19 / 14 / 21 e PPY 19 / 21, certos desde 1 de abril de 2027 (antes, o máximo). Os meses até janeiro de 2026 não mudaram: os testes antigos ficam presos
   ao acordo de 2023 (`__pinTablesForTests`), e onde tinham cenários em meses de 2026 os valores foram refeitos à mão, com a
   conta no próprio teste.
5. **Citações:** a Biblioteca ("O teu AE"), a Prova, os rótulos dos Cálculos e a tradução passam à numeração nova (SNC:
   Art. 65.º e Anexo I.11; DDO/IDO/WFLY: Anexo I.12; escritório: Anexo I.13; retenção: Anexo I.14; WFLY: Art. 64.º;
   gravidez: Art. 49.º com o valor no 80.º, n.º 2). O detetor de alterações de escala cita o artigo do acordo em vigor na
   data do serviço (63.º até 25 de junho de 2026, 65.º depois). O link da Biblioteca é o boletim completo no portal do BTE
   (a separata do Diário da República não apareceu na pesquisa).
6. **O que NÃO é do acordo:** o FTL não mudou. As cláusulas de escala mais apertadas do que a lei estão listadas à parte
   (ponto 7 do documento) e não entraram no motor FTL.

**Onde a app passou a ler diferente, por o texto novo decidir:** a retenção deixa de ter intervalo — o texto já não fala
em pagar "proporcionalmente" a quem está a tempo parcial, e diz "calculada sobre a respetiva remuneração base a tempo
completo".

**Onde o texto não fecha e a app diz o que falta:** o SNC de abril a outubro (60 € certos, até 240 €); DDO/IDO/WFLY nos
contratos a tempo parcial (a base do contrato certa, a base a tempo completo como máximo); o IPC de 2027; o ano de férias
em que os dias novos começam (os de 2023 até 31 de março de 2027, os novos como máximo); a data em que o prémio de permanência passa a mensal (não antes de 26 de junho de
2027 — até lá fica no mês do aniversário, com nota desde julho de 2027); o retroativo da retenção de fevereiro de 2026.

**Revisão independente (Opus, no fim):** leu o acordo todo e as imagens das tabelas e refez à mão as contas do golden —
nenhum número errado. Apontou 16 pontos; corrigidos no mesmo dia, com o golden primeiro: a retenção já não se paga a quem
saiu antes de 30 de abril (era assim também na regra de 2023); um contrato 4-4 com datas anteriores ao acordo já não fica a
100 %; DDO/IDO/WFLY e os dias de férias passaram de "o novo" a "certo e máximo", porque o texto tem duas leituras; a regra
de 2023 da retenção cita o artigo certo no PPY 9/12. Os que ficam (rubricas do 4-4, os "(*)" sem nota do Anexo, os
benefícios que as partes podem adiar, a data legal de entrada em vigor, os retroativos de fevereiro a junho) estão na lista
de cima e no ponto 8 do documento. **Não conferido por ninguém:** os artigos 478.º e 519.º do Código do Trabalho (não estão
em `fontes/pt/`); se algum ecrã calcula meses depois da saída da companhia; os ecrãs no iPhone.

**2.ª parte, no mesmo dia (o Nuno: "faz como manda a lei" e "é fazermos"):** as rubricas novas entraram na soma do mês
com o golden primeiro (308 asserções no teste do acordo novo): voo doméstico, turnaround, SOC/EXPD e LTC; o SNC passou a
ler o facto do regime reforçado (falta a pergunta no Perfil); os artigos 478.º e 519.º do Código do Trabalho entraram em
`fontes/pt/` e fecharam a data legal: os dias de férias novos só são possíveis depois da publicação (8 de agosto de 2026),
o dinheiro vale desde as datas do acordo. **Esta 2.ª parte não teve revisão independente.** A separata do Diário da
República continua por encontrar. O Nuno pediu também a análise das 57 imagens de `referencias/Para a app/` e o layout das
páginas que faltam: é design, fica para a sessão seguinte (enunciado no topo).

**Testes:** `npm test` passa (34 suites). Não foram tocados: o FTL, a cabine, a TAP.

---

## 2026-11-12 — A série de assistências num só sítio (Fable 5.2, sessão própria) e a 4.ª revisão independente

O enunciado da entrada de baixo, feito. **Gravado no ramo e passado ao `main` (sem push).** Golden 917 → 1008;
`npm test` verde (33 suites); motor na versão **20**.

**O que mudou**
- **`ftl/standbySeries.js` (novo, puro): a única leitura da assistência antes de um voo.** As entradas do mesmo tipo
  contíguas ou sobrepostas — de qualquer dia, por qualquer ordem, duplicadas, uma dentro da outra — são uma série, do
  início ao MAIOR fim; a série que precede um voo; a relação (durante → chamada certa; do fim até ao repouso mínimo → duas
  leituras; depois → nada); e o 210 de cada entrada (o seu pedaço, até à apresentação se a chamada é certa; a soma dos
  pedaços arredonda-se uma vez). Saíram `foldStandbyIntoFlight`, `takeRun`, `carriedStandbyOf`, `standbyBeforeOf` (PSV) e
  `sbRun`/`sbCont`/`earlierCallOk` (repouso).
- **PSV (`ftl/index.js`, `sbDayPlan`):** a assistência ligada a um voo fica à parte (conta para o 210 no seu dia, fora dos
  blocos de PSV) e o voo leva o tempo de assistência; nenhuma assistência entra num bloco de PSV; um bloco sem voo não é
  PSV; o PSV de um bloco acaba no último voo (ORO.FTL.105(12)); a assistência de antes de um voo reduz o máximo mesmo com
  um escritório antes dela; o registo de um dia passa a depender também dos 2 dias seguintes (a assistência acaba na
  apresentação do voo do dia seguinte).
- **Repouso (`data/today.js`):** a série entra na linha como UMA entrada (no dia em que começa); a leitura "chamado na
  assistência anterior" (`calledInOk`) refeita; o voo durante uma assistência no aeroporto junta-se a ela em qualquer dia
  (salvo se ela vem colada a um serviço de outro dia).

**Os 13 casos da 3.ª revisão** (cada um com teste no golden, bloco "A SÉRIE DE ASSISTÊNCIAS NUM SÓ SÍTIO"):
P1 véspera em duas entradas → máximo 4:00, excede · P2 entrada dentro de outra → 9:00, excede, por qualquer ordem · P3
ver abaixo · P4 sobrepostas → 210 uma vez (90 e 405 por dia local) · P5 voo sem hora de fim → o dia tem registo (135) ·
R1 → curto 7:00 · R2 → incerto · R3 → incerto (o golden mudou de propósito) · R4 → incerto · R5 → curto 10:00 e 11:00 ·
R6 → curto · R7 → curto · R8 → certo acima do teto que a lei dá (ver "As três dúvidas").

**De caminho, o que as provas e a 4.ª revisão puseram à vista e ficou corrigido** (com teste): dois voos seguidos e
assistência no aeroporto depois davam "dentro" com um PSV de 17:30 (o bloco passava as 24 h e lia-se 3:45); voo e
assistência em casa depois, ou escritório e formação seguidos, eram um "PSV" que excedia; a assistência de dois dias
atrás (começa às 23:30 e dura 16 h 45) nem se via; uma assistência de mais de 16 h com um voo a seguir não dava o aviso;
o dia com assistência e voo separados por um repouso guardava o PSV da assistência; a assistência da véspera contava as
horas todas no 210 mesmo acabando na apresentação; a assistência no aeroporto que passa a meia-noite com o voo durante
ela dava "curto, −2:00"; duas assistências em casa no mesmo dia com tempo livre e o voo durante a 2.ª davam "certo".

**4.ª revisão independente** (dois revisores Opus, só com o código, o diff e `fontes/`; geradores próprios).
- *Confirmaram:* várias entradas = entrada única em cerca de 12 300 escalas (PSV, voo sozinho, 210 por dia local) e
  12 664 (repouso, quatro vistas), 0 diferenças; o PSV contra o oráculo deles em 21 700 casos, 0 erros (o código anterior
  tinha 103 a 125 "dentro" falsos em cada 3 000); o 210 em 6 000 casos, 0 erros (antes: 1 298 em 3 000); dias sem
  assistência iguais ao commit anterior, salvo os blocos sem voo; o repouso sem assistência em casa: 14 223 serviços, 0
  diferenças; R7 coerente; 2 700 escalas estragadas, 0 exceções; nenhuma regra decidida contraria os textos.
- *Erros meus desta sessão que apanharam — corrigidos:* (1) uma entrada de assistência duplicada sem hora de fim tirava a
  redução ("dentro"); (2) a assistência dentro da janela de um PSV de vários serviços contava duas vezes no 210; (3) o voo
  à hora exata do início da assistência contava-a toda; (4) **um "certo" falso**: voo até às 19:30, assistência no
  aeroporto às 20:00 e chamada às 02:00 → agora curto (0:30 de 18:00); (5) a leitura "chamado na 1.ª assistência" aceitava
  como repouso um tempo com outra assistência inteira lá dentro → agora só a assistência DURANTE a qual o voo se apresenta
  fica de fora (é o caso do R3).
- *Antigos que apanharam — corrigidos:* o PSV prolongado por um serviço em terra depois do último voo; o repouso negativo
  com um voo sem apresentação antes de duas assistências; o "incerto" num dia sem voo.
- *Ficam na lista* (topo, grupo 0): os que já eram assim e pedem mais do que um remendo.
- **As correções desta lista não foram revistas por ninguém.**

**As três dúvidas, fechadas pela lei** (o Nuno, 2026-11-12: "quero que seja seguido como a lei diz; a lei é que está
certa"). Devolvi-as como perguntas e não devia: nenhuma era uma escolha — a lei decidia as três. **Mudaram 5 goldens além
do R3**, todos de propósito e antes do código:
1. **P3 — a declarada à mão que não bate com a da escala.** A lei pede um facto — o tempo de assistência até à
   apresentação (CS FTL.1.225(b)(7)) — e há duas fontes que não batem. Nenhum texto diz qual vale: a app não escolhe, dá
   as duas pontas e o motivo (`standbyDeclared`: "as horas que indicaste não batem com a assistência da escala — corrige a
   que estiver errada"). A menos de 1 h de diferença vale a declarada (o formulário é em horas inteiras); de outro tipo é
   outra assistência e as duas contam. *2 goldens:* 7 h declaradas contra 11 h na escala davam "máximo 10:00"; dão "6:00 a
   10:00" (excede nas duas; o 210 continua 765, com 825 no possível).
2. **Duas assistências em casa no MESMO dia com tempo livre e o voo durante a 2.ª** (04–08, 1 h, 09–12, voo às 11:00). A
   lei não tem "o mesmo dia": a assistência "is followed by a rest period in accordance with ORO.FTL.235" (CS
   FTL.1.225(b)(4)) e acaba na apresentação ((b)(5)). Chamado na 2.ª, a 1.ª não foi seguida de um repouso; chamado na 1.ª,
   conta desde o início dela (no máximo 16 h, (b)(1)). "Certo" não sai de nenhuma leitura → incerto, ou curto se as duas
   falham. *1 golden* ("certo" → "incerto").
3. **R8 — o serviço sem hora de fim.** A lei dá um teto: o período de serviço começa na apresentação e acaba quando o
   tripulante fica livre de todos os serviços (ORO.FTL.105(11)) — não pode ser mais longo do que o tempo da apresentação
   dele ao fim do último serviço antes do repouso. O mínimo a seguir é esse período ou o piso (ORO.FTL.235(a)(1); no máximo
   as 14 h da CS FTL.1.235(b)(3)(ii) e da CS FTL.1.205(c)(6)), mais 4 h de um prolongamento (ORO.FTL.205(d)(1)) e o
   aumento depois de um repouso talvez reduzido antes dele (CS FTL.1.235(c)(3)). Um repouso acima disso chega em qualquer
   leitura → "certo"; abaixo, "incerto" com as duas pontas (antes: "incerto, sem teto", sempre). Um repouso conhecido pelo
   caminho (44 h entre duas assistências) também cobre. *2 goldens:* "60 h livres depois da assistência: incerto" → certo
   (teto 35:00); "Repouso até: 12:00 ou mais, sem teto" → "12:00 a 35:00". **Sem revisão independente.**

**5.ª passagem independente** (um revisor Opus, só sobre as dez correções feitas depois da 4.ª e o teto do R8; cerca
de 80 cenários dele e as provas, todas com 0 diferenças). No teto do serviço sem hora de fim não encontrou nenhum "certo"
abaixo de uma leitura da lei. **Apanhou e ficou corrigido** (com teste): (1) *erro meu* — o desconto da assistência dentro
de um PSV de vários serviços tirava-a também do 210 certo quando o bloco tem duas leituras (5:30 em vez de 15:30): agora
só sai do possível; (2) *erro meu* — um voo sem apresentação antes de duas assistências dava "curto" onde o mesmo voo
conhecido dá "incerto"; (3) *antigo* — um serviço com apresentação e sem hora de fim antes de um voo do mesmo dia saía
das contas e o PSV ficava "dentro": agora "incerto", com o motivo novo `noEndBefore`; (4) *antigo, "certo" falso* — um
escritório colado depois de um voo prolongado apagava as 4 h do prolongamento (e os pisos de 14 h): agora valem com o
voo em qualquer sítio do bloco (ORO.FTL.205(d)(1)); (5) *antigo, "certo" falso* — o repouso DEPOIS de um PSV que veio a
seguir a um serviço sem hora de fim: o de antes pode ter sido reduzido (CS FTL.1.235(c)(3)) → incerto até ao teto.
Ficaram na lista do topo os que pedem mais do que um remendo.

**Três pontos da lista, corrigidos a pedido do Nuno ("vamos corrigir isto")** — com teste, sem revisão independente:
1. **O intervalo do repartido passado em assistência.** O intervalo é tempo "free of all tasks" (ORO.FTL.105(6)); em
   assistência o tripulante tem de estar disponível (105(25)). Conta só o maior troço LIVRE de assistência: voo 06–08,
   assistência 09–17 e voo chamado às 16:00 → sem prolongamento, 14:00 contra 11:00, excede (era "dentro", máximo 15:45).
   Um golden de hoje acompanhou: escritório | assistência | voo tinha o possível em 17:00, fica em 13:00.
2. **A assistência no aeroporto e o voo do dia seguinte, à hora do fim ou antes de passar o repouso mínimo.** A lei tem
   "if not leading to the assignment of an FDP … followed by a rest period" (CS FTL.1.225(a)(1)) e "if an assigned FDP
   starts during airport standby" ((a)(2)); sem alojamento, o PSV conta desde a apresentação no aeroporto (ORO.FTL.225(d)).
   A escala não diz se o voo foi atribuído durante ela → as duas leituras, "incerto", como a de casa e como o PSV já fazia
   (era "curto, 0:00"). No mesmo dia fica como estava; colada a um serviço da véspera continua "curto". O golden do R5 com
   serviço no aeroporto passou de "curto" a "incerto" (os mesmos 11 h desde as 20:00). O "Repouso até" depois de uma
   assistência destas passou a ver as leituras de uma bifurcação anterior (uma 3.ª linha; 1 caso na prova).
3. **O Detalhe do voo com um serviço sem hora de fim antes dele:** fica "incerto" com o mesmo motivo do dia (`noEndBefore`).

**Provas no fim** (`scripts/provas/`, README atualizado; a nova é `uma-entrada.js`): uma entrada contra a mesma partida
2 966 escalas, 0 diferenças; a regra da assistência 10 158 casos, 0, e o voo sozinho igual ao dia; vistas 18 327, 0;
"Repouso até" 36 330, 0; mais repouso nunca piora: as mesmas classes de antes (394 casos; eram 388); o repouso contra `3c217a5` sem assistência
em casa: só os 33 "curto" falsos de sempre; contra o commit anterior sem assistência em casa: 0 diferenças.

## 2026-11-12 (noite) — 3.ª revisão independente e o enunciado da sessão seguinte (nada mudou no código)

Dois revisores Opus sobre o commit `4966a6b`, só com o código e `fontes/`. Reproduzi os achados principais de cada um.
**Decisão do Nuno: não remendar mais nesta sessão; a correção faz-se numa sessão nova, de uma vez.**

**O que confirmaram estar certo**
- PSV: a série no mesmo dia em 2, 3 e 4 entradas igual à entrada única, no dia e no voo sozinho; a assistência partida à
  meia-noite com UMA entrada na véspera; a janela da noite pela hora a que a série começou; `sbOver` só com a chamada
  certa; o registo recalcula e é idempotente; 0 diferenças nos dias sem assistência ou com uma só (814 dias).
- Repouso: uma entrada contra a mesma partida (meia-noite, a meio, sobreposta, três pedaços), 0 diferenças em cerca de
  3 600 comparações fora das classes abaixo; `earlierCallOk` contra o oráculo deles em cerca de 3 000 casos, salvo os
  achados 3 e 6; a assistência colada, de um dia para o outro, sempre "curto" e nunca negativo; "Repouso até" contra
  "Tenho descanso?" em cerca de 7 000 testes; vistas coerentes; sem assistência em casa só muda o `noEnd`; sem exceções.

**O que fica errado — PSV (`ftl/index.js`)**
- P1 · Duas ou mais entradas de assistência NA VÉSPERA (14–21 + 21–04) e voo às 03:00: máximo 11:00, "dentro"; a entrada
  única dá 4:00, excede. `carriedStandbyOf` só vê a última entrada da véspera (já era assim). A janela da noite usa a
  hora dessa última entrada.
- P2 · Uma entrada dentro de outra, ou com o mesmo início (aeroporto 06–14 + 07–08, voo 13:00): máximo 13:00, "dentro";
  só a 06–14 dá 9:00, excede. O resultado muda com a ordem das entradas. Mede-se tudo pela última entrada por
  apresentação; o fim máximo da série não entra (regressão de veredicto: antes dava "excede" com um PSV mal contado).
- P3 · Assistência de 12 h na escala e 2 h declaradas à mão no voo: máximo 11:00, "dentro"; a da escala sai sem se
  conferirem horas, tipo nem véspera (novo; "vale a declarada" foi decisão, mas quando as duas não batem devia ser
  incerto). Também tira do 210 uma assistência da escala que é OUTRA (casa 06–08, voo 14:00 declarado de aeroporto).
- P4 · Entradas sobrepostas contam a dobrar no 210 (véspera 18–01 + hoje 00–06). P5 · Voo sem hora de fim depois de uma
  série: o dia inteiro fica sem registo.

**O que fica errado — repouso (`data/today.js`)**
- R1 · Assistência da noite partida à meia-noite (17–00 | 00–02) com OUTRA assistência na manhã seguinte (09–13) e voo às
  10:00: "certo" (30:30); numa entrada (17–02) dá "curto" (7:00), que é o que a lei dá. O pedaço de depois da meia-noite
  junta-se à assistência da manhã pela regra do mesmo dia.
- R2 · Duas assistências que começam no mesmo dia com tempo livre (20–21 e 22–06) e voo às 02:00 do dia seguinte:
  "curto" (1:00); chamado na 1.ª são 6 h de assistência e 33 h de repouso antes → devia ser incerto. `glued` trata a
  assistência anterior como um serviço verdadeiro.
- R3 · O teto das 16 h de `earlierCallOk` não vê o repouso mínimo antes da apresentação (GM1 CS FTL.1.225 (b)): 06–14,
  11 h livres, 01–08 e voo às 07:00 dá "curto" — e há um golden a exigir isso; chamado na 1.ª houve 17 h livres antes
  da apresentação, a assistência conta só 8 h → devia ser incerto. **O golden "assistência, 11 h livres, assistência e
  voo durante ela (25 h desde a 1.ª): curto" está a fixar um erro.**
- R4 · A conta dos 2 repousos reduzidos (`reducedSinceRecovery`) não usa o `strict`: o 3.º repouso de 12:30 depois de
  "escritório + voo" dá "curto"; devia ser incerto (já era assim em `b6f6fa8`).
- R5 · O repouso mede-se do fim do serviço que COMEÇOU por último, não do que acabou por último: chamada antes da
  meia-noite e pedaço de depois (20–00 + voo 23:00 | 00–02 + voo 15:00) dá "certo" 13:00 (uma entrada: "curto" 10:00);
  uma entrada duplicada dentro de outra (08–20 + 09–10) dá "certo" onde era "curto" (já era assim).
- R6 · `earlierCallOk` ignora a série colada a um voo: voo até 10:30 + assistência 12–16 | assistência 00–08 + voo 02:00
  dá "incerto"; não houve repouso nenhum → curto. R7 · O `strict` trata voo→escritório como repartido possível (não é:
  o escritório vem depois do último setor) → "incerto" onde é "curto". R8 · O `noEnd` ignora um repouso conhecido de 44 h
  depois do serviço sem fim → "incerto" a mais.

**ENUNCIADO DA SESSÃO SEGUINTE (Fable 5.2, Alto, sessão própria)**
- **O problema:** "a assistência antes de um voo" calcula-se em três sítios com regras diferentes —
  `foldStandbyIntoFlight`/`takeRun` (PSV, mesmo dia), `carriedStandbyOf` (PSV, véspera) e `buildLine` com
  `sbRun`/`glued`/`callFork` (repouso). Cada remendo num sítio desalinhou os outros (três rondas).
- **O que se quer:** UMA função pura, em `ftl/`, que dada a escala e um voo devolve a assistência que o precede como um
  intervalo — início, fim (o MAIOR fim das entradas), tipo, que entradas a compõem, e em que dias caem — juntando entradas
  do mesmo tipo contíguas ou sobrepostas, de qualquer dia, em qualquer ordem. O PSV e o repouso passam a ler essa função e
  mais nenhuma regra própria. Entradas duplicadas ou aninhadas, uma em cada dia, várias na véspera: o mesmo resultado que
  a entrada única (é o teste a escrever primeiro, em grelha).
- **As regras já decididas (não reabrir):** só o voo que se apresenta DURANTE a assistência é chamada de certeza; à hora
  do fim ou depois, e antes de um repouso mínimo, há as duas leituras (PSV: garantido reduzido, possível inteiro;
  repouso: incerto, `standbyCall`); acima das 16 h com a apresentação depois do fim: "Não" com o motivo `standbyOver16`
  (corrigir pelo R3: se houve um repouso mínimo antes da apresentação, esse tempo não é assistência); a chamada certa
  acima das 16 h marca-se no PSV (`sbOver`); a assistência no aeroporto acaba no fim do período notificado; a declarada à
  mão manda (P3: decidir o que fazer quando contradiz a escala — proposta: incerto); assistências com tempo livre entre
  elas não são uma série: são leituras (chamado numa ou noutra).
- **O que tem de continuar a passar:** `npm test` (golden 917), salvo o golden do R3, que muda de propósito; os cenários
  P1–P5 e R1–R8 de cima entram como testes ANTES do código.
- **As provas a repetir:** uma entrada contra a mesma partida (o PSV, o 210 somado pelos dias, o repouso e o "Repouso
  até"); as vistas iguais; o voo sozinho igual ao registo do dia; mais repouso nunca piora; contra `3c217a5` sem
  assistência em casa. Os scripts destas provas estão em `scripts/provas/` (ver o README de lá); falta um para "uma
  entrada contra a mesma partida", que os revisores fizeram e não ficou guardado.
- **No fim:** revisão independente (dois revisores Opus, repouso e PSV), e só depois o `main`.

## 2026-11-12 (noite) — Voo sem hora de fim, iPhone e 2.ª revisão independente (Fable 5.2, a mesma sessão)

O Nuno: "vamos fazer esses 3 passos" (ver no iPhone; revisão independente das correções que não a tinham tido; o voo sem
hora de fim). Testes primeiro em tudo. Golden 889 → 917.

**1 · Um serviço sem hora de fim antes de uma assistência ou de um serviço em terra** (`data/today.js`, `openIso`, motivo
`noEnd`). Voo sem hora de fim, assistência em casa (ou escritório), 12 h, voo: era "certo" pelo piso; agora "Incerto —
falta a hora de fim do serviço de DD/MM", sem teto (o mínimo pode medir-se por esse serviço e não se sabe quanto durou).
Abaixo do piso continua "Não". Texto novo no Início, no cartão do repouso e na Simulação.

**2 · iPhone** (conta de teste, calendário sintético). Os cálculos bateram em tudo o que se viu: o Detalhe do voo depois
de uma assistência mostra "Incerto", máximo 07:30–11:30 e "Calços até às (garantido) 23:30"; a importação mostra "⚠
repouso antes 9:30 de 12:00" no caso das 16 h; o alerta de SNC com o texto longo cabe. O que falhou foi a apresentação:
nove acertos de ecrã e de importação, no grupo 2. Não se viu: o texto do voo sem hora de fim; o voo durante a assistência
com um só máximo reduzido; o "Tenho descanso? Incerto" (o Início 3.0 não tem cartão para ele).

**3 · 2.ª revisão independente** (dois revisores Opus, só com o código e `fontes/`; reproduzi cada achado). Confirmaram:
as vistas do repouso iguais (4 693 pares, 0 diferenças); "Repouso até" contra "Tenho descanso?" (4 511 dias, 0 erros);
sem assistência em casa, só mudam os casos esperados (cerca de 150 000 comparações); o PSV com a assistência antes do voo
conferido à mão, mesmo dia contra véspera (3 360 pares) e zero diferenças face ao commit anterior nos dias sem assistência
antes de um voo (cerca de 5 200 dias). **Erros corrigidos:**
- **PSV — a assistência em várias entradas.** Duas assistências seguidas antes de um voo (07–11 e 11–17, voo às 16:00)
  davam um PSV de 19:00 contado desde a 1.ª (erro meu da 1.ª revisão); uma assistência partida à meia-noite pelo
  calendário (18–00 e 00–06, voo às 05:00) perdia a parte da véspera e dava "dentro" (já era assim). Agora as contíguas
  contam como uma: 10:00 contra 8:30, e máximo 7:00 — excede, como a entrada única.
- **PSV — a assistência da escala e a mesma declarada à mão no voo** davam um PSV de 21:30 e o 210 a dobrar. Vale a
  declarada, uma vez.
- **PSV — o registo dos dias** não recalculava quando a assistência da véspera entrava como 2.º serviço desse dia.
- **PSV — uma assistência de mais de 16 h com a chamada durante ela** não era assinalada em lado nenhum; o dia passa a
  marcar "assistência acima de 16 h" (CS FTL.1.225(b)(1)).
- **Repouso — só as assistências contíguas são uma série.** Com tempo livre entre duas (erro meu da 1.ª revisão: juntava
  tudo o que tivesse menos de 12 h pelo meio) há duas leituras — chamado na 1.ª, ou na 2.ª depois de um "repouso" que pode
  não chegar: 11 h livres e 25 h desde a 1.ª → "Não" (era "Sim"); 10 h livres e 16 h desde a 1.ª → "Incerto" (era "Sim").
- **Repouso — a assistência 10 h depois de um serviço e a chamada no dia seguinte:** "Sim" (erro meu); agora "Não" (ou
  as 10 h são um repouso curto, ou é um PSV só de 21 h).
- **Repouso — "só podia ser um repouso reduzido"** exige agora que o bloco seguinte não possa ser um repartido (a
  correção do "curto" falso tinha criado outro "curto" falso, 3 a 6 casos em 1 500 escalas).
- **"Repouso até" depois de uma chamada** contava do fim da assistência que estava na escala; conta do fim do voo.
**A versão do motor sobe para 19.**

**Provas no fim:** `npm test` verde (33 suites; golden 917, cartões 251); exportação iOS sem erros; todos os cenários das
duas revisões com o resultado que a lei dá; a regra da assistência 10 158 combinações, 0 diferenças, e o voo sozinho igual
ao registo do dia; vistas 37 050 comparações, 1 diferença (a de sempre); "Repouso até" 32 824, 0; mais repouso nunca piora:
as mesmas classes; contra o commit `3c217a5` sem assistência em casa: só o "curto" falso corrigido (33 e 35 casos).

**O padrão destas duas noites, para não o esconder:** cada ronda de correções minhas no caso "assistência antes de um voo"
abriu falhas novas que só a revisão seguinte apanhou. As correções desta 2.ª revisão não foram revistas.

## 2026-11-12 — Revisão independente das correções de hoje (dois revisores Opus) e o que se corrigiu

O Nuno: "revisão independente nas correções de hoje". Dois revisores em paralelo, cada um só com o código, o diff e
`fontes/` (sem esta lista nem as minhas conclusões): um para o repouso (`data/today.js`), outro para o PSV
(`ftl/index.js`). Correram cenários próprios e compararam com o último commit. Reproduzi cada achado antes de mexer.

**O que confirmaram estar certo:** sem assistência em casa antes de um voo, o repouso e o PSV dão exatamente o mesmo que o
último commit (repouso: 996 escalas aleatórias em quatro conjuntos, 0 diferenças; PSV: 2 669 dias e 2 652 voos sozinhos,
0 diferenças); a regra "durante a assistência → chamada; do fim até ao repouso mínimo → duas leituras; depois → nada"
contra a leitura deles da CS FTL.1.225 em cerca de 5 400 cenários; o voo sozinho igual ao registo do dia; o registo dos
dias recalcula quando a assistência da véspera entra ou sai e não entra em ciclo; nenhuma exceção com dados incompletos.

**Erros que eu tinha introduzido hoje — corrigidos (teste primeiro; bloco "REVISÃO INDEPENDENTE DAS CORREÇÕES" no golden,
golden 867 → 886):**
1. **PSV — a regra dos serviços sobrepostos apanhava qualquer par.** Um dia com assistência e formação sobrepostas, sem
   voo, passava a "excede"; um voo encaixado noutro ficava "dentro"; três voos davam um PSV de 0:07. Agora só vale para
   uma assistência seguida de um voo; o resto fica como era.
2. **PSV — voo, assistência e outro voo no mesmo dia, com 8 h 30 entre os voos:** tinha passado de "excede" a "incerto".
   Menos de 10 h não é repouso em nenhuma leitura: um PSV só de 18:00, excede. (Na leitura "sem chamada" a assistência
   deixa de partir o dia em dois.)
3. **Repouso — duas assistências seguidas** (ou uma partida em duas entradas, como o calendário faz à meia-noite) e um
   voo: "curto" onde era "certo". Agora são uma série: o repouso de antes do voo é o de antes da 1.ª.
4. **Repouso — uma assistência entre um escritório e um voo do mesmo dia:** "curto" onde era "certo". Agora "incerto"
   (com chamada é como se a assistência não estivesse lá; sem chamada é curto). De um dia para o outro, a assistência
   colada a um serviço continua "curto".
5. **"Repouso até" e mínimo a seguir:** com a assistência escolhida, misturava o repouso depois dela com o do voo seguinte
   ("12:00 a 16:00" onde o voo pedia 16:00 a 18:00). Agora cada um mede o seu, e o "Repouso até" conta do fim do bloco.

**Outros achados corrigidos:**
6. **PSV — a assistência da véspera acima das 16 h** dava "dentro" (eu tirava a leitura da chamada); no mesmo dia dava
   "incerto". Agora "incerto" nos dois.
7. **PSV — assistência no aeroporto com o voo depois do fim:** contava 9 h de assistência; ela acaba no fim do período
   notificado (ORO.FTL.225(b)): 6 h → máximo 10:00 a 12:00, dentro (era "incerto"; no último commit, "excede").
8. **"18 h acordado" como erro na Simulação e na importação:** passou a aparecer para as assistências da escala. A app
   não sabe a que horas o tripulante acordou: o aviso fica só para a assistência declarada à mão.
9. **Repouso — um serviço sem apresentação antes da assistência** tirava a leitura da chamada ("curto"; já era assim de
   um dia para o outro). Agora "incerto". Uma expectativa antiga (E3) mudou de propósito.
10. **Repouso — duas bifurcações seguidas:** a leitura "sem chamada na 1.ª, chamada na 2.ª" não se via ("curto"; já era
    assim). Agora "incerto".
11. Na noite da mudança de hora a assistência do mesmo dia conta-se pelo tempo real, como a da véspera.
**A versão do motor sobe para 18.**

**As 16 h no repouso — decidido com o Nuno ("o que diz a lei nesses casos?" → "concordo").** Assistência 14:00–22:00 e
voo às 07:00 (9 h depois do fim, 17 h depois do início). A lei não diz "o repouso é curto": diz que a sequência não é
permitida, por uma de duas regras. Sem chamada, a assistência é seguida de um repouso do 235 (CS FTL.1.225(b)(4)) e 9 h
não chegam. Com chamada não é preciso repouso, mas esse tempo conta como assistência (GM1 CS FTL.1.225 (b)) e ela passa
das 16 h ((b)(1)). O veredicto continua "Não", agora com o motivo certo (`standbyOver16`, `data/today.js` `over16`): no
Início e na Simulação o texto diz as duas hipóteses e que em qualquer delas está fora. Teste primeiro (golden 886 → 889).
Só texto e motivo: nenhum veredicto mudou.

**O que NÃO mudei:** os menores do ponto 5 do grupo 0.

**Provas depois das correções:** `npm test` verde (33 suites; golden 889, cartões 251); exportação iOS sem erros; os cenários dos dois revisores,
todos com o resultado que a lei dá; a regra da assistência 10 158 combinações, 0 diferenças; o voo sozinho contra o
registo do dia 10 158, 0 diferenças; repouso contra o último commit sem assistência em casa: só mudam os casos do "curto"
falso da manhã (o escritório seguido de voo já não é um repartido certo) e a consequência deles; vistas 36 859
comparações, 1 diferença (a de sempre); "Repouso até" 32 824, 0 diferenças; mais repouso nunca piora: as mesmas classes.

**Estas últimas correções não tiveram, elas próprias, revisão independente.** Nada visto no iPhone.

## 2026-11-12 — Uma companhia de cada vez (decisão do Nuno)

A pergunta dele: "quantas companhias temos?" A resposta, pelo código: a funcionar de ponta a ponta, uma — a easyJet
(limites de fadiga, dinheiro de pilotos e cabine, importação da escala), e só experimentada com a conta de teste. A TAP
tem o dinheiro e os limites do acordo modelados, mas não importa a escala (faltam os códigos); a Ryanair tem acordo
publicado e não modelado; Hi Fly, Jet2, Volotea e Wizz só têm os limites da lei europeia. A importação só conhece os
códigos da easyJet e usa-os por omissão para qualquer companhia.

**Decidido:** "vamos fazer só para a easyJet… uma de cada vez… mete em breve, porque vou fazer mais tarde… quando tiver
tudo pronto, as companhias todas é que lanço para o mercado."
- A easyJet primeiro, até ficar pronta; depois a seguinte, uma a uma.
- Na app as outras ficam "em breve": visíveis, sem acesso. Por fazer (grupo 2).
- O lançamento só com todas prontas. Enquanto isso, o "em breve" serve os testes (a versão de teste com 2 ou 3
  tripulantes): quem não é da easyJet percebe que ainda não é para ele.
- Nada do que está feito para a TAP se apaga.
- Consequência para a lista: a lei portuguesa (DL 25/2022), os limites e a importação da TAP e a reserva ficam para a vez
  de cada companhia. A conversa com os sindicatos (SPAC e SNPVAC também representam a TAP) faz-se sabendo isto.

## 2026-11-12 — Como diz a lei: a assistência a acabar à hora do voo, e o Detalhe (Fable 5.2, a mesma sessão; por gravar)

O Nuno, sobre a minha escolha de ler como chamada certa a assistência que acaba na escala no minuto da apresentação: "tem
que ser como diz a lei". E sobre o Detalhe do voo, que calculava o voo sozinho: "corrige isto". Testes primeiro (golden
858 → 867; 4 expectativas mudadas de propósito). Nada visto no iPhone.

**1 · Só a apresentação DURANTE a assistência é uma chamada de certeza.** A lei dispensa o repouso entre a assistência e o
voo, e reduz o máximo do PSV, quando o voo foi atribuído durante a assistência (CS FTL.1.225(b)(5) e (7); FAQ 47642). A
escala não diz quando foi atribuído. Com a apresentação dentro do período de assistência só há uma leitura; com a
apresentação à hora em que ela acaba, ou depois, há duas — e a app não escolhe:
- **o repouso** (`data/today.js`): a assistência a acabar às 12:00 e a apresentação às 12:00 → "Incerto · 0:00 (mín
  12:00)", chamada ou repouso curto (a minha versão de há pouco dizia "Sim");
- **o PSV** (`ftl/index.js`, `computeDuty`, `foldStandbyIntoFlight`, `carriedStandbyOf`): abaixo das 10 h entre o fim da
  assistência e a apresentação o motor lia sempre uma chamada e reduzia o máximo de certeza. Agora o garantido é o máximo
  reduzido e o possível o inteiro: assistência 07:00–18:00, apresentação às 18:00, PSV de 10:30 → máximo entre 6:00 e
  11:00, **incerto** (antes: "excede"), com o que falta: "se o voo te foi atribuído durante a assistência… se já estava na
  escala, não reduz — mas então o repouso antes do voo é curto" (dúvida nova `standbyCall`, `data/ftlUnknowns.js`). Dentro
  do garantido continua "dentro"; acima do possível continua "excede". O ORO.FTL.210 fica entre as duas contas. Vale igual
  para a assistência da véspera. **Mudança de número. A versão do motor sobe para 17.**
Expectativas mudadas: A-167 (o possível passa de 12:15 a 12:45), A-234 na importação (HSBY até às 11:00 e apresentação às
11:00: veredicto "incerto", antes "ok"), e duas desta sessão.

**2 · O Detalhe do voo, o pós-voo do Início, o registo 245 e a importação veem a assistência de antes do voo**
(`ftlForDuty` → `standbyBeforeOf`). Quem calcula o voo sozinho, com a escala à mão, procura a assistência do mesmo dia ou
da véspera com a mesma regra do registo do dia. Assistência 07:00–19:00 e apresentação às 18:00: o Detalhe mostrava máximo
11:00, "dentro"; agora 6:00, excede — o mesmo que "Dentro dos limites?". A assistência declarada à mão no voo (Completar →
"Assistência antes do voo") manda sobre a da escala.

**Provas:** `npm test` verde (33 suites; golden 867, cartões 251). A regra (durante → certa; do fim até ao repouso mínimo
→ duas leituras; depois → nada) contra a assistência declarada à mão e contra o voo sem assistência: 9 666 combinações, no
mesmo dia e de um dia para o outro, 0 diferenças. O voo sozinho contra o registo do dia: 9 486 combinações, 0 diferenças.
Vistas do repouso 37 050 comparações, 1 diferença (a de sempre); "Repouso até" 32 967, 0 diferenças; mais repouso nunca
piora: as mesmas três classes.

**Sem revisão independente.**

## 2026-11-12 — A lei não olha para a data: assistência em casa logo antes de um voo (Fable 5.2, a mesma sessão; por gravar)

O Nuno: "sim, avança" (os pontos 1 e 2 da verificação, juntos). Testes primeiro (bloco "A ASSISTÊNCIA EM CASA LOGO ANTES
DE UM VOO" no golden, 30 casos; 3 expectativas antigas mudadas de propósito; golden 828 → 858). Nada visto no iPhone.

(**Corrigido na entrada de cima:** abaixo das 10 h depois do FIM da assistência o máximo já não se reduz de certeza —
fica entre o reduzido e o inteiro, incerto. Só a apresentação durante a assistência reduz de certeza.)

**1 · O PSV com a assistência da véspera** (`ftl/index.js`, `carriedStandbyOf`). O motor do dia passa a ver a assistência
que foi o último serviço da véspera (em casa, ou no aeroporto com alojamento) quando o 1.º voo de hoje se apresenta antes
de passar um repouso mínimo desde o fim dela:
- apresentação durante a assistência, ou menos de 10 h depois do fim → a assistência vai até à apresentação e reduz o
  máximo (CS FTL.1.225(b)(5) e (7)), como já acontecia no mesmo dia. Assistência 14:00–02:00, apresentação à 01:00, PSV
  de 10:30: era máximo 11:00, "dentro"; agora máximo 6:00, excede. **Mudança de número;**
- 10 h ou mais, mas menos do que as 12 h (10 h fora da base) → as duas leituras, PSV incerto ("falta saber se houve um
  repouso mínimo"), como no mesmo dia;
- mais de 16 h do início da assistência à apresentação, com a apresentação depois do fim dela → não pode ter sido uma
  chamada: o PSV não muda, e o que falha é o repouso;
- ORO.FTL.210: hoje só conta 25 % do tempo que vai do fim da assistência à apresentação (a véspera já contou o resto);
- o registo de cada dia guarda sempre a assinatura dos seis dias antes: se a assistência da véspera entrar na escala
  depois, o dia do voo recalcula-se. **A versão do motor sobe para 16.**
Prova: a assistência da véspera contra a mesma assistência declarada à mão no voo, 5 538 combinações de horas, 0 diferenças.

**2 · O repouso: chamada ou repouso curto, no mesmo dia como no dia seguinte** (`data/today.js`). Com menos do que o
repouso mínimo entre o fim de uma assistência em casa e um PSV, a app não sabe se o voo foi atribuído durante a
assistência (a apresentação pode ser depois do fim dela — EASA, FAQ 47642 — e não há repouso entre os dois) ou se já estava
na escala (repouso curto). O repouso passa a ter duas linhas do tempo, com chamada e sem chamada (`buildLine`, `svcs.alt`),
e o veredicto só é certo quando as duas concordam (`pairBoth`):
- **no mesmo dia: "Incerto" (antes: "Sim")**, com o texto que já existia para o dia seguinte. Assistência 06:00–12:00 e
  voo às 16:00 → "Incerto · 4:00 (mín 12:00)". **Mudança de número;**
- curto nas duas leituras continua "Não": mais de 16 h do início da assistência à apresentação; o repouso antes da
  assistência também curto; a assistência colada a outro serviço (menos de 10 h depois dele);
- o voo apresenta-se durante a assistência → chamada de certeza, em qualquer dia: mede-se o repouso de antes da
  assistência. De um dia para o outro o Início mostrava "Incerto · −1:00"; agora "Sim". (Nesta entrada lia-se também
  como chamada certa a assistência que acaba no minuto da apresentação: era uma escolha minha, retirada na entrada de
  cima — fica "incerto".);
- a leitura da chamada chega ao repouso SEGUINTE: se o repouso de antes da assistência foi, talvez, um repouso reduzido,
  o que vem depois do voo fica "incerto entre 12:00 e 12:30" (antes, de um dia para o outro: "certo"); o mesmo no "+2 h ou
  +4 h" do prolongamento e no "Repouso até";
- as três vistas passam pela mesma conta (`pairOne`), em vez de cada uma repetir a sua.
Expectativas antigas mudadas: "prolongado, 16 h, assistência + prolongado" (lia-se sempre como chamada; agora incerto) e o
caso do "curto" falso de cima (o voo depois da assistência é agora a própria bifurcação).

**Provas:** `npm test` verde (33 suites; golden 858, cartões 251); exportação iOS sem erros. Vistas: 37 050 comparações,
1 diferença (a mesma de antes: serviço sem fim seguido de serviço sem apresentação). "Repouso até" contra "Tenho
descanso?": 32 967 comparações, 0 diferenças. Mais repouso nunca piora: 177 760 veredictos, 384 retrocessos — com uma
assistência em casa antes do voo só fica a regra das 16 h (120); os outros (264) são de voos, escritório, formação e
assistência no aeroporto no mesmo dia, que não mudaram (ponto 5 do grupo 0).

**Sem revisão independente.** O que ficou por fazer está no grupo 0, em cima.

## 2026-11-12 — Verificação do repouso (Fable 5.2, sessão própria; duas correções, por gravar)

O combinado: verificar tudo o que mudou no repouso no ramo `calculos-repouso-2` antes de passar ao `main`. Sessão sem o
contexto das anteriores: só o código, `fontes/` e esta lista. Os cenários ficaram fora do repositório.

**O que foi conferido e bate certo**
- **`npm test`** antes e depois: 33 suites, saída 0 (golden 817 → 828 com os casos desta sessão; cartões 251).
- **A lei, regra a regra**, lida de novo nos textos (ORO.FTL.105(21), 205(d), 225, 230, 235; CS FTL.1.205(c)(6), 225, 230,
  235; GM1 CS FTL.1.225; FAQ 47610, 47630, 47642, 47645): E1 a E5 e M1 a M5, 6.ª passagem (1 a 5 e 7), "a regra sem
  exceção" (A, B, C) e 7.ª passagem (1 a 3). As expectativas do golden dessas quatro rondas dão o que os textos dão; onde
  o texto não fecha, a app dá "incerto" com as duas pontas. Grelha própria da assistência em casa (3 posições × 7
  repousos): o piso, o serviço anterior e a chamada saem como a regra escrita.
- **As vistas** (Início, Simulação, Estatísticas): 77 610 comparações em 7 sementes, com dados incompletos; 2 diferenças,
  as duas do mesmo caso (serviço sem fim seguido de serviço sem apresentação: "sem dados" no Início, "incerto" na Simulação).
- **"Repouso até" contra "Tenho descanso?"**: um voo posto à hora do "Repouso até" dá sempre "Sim" e um minuto antes da
  ponta de baixo nunca dá "Sim" — 38 426 comparações, 0 diferenças (fora os voos que caem no mesmo dia do serviço e se
  juntam a ele: é o ponto 2 do grupo 0).
- **Mais repouso nunca piora**: 223 090 veredictos, 560 retrocessos, todos de três classes conhecidas — a chamada deixa de
  ser possível acima das 16 h de assistência (125; é a regra A); mesmo dia → dia seguinte (419); limiar de juntar no
  mesmo dia (16). Nenhuma classe nova.
- **`main` contra o ramo, por classe**: sem longo curso nem assistência em casa, 27 534 veredictos, 531 diferentes — todos
  das mudanças escritas (repouso reduzido com as horas do prolongamento, "só antes de um PSV", regra C). Com longo curso e
  assistência, as classes são as do sítio (E1), das noites locais, da assistência (A, B) e da regra C. Vi um exemplo de
  cada classe, não cada caso.
- **FAQ 47642 completa** lida e guardada (`fontes/easa/faq-47642.txt`): não fecha a dúvida "chamada ou repouso curto".
- **Lei portuguesa**: o DL 139/2004 está revogado; vale o DL 25/2022 (guardado em `fontes/pt/`). Para o repouso remete
  para o ORO.FTL.235 (art. 11.º, n.º 1): não há mínimo antes de um serviço que não é PSV. O que traz a mais está no
  ponto 5 do grupo 0.

**Dois erros corrigidos (teste primeiro; bloco "VERIFICAÇÃO DO REPOUSO" no golden, +11)**
1. **Um "curto" falso** (`data/today.js`, `nextFitsReduced`). 13 h de serviço, 12 h de repouso (só legal como repouso
   reduzido), assistência em casa 06:00–10:00 e voo 9 h 30 depois: "Não". A app tomava a assistência seguida de voo por
   um serviço repartido, que não pode vir depois de um repouso reduzido (ORO.FTL.220(c)). Não é um repartido: o
   intervalo é "dentro de um PSV" (ORO.FTL.105(6)). Agora "Incerto" (repouso reduzido); o mesmo com escritório ou
   formação antes do voo. Dois voos com um intervalo pelo meio continuam "curto".
2. **Um "dentro" falso no PSV** (`ftl/index.js`, `restBetweenDuties`; já vinha do `main`). Assistência em casa
   07:00–19:00 na escala e chamada com apresentação às 18:00, PSV de 10:30: o motor lia "23 h de repouso" entre os dois (a
   conta dava a volta à meia-noite), não juntava a assistência ao voo e dizia máximo 11:00, "dentro". São 11 h de
   assistência: máximo 6:00, excede (CS FTL.1.225(b)(5) e (7)) — como já saía com a assistência a acabar às 18:00.
   Vale para qualquer serviço que se apresenta antes de o anterior do mesmo dia acabar (dois voos sobrepostos deixam de
   ter "23 h 45 de repouso"). **Mudança de número. A versão do motor sobe para 15.**

**O que ficou por corrigir:** os pontos do grupo 0, em cima (os dois primeiros ficaram feitos na entrada acima desta).

**O que não foi visto:** os ecrãs no iPhone; cada caso das diferenças `main` contra ramo (só as classes); o motor do PSV
fora da assistência e dos serviços sobrepostos.

## 2026-11-12 — As correções da 5.ª revisão do repouso (Fable 5.2, a mesma sessão; por gravar)

O Nuno: "avança. e quero tudo corrigido". Testes primeiro em cada um (bloco "5.ª REVISÃO INDEPENDENTE DO REPOUSO" no fim de
`scripts/ftl-golden.test.js`, 45 casos; o golden passou de 713 para 758). Nesta ronda só `data/today.js` mudou contas; na
6.ª passagem (abaixo) mudou também o motor do PSV do dia, e a versão do motor subiu para 13. Nada visto no iPhone.

**Os nove achados (entrada de baixo), como ficaram:**
- **E1 · O sítio de um serviço em terra sem rota.** A assistência em casa ou no hotel, a assistência no aeroporto, a
  formação e o escritório não levam o tripulante a lado nenhum: ficam onde o último serviço com rota o deixou (com ou sem
  apresentação). Dali sai o piso (12 h na base, 10 h fora — ORO.FTL.235(a)(1)/(b)), o limiar de juntar serviços do mesmo dia e
  as noites locais "na base", que num hotel já não se pedem. Depois de um voo sem rota não se sabe onde ele acabou: fica o
  valor de antes. **Mudança de número, grande:** fora da base, os mínimos depois de formação, escritório e assistência no
  aeroporto sem rota passam de 12 h para 10 h; e as rotações com fuso deixam de se "partir" nesses serviços — voltam a
  pedir noites locais onde antes não pediam (LIS→EWR, assistência no aeroporto de lá, EWR→LIS: 2 noites na base).
- **E2 · Os pisos de 14 h são desse PSV** ("the minimum rest following that FDP", CS FTL.1.235(b)(3)(ii); "the minimum
  rest at destination", CS FTL.1.205(c)(6)): sem nenhum repouso de 14 h desde ele, uma assistência pelo meio não os apaga,
  antes ou depois da meia-noite. Com o serviço acima das 14 h: entre as 14 h e o serviço → incerto.
- **E3 · Serviço sem apresentação antes da assistência.** O veredicto passa a "incerto — falta a apresentação do serviço
  de …" (curto abaixo do piso do sítio); o sítio da assistência vem dele. Também entre duas assistências.
- **E4 · "Repouso até" e o mínimo da Simulação** nunca ficam antes de o "Tenho descanso?" deixar de dizer "Não". **E não
  escolhem (o Nuno, 2026-11-12: "não faz mal mexer no desenho do cartão. tem é que seguir a lei"):** quando o mínimo
  depende de uma leitura que a lei não fecha — a assistência em casa, o prolongamento depois dela, pernas que não batem
  certo, serviço repartido ou dois, repouso anterior talvez reduzido, serviço sem apresentação —, o motor devolve as duas
  pontas e o motivo (`restUntilAfter`: `untilLoMs`/`untilHiMs`, `requiredLoMin`/`requiredHiMin`, `why`) e os ecrãs
  mostram-nas: o cartão do repouso ("mín. 16 h–18 h" · "14:00 no máximo" · "cumprido entre 12:00 e 14:00 · a companhia
  fixa o repouso depois da assistência"), o topo da pernoita ("Incerto", com "no mínimo" e "no máximo"), a pernoita a
  seguir ("mínimo 10 h a 13 h") e a Simulação ("16:00 a 18:00", com o artigo). Com as peças que o cartão já tinha (a
  regra ficou em `docs/design-system.md` §14); golden `test:homecards` (+18).
- **E5 · Noites locais depois de uma rotação com fuso.** Têm de caber num só repouso (ORO.FTL.105(21): contínuo, livre de
  assistência); uma assistência em casa interrompe-o. Com 2 noites antes da assistência estão dadas; senão pedem-se ao
  repouso depois dela. **Mudança de número, para o lado mais exigente** (antes: "Sim").
- **M1** opção (i) ou (ii) do prolongamento incerta quando o repouso antes dele veio depois de uma assistência — caso novo
  `extAfterStandby`, com texto no Início e na Simulação; **M2** dois prolongados com um dia só de assistência pelo meio
  continuam "consecutivos"; **M3** o repouso a seguir a um "incerto" por assistência pode levar a diferença da
  CS FTL.1.235(c)(3); **M4** uma reserva que começa durante o serviço anterior e continua depois dele corta a recuperação
  (a que o envolve, não).

**Mais três que apareceram ao corrigir (com teste):**
- **M5** · depois de um repouso "incerto" por assistência no mesmo dia do serviço, o repouso seguinte abaixo do mínimo saía
  "curto" como se o anterior tivesse sido de certeza um repouso reduzido; na leitura do piso não foi → incerto.
- Uma formação sem rota num hotel continuava "na base" e, com a correção do E1, passava a apanhar as noites locais → o E1
  foi alargado a todos os serviços em terra (acima).
- Uma rotação fechada por um regresso SEM apresentação não se via fechada: os voos locais seguintes herdavam as noites
  (LIS→EWR, regresso sem apresentação, voo local, voo: "1 de 3 noites"; já era assim) → um serviço sem apresentação que
  acaba na base fecha a rotação.

**Provas:** `npm test` verde (33 suites); exportação iOS sem erros. Motor antigo contra o novo, escalas aleatórias: sem
sair da base e sem assistência em casa nem reserva, 32 002 veredictos e 0 diferenças; sem assistência nem reserva mas com
longo curso, as diferenças são todas do sítio dos serviços em terra (E1); com assistência, vistas por classe (as maiores:
noites locais, sítio, serviço sem apresentação). As três vistas (Início, Simulação, Estatísticas): 68 394 comparações com
longo curso, 0 diferenças, 0 exceções. Mais repouso nunca piora o veredicto, salvo o caso já pendente (assistência e voo
em dias diferentes).

**Revisão independente destas correções — 6.ª passagem** (Opus, só com o código e a lei, sem as minhas conclusões). 0
diferenças entre as três vistas, 0 exceções com dados incompletos, custo aceitável (um ano de escala: 209 → 332 ms). Achou
seis erros e uma suspeita; cinco erros e a suspeita corrigidos com teste primeiro (bloco "6.ª PASSAGEM" no golden, +19; o
golden está em 777), o sexto ficou como estava, com a razão:
1. depois de um prolongado com "+2 h ou +4 h" incerto, o repouso seguinte saía "certo" quando na leitura das +4 h o anterior
   só era legal como repouso reduzido (CS FTL.1.235(c)(3)) → incerto, entre 12:00 e 13:30 no cenário (era novo);
2. a opção (i)/(ii) do prolongamento ignorava as outras dúvidas do repouso antes dele (repouso anterior talvez reduzido,
   pernas, repartido ou dois) → caso novo `extPreRest`, "16:00 a 18:00" (já vinha de antes);
3. noites locais depois de uma rotação com fuso, com formação, escritório ou assistência no aeroporto pelo meio: dava
   "certo" (com a assistência em casa, "curto"). São períodos de serviço: a FAQ 47610 da EASA mede o repouso antes do PSV
   pelo serviço que vem logo antes, e a CS FTL.1.235(b)(3)(i) não diz se as noites ainda se pedem → **incerto** ("1 de 2
   noites locais na base", caso novo `rotationNights`; o "Repouso até" dá as duas pontas). O regresso e a formação no MESMO
   dia são um só período de serviço: as noites pedem-se de certeza (antes perdiam-se). Só assistência em casa: continua curto;
4. a resposta mudava com a meia-noite quando o serviço antes da assistência vinha depois de um repouso talvez reduzido
   (12 540 pares: 967 diferenças → 0 no estado e nos números; fica só o motivo mostrado) (já vinha de antes);
5. o sítio de um serviço em terra media-se contra a base do dia do VOO; com a base a mudar ficava trocado → guarda-se o
   aeroporto e compara-se com a base do dia do serviço em terra;
6. **não alterado nesta passagem — mudado ao fim do dia (ver "A regra sem exceção", B: passa a incerto).** A revisão diz
   que manter as 14 h (fuso, repouso a bordo) na leitura do piso depois de uma assistência
   é meia frase: "at least as long as the preceding duty period, or 14 hours". Fica como está porque é a mesma construção
   da leitura do piso no caso geral — no ORO.FTL.235(a)(1), "the preceding duty period, or 12 hours", a leitura B também
   dá por ausente o serviço precedente e fica com as 12 horas — e porque em qualquer leitura falta um repouso de 14 h
   entre esse voo e o seguinte (ou o que vem logo a seguir ao voo, ou o que vem antes do PSV). Vai com o resto para a ANAC;
7. (suspeita, confirmada) o motor do PSV do dia ainda lia a assistência no hotel "na base": voo 10 h 30 depois → "repouso
   ou chamada?" e PSV incerto entre 8:00 e 13:00, quando fora da base 10 h já são um repouso → `gapInBaseOf` no `ftl`
   (a última chegada, como no repouso). **A versão do motor sobe para 13** (o registo dos dias recalcula-se no telemóvel).
Depois destas correções: três vistas 68 394 comparações, 0 diferenças; sem sair da base e sem assistência nem reserva,
31 995 veredictos iguais e 7 que mudam só o mínimo mostrado (o `extPreRest`). **Estas últimas correções estão em revisão
(7.ª passagem, só sobre elas).**

**A regra sem exceção (2026-11-12, fim do dia).** O Nuno perguntou se estava tudo como a lei diz; a resposta foi "ainda
não", com três sítios onde a app dizia "curto" ou "certo" por uma leitura sua. "Avança": os três passam a **incerto**, com
teste primeiro (bloco "A REGRA SEM EXCEÇÃO" no golden; 18 casos novos e 12 expectativas mudadas de propósito; golden 795).
- **A · Assistência em casa num dia e voo no dia seguinte, abaixo do mínimo** (antes: "curto"). Pode ter sido uma chamada:
  "standby ceases when the crew member reports at the designated reporting point" (CS FTL.1.225(b)(5)). Incerto
  (`standbyCall`). Só é curto quando a leitura da chamada também falha: mais de 16 h do início da assistência à
  apresentação (CS FTL.1.225(b)(1)), ou o repouso ANTES da assistência já é curto.
- **B · Depois de uma assistência em casa, o que vinha do último voo** — as 14 h, as horas do prolongamento, as noites
  locais (antes: "curto" abaixo delas; decisão da 4.ª revisão para o prolongamento, estendida por mim às 14 h e às noites,
  contestada na 6.ª). Na leitura do piso o repouso depois da assistência é só o piso do sítio (12 h / 10 h): incerto entre
  o piso e o mínimo do voo; curto só abaixo do piso. **Mudança de número:** prolongado, assistência, 12 h → era "Não (mín
  16:00)", agora "Incerto, entre 12:00 e 18:00".
- **C · Escritório, formação ou assistência no aeroporto entre um voo com horas a mais e o PSV seguinte** (antes: "certo",
  pela resposta da EASA, FAQ 47610). Sem um repouso com o mínimo desse voo desde ele: incerto (`groundBetween`), entre o
  mínimo pelo serviço em terra e o do voo. Sem horas a mais no voo fica como estava (é o caso a que a FAQ responde).
Três vistas: 68 394 comparações, 0 diferenças. Textos novos no Início e na Simulação; o cartão do repouso mostra as duas
pontas também nestes casos. **Estas alterações não tiveram revisão independente: entram na verificação de amanhã.**

**7.ª passagem (2026-11-12, noite): a revisão independente das correções da 6.ª (agente Opus, cenários corridos).** Chegou
depois de "a regra sem exceção". Três erros confirmados — reproduzidos com os cenários do revisor e corrigidos com teste
primeiro (bloco "7.ª PASSAGEM" no golden, 22 casos; golden 817):
1. **O "+2 h ou +4 h" do prolongamento mudava com a meia-noite.** 13 h de serviço → 12 h 30 → D → assistência em casa num
   dia próprio → 14 h 15 → prolongado. O mínimo antes do prolongado é 12:00 ou 12:30 (D veio de um repouso talvez reduzido,
   CS FTL.1.235(c)(3)); com 14 h 15 a opção (i) só cabe numa das leituras (ORO.FTL.205(d)(1)). A app dizia "certo" com
   16:00 a seguir ao prolongado; com a assistência no mesmo dia de D já dizia "incerto, 16:00–18:00". Causa: a cadeia da
   assistência só via o aumento de D ao nível de cima (`requirementAfter`, `lvl === 0` → `lvl <= 1`). Agora dá o mesmo
   incerto nos dois casos, e no "Repouso até". **Acrescento meu, sem revisão:** o mesmo com um escritório no lugar da
   assistência, e o aumento do repouso reduzido passa a contar como "hora a mais" de D na regra C (repouso talvez
   reduzido, D, 11 h, escritório, 12 h 15 → era "certo", agora "incerto entre 12:00 e 12:30", `groundBetween`).
2. **O motor do PSV situava o serviço em terra com outra regra** (`lastArrivalBefore`: saltava um voo sem rota, não via um
   serviço sem apresentação do próprio dia, não aceitava uma rota de um só aeroporto, só 14 dias para trás) e dizia "fora
   da base" com certeza — 10 h 30 entre assistência no aeroporto e voo davam "repouso" e PSV certo, quando o repouso
   (`data/today.js`) dizia "na base" ou "não se sabe". Agora `groundPlaceBefore` no `ftl`, com a regra do repouso: o
   último serviço a acabar antes, com ou sem apresentação, sem limite de dias; voo sem rota = não se sabe = valor por
   omissão. **A versão do motor sobe para 14.** Motor contra repouso com dados incompletos (voos sem rota, sem
   apresentação, formação com rota de um aeroporto): 3 844 pares, 0 discordâncias.
3. **Um serviço em terra SEM FIM na cadeia** (rotação com fuso → formação sem hora de fim → escritório → voo): as noites
   locais deixavam de se pedir ("certo") e o "Repouso até" discordava ("incerto"). Agora o serviço sem fim não pára a
   cadeia (o repouso depois dele não conta, porque não se sabe quanto foi) e dá "incerto" nas quatro vistas; o mesmo nas
   cadeias da assistência em casa e do serviço em terra (prolongado → formação sem fim → escritório → 14 h: era "certo",
   agora "incerto entre 12:00 e 18:00"). O "Repouso até" passa a usar a mesma linha das outras vistas (antes tirava os
   serviços sem fim e contava o tempo deles como repouso).

Suspeitas do revisor: (4) as noites da rotação pedem-se como "incerto" sem limite de tempo — **não mexi**, vai para a
verificação (grupo 0); (5) o repouso estava 2 a 4 vezes mais lento do que no `main` — o mínimo de cada serviço passa a
guardar-se por linha (`RQ_MEMO`) e a procura do serviço anterior deixa de ordenar a escala a cada pergunta: um ano de
escala volta ao tempo do `main` (cerca de 100 ms no PC), com os resultados iguais (impressão digital de 2 000 escalas,
antes e depois).
**Fica por fazer (não é desta passagem, já era assim no `main`):** um serviço que VOA sem hora de fim, seguido de
assistência em casa ou escritório e depois de um voo, dá "certo" pelo piso — o mínimo desse serviço não se sabe; devia
ser "incerto" sem teto, com um texto novo ("falta a hora de fim do serviço de …"). Está no grupo 0.
Provas: `npm test` verde (golden 817, cartões 251); três vistas 62 110 comparações em 3 sementes, 0 diferenças; com
serviços sem fim, 59 654 comparações e 45 622 do "Repouso até" contra a Simulação, 0 diferenças; exportação iOS sem erros.
**Nada visto no iPhone. Estas correções não tiveram revisão independente: entram na verificação de amanhã.**

## 2026-11-11 (noite, 12) — 5.ª revisão independente do repouso (Fable 5.2, sessão própria; só revisão, nada mudou no código)

Revisto: `data/today.js` no ramo `calculos-repouso-2` (a regra da assistência em casa — `requirementAfter`, 'standbyHome',
`refOf`; `recoveryIn`; `estBefore`) contra `fontes/ftl` e `fontes/easa`, com cenários corridos (os ficheiros de cenários
ficaram fora do repositório). `npm test` verde antes e depois (saída 0). Contexto de todos os cenários: pós-voo 30 min,
base LIS, piloto. **Os achados foram corrigidos a seguir, na entrada de cima (2026-11-12).**

**Erros (cada um com o cenário corrido):**
- **E1 · A assistência no hotel ainda é lida "na base" em dois sítios.** A 4.ª passagem corrigiu o piso (`refOf`), mas o
  `ra.inBase` da própria assistência (sem rota → "na base") continua a ser lido em:
  - `rotationNights` (noites locais na base, CS FTL.1.235(b)(3)(i)): voo LIS→EWR a 10/1 (10:00–19:00), assistência no
    hotel a 11/1 (00:30–02:00), voo de volta 14 h depois → "Não · 0 de 2 noites locais na base" (curto, com 14:00 de
    repouso e mínimo mostrado 10:00). Com a assistência no hotel a 11/1 das 12:00 às 14:00, o "Repouso até" depois dela
    salta para 13/1 às 06:00 (2 noites). No `main` já dava.
  - juntar serviços do mesmo dia (`restServices`, limiar `p.ra.requiredMin` = 12 h): voo LIS→FNC (fim 21:30), assistência
    no hotel 00:30–01:00, voo FNC→LIS 10 h 30 depois, no mesmo dia → "curto 3:00 (mín 13:00)"; a mesma assistência às
    23:00–23:30 da véspera → "incerto, entre 10:00 e 13:00".
- **E2 · Os pisos de 14 h apagam-se com uma assistência depois da meia-noite.** Voo reforçado LIS→FNC (07:30, calços
  20:00, repouso a bordo: piso 14 h, CS FTL.1.205(c)(6)); assistência no hotel 21:00–22:00 do mesmo dia e voo 12 h depois →
  "curto (14:00)"; assistência às 00:30–01:30 e voo 12 h depois → "incerto, entre 10:00 e 14:00". Pelo código, o mesmo com
  o fuso de 4 h ou mais (CS FTL.1.235(b)(3)(ii): "the minimum rest following that FDP") — no cenário corrido fica tapado
  pelo E1. É o caso que a 4.ª passagem corrigiu só para o
  prolongamento e para os pisos de 12 h / 10 h (`if (ref.ra.floorMin === std)`; no bloco só de assistência o piso volta ao normal).
- **E3 · Um serviço sem apresentação antes de uma assistência em casa é esquecido** (a regra só anda para trás pelos
  serviços com apresentação):
  - o mínimo: serviço sem apresentação 06:00–20:00 (14 h 30 à vista), assistência no dia seguinte 10:00–14:00, voo 12 h
    depois → "certo (12:00)" nas três vistas; sem a assistência o mesmo repouso dá "incerto" (falta a apresentação);
  - o sítio: LIS→FNC sem apresentação, assistência no hotel 08:00–14:00, voo FNC→LIS 11 h depois → "curto (12:00, base)";
    com a apresentação → "certo (10:00, fora)".
- **E4 · O "Repouso até" e o `need` da Simulação num dia só de assistência não acompanham o "Tenho descanso?"**
  (`restUntilAfter` lê `requiredMin`, não o mínimo de todas as leituras). Prolongado a 2/11 (07:00, calços 20:30),
  assistência a 3/11 (08:00–20:00): "Repouso até 08:00" (12 h), mas um voo às 08:00 dá "Não (mín 16:00)". Depois de um
  serviço de 13 h e 12 h livres: "Repouso até" a 12 h, e o "Tenho descanso?" incerto até às 13 h.
- **E5 · As noites locais na base depois de uma rotação com fuso perdem-se com uma assistência em casa pelo meio.**
  Rotação LIS–EWR, regresso a 13/1 às 07:30, voo a 14/1 às 08:00 → "Não (1 de 2 noites)"; com uma assistência em casa a 13/1
  (12:00–20:00) pelo meio → "Sim". Já era assim no `main`; é o lado permissivo.

**Menores (terceira ordem; confirmados):**
- **M1** · PSV prolongado a seguir a um bloco só de assistência: a opção (i) (+2 h) sai como certa quando, na leitura A, o
  repouso antes não teve as +2 h (serviço de 13 h, 12 h, assistência, 14 h 30, prolongado → depois dele "certo com 16:00";
  devia ficar entre 16:00 e 18:00).
- **M2** · Dois prolongados com uma assistência num dia próprio pelo meio perdem o "consecutivos" (ORO.FTL.205(d)(2)):
  "certo com 16:00"; sem a assistência, 18:00. A 2.ª passagem tratou só a assistência no mesmo dia do 2.º.
- **M3** · Depois de um repouso "incerto" por assistência em casa, o repouso seguinte não leva a diferença da
  CS FTL.1.235(c)(3): "certo com 12:00"; o mesmo caso sem a assistência dá "incerto, entre 12:00 e 12:30".
- **M4** · Uma reserva que começa 1 minuto antes do fim do serviço (pós-voo incluído) é ignorada na conta da recuperação
  (09:59–23:00 → há recuperação; 10:00–23:00 → não há).

**Sem erro:**
- `recoveryIn`: 17 cenários (reserva com e sem horas, só com início, a acabar depois do serviço seguinte, assistência,
  escritório, serviço sem apresentação) — todos como a regra escrita.
- `estBefore`: o teto das 10 h (9:59 curto, 10:00 incerto), mesmo dia e dia seguinte.
- A regra da assistência com os pisos normais e com o prolongamento: grelha de 4 serviços × 5 posições da assistência (mesmo
  dia, a atravessar a meia-noite, dia seguinte) × 12 repousos — o mesmo veredicto dos dois lados da meia-noite, salvo o E1.
- Início, Simulação e Estatísticas: 54 902 comparações em 4 000 escalas aleatórias, 0 diferenças, 0 exceções.
- Mais repouso nunca piora o veredicto: 67 016 veredictos, 45 retrocessos, todos do caso já pendente (assistência e voo em
  dias diferentes não se juntam: voo às 23:45 do dia da assistência "certo", às 00:00 "curto").
- A lei: as citações batem com `fontes/` (CS FTL.1.225(b)(4), ORO.FTL.225(c) e (f)(3), ORO.FTL.105(21), ORO.FTL.235(d),
  CS FTL.1.235(c)(5), GM1 CS FTL.1.225(c)). "Se já houve um repouso com o mínimo do último serviço, chega o piso" é regra
  da app, não texto da lei (já estava dito).

**Não visto:** os ecrãs no iPhone; a reserva entre um serviço e o PSV seguinte (o repouso mede-se através dela — regra
anterior a este ramo); o texto completo da FAQ 47642 da EASA (em `fontes/easa/` só está o extrato).

## 2026-11-12 (noite, 11) — Os cinco que tinham ficado: prolongamento, assistência em casa, Estatísticas, dois serviços, (c)(5)

O Nuno: "temos que corrigir isto". Testes primeiro em cada um. Nada visto no iPhone. (O que vinha de antes está gravado: `1fdae68`.)

1. **Repouso depois de um PSV prolongado.** "os períodos mínimos de repouso pré-voo e pós-voo devem ser aumentados de duas
   horas, ou o período de repouso pós-voo deve ser aumentado de quatro horas" (ORO.FTL.205(d)(1)): o que aumenta é o mínimo, e
   nada proíbe que seja o do repouso reduzido. Entre o reduzido mais as horas do prolongamento (12 h + 4 h = 16:00 na base) e
   o exigido (17:30 no exemplo) o repouso passa de "curto" a **incerto**; abaixo, curto. Um golden mudou de propósito
   (reststatus "205(d) … com 16:00").
2. **A assistência em casa não é "serviço precedente" do repouso.** "Standby other than airport standby counts (partly) as
   duty for the purpose of ORO.FTL.210 only" (GM1 CS FTL.1.225 (c)); a seguir a ela o repouso é o do ORO.FTL.235 (CS
   FTL.1.225(b)(4)) — o piso: 12 h na base, 10 h fora. Depois de 14 h de assistência em casa, 13 h de repouso eram "curto"
   (exigia 14 h); agora "certo". Num dia com assistência em casa e voo, o serviço precedente conta da apresentação do voo. A
   do aeroporto conta toda (ORO.FTL.225(c)). **Mudança de número, para o lado menos restritivo** — a regra de antes pedia
   mais do que a lei.
3. **Estatísticas.** "Curtos" passam a ser os repousos curtos de certeza; os que só são legais como repouso reduzido contam
   à parte: "N curtos · M incertos" no mosaico Corpo; na folha, "Repousos abaixo do mínimo" conta só os curtos e os incertos
   dizem-se na nota (acerto da 3.ª revisão).
4. **Partir um serviço em dois no Detalhe.** Com 10 h ou mais em terra entre pernas e as horas certas, a linha "Horas das
   pernas" oferece "As horas estão certas: são dois serviços" (ORO.FTL.105(6): não é um intervalo). O 1.º fica com a
   apresentação e as pernas até aí; o 2.º entra como serviço extra do dia, com a apresentação que escreveres (sem ela fica
   por indicar). Só no serviço principal do dia. Na folha que já existe, com os campos que ela já tem (sem Mobbin).
5. **No máximo 2 repousos reduzidos entre recuperações.** "There is a maximum of 2 reduced rest periods between 2 recurrent
   extended recovery rest periods" (CS FTL.1.235(c)(5)); a recuperação são "36 horas, incluindo 2 noites locais"
   (ORO.FTL.235(d)). A app conta para trás até à última recuperação: o 3.º repouso da banda reduzida é "curto".

**Provas (no fim, depois das quatro revisões):** `npm test` verde (33 suites; FTL 713, completar 53, estatísticas 185). Motor
antigo contra o novo: dias de um só serviço, 58 359 com 0 diferenças; dias de dois serviços fora das zonas novas, 36 720
iguais e 0 diferentes.

**Revisão independente — 1.ª passagem** (Opus, sem ver as minhas conclusões). Confirmou a leitura da lei nos cinco pontos e
0 diferenças fora dos casos novos. Achou cinco erros, corrigidos com teste primeiro:
- uma assistência em casa no fim do dia escondia o prolongamento do voo (o repouso a seguir perdia as 4 h) — o piso, o
  prolongamento e o sítio vêm agora do último serviço do bloco que não é assistência em casa;
- um repouso (talvez) reduzido depois de um PSV prolongado não aumentava o repouso seguinte (CS FTL.1.235(c)(3));
- as Estatísticas davam "incerto" a repousos que o Início dava "curto" — passam a usar o MESMO veredicto do Início;
- a apresentação do 2.º serviço (ao partir em dois) não era validada;
- um dia de reserva dentro das 36 h contava como recuperação.

**2.ª passagem** (Opus, sobre essas correções). Achou sete erros, corrigidos com teste primeiro:
- a correção da reserva estava larga de mais: qualquer reserva no intervalo anulava a recuperação. A lei pede UM período de
  "36 horas, incluindo 2 noites locais" (ORO.FTL.235(d)) livre de serviço e de reserva (ORO.FTL.105(21)): basta um troço
  contínuo antes, depois ou entre reservas. Uma reserva sem horas conta na leitura mais favorável;
- o repouso antes de um serviço que NÃO é PSV (escritório, formação) contava como repouso reduzido — a lei só fixa mínimo
  "antes de um PSV" (ORO.FTL.235(a)/(b));
- quando o repouso anterior só era reduzido numa das leituras (pernas que não batem certo), o seguinte saía "curto" em vez
  de "incerto";
- as Estatísticas não sabiam se o tripulante é piloto (o máximo do PSV seguinte depende disso) e discordavam do Início;
- ao partir em dois, a apresentação do 2.º aceitava-se ainda dentro do 1.º serviço (contavam os calços, não o fim do
  serviço com o pós-voo);
- partir em dois SEM a apresentação do 2.º fazia o Início e as Estatísticas saltarem esse serviço (davam "Sim" a um repouso
  de 8 h). Um serviço sem apresentação entre os dois dá agora "curto" abaixo de 10 h e "incerto" acima, nos três sítios;
- com uma assistência antes do 2.º PSV prolongado, os repousos adicionais não saíam "consecutivos" (ORO.FTL.205(d)(2)).

**Onde é leitura e não lei (para a ANAC, com o resto do pack):**
- *Assistência em casa (sem chamada) entre um serviço e o PSV — os textos NÃO decidem; fica "incerto" (4.ª revisão).*
  História, para não se repetir: a 2.ª revisão pôs o caso "incerto"; o Nuno perguntou "como corrigimos isto?"; eu concluí
  que os textos e as FAQ da EASA decidiam ("o piso, sempre") e tirei o incerto; a 4.ª revisão, pedida de propósito para
  atacar essa decisão, mostrou que não se aguenta, e repus o incerto com a regra completa. O que é certo nos textos:
  o repouso antes do PSV só começa quando a assistência acaba (ORO.FTL.105(21)) e é "a rest period in accordance with
  ORO.FTL.235" (CS FTL.1.225(b)(4)); a assistência em casa não é período de serviço para o 235 (só a do aeroporto,
  ORO.FTL.225(c); EASA FAQ 47630). O que NÃO dizem: por que serviço se mede esse repouso — pelo último serviço verdadeiro
  (leitura A: o mínimo dele) ou por nenhum (leitura B: o piso, 12 h na base / 10 h fora). As FAQ que citei tratam de outros
  casos (47630: assistência seguida de PSV; 47610: serviços sem PSV; 47645: reserva) e nenhuma responde a este.
  **Quem decide é o esquema de cada companhia:** "O período mínimo de repouso após um serviço de assistência que não conduz
  à atribuição de um PSV" é um dos elementos que o esquema tem de especificar (ORO.FTL.225(f)(3)).
  **Regra da app:** se depois do último serviço verdadeiro já houve um repouso com o mínimo dele (antes da assistência ou
  entre duas), chega o piso; senão, entre o piso e esse mínimo → incerto; abaixo do piso → curto. Depois de um PSV
  prolongado as horas do 205(d)(1) não se apagam com uma assistência pelo meio (o piso sobe-as nas duas leituras). Vale
  igual com a assistência no mesmo dia do serviço ou nos seguintes, e com várias seguidas. O sítio do repouso (base ou
  fora) é onde o último serviço deixou o tripulante.
  **Como se resolve de vez (pendente, grupo 2):** a frase do OM-A de cada companhia (easyJet, TAP) sobre o repouso depois
  de uma assistência sem chamada → uma regra por companhia, e o incerto passa a veredicto certo.
  As FAQ 47630, 47610, 47642 e 47645 ficaram em `fontes/easa/`, com o teste a conferir as frases citadas.
- *Repouso reduzido depois de um PSV prolongado.* Nenhum texto o proíbe (o ORO.FTL.220(c) só proíbe o repartido); a app dá
  "incerto" entre o reduzido mais as horas do prolongamento e o exigido.

**3.ª passagem** (Opus, sobre as correções da 2.ª). Uma expectativa do `HEAD` mudou (a do 205(d), já justificada); as três
vistas (Início, Simulação, Estatísticas) deram o mesmo em cerca de 10 600 comparações. Achou cinco erros; quatro corrigidos
com teste primeiro e o quinto desapareceu com a decisão de cima:
- partir em dois com o 2.º serviço a partir DEPOIS DA MEIA-NOITE gravava-o no dia do 1.º, antes dele (o Início dava "Sim" a
  um repouso de 10 h 30 na base) — a linha deixa de oferecer "são dois serviços" nesse caso (fica só corrigir as horas);
- um serviço sem apresentação no MESMO dia e a menos de 10 h do seguinte dava "curto" (0:30 de "repouso") — pode ser o mesmo
  PSV (intervalo, ORO.FTL.105(6); posicionamento antes do voo, ORO.FTL.215(a)): passa a "incerto";
- uma reserva que começa dentro do intervalo e só acaba depois de o serviço seguinte começar era ignorada na conta da
  recuperação — o troço livre acaba no início dela;
- um serviço sem apresentação no meio do intervalo não interrompia a recuperação;
- (o "incerto" da assistência em casa só olhava um bloco para trás — saiu com a decisão de cima).
Mais dois acertos: as Estatísticas usam o mesmo "serviço anterior" do Início; e "Repousos abaixo do mínimo" (folha das
Estatísticas) passa a contar só os curtos — os incertos dizem-se à parte, na nota.

**4.ª passagem** (Opus, pedida pelo Nuno, sobre a ronda da 3.ª). Conferiu no site da EASA que as citações de `fontes/easa/`
são literais. Deitou abaixo a decisão da assistência em casa (ver acima) e achou mais:
- depois de um PSV prolongado, 12 h a seguir a uma assistência em casa davam "certo" — as 4 h do ORO.FTL.205(d)(1)
  desapareciam; agora "curto" abaixo de 16:00 e "incerto" até às 18:00;
- a resposta mudava com a meia-noite (assistência no mesmo dia do voo: mínimo do voo; no dia seguinte: o piso) — a mesma
  regra nos dois casos;
- num bloco só de assistência o repouso contava sempre como "na base" (12 h), mesmo num hotel fora — passa a ser onde o
  último serviço deixou o tripulante (10 h fora, ORO.FTL.235(b));
- um serviço sem apresentação no mesmo dia tinha ficado "incerto" mesmo quando o repouso antes dele não pode chegar às 10 h
  (do fim do serviço da véspera aos calços dele) — volta a "curto" nesse caso;
- uma reserva a começar no minuto exato em que o serviço acaba era ignorada na conta da recuperação.
Um golden desta sessão mudou de valor: "prolongamento + assistência em casa no mesmo dia, 15 h" continua "curto", mas o
mínimo mostrado passa de 18:00 para 16:00 (o de todas as leituras; as 18:00 são o da leitura mais exigente).
Sem erro: a regra de não oferecer "são dois serviços" quando o 2.º parte no dia seguinte (7 casos corridos); o custo das
contas novas (um ano de serviços: Início 10 ms, Estatísticas 52 ms); cerca de 11 900 repousos aleatórios sem exceções.
**As correções desta 4.ª passagem não tiveram nova revisão independente.**

**Visto e mantido:** assistência em casa e voo no mesmo bloco (chamada), com menos do que o mínimo antes da assistência →
"curto": o repouso é livre de assistência (ORO.FTL.105(21), vinculativo), por isso acaba quando ela começa.

## 2026-11-11 (noite, 10) — Repouso reduzido, assistência + voo, mudança de hora, pernas no Detalhe (Fable 5.2)

O Nuno: "vamos corrigir isto" — os quatro pontos que tinham ficado por tratar. Testes primeiro em cada um. Nada visto no iPhone.

**1 · O repouso reduzido.** Um repouso abaixo do mínimo do ORO.FTL.235(a)/(b) dava sempre "curto".
- **A lei:** ORO.FTL.235(c) — "os planos que especificam os tempos de voo podem prever reduções dos períodos de repouso
  mínimos"; CS FTL.1.235(c): (1) mínimo de 12 h na base e 10 h fora; (2) "used under fatigue risk management"; (3) o repouso
  seguinte aumenta pela diferença; (4) o PSV seguinte reduz-se pela diferença; (5) no máximo 2 entre recuperações.
- **Agora** (`data/today.js` `reducedBand`, `restVerdict`): entre o mínimo reduzido e o mínimo normal o repouso é
  **incerto** — "só é legal como repouso reduzido, se a companhia o tiver", com a diferença. É "curto" abaixo do mínimo
  reduzido, e também quando o PSV seguinte não cabe no máximo menos a diferença. O repouso a seguir ao serviço seguinte fica
  com o mínimo entre o normal e o normal mais a diferença. Não se aplica depois de um PSV prolongado (205(d)(1)) nem com os
  pisos de 14 h (fuso, repouso a bordo).
- **MUDANÇA DE NÚMERO, grande, a saber:** nove expectativas auditadas passaram de "curto" a "incerto" — A-160 (a) (13:45
  depois de 14:00 de serviço), os repartidos do bloco 2 (12:30 depois de 13:30), A-242(3) (12:00 depois de 14:00) e a E1 da
  importação (10:45 fora da base depois de 12:00). Na prática: depois de um serviço longo, um repouso de 12 h ou mais na
  base (10 h fora) já não diz "curto"; diz "incerto" até se saber se a companhia tem repouso reduzido (pergunta nova para os
  sindicatos, grupo 4).
- **Fica dito:** a app não conta o máximo de 2 entre recuperações (di-lo no texto) nem mostra o máximo do PSV seguinte reduzido.

**2 · Assistência seguida de voo com 10 h ou mais entre o fim dela e a apresentação.**
- **A lei:** a assistência só acaba na apresentação (CS FTL.1.225(b)(5)) e o máximo reduz-se no que passa das 6 h ((b)(7));
  mas "If a minimum rest period as specified in ORO.FTL.235 is provided before reporting for the duty assigned during the
  standby, this time period should not count as standby duty" (GM1 CS FTL.1.225 (b)).
- **Agora** (`ftl/index.js` `dayFtlFromDuties` → `dayFtlCore`): com 10 h ou mais e menos do que o repouso do caso, o PSV só
  "excede" se excede nas duas leituras e só está "dentro" se está nas duas; senão incerto (`standbyRest`). Exemplo:
  assistência 08:00–10:00 e voo às 20:30 com PSV 5:30 → antes "excede 1:00" (máximo 4:30); agora incerto. As contas do dia
  (serviço, voo) são as de antes.

**3 · A noite da mudança de hora.** O tempo entre dois serviços do mesmo dia media-se pelo relógio (00:50 → 13:00 = 12:10) e
o repouso pelos instantes (11:10 reais a 29/03): podiam discordar. `restBetweenDuties` mede agora pelo tempo real quando
tem o dia (o relógio do dispositivo, como o repouso). Só muda nessas duas noites.

**4 · As horas das pernas no Detalhe.** Um serviço já guardado com as pernas a não bater certo só se corrigia pela
importação. O Completar ganha a linha "Horas das pernas" (`data/dutyComplete.js` `legTimesPatch`), que aparece quando o
motor diz que faltam as horas certas: a partida e a chegada de cada perna, na folha que já existe (sem ecrã novo — por isso
sem Mobbin; se a quiseres desenhada de outra maneira, é uma sessão de design). Só grava quando as horas passam a bater; os
calços, o tempo de voo e o fim de um posicionamento acompanham.

**O serviço do dia nos limites (ORO.FTL.210), nas duas leituras.** Num dia com dois serviços a 10 h ou mais (noite 9) ou com
assistência + voo, o serviço conta de duas maneiras (como um PSV repartido o intervalo conta todo, ORO.FTL.220(b); como dois
PSV não; a assistência até à apresentação ou só o que durou). Fica o CERTO (o menor) e o POSSÍVEL (o maior): um limite só
"excede" com o certo; com o possível fica incerto, e o texto diz "depende de como se lê o tempo em terra de N dia(s)". O
exemplo auditado do repartido ilegal passou de 17 h certas a 7 h certas e 17 h possíveis.

**Provas:** `npm test` verde (33 suites; FTL 658, completar 41). Serviços de um só serviço: 58 359 comparados com o motor
antigo, 0 diferenças. Dias de dois serviços fora das zonas novas: 36 720 iguais, 0 diferentes; nas zonas, o voo é sempre o de
antes, o serviço possível é o de antes e o certo nunca fica acima.

**Revisão independente (Opus, sessão própria):** confirmou a leitura da lei nas quatro ("incerto" é a saída certa para o
repouso reduzido: o 235(c) diz "podem prever" e a CS exige gestão do risco de fadiga; a GM1 da assistência lê-se como o
código lê) e as nove expectativas alteradas. Achou sete erros, corrigidos com teste: (1) dois repousos abaixo do mínimo
seguidos davam "incerto" — o que se segue a um reduzido aumenta, não pode ser outra vez reduzido → "curto"; (2) um repartido
no dia a seguir não era testado — "Após um repouso reduzido não pode ser prestado serviço de voo repartido" (ORO.FTL.220(c))
→ "curto"; (3) com o serviço anterior sem apresentação a app ficava mais severa → incerto; (4) os limites do 210 só usavam
uma leitura → o certo e o possível (acima); (5) na 2.ª leitura da assistência, o voo de antes juntava-se a ela num PSV
inventado; (6) na noite da mudança de hora o serviço anterior ainda se contava pelo relógio; (7) a correção das pernas
aceitava uma partida antes da apresentação. E uma leitura: o prolongamento planeado não é proibido depois de um repouso
reduzido → o PSV seguinte testa-se contra o máximo com prolongamento menos a diferença. Estes acertos já não tiveram uma
passagem independente a seguir.

**Ficou por tratar:** os cinco pontos que aqui estavam foram corrigidos na entrada de cima (noite 11).

## 2026-11-11 (noite, 9) — Dois serviços no mesmo dia: intervalo ou repouso (Fable 5.2, golden primeiro)

O Nuno perguntou se era para corrigir ("fazes depois disto"). Achado ao fechar a noite 8: a leitura do calendário lê dois
serviços quando há 10 h ou mais entre eles, mas o motor juntava-os num PSV só, como repartido, sempre que o intervalo era menor
do que o repouso do caso (12 h na base) — e dava "excede". Exemplo: 05:00 → 08:40 e 19:10 → 21:55 em Lisboa (10 h depois do
pós-voo) → "excede", PSV 16:55 de 11:30–16:30. Nada visto no iPhone.

- **A lei:** "intervalo" é inferior a um período de repouso (ORO.FTL.105(6)) e 10 h já são um repouso possível (ORO.FTL.235(b);
  na base com alojamento adequado, 235(a)(2); CS FTL.1.235(c)(1)). Com 10 h ou mais e menos do que o repouso do caso, o texto
  admite duas leituras: A = um PSV repartido (CS FTL.1.220); B = dois PSV com um repouso no meio. A app não escolhe.
- **Motor** (`ftl/index.js`): `restBetweenDuties` ganha o tipo `either` (antes `split`). `dayFtlFromDuties` mantém os dois
  juntos para o serviço e o voo do dia (o máximo, como antes) e decide o veredicto pelas duas leituras: "excede" só se o dia
  é ilegal nas duas (em A o PSV excede; em B um PSV excede ou o repouso é curto de certeza — fora da base, ou menor que o
  serviço anterior, ou sem alojamento adequado dito pelo tripulante); "dentro" só se é legal nas duas (em B: na base, com
  alojamento adequado dito, e repouso não inferior ao serviço anterior); senão **incerto**, com o facto em falta `breakOrRest`.
- **Repouso a seguir** (`data/today.js`): depois de um dia assim o mínimo depende da leitura (um PSV de 17 h, ou só o último
  serviço): "curto" só abaixo do piso, "certo" só acima do exigido pelo PSV único, no meio incerto.
- **Ecrãs:** na Escala, a linha entre os dois serviços diz "Incerto · X entre serviços (mín Y) → serviço repartido ou repouso
  curto"; Início, Detalhe, Simulação e importação dizem "incerto" com o que falta (texto novo em `data/ftlUnknowns.js`).
- **Golden alterados, de propósito:** "11 h na base", "12 h 45 depois de 13 h de serviço" e "10 h na base" passaram de
  `split` a `either`. O exemplo auditado do repartido ilegal (10 h com sala, ou sem alojamento) continua "excede": é ilegal
  nas duas leituras.
- **Provas:** `npm test` verde (FTL 623). Motor antigo contra o novo em 38 837 dias de dois serviços: fora da zona das duas
  leituras, 36 720 iguais e 0 diferentes; o serviço e o voo nunca mudam; na zona (2 117), 1 116 passam de "excede" a "incerto",
  820 continuam "excede", 120 já eram incertos e 61 continuam "dentro".
- **Revisão independente (Opus, sessão própria):** confirmou as duas leituras e as citações (o `accommodation` do serviço
  serve para a leitura B: "alojamento adequado" tem a mesma definição no repartido e no repouso), as três expectativas
  alteradas, e 0 diferenças fora da zona em 32 572 dias de 2 e 3 serviços (com não-voos, assistência, sem apresentação).
  Achou dois erros, corrigidos com teste: (1) num dia de 3 serviços, um bloco incerto perdia para outro que estava dentro e o
  dia ficava "dentro" — o pior bloco passa a ser excede > incerto > dentro; (2) na leitura dos dois PSV, o "serviço
  precedente" do repouso era só o último serviço e não o PSV inteiro antes dele (que pode já ser um repartido) — dava
  "incerto" quando era ilegal nas duas leituras. Estes dois já não tiveram uma passagem independente a seguir.
- **MUDANÇA a saber, fora do caso das 10 h:** a regra "excede > incerto > dentro" vale para qualquer dia com vários PSV. Um
  dia com um PSV dentro e outro incerto (por exemplo um repartido sem o alojamento indicado) dizia "dentro"; agora diz
  "incerto". Já era um defeito antes desta sessão.
- **Ficou dito e por tratar (grupo 2):** o repouso reduzido (ORO.FTL.235(c), com FRM) não se modela — como no resto da app,
  um repouso abaixo do mínimo do 235(a)/(b) é curto; nas duas noites da mudança de hora, a classificação do dia (pelo
  relógio) e a do repouso (pelos instantes) podem discordar numa hora; uma assistência seguida de um voo com 10 h ou mais
  entre os dois continua dobrada no voo (só a leitura do PSV único); a pergunta do alojamento no Completar só fala do
  repartido, mas a resposta também decide a outra leitura.

## 2026-11-11 (noite, 8) — As pernas que não batem certo e a perna do meio (Fable 5.2, golden primeiro)

Os dois defeitos achados no iPhone na ronda anterior. Os testes novos falharam antes da correção e passam depois. Nada visto no
iPhone (passos 7 e 8 de `docs/verificacao-calendario.md`). **O Nuno, a meio: "tem que ser como está na lei" e "seguir o que diz
a lei"** — a 1.ª versão tinha uma convenção minha (um serviço dura menos de 24 h) e deixava o dia de fora; ficou como abaixo.

**1 · Pernas que não formam um PSV** (a volta sai antes de a ida chegar: 17:30–20:35 e 19:50–21:30; o motor somava 24 h à
pausa negativa e dava "repartido" com máximo 11:15–22:37).
- **A lei, e só a lei:**
  - ORO.FTL.105(13) e (24): o setor vai do primeiro movimento da aeronave à sua imobilização. O mesmo tripulante não está em
    dois setores ao mesmo tempo (impossibilidade de facto): uma partida antes da chegada anterior são horas erradas.
  - ORO.FTL.105(6): "Intervalo" é um período "durante um período de serviço de voo **inferior a um período de repouso**". O
    repouso mais curto que a lei admite é de 10 h: longe da base (ORO.FTL.235(b)), na base com alojamento adequado
    (235(a)(2)) e no repouso reduzido fora da base (CS FTL.1.235(c)(1)). 10 h ou mais em terra entre duas pernas já podem ser
    um repouso: não são, de certeza, um intervalo do PSV. É o limiar com que a leitura do calendário já separa os serviços
    (bloco 4). Entre as 10 h e o repouso que se aplicaria ao caso (o serviço precedente, ou 12 h na base) o texto admite
    duas leituras — a app não escolhe, o PSV fica incerto. Uma "pausa" de 23 h 15 não é um intervalo em leitura nenhuma.
  - CS FTL.1.220(a), (b) e (c): só o intervalo de 3 h seguidas ou mais prolonga o máximo, até 50 % dele, tirados os 30 min de
    pré e pós-voo. Sem intervalo conhecido fica o Quadro 2 (ORO.FTL.205(b)(1): 16:30–16:59, 1–2 setores → 11:15).
  - ORO.FTL.210: as escalas e os setores atribuídos contam todos para os limites. O dia não sai da conta.
- **Motor** (`ftl/index.js`): `legsBrokenKind` (nova) diz porque é que as pernas não formam um PSV — `before` (uma partida
  antes da chegada anterior, pelos instantes da cadeia do serviço, a que dá o PSV real) ou `rest` (10 h ou mais em terra).
  `splitFromLegs` não tira repartido dessas pernas. `ftlForDuty`: o serviço CONTA (serviço, voo, repouso) e o PSV fica
  **incerto**, com o facto em falta `legTimes` ("as horas certas das pernas"), entre o máximo GARANTIDO (Quadro 2) e o
  POSSÍVEL em todas as leituras: um repartido que as horas erradas não deixam ver (o intervalo cabe no PSV e é inferior a
  10 h) ou o prolongamento planeado, se cabia. No teu caso: 11:15 a 13:30 (antes: 11:15 a 22:37). Nunca "dentro" (uma hora
  está errada, e pode ser a do fim). "Excede" só acima do máximo possível e só quando é de certeza um PSV único (`before`);
  com 10 h ou mais em terra podem ser dois serviços: incerto. `ENGINE_VERSION` 12 (os dias guardados recalculam-se sozinhos).
- **O repouso a seguir** (`data/today.js`): depois de um serviço destes o mínimo depende da leitura (se eram dois serviços, o
  precedente é mais curto; se cabia no prolongamento, leva as horas do ORO.FTL.205(d)(1)). "Curto" só abaixo do mínimo de
  todas as leituras, "certo" só acima de todas; no meio, incerto ("o mínimo fica entre X e Y").
- **Os "2 em 7 dias" do prolongamento (ORO.FTL.205(d)(1)):** um dia anterior com as pernas erradas não se sabe se foi um
  prolongamento. Se disso depender o 3.º, o serviço fica incerto entre o Quadro 2 e o prolongamento (facto em falta
  `extCount`); com dois prolongamentos certos antes, é recusado como sempre.
- **"Dentro dos limites?"** (`legalStatus`): um limite do ORO.FTL.210 excedido de certeza vem antes do "PSV incerto" (um
  incerto escondia-o; já era assim antes desta sessão, mas agora há mais incertos).
- **Importação** (`data/rosterImport.js`, `components/RosterImportSheet.js`): o dia **entra** (antes ficava "a corrigir" e de
  fora) e a linha diz "Incerto — falta saber as horas certas das pernas: as da escala não batem certo (ORO.FTL.105) · toca
  para corrigir"; tocar abre o formulário com as horas lidas. A lei não tem tolerâncias: 1 minuto de sobreposição também fica
  incerto; a chegada e a partida à mesma hora estão certas. **PDF** (`data/pdfRoster.js`): a perna que saía antes de a
  anterior chegar passava para o dia seguinte e o dia partia-se em dois serviços com 23 h de "repouso"; agora é um serviço
  só, que entra incerto. **Completar** (`data/dutyComplete.js`): não pergunta pelo alojamento de uma pausa que não existe.
- **Continua certo (golden):** chega 23:50, sai 00:30 → 40 min de intervalo, sem repartido; chega 19:00, sai 23:30 →
  repartido de 4 h 30; chega 22:00, sai 02:00 → repartido de 4 h; dois serviços no mesmo dia do PDF com o 2.º depois da
  meia-noite.
- **MUDANÇA DE NÚMERO a saber (serviços postos à mão; a leitura do calendário nunca junta pernas com 10 h ou mais entre
  elas):** 10 h ou mais em terra entre duas pernas do mesmo serviço davam um repartido (por exemplo 11 h 30); agora o serviço
  fica incerto, sem repartido. O exemplo do golden da importação com 11 h 30 no Porto passou a 9 h 30. Entre dois SERVIÇOS do
  mesmo dia o motor usava outra regra (12 h na base) — alinhado na entrada seguinte (noite, 9).
- **O que fica de leitura ou de convenção, dito:** o voo de um serviço com as pernas erradas conta pela soma das pernas (a
  mais, nunca a menos) e o serviço conta da apresentação aos últimos calços, mesmo quando podiam ser dois serviços (a mais,
  nunca a menos); a cadeia deixa no mesmo dia uma partida até 3 h antes da chegada anterior (regra de 2026-11-07); no PDF, uma
  perna do bloco de um dia que só cabe 24 h depois da 1.ª saída é do mesmo serviço com as horas erradas (é uma regra de
  leitura do documento, não de FTL).

**2 · A mudança de uma perna do meio não se detetava.**
- **A lei:** as horas de cada perna decidem o tempo de voo (ORO.FTL.105(13), somado nos limites do ORO.FTL.210) e o intervalo
  do repartido (CS FTL.1.220(a)); o posicionamento não é setor (ORO.FTL.215) e a app não o conta como tempo de voo (leitura da
  casa, bloco 4).
- **`data/rosterDiff.js` `diffDuty`:** além das pontas (`DIFF_FIELDS`), compara perna a perna e pela ordem a partida, a chegada
  e se é posicionamento → "Perna 1 06:40-08:15→06:40-11:15"; se o número de pernas mudou, uma linha só ("Pernas 2→1"). A Zulu,
  o número de voo e a aeronave não contam. Sem as horas das pernas de um dos lados compara-se o tempo de voo, se os dois o têm.
- **O snap** (`data/rosterImport.js` `snapOfCandidate`) passa a levar as pernas e o tempo de voo publicados. A versão da leitura
  não muda (o agrupamento é o mesmo). **Snaps antigos** (sem pernas): valem as pernas do serviço guardado se o tripulante não
  lhes mexeu (calços iguais aos do snap e a Zulu do calendário intacta em cada hora); se mexeu — horas reais, ou uma perna do
  meio corrigida à mão — ou se vieram do PDF (sem Zulu), não se comparam, como antes: nunca um "alterado" ou um conflito
  inventado sobre o que o tripulante escreveu.
- **O "refresh" fica:** um snap da leitura antiga com os mesmos voos agrupados de outra maneira continua "relido" (golden).
- **De caminho:** a chegada de um posicionamento no fim do serviço (que não estava em `DIFF_FIELDS`) também passa a detetar-se.
- **SNC/RDP:** não mudam — uma perna do meio alterada não mexe na apresentação, no fim nem nos setores (o arquivo guarda-a,
  sem candidato).

**Provas:** `npm test` verde (33 suites; FTL 545 → 605, diff 33 → 61, importação 135 → 150). Motor antigo contra o novo em
58 359 serviços certos ao acaso (13 543 com repartido; um terço à volta das mudanças de hora; intervalos em terra até 9 h 20):
0 diferenças, 0 serviços certos dados como errados. 39 394 sobreposições metidas à força: contam o mesmo serviço e o mesmo voo
de antes, todas as de voo ficam incertas ou "excede", e o máximo garantido novo nunca fica acima do antigo; ficaram por ver
33, todas na hora repetida da noite em que a hora atrasa e em pernas sem Zulu (nenhuma do calendário).

**1.ª revisão independente (Opus, sessão própria, só com o código e a lei):** confirmou o núcleo e as citações. Achados
tratados: (1) snap antigo + perna do meio corrigida à mão dava "alterado" e aplicá-lo desfazia a correção → só valem as pernas
guardadas com a Zulu intacta; (2) um posicionamento longo no fim de um serviço posto à mão dava um falso erro; (3) a noite da
mudança de hora (apanhada ao repetir a comparação). Os testes destes foram escritos logo a seguir à correção (a falha de antes
ficou demonstrada pelas sondas da revisão).

**2.ª revisão independente (depois de a regra passar a sair só da lei e de o dia passar a entrar):** confirmou as citações nas
duas línguas, "entra e fica incerto" contra "fica de fora" e "tolerar minutos" (sem base na lei), e 0 diferenças em 30 000
serviços sem problema (com intervalos de 9 a 13 h, sem base, sem apresentação, posicionamentos, assistência antes, cabine).
Achados tratados, com teste: (1) um "PSV incerto" escondia um limite do 210 excedido de certeza → a ordem mudou; (2) o repouso
a seguir dizia "ok" quando a leitura do prolongamento o dava curto → incerto entre as leituras; (3) o limiar dependia da base
e do serviço precedente, e os "2 em 7" não os recebiam → 10 h fixas, a leitura conservadora e a que a casa já tinha; (4) a
promoção punha à frente o serviço errado → primeiro o que tem uma hora em falta; (5) "nunca excede" não se aguentava (um PSV
de 20 h ficava "incerto") → o máximo possível que sai da lei; acima dele, "excede".

**Verificação dos acertos da 2.ª revisão (3.ª passagem independente, âmbito fechado):** o limiar das 10 h, a ordem no
"Dentro dos limites?", a promoção e os "2 em 7" estão certos; 29 690 serviços sem pernas erradas comparados com o código de
antes: 0 diferenças. Achou cinco defeitos pontuais, corrigidos com teste: o máximo possível não contava com a aclimatação
por saber (dava "excede" fora da base sem o ser em todas as leituras); a discrição declarada transformava o incerto em
"excede"; o prolongamento entrava como leitura possível mesmo com dois prolongamentos certos antes (devia ser "excede"); o
repouso antes de um serviço sem apresentação usava o mínimo de uma leitura só; e a voz e o cartão da véspera do Início
diziam "repouso curto" no caso incerto. Estes cinco já não tiveram uma passagem independente a seguir (`npm test` verde e a
comparação motor antigo/novo repetida: 0 diferenças).

**Ficou por tratar (na lista do que falta, grupo 2):** um serviço já guardado com as pernas erradas só se corrige pela
importação (no Detalhe só se registam a 1.ª saída e a última chegada reais); entre dois SERVIÇOS do mesmo dia o limiar
intervalo/repouso é o do caso (12 h na base), não as 10 h das pernas e da leitura do calendário; o serviço e o voo de um dia
assim contam pelo máximo (certos, não "incertos"); a cadeia (`legsChainMs`) passa para o dia seguinte uma perna com mais de 3 h
de sobreposição (voo "depois da meia-noite" inventado nesse caso); corrigir na folha um dia assim volta a aparecer em cada
sincronização enquanto o calendário estiver errado; um serviço posto à mão SEM pernas passa a "alterado" se o tempo de voo do
calendário for diferente; uma alteração só de pernas entra no arquivo de alterações sem mostrar o que mudou; no PDF, pernas
fora de ordem (10:00–15:00 e 09:00–11:00) ficam dois serviços; dois SERVIÇOS do mesmo dia com horas sobrepostas; no Detalhe,
"Calços até às" de um PSV incerto sem dizer "(garantido)".


## 2026-11-11 (noite, 7) — "Testar o calendário": os estados do Início com serviço hoje (Opus 5.5) — eventos SINTÉTICOS

Calendário "CrewPact Teste" com eventos sintéticos (EZY7841/7842 LIS-FNC-LIS, ADTY LIS, SEP TRAINING LIS), a mudar as horas
entre rondas. **Visto no iPhone ✅ (o Nuno):** antes do report · em voo (com e sem report) · entre setores · pós-voo · pernoita
(escura, hotel guardado, tempo de amanhã) · standby no aeroporto · formação · a linha do mês quando há um só cartão · VoiceOver
em português no Início · letra grande. As contas conferidas no ecrã: PSV, limites (report + máximo), margens, fim de serviço (+30 min), repouso
mínimo na base (12 h) e fora (10 h, ORO.FTL.235), per-diem, pernoita e standby (2 setores nominais), formação (3), o mês, e as
9 h dos 7 dias (5 h 25 de hoje + 3 h 30 do dia 5 = 8 h 55).

**Corrigido nesta sessão:**
- **Em voo sem report:** o cartão ficava só com o título → partida — duração — última chegada.
- **Em voo, a linha pequena** (Nuno: "o tripulante quer ver"): "próximo setor às 19:50 · última chegada 21:35" (a margem era até
  à última chegada, mas a hora não aparecia); sem uma 2.ª fila de horas. **O limite depois da meia-noite** diz "limite · amanhã".
- **Nunca vazio** (Nuno: "sim"): num estado com serviço, se a folha fica com um só cartão, junta-se a linha do mês. A baixa fica
  de fora. Golden: 226 ✓.
- **VoiceOver lia português com a voz inglesa:** na Expo Go a app corre dentro da Expo Go (só inglês) e o projeto não declarava o
  português. `app.json` → `CFBundleDevelopmentRegion` pt-PT + `CFBundleLocalizations` (pt-PT, en) — vale no dev build e na
  App Store; e `accessibilityLanguage` pela língua da app no Início, nos cartões, na barra de abas e no sino (vale já na Expo Go
  e para quem escolhe inglês na app).

**Achados que ficam para uma sessão Fable 5.2 (golden primeiro), escritos na lista do que falta:** pernas sobrepostas inventam
uma pausa de 23 h (`splitFromLegs`); a mudança de uma perna do meio não se deteta na sincronização (`diffDuty`).

**Falta:** disrupção (precisa de um atraso real no voo ao vivo) · aterrado antes do sign-off · hora Zulu (verão ou fora de Lisboa)
· iPhone pequeno · os outros ecrãs com `accessibilityLanguage` (na Expo Go ainda falam com a voz inglesa) · no dev build, confirmar
o VoiceOver em português na app toda. Os eventos sintéticos podem ficar no "CrewPact Teste" (ou apagar).

## 2026-11-11 (noite, 6) — "Testar os estados" do Início 3.0 no iPhone (Opus 5.5) — 1.ª ronda

**Visto no iPhone ✅ (o Nuno: "tudo ok"):** o estado real de hoje · configuração · folga · véspera e hoje antes do report (com
o voo de exemplo, porque a conta de teste não tem serviços nos próximos dias) · fecho do mês (as parcelas somam o total:
7 726,08 + 483,37 + 322,24 + 1 386,73 + 60,00 = 9 978,42 €) · férias · baixa (evento de teste) · documento a caducar
(validade de teste a 6 dias) · a barra de abas A de dia e de noite.

**Corrigido no iPhone:**
- **"Ver um exemplo" fazia a página subir 6 pt:** o sino (44) dava lugar à pílula "Exemplo · sair" (38). A fila das pílulas
  tem agora sempre a altura do sino.
- **As pílulas saíam cortadas** ("Novem…", "fecha em 19…") quando não cabiam as três. Nunca se cortam: se não cabem, sai a de
  contorno (a secundária). Medido com as larguras da Hanken: com o sino cabem em todos os estados, também a 375; só o modo
  exemplo pode tirar a de contorno.
- **O último algarismo do número gigante saía cortado** (o "8" de "9 978"): o aperto entre letras (−0,046 em) também conta
  depois da última e o iOS cortava-a. Devolve-se esse aperto à direita da caixa (e a conta da largura inclui-o; quatro
  estados descem um degrau do tamanho quando os factos estão apertados, todos cabem).
- **Estado forçado sem serviço caía num ecrã de recurso** ("A ler a escala" e um "—" a 86 pt que parecia uma barra). Hoje,
  véspera e disrupção sem serviço, baixa sem dia de episódio, pós-voo sem o dia fechado e pernoita sem a estação mostram
  agora a FOLGA honesta. Golden: 220 ✓.
- **O voo de exemplo dizia "2 setores" com uma só perna** (LIS → FNC; vinha do v6): passa a 1 setor.
- **Os 60,00 € de diferença** entre o fecho (9 978,42) e as férias (9 918,42), 5 minutos depois: eram os dados da conta a
  mudar entre as leituras (o Nuno confirmou que o fecho e os Números batiam certo); não há diferença entre estados.

**Falta ver no iPhone (precisa de um serviço hoje no calendário → sessão "testar o calendário", eventos sintéticos):** em
voo · entre setores · aterrado · standby · formação · disrupção · pós-voo · pernoita · a hora Zulu (só no verão ou fora de
Lisboa). E, em todos: letra grande, VoiceOver e iPhone pequeno.
- Para depois: a atualização da Expo 58.0.23 → 58.0.24 (e 18 pacotes) pelo `npx expo install --check`, depois deste teste;
  nunca `npm audit fix --force` (sobe pacotes por cima das versões da Expo).

## 2026-11-11 (noite, 5) — Início 3.0 "cartões de cor" CONSTRUÍDO (Opus 5.5) — falta o iPhone

Construído a partir do esboço aprovado `design/inicio-cartoes.html` (plano da entrada "noite, 4"). Nada foi visto no
iPhone: só testes, o pacote iOS (`expo export`, compila) e um desenho feito a partir do código.

- **O que ficou no código:**
  - `data/homeCards.js` (novo, PURO): de um estado e dos factos já calculados dá o topo (pílula, número em duas linhas,
    dois factos) e os cartões. Nenhum número novo: os factos vêm dos motores de sempre (crewState, FTL, dutyLine,
    restUntilAfter, monthStats/monthSplit, serviceMoney, liveFdpVerdict).
  - `scripts/homecards.test.js` (novo golden, `npm run test:homecards`, na suite antes do guardião — são agora 33): os 16
    estados do esboço com os dados de teste do esboço + as regras (nada se repete entre o topo e os cartões · nunca mais de
    dois cartões grandes · com um aviso o 2.º passa a linha fina · o selo entre duas horas é o intervalo · € com cêntimos ·
    "estimado · bruto" · Incerto com o que falta e "Completar" · o número e os factos cabem a 390 e a 375) + inglês + um caso por achado da revisão. 206 ✓.
  - `data/fontMetrics.js` (novo): as larguras da Hanken lidas do `.ttf`. O número gigante começa em 86 e desce de 2 em 2 até
    60 até os dois factos caberem ao lado (o esboço fazia o mesmo no navegador). Medido: a 390 só o pós-voo (70), a
    configuração (70) e o documento (80) encolhem.
  - `components/HomeCards.js` (novo): topo, cartão grande, linha fina, linhas (parcelas, passos), texto. O cartão inteiro
    abre o detalhe; partilhar e a barra de ação são botões à parte (o VoiceOver chega aos três).
  - `screens/HomeScreen.js`: os cálculos de cima ficaram; a apresentação foi reescrita (1909 → ~1130 linhas). Saíram do
    Início: a placa do painel, os dígitos Solari, a frase da voz (o esboço não a tem; `stateVoice` e o seu golden ficam no
    código, sem uso no ecrã), os secundários em mosaico, as 3 teclas e o tempo no topo. O tempo só se pede na pernoita (o
    facto "7° · amanhã · chuva").
  - `components/TabBar.js`: a barra A (cápsula neutra, a aba ativa numa pílula clara, o ＋ redondo de tinta).
  - `components/NotificationsBell.js`: variante redonda de 44 com a contagem a laranja. `data/constants.js`: `CARD`, `TXT3`,
    `RADIUS.sheet` (32). `ftl/index.js`: só se exportou o `splitFromLegs` (para o "repartido" do cartão; nenhuma conta mudou).
  - `scripts/citacoes-tap-ftl.test.js`: a verificação "o € do mês diz bruto" passou a ler `data/homeCards.js` (o texto mudou de ficheiro).
- **Diferenças ao esboço, de propósito:** (1) a folga a menos de 48 h continua a contar em HORAS (regra da auditoria do
  tripulante de 2026-11-04; o esboço mostrava "2 dias" com 40 h pela frente); (2) "Certificado médico caduca em", sem
  artigo (o artigo muda com o documento: o/a); (3) o standby diz "PSV estimado a 1 setor (225) · confirma na Simulação" em
  vez de "não chamado até agora" (a estimativa tem de dizer que o é); (4) dois pares de contraste corrigidos: o rótulo do
  cartão a 80 % (a 72 % o laranja dava 4,35) e as abas inativas #5E5E57 (o #77776F dava 3,93); (5) o per-diem do dia aparece
  como pílula verde no cartão do dia de serviço quando o acordo o dá (o esboço não o mostrava; o v6 mostrava-o num secundário).
- **Revisão independente (subagente Opus, sem as minhas conclusões) — 9 achados, todos corrigidos e com caso no golden:**
  (1) o posicionamento de hoje ficava preso em "Report às" (o ecrã trata-o como serviço sem fases, o homeCards tratava-o
  como voo) → agora "Termina às", com a cor de voo; (2) na disrupção o PSV com o atraso aparecia como facto → "projeção:"
  e "PSV projetado" enquanto o último setor não aterra (como no v6); (3) pernoita num dia com 2 serviços perdia o hotel e
  o € da noite → já não dependem da hora do fim do repouso; (4) o "Incerto" desaparecia depois do report → continua (com
  "Completar"); (5) um serviço que só está no calendário perdia a hora do fim → vem do calendário; (6) depois de aterrar o
  PSV continuava a contar → fecha nos calços do último setor; (7) o "Completar" dentro de um cartão tocável ficava fora do
  alcance do VoiceOver → a ligação é um botão próprio e o cartão deixa de ser um botão inteiro; (8) sem hora de report,
  depois da partida, voltou "sem hora de report — PSV não calculado"; (9) um repouso que acaba daqui a 2 dias ou mais
  (noites da rotação) diz o dia ("cumprido · dom 15").
- **A hora Zulu do report — decidido pelo Nuno (opção A, depois do Mobbin e das medidas):** um 3.º facto na coluna ao lado
  do número, "04:15Z · report em UTC", SÓ quando é diferente da hora local (verão em Portugal, pernoitas fora, longo curso)
  e só quando o número grande é o report (antes do report, véspera, pernoita). O fuso é o do aeroporto de partida
  (`airportZulu`, como no v6). Medido: não encolhe o número nem acrescenta altura (3 factos = 135 pt ao lado de um número
  de 155; no desenho feito a partir do código a folha fica onde estava). Recusadas: ao lado do sítio na 2.ª linha (na
  pernoita em LGW o número encolhia de 86 para 80, 74 no iPhone pequeno) e uma linha por baixo do número (+24 pt; o Incerto
  tem 23 livres). Refs: Tide Guide no Mobbin (hora + "• UTC−7"; a hora local pequena por baixo da principal) — as apps de
  passageiros não mostram UTC e o Mobbin não tem apps de tripulantes. Golden: 214 ✓.
- **Medido no desenho feito a partir do código** (saída real do `homeCards` no CSS do esboço, 390 × 844): os 18 casos cabem
  sem deslizar; o mais apertado é o Incerto (23 pt livres), depois o fecho (32) e o pós-voo (37).
- **Por fazer:** "testar os estados" no iPhone (guião reescrito em `docs/verificacao-device.md`), com letra grande, VoiceOver
  e o iPhone pequeno; a altura das linhas do número (`GIANT_LINE` em `components/HomeCards.js`) afina-se no iPhone; o
  movimento (skill `animacoes`, depois de a página estar certa); levar a linguagem aos outros ecrãs, um a um, com Mobbin.

## 2026-11-11 (noite, 4) — Início novo: a direção "cartões de cor" (Fable 5.2) — só esboços, nada no código

**ESBOÇO APROVADO pelo Nuno ("sim", 2026-11-11).** Acaba a fase de design do Início; a seguir é a construção.

**PRÓXIMA SESSÃO — construir o Início 3.0** (sessão nova; pelo método: Opus 5.5, esforço Extra — é a base de uma linguagem
nova). Ler primeiro `design/inicio-cartoes.html` e `docs/design-system.md` §14. O que fica e o que muda:
- **Fica:** o motor dos estados (`cs.state` em `screens/HomeScreen.js`, `data/today.js`), as frases, todos os cálculos e as
  folhas que o Início abre. Nenhum número novo: o que os cartões mostram já existe no ecrã de hoje.
- **Muda:** a pele e a anatomia do Início (`screens/HomeScreen.js`, 1909 linhas) e a barra (`components/TabBar.js`).
- **Ordem proposta:** (1) tokens em `data/constants.js`: as cinco cores dos cartões de dia e de noite, o raio 32 da folha,
  os estilos de texto em Hanken para título de cartão e facto; (2) uma função pura que, de um estado, dá o topo e os
  cartões (o que é o número, os dois factos, os cartões e a ordem), com teste golden ANTES, a trancar as regras do esboço
  (nada se repete, o selo é o intervalo, "incerto" com o que falta, "estimado · bruto", cêntimos); (3) os componentes
  (topo, cartão, linha fina, barra de ação, pílula do ganho) e a barra em cápsula; (4) o `HomeScreen` estado a estado,
  com `FORCE_HOME_STATE`; (5) `npm run test:design` (o roquete só desce) e `npm test`; (6) atualizar o guião
  `docs/verificacao-device.md` e ver no iPhone ("testar os estados"), incluindo letra grande e VoiceOver.
- **Estados do esboço que hoje não são estados próprios no código** (confirmar ao construir): Formação e Documento a
  caducar existem nas fichas da Living Interface; "Incerto" é uma variante de qualquer estado, não um estado.
- **Movimento:** nada foi desenhado. Decidir com a skill `animacoes` depois de a página estar parada e certa.
- Os esboços recusados foram para `design/arquivo/`.

- **Porquê:** o estado mais cheio do Início v6 (em voo, com pernoita e aviso) pede 771 pt em 714 (medido no desenho feito a
  partir do código, não no iPhone). O Nuno trouxe 22 referências (`referencias/newref`) e pediu uma página que aguente todos
  os estados, "algo uau, e bom para o utilizador", para depois refazer a app a partir daí.
- **Recusados pelo Nuno:** `design/inicio-v7.html` (faixas) e `design/app-painel-instrumento.html` (painel de abas + linhas:
  "tem coisa a mais", a arrumação, as linhas por baixo). Ficam como registo: `inicio-alternativas`, `inicio-instrumento`,
  `inicio-uau`. As 3 teclas do fundo do v6 deixam de ser obrigatórias (Nuno).
- **Escolhido: `design/inicio-cartoes.html`** ("gostei deste"). Pílula do estado + número gigante em duas linhas + dois
  factos ao lado; folha branca com o cartão do momento e o do que vem a seguir. A cor é o tipo: areia = voo, salva =
  repouso/pernoita, lilás = serviço em terra, neutro = dinheiro, laranja = atenção. Regra da quantidade: o essencial e dois
  ou três factos.
- **Regras fixadas no esboço:** nunca mais de dois cartões grandes (com um aviso, o segundo passa a linha fina) · a segunda
  linha do número é a tinta quando é o sítio e a cinzento quando qualifica ("estimado", "fechado", "livre", "de 22") · o
  repouso mostra o intervalo real, o mínimo da lei vai na linha pequena · a ação com nome é uma barra ao fundo do cartão
  (Nuno), partilhar é o ícone do canto · **nada se repete:** o topo é o próximo marco, o cartão é o resto do dia (em voo, o
  topo é o setor e o cartão é o dia de serviço do report ao limite do PSV) · **o dinheiro que entra vai sempre a verde numa
  pílula branca**, em qualquer cor de cartão · fecho do mês: valor inteiro com cêntimos, "estimado" por baixo, as parcelas
  somam o número de cima, "Como é calculado?".
- **Barra de abas: a A** (Nuno: "A.") — cápsula com as 4 abas (a ativa numa pílula clara) + o ＋ num botão redondo. A barra
  plana com fio vinha do desenho anterior.
- **Revisão dos estados (Nuno: "vê se é preciso afinar mais algum estado") — corrigido:** a pernoita mostrava "+142,30 €"
  (era o dia todo; a noite rende 45,40 €) · folga "daqui a 2 dias" com o serviço a 3 dias · o selo entre duas horas passa a
  ser sempre o intervalo entre elas (o PSV e o limite vão na linha pequena, em h:mm como na app) · "Vais receber cerca de"
  → "Ganhos brutos do mês" e "estimado · bruto" em todo o lado (a app já o diz, A-198) · disrupção dizia "prevista" duas
  vezes · folga vazia dizia "hoje" duas vezes · a configuração tem as três ações da app (ligar, PDF, exemplo) · a véspera
  passa a pernoita a linha fina · letra mínima 11, tamanhos e espaços da escala do design system, sino a 44.
- **Quatro estados que faltavam, desenhados:** Incerto (falta um dado: "Incerto" no lugar do número, o que falta na linha
  pequena, barra "Completar"; o mês com mínimo e máximo), Formação, Documento a caducar (≤ 7 dias toma o topo) e Baixa (texto
  do acordo, Art. 48.º). São 16 estados.
- **Medido no esboço (390×844, 714 pt úteis):** os 16 estados cabem (os mais apertados: pós-voo e fecho do mês, 32 pt
  livres). Contraste WCAG calculado na página: 12 pares passam (o mais baixo: a segunda linha a cinzento, 3,24 para 3
  pedidos em texto muito grande; o verde na pílula branca 6,31). **Não visto no iPhone; não testado com letra grande nem
  VoiceOver.**
- **Decidido pelo Nuno ("faz o recomendado" · "sim" · "sim"):** (1) **iPhone pequeno (375×667):** a folha desliza; o topo
  e a barra ficam; medido com `?se=1`: 11 dos 16 deslizam (5 a 104 pt) e o primeiro cartão vê-se inteiro em todos. (2) **A
  letra:** Hanken Grotesk em tudo; o design system mudou (`docs/design-system.md` §14, "Direção 3.0"); a Barlow sai de cada
  ecrã quando esse ecrã migrar — os tokens do código (`TXT`, `PELE_FONT`) NÃO foram tocados. (3) **Pílulas do topo:** a do
  estado não se toca; a de contorno abre esse dia na Escala.
- **Barra de abas: a A** (Nuno: "A.") — cápsula com as 4 abas (a ativa numa pílula clara) + o ＋ num botão redondo. A barra
  plana com fio vinha do desenho anterior.
- **Revisão dos estados (Nuno: "vê se é preciso afinar mais algum estado") — corrigido:** a pernoita mostrava "+142,30 €"
  (era o dia todo; a noite rende 45,40 €) · folga "daqui a 2 dias" com o serviço a 3 dias · o selo entre duas horas passa a
  ser sempre o intervalo entre elas (o PSV e o limite vão na linha pequena, em h:mm como na app) · "Vais receber cerca de"
  → "Ganhos brutos do mês" e "estimado · bruto" em todo o lado (a app já o diz, A-198) · disrupção dizia "prevista" duas
  vezes · folga vazia dizia "hoje" duas vezes · a configuração tem as três ações da app (ligar, PDF, exemplo) · a véspera
  passa a pernoita a linha fina · letra mínima 11, tamanhos e espaços da escala do design system, sino a 44.
- **Quatro estados que faltavam, desenhados:** Incerto (falta um dado: "Incerto" no lugar do número, o que falta na linha
  pequena, barra "Completar"; o mês com mínimo e máximo), Formação, Documento a caducar (≤ 7 dias toma o topo) e Baixa (texto
  do acordo, Art. 48.º). São 16 estados.
- **Medido no esboço (390×844, 714 pt úteis):** os 16 estados cabem (os mais apertados: pós-voo e fecho do mês, 32 pt
  livres). Contraste WCAG calculado na página: 12 pares passam (o mais baixo: a segunda linha a cinzento, 3,24 para 3
  pedidos em texto muito grande; o verde na pílula branca 6,31). **Não visto no iPhone; não testado com letra grande nem
  VoiceOver.**
- **Por decidir:** (1) **iPhone pequeno (375×667, medido com `?se=1`):** 11 dos 16 não cabem sem deslizar (faltam 5 a
  104 pt) — a folha desliza nesse tamanho, ou o segundo cartão passa sempre a linha fina; (2) **a letra dos títulos:** o
  esboço usa Hanken em tudo; o design system manda Barlow nos títulos e nos números (`TXT.title`, `TXT.num`) — ou muda o
  design system, ou o esboço; (3) o que fazem as pílulas do topo ao toque (proposta: a do estado não faz nada; a segunda abre
  o dia na Escala).
- **Mobbin (ligações no esboço):** Lloyds e DoorDash (total e parcelas), Amie e Structured (blocos de cor com duração),
  Singapore Airlines e American Airlines (ecrã vazio), Fresha, Truecaller e Shop (barra em cápsula).
- **Outra coisa desta sessão:** `CLAUDE_CODE_SUBAGENT_MODEL=opus` no `settings.json` global (os subagentes sem modelo
  explícito deixam de herdar o Fable); pesquisa continua em Haiku.

## 2026-11-11 (noite, 3) — Pesquisa do grupo 5 (3 agentes de pesquisa Haiku; fontes conferidas pelo Fable 5.2)

- **Tipo de horário irregular:** Irlanda = matinal, com documento oficial (IAA, OAM 06 de 11.08.17, lido e guardado em
  `fontes/autoridades/`). ANAC e Austro Control: não encontrado. Malta: não confirmado (o site recusa a leitura). Nada mudou
  no código: falta saber sob que certificado voam os tripulantes da Ryanair em Portugal; a app continua a avaliar os dois tipos.
- **EASA:** a discrição do comandante conta do quadro do 205(b)(1), sem o prolongamento (FAQ 47599, guardada em
  `fontes/easa/`) — é o que a app já faz; sai da lista do advogado. As outras duas dúvidas não têm FAQ.
- **Salário mínimo de 2027:** ainda não publicado (pista de imprensa: 970 €). Voltar a ver no fim de dezembro.
- **Plataforma europeia de litígios:** encerrada a 20 de julho de 2025 (Regulamento (UE) 2024/3228, guardado em
  `fontes/eu/`). A frase que remetia para ela saiu do rascunho dos termos (§12) e a pergunta A2.4 do pacote foi reescrita
  (Word gerado de novo). **Os termos publicados no site só mudam quando o Nuno os republicar** ("vamos às leis").
- **Tabela geotime do ROV da TAP:** não é pública.
- Pormenor em `docs/pesquisa-pendente.md` (secções 4, 5 e a nova 6).

## 2026-11-11 (noite, 2) — "Sem telemóvel": os cálculos raros do grupo 2 (Fable 5.2)

- **TAP, serviço em terra fora da base:** conta no dia de calendário DA BASE (cabine Cl. 7.ª, pilotos RUPT Cl. 6.ª, n.º 9), como
  os voos. O sítio é o da última chegada (até 14 dias antes); as horas da escala são as de lá. Exemplo do teste: formação em
  São Paulo às 22:00 de lá = 01:00 de Lisboa → o dia seguinte. Na base, sem base ou sem sítio: o dia da escala, como antes.
  Dinheiro 166 ✓.
- **Simulação mais rápida (era "TAP ~45 ms por cálculo"):** o que só depende da escala guardada (os avisos de recuperação e os
  problemas dos limites TAP sem o simulado) calcula-se uma vez por abertura do formulário (`ctx.memo`), não a cada tecla. Com
  um ano de escala: TAP de 49 para 24 ms, easyJet de 22 para 12 ms; o resultado é igual com e sem memória (teste).
- **Cabine → piloto na mesma companhia:** não é erro de código, é dúvida jurídica (saída ou continuidade) → pergunta D28 do
  pacote; a app continua a seguir a continuidade (a leitura que não inventa um acerto de saída).
- **O dia da saída de uma companhia:** não se resolve sem o perguntar (a linha do tempo guarda o mês) → passou para os
  "Campos por fazer (com Mobbin)".
- **Plataforma, não feita sem telemóvel:** a navegação v7 muda o comportamento do `navigate` e tem de ser vista no iPhone
  (regra 7: versões nativas só as do `expo install`); o "Secure email change" e o modelo de e-mail fazem-se no painel do
  Supabase; apagar as tabelas órfãs é irreversível — nenhum código as usa (conferido), e o SQL, para o Nuno correr no
  editor SQL do Supabase se quiser, é `drop table if exists public.rest_periods;` e
  `drop table if exists public.user_additional_roles;`; a pasta `android/` é local (está no `.gitignore`).

## 2026-11-11 (noite) — Importação e formulário (Fable 5.2) — o Nuno: "sim"

- **Ordem das pernas (A-249, A-250):** `aggregateLegs(legs, { report })` deixou de ordenar pela hora do relógio — com a
  apresentação, pelos minutos depois dela (3 h de folga para trás); sem ela, o serviço começa depois do maior intervalo sem
  voo; uma perna à mão (sem horas) fica onde foi introduzida. O formulário guarda as pernas pela MESMA ordem da rota (antes a
  rota era reordenada e as horas ficavam pelo índice). Exemplo do achado: LIS-FNC 22:30 + FNC-LIS 01:05 dava "FNC-LIS-FNC"
  (pernoita a mais, +157,50 € no comandante).
- **Durações pelo tempo decorrido (A-251, A-179):** `serviceRealMin` (data/zulu.js) — os minutos de cada perna e o PSV pelos
  instantes (o fuso de cada aeroporto no seu dia), não pela diferença dos relógios. LIS 10:00 → TLV 17:50 = 5:50 (dava 7:50);
  LIS 10:00 → PDL 11:20 = 2:20 (dava 1:20). Usam-no o formulário (Block hours, Duty hours e o `flight_minutes` que se grava) e
  o "Registar as horas reais" do Detalhe (`realTimesPatch` com a data).
- **Dois erros encontrados pelo caminho:** (1) no formulário, mudar a hora de uma perna importada deixava a Zulu antiga do
  calendário — o PSV ficava o do plano (chegada 12:20 em vez de 10:20: PSV 4:20 em vez de 6:20); a Zulu da hora editada passa
  a sair. (2) uma perna detetada pelo histórico ou pela API trazia a Zulu de OUTRO dia (hora de verão diferente = 1 h ao
  lado); `legForDate` tira-a quando o fuso do aeroporto é conhecido.
- **O sítio não bate (pendência de 2026-11-04):** aviso novo `placeGap`, "incerto" — "parte de LIS, mas o serviço de 10/3
  acabou em LGW — falta um posicionamento na escala?". Na importação cada dia olha para trás; na Simulação também para o
  serviço seguinte. Só serviços com sítio (pernas ou rota), até 7 dias de intervalo. Cita ORO.FTL.235(a)/(b) (o repouso
  depende de onde se está); a app não inventa a viagem.
- **Riscos do bloco 4:** R6 (1.ª parte) a folha de importação mostra "Incerto — …" (só mostrava o "⚠ excede"); R8 depois de
  corrigir um candidato a verificação corre outra vez para todos (`verifyCandidates`); R10/R11 o papel, a folga trabalhada, os
  casos especiais e o alojamento seguem o SERVIÇO em que foram registados (casam-se principal e extras lidos com os
  guardados; um serviço único por casar de cada lado é o mesmo com a hora mudada), e a pernoita ligada à mão numa formação
  fica; R12 fechado sem código (um candidato sem rota fica "a corrigir" e não entra; o formulário recalcula a pernoita pela
  rota corrigida).
- **Revisão independente (agente Opus, só com o código) — 6 erros confirmados, corrigidos no mesmo dia:** E1 sem apresentação,
  um repartido com a pausa maior ao meio do dia começava à tarde (regressão minha) → sem apresentação vale a ordem do relógio,
  a menos que o intervalo da noite tenha menos de 8 h; e a apresentação escrita DEPOIS das pernas volta a ordená-las (na
  Simulação; na correção de um candidato não, que já vem na ordem da escala). E2 um principal lido sem par apagava o papel, a
  folga trabalhada, os casos especiais e o alojamento (regressão minha) → casa-se também por tipo, o principal sem par
  substitui o principal como sempre foi, e a folga trabalhada é do DIA (fica no principal se o serviço dela saiu da escala).
  E3 aviso do sítio falso com um posicionamento sem rota pelo meio. E4 aviso do sítio em falta quando o dia seguinte já está
  guardado e é lido igual → o aviso fica no dia novo. E5 um aeroporto do meio sem fuso: o PSV do formulário caía no relógio
  (o motor usa as pontas) → igual ao motor. E6 `legForDate` tirava a Zulu só de uma ponta → as duas ou nenhuma. O formulário
  bate com o motor (`ftlForDuty`) em 25 casos conferidos pelo revisor.
- **Os 4 riscos da revisão, corrigidos a seguir (o Nuno: "vamos corrigir isto"):** (1) depois de corrigir um candidato a
  lista volta à ordem da 1.ª leitura (`sortCandidates`: um aviso novo sobe para junto dos avisos). (2) Com a apresentação e a
  data, a ordem das pernas é pelos INSTANTES (o fuso de cada aeroporto): experimenta-se cada perna como 1.ª e fica a que sai
  em 1.º com a partida mais perto depois da apresentação — LIS→SIN e de lá às 07:30 já não troca; 356 ordens baralhadas de 12
  serviços (Açores, leste, oeste, noite, repartido, mudança de hora) deram todas certas; sem fuso em alguma perna, o relógio.
  (3) A cauda de um posicionamento (o sign-off é a chegada do DH) conta pelo tempo decorrido, no MOTOR e no formulário
  (ORO.FTL.215(b)): LIS-OPO e depois DH para PDL dava 4 h de serviço, são 5 h. `ENGINE_VERSION` 11 (o dayLog recalcula-se). O
  posicionamento sozinho e o DH antes de operar já estavam certos (conferido). (4) O papel, a folga trabalhada, os casos
  especiais e o alojamento escritos na correção da importação gravam-se no serviço principal (só o que foi escrito: vazio não
  apaga o guardado), e a verificação da folha usa o alojamento escrito.
- **Os dois limites que ficavam (o Nuno: "como corrigimos isso?"):** uma só ideia — o que está GUARDADO acompanha o
  candidato (`storedFacts`: o papel, a folga trabalhada, os casos especiais e o alojamento do serviço guardado que casa com
  cada serviço lido). (a) A verificação da folha conta com os casos especiais e o alojamento guardados (um repartido de
  11 h 30 com alojamento adequado guardado dava "incerto"; agora "dentro"). (b) A correção abre já com o que está guardado, e
  um serviço que passou pela correção leva a marca `edited`: manda o que lá ficou escrito e vazio APAGA o guardado (a marca
  não se grava nem entra no snap). Um serviço corrigido que passa a extra não perde o que se escreveu.
- **Testes:** flightDetect 55, zulu 47, FTL golden 545, completar 28, importação 135, Simulação 113; 34 suites verdes; export
  iOS ✓. **Nada visto no iPhone.**

## 2026-11-11 — Os grupos TAP e easyJet dos acertos de código (Opus 5.5 → Fable 5.2 a meio) — o Nuno: "vamos aos dois"

**TAP (5):**
- **Estadia depois de outro serviço:** a estadia conta do último VOO (ou posicionamento) do dia — uma assistência lá fora depois
  do voo apagava-a (`tapCalendarDays`).
- **Dias de calendário na hora da BASE** (cabine Cl. 7.ª "das 0h00 às 23h59, horas locais da base"; pilotos RUPT Cl. 6.ª, n.º 9):
  pelos instantes das pernas (`baseDaysOf`); sem pernas com horas ou sem a base, as horas da escala (como antes). `baseAt` passa
  a `monthlyAe`, `aeMonthTotal`, `serviceMoney`, `payStatus`, estatísticas e ecrãs. Golden: GRU 21:00 de 4/4 = 01:00 de Lisboa de
  5/4 → 3 A + 2 B (dava 4 A + 1 B).
- **Doença:** `sickDays` regista-se nos dois acordos (estado do Início, suspensão); sem prestação em € — a base dos dias de baixa
  fica incerta, de base − dias × base ÷ 30 ao máximo, motivo `tapSick` (a TAP paga o líquido ou completa a Segurança Social).
- **AC2 por cancelamento tardio** (cabine Cl. 7.ª, n.º 2, a)): extra `lateCancelDays` à AC2; num dia com voo não conta (n.º 3).
- **Prestação retributiva complementar** dos pilotos (regulamento de retribuições, Cl. 10.ª): menos de 5 dias de per diem A/B
  (ou simulador como verificador) → o per diem A por dia em falta; com férias, baixa ou entrada no mês → só como máximo
  (`prestCompl`; linha Extras dos Números).

**easyJet (4):**
- **Ano da saída** ("proporcionalmente nos anos de contratação e cessação", Cl. 51.ª/1 e Art. 36.º/1; TAP Cl. 17.ª e Cl. 8.ª/2):
  `leavingAt` + `serviceEnd` nos quatro acordos — o Natal no mês da saída pelos meses do ano; as férias (easyJet) entre a leitura
  do acordo e a do CT art. 245.º (vencidas + proporcionais), certo e máximo. **Erro maior apanhado:** os meses de uma companhia
  ANTERIOR usavam a data de entrada da atual → os anos passados na antiga ficavam SEM subsídios; agora a linha da companhia dá
  a entrada e a saída de cada mês (`companySpanAt`, `tenureAt` nas estatísticas; os Números passam `companyHistory`).
- **WFLY + DDO/IDO no mesmo serviço** (cabine Cl. 67.ª/5): `dayOffWorked` aceita `wfly+ddo` e `wfly+ido`; Completar ganha as duas
  opções; o formulário mostra o WFLY sem desfazer a combinação.
- **Formação fora da base** (cabine Cl. 56.ª "em voo, formação e outras funções"): `awayNights` com `throughGround` — os dias de
  terra entre dois serviços com rota não quebram a estadia; pilotos como estavam (Art. 39.º "entre serviços de voo", D15).
- **Média das variáveis:** não se resolve por código — a Cl. 51.ª/2 dá o período (12 meses) mas nenhum acordo diz as rubricas →
  pergunta D26 do pacote; a nota do subsídio diz o que falta.
- **Pacote:** D24–D27 novas, Word gerado.
- **Revisão independente (os 3 commits + o do mês da entrada):** 14 erros confirmados, todos corrigidos com golden primeiro —
  (1) Natal com baixa no ano da saída/entrada: as reduções SOMAM-SE (meses − dias suspensos ÷ dias do ano, `servedShare`), não se
  multiplicam; (2) as baixas e as férias de OUTRA companhia já não mexem nos subsídios desta (`tenureEvents`); (3) TAP na saída:
  as férias vencidas dão o subsídio inteiro (AE Cl. 22.ª, n.º 6/n.º 3), o proporcional do ano como máximo; (4) as férias da
  companhia anterior tiravam o subsídio de férias da TAP; (5–6) entra e sai no mesmo ano: junho nunca além da saída, e a saída
  paga o resto como certo (`leavingAt` com `juneFrac`/`venc`; CT art. 245.º, n.º 3 no ano seguinte ao da admissão); (7) baixa
  TAP no mês da entrada pela base inteira ÷ 30; (8) prestação complementar com formação sem tipo: os três casos juntos (certo
  945, máximo 1 012,50), e só certa num mês passado com escala antes dele; (9) cancelamento tardio num dia com complemento:
  o maior, e um por dia; (10) RDP não soma com DDO nem com WFLY+DDO/IDO; IDO antes de DDO; (11) o sino com a entrada e a saída
  da companhia do mês; (12) o serviço TAP acaba aos calços + 30 min ou no sign-off se for mais tarde; (14) o 1.º mês de uma
  companhia anterior conta inteiro. Itens repetidos no mesmo mês juntam-se (`mergeItems`); os motivos do incerto somam-se
  (`reasons`); o art. 245.º do CT entrou em `fontes/pt/` (do mesmo PDF oficial, SHA conferido). O revisor confirmou sem erros:
  os dias na hora da base, a doença TAP no total do mês e do ano, o `dayOffWorked` composto e as noites de formação.
- **Os três que ficavam (o Nuno: "vamos ao que falta"):** (a) a Disrupção, os Relatórios e a Auditoria já não sugerem o RDP de
  um serviço com DDO ou de um WFLY que entrou na folga (`disruptionsByDuty` com `duties`; a mesma regra dos eventos,
  `rdpBarredBy`); (b) o valor de cada serviço TAP soma ao mês — o dia de calendário é do 1.º serviço que o toca (`owners`;
  `serviceMoney` com `duties` no Detalhe, na Escala e no Início); (c) prestação complementar: a baixa do 11.º ao 50.º dia do
  ano conta como disponível (Cl. 10.ª, n.º 2, b)) → só os 10 primeiros dias, os que passam dos 50 e o mês a seguir deixam a
  prestação em dúvida.
- **Testes:** dinheiro 161, dinheiro a menos 279, stats 183, ae-golden, disruption; 34 suites verdes; export iOS ✓.
- **iPhone (sessão guiada, blocos 1 e 2 ✅; o Nuno adiou o resto):** dois erros só visíveis no telemóvel, corrigidos e
  confirmados lá — (1) a roda do dia saltava de 31 para 29 ao mudar para um mês de 30 (a lista encolhe e o iOS reajusta a
  posição; a coluna do dia passou a ouvir só o dedo); (2) "O calendário está errado?" → "Registar as horas reais" prendia o
  ecrã (a 2.ª folha abria com a 1.ª ainda a fechar, temporizador de 280 ms) → `PeleSheet.onClosed`. Na Escala há 4
  encadeamentos iguais com 320–350 ms que nunca prenderam — passar para o `onClosed` se algum falhar.
- **Números de um mês sem serviços (o Nuno: "convém mostrar"):** o ecrã vazio escondia o dinheiro, mas o vencimento base paga-se
  na mesma → com acordo e total > 0 fica o bloco do dinheiro e, por baixo, a nota "Sem escala neste mês" com "Ir para a Escala"
  (refs Mobbin: Cash App, Chime, Fiverr — o número no topo, uma frase e um botão). Sem acordo, o ecrã vazio de sempre.

---

## 2026-11-08 — C34 da cabine TAP: o "agora" pela leitura maior e o trimestre com as duas dúvidas (Opus 5.5) — o Nuno: "vamos a esses dois"

Os dois reparos que a 2.ª revisão dos "4 da triagem" deixou (R3: o Dia da cabine começa às 0h00 do sítio onde se descansa —
Cl. 4.ª, n.os 9 e 13 — e num voo entre fusos pela meia-noite há duas leituras, a da partida e a da chegada):
- **O "agora"** (o valor do período em curso nos Limites): só os 7 dias usavam a leitura maior; o mês, o trimestre e o ano (voo e
  serviço) ficavam pela hora da partida → agora todos pela MAIOR (no voo, cada ponta do intervalo da meia-noite pela maior), e o
  gráfico dos 7 dias também, ponto a ponto (o ponto de hoje = o "agora"). Golden: LIS→PDL a 31/03 23:30 → 00:30 locais, março
  94h25 ou 95h25 → o "agora" 95h25.
- **O trimestre com assistência em casa** (A-140: a 25 % "nos limites semanais, mensais e anuais", Cl. 17.ª, n.º 11 c); o
  trimestre não está na lista → 25 % ou 100 %): as duas dúvidas juntam-se no MESMO aviso — o certo é a leitura menor a 25 %, o
  possível a maior a 100 %; o motivo diz qual decide, ou os dois (`reasons`: hora local + assistência), e o texto diz os dois.
  Antes, se a leitura a 25 % já era incerta pela hora local, o máximo a 100 % perdia-se. Golden: 59 dias de escritório + 3
  assistências + o LIS→PDL → de 479h15 a 498h15, incerto pelos dois motivos (dava até 480h15).
- **Testes:** ae-tap-limits (+4); 34 suites verdes; export iOS ✓. Sem revisão independente (acerto pequeno, com os casos no
  golden). **Nada visto no iPhone.**

---

## 2026-11-08 — O mês da entrada pelos dias (Opus 5.5) — o Nuno: "corrige isso" · "Pedir o dia (Recomendado)"

**O problema:** o `serviceStart` guarda só o mês (`AAAA-MM-01`) → quem entra a meio do mês recebia na app o vencimento do mês
inteiro, e o mês da entrada contava inteiro nos subsídios do ano da admissão. **Decidido (Nuno):** pedir o DIA, opcional, com
Mobbin primeiro; até ser dado, o mês da entrada fica "incerto". **Feito (o motor):**
- `ae/tables.js`: `entryFrac` (a parte trabalhada do mês da entrada: com o dia, (dias do mês − dia + 1) ÷ dias do mês; sem ele, de
  1 dia ao mês todo), `admissionRange` (a fração do ano da admissão, certo e máximo — "proporcional nos anos de contratação",
  Cl. 51.ª/Art. 36.º; RRRGS Cl. 8.ª/17.ª; CT art. 263.º, n.º 2, a)) e `entryMonthBase` (o vencimento do mês da entrada: base ÷ 30
  × os dias desde a entrada, nunca mais do que o mês — a convenção dos acordos já usada na doença; no pacote do advogado).
- Os quatro acordos: Natal e férias do ano da admissão com o certo e o máximo e a marca `admission`; `monthlyAe` reduz o
  vencimento do mês da entrada e dá o intervalo (`baseRange`, motivo `admission`). Sinal novo `startExact` (perfil
  `serviceStartExact`), levado a `monthlyAe`, `aeMonthTotal`, `monthStats`, `yearStats`, `payStatus`, Início, Números e sino.
- Textos: "Quanto recebo?" ("é o mês em que entraste e falta o dia"), Números ("falta o dia em que entraste"; "até mais X
  conforme … o dia em que entraste").
- **O campo do dia** (Nuno escolheu a opção 1 do Mobbin: Open + Lifesum, em `referencias/perfil-dia-entrada/`): a roda de mês
  e ano (`MonthYearWheel`, `withDay`) ganha a coluna do dia à esquerda, a começar em "—" = não sei (o valor dos perfis antigos);
  no Perfil ("Na … desde") e no onboarding; grava `serviceStartExact` nos metadados da conta (e na exportação RGPD). Medido com a
  Hanken Grotesk: cabe a 390, 375 e 320 pt; dívida de desenho igual.
- **Testes:** Dinheiro a menos 258 (o ano da admissão pela regra nova: sem o dia, certo e máximo; com o dia, um valor), stats 180
  (o ano = a soma dos meses, com e sem o dia); 34 suites verdes; export iOS ✓. **Nada visto no iPhone.**

---

## 2026-11-08 — Os três que ficavam: terra fora da base, hora repetida e os fusos de todos os aeroportos (Opus 5.5) — o Nuno: "corrige isto"

- **Serviço em terra sem pernas fora da base** (assistência em GRU): o `nightClockOf` situa-o como o Quadro 1 já fazia — pela
  rota, ou pelo aeroporto da última chegada antes dele — e lê-o pela aclimatação como os voos (B → hora da base). Golden: uma
  assistência em GRU às 20:30 locais, 35 h depois da apresentação em Lisboa, é noturna pela hora de Lisboa → 4.º irregular.
- **A hora repetida da noite em que a hora atrasa** (pernas sem Zulu do calendário): a cadeia escolhe a ocorrência que dá uma
  duração de voo possível para a distância entre os aeroportos (distância/960 km/h + 10 min a distância/600 km/h + 60 min);
  se as duas servem, a conservadora (partida mais cedo, chegada mais tarde); num posicionamento (pode ser por terra) não se
  julga a duração. Antes resolvia-se sempre para a 2.ª — também na partida, onde a 2.ª dá um voo de 1h50 num Lisboa–Faro.
  Fora dessa noite nada muda: 20 000 cadeias aleatórias iguais às de antes.
- **Os fusos de TODOS os aeroportos** (5458) contra a tabela oficial da IANA (`fontes/iana/`, tzdb, 2026-11-08): o tz-lookup
  errava 49 — Pago Pago (um dia inteiro: Apia em vez de Pago Pago), Holguín e Moa (hora das Baamas), Díli (−1 h), Bahrein, Eilat,
  Taba, Kastelorizo, Lampedusa, Saint-Pierre e Miquelon, quatro em Venezuela, Trail (BC, que passou a hora de verão permanente),
  Yukon… → `data/tzOverride.js` (48; Hyder fica com a hora do Pacífico, que é a que usa). O teste do zulu tranca o catálogo
  todo: cada aeroporto num fuso do seu país, ou com as mesmas horas que um deles.
- **Testes:** zulu (+ a verificação dos 5458), ftl-golden, Simulação 102; 34 suites verdes; export iOS ✓; recuperação de um ano
  46 ms. ENGINE_VERSION continua 10 (ainda não saiu do PC). **Nada visto no iPhone.**

---

## 2026-11-08 — Três acertos de cálculo e a recuperação no fuso de aclimatação (Opus 5.5) — o Nuno: "sim" · "vê bem se consegues corrigir"

**Pedido:** os três acertos de segurança ou dinheiro sem desenho da lista (suspensão, noites no Início, noite pelo fuso de
aclimatação); depois, a falha da mesma família que encontrei na recuperação. **Feito:**
- **Suspensão do contrato na cabine easyJet:** a Cl. 86.ª, n.º 2 diz "superior a 30 (trinta) dias" — mais específica do que o "mais
  de um mês" do Código do Trabalho (art. 296.º, que continua nos outros acordos). `suspensionShare(…, { minDays: 30 })`. Golden:
  31 dias suspende, 30 não; um caso antigo do Natal FA passou de 1235,89 € para 1232,20 € (1346,55 × 334/365). Os Números citam a
  cláusula (`suspShort`).
- **Início, "Dentro dos limites?":** os 4 setores em noites seguidas (CS FTL.1.205(a)(1), FAQ EASA 47617) pela MESMA regra da
  Simulação (`nightSectorIssues`): "Não — 5 setores em noites seguidas (máx. 4)" ou "Incerto" (o que pode quebrar a sequência, ou
  a aclimatação). Vê todos os PSV noturnos do dia (um dia pode ter dois).
- **Noite no fuso de aclimatação (ORO.FTL.105(9)):** `nightClockOf` no motor, pelo Quadro 1 como o PSV — B → hora da base; D →
  hora local; X ou por saber → as duas leituras → incerto se discordam. **Em faixa (≤ 2 h da base) a "faixa de 2 h" é convenção
  → o conservador:** noturno se a hora da partida, a da base ou a da chegada (ainda na faixa) o der. O tempo decorrido é o real
  (Zulu), até aos calços da última perna (o posicionamento conta, é período de serviço); um bloco de vários serviços também.
  Ex.: LIS 17:00 → GRU 00:30 locais acaba às 05:00 de Lisboa → noturno (pelas horas da escala não era).
- **Recuperação (ORO.FTL.105(8)):** noturno, matinal e tardio no mesmo fuso, para as 60 h depois de 4 irregulares e a noite de
  transição. O `recoveryIssues` corre matinal/tardio × as duas leituras (estas só quando há aclimatação X ou por saber); o incerto
  diz o motivo (tipo de horário, aclimatação ou os dois). Com o tipo conhecido, a dúvida da aclimatação fica. Os intervalos e as
  noites locais continuam nas horas da escala (o fim de cada serviço está no fuso de onde se repousa).
- **Aclimatação (Quadro 1 — mexe no PSV, ENGINE_VERSION 10):** um serviço dos 6 dias antes sem pernas com horas situa-se pela rota
  (ou na base, se for em terra); sem forma de o situar e se a letra mudasse com ele → por saber (antes saltava-se e dava D).
- **Rapidez:** o desvio de cada fuso guarda-se por quarto de hora UTC (exato: as mudanças de hora caem sempre no início de um) e
  o `nightClockOf` faz um só `zuluTimingOf`. Recuperação de uma escala de um ano: 24 → 44 ms; a janela da Simulação, 12 ms.
- **Revisão independente (1.ª):** 4 erros confirmados — dia com 2 PSV noturnos (só se via o 1.º); serviço anterior sem pernas →
  D; blocos de vários serviços pelo relógio; o texto do Natal proporcional nos Números com a regra do CT — e uma interpretação
  (em faixa para leste a leitura nova era menos conservadora; decidido o conservador). Tudo corrigido, com golden primeiro.
  **2.ª revisão (só ao que mudou):** 1 erro ALTO meu — um serviço em terra sem rota era dado como feito na base, mesmo fora (uma
  assistência em Newark virava a referência do Quadro 1: B em vez de X, PSV com 2 h a mais) → situa-se no aeroporto da última
  chegada antes dele. Mais: o fuso de um bloco que começa com uma assistência sem pernas (vem agora do 1.º serviço com pernas);
  sem base, só a hora local; dois PSV noturnos no mesmo dia com um aviso cada; motivo "os dois" no incerto das noites; os desvios
  no instante da apresentação (dia da mudança de hora). Fora do âmbito mas real, corrigido: o Bahrein caía no fuso de Teerão
  (+3:30) e o desvio por aeroporto guardava-se por hora (30 min errados na mudança de hora da Terra Nova e de Adelaide) → por
  quarto de hora. O `homeBaseAt` passou a estável (`useCallback`): o Início refazia a recuperação a cada render. A revisão
  confirmou o resto: sem longo curso, a recuperação e a Simulação dão exatamente o mesmo de antes (1440 + 3000 escalas
  aleatórias); a cache de fusos é exata (418 fusos, 2020–2030). **Por convenção:** com a chegada noutro fuso dentro da faixa
  (BCN, MAD, TLV) aparecem avisos novos CERTOS (noites, transição tardio → matinal) — é a leitura conservadora escolhida.
- **Testes:** Simulação 102, Dinheiro a menos 247, ftl-golden e zulu com os casos das duas revisões; 34 suites verdes; export
  iOS ✓. **Nada visto no iPhone** (ver a lista: Início e Números).

---

## 2026-11-08 — Os dois números do Manual de Operações vão aos sindicatos

O desconto da pausa no repartido (`splitAdminMin`, CS FTL.1.220(b)) e a diferença de apresentação pilotos/cabine
(`cabinGapMin`, ORO.FTL.205(c)) estão desconhecidos (null) para todas as companhias: os repartidos e a cabine perto do limite dão
"incerto". **Decidido (Nuno, por recomendação):** pedir os valores da easyJet e da TAP ao SPAC e ao SNPVAC (Anexo D-A do pack,
na mesma conversa da licença) — é um número por companhia, não por tripulante. O campo na configuração (como o pós-voo da Ryanair
e da Hi Fly) fica de reserva para as companhias de que nunca se consiga o valor. Quando chegarem: pô-los em `App.js` por
companhia, com a citação do manual, golden primeiro.

---

## 2026-11-08 — O "Editar serviço" saiu: a escala só se lê, o resto completa-se (Opus 5.5)

**Pergunta do Nuno:** "a opção editar serviço não faz sentido, pois não? A escala vem do calendário ou do PDF." **Análise:** metade
certa — as horas, a rota e os setores vêm da fonte (regra 4: o que se mudasse à mão a sincronização repunha); mas o formulário
também era o único sítio para os factos que a lei (FTL) ou o acordo precisam e o calendário nunca traz (discrição, adiamento,
assistência antes, tripulação reforçada, alojamento na pausa, apresentação dos pilotos, prolongamento planeado, pernoita, papel,
DHC em económica, folga trabalhada, tipo de escritório/formação). **Decidido (Nuno: "faz o recomendado"):**
- **Referências** (Mobbin, em `referencias/servico-completar/`): N26 (secções da fonte vs. o que acrescentas), Starling (o cartão
  que diz onde completar), Apple Wallet (a saída discreta quando a fonte está errada). Esboço `design/detalhe-servico.html` v2
  (o v1 foi para `design/arquivo/`), medido: 390 pt sem nada a passar, letra ≥ 11, toque ≥ 44, contraste calculado.
- **Construído:** `data/dutyComplete.js` (puro, `test:completar` 27 — que linhas, valor, `need`, folha, o que gravar; horas reais
  e dado em falta) · `components/FactSheet.js` (a folha de UM dado: escolha, hora, horas) · Detalhe do serviço: Horário e Setores
  só leitura com "do calendário"/"do PDF" e a hora REAL ao lado da prevista (a escala publicada `snap`); secção **Completar**
  (sobe para logo a seguir ao FTL quando falta um dado, com o cartão); pílula **Incerto** (antes dizia "Dentro" com um incerto);
  a saída "O calendário está errado?" com duas portas (horas reais · faltou um dado) — o resto corrige-se na fonte. Os serviços
  extra abrem o seu Detalhe (`idx`). Estilos do ecrã migrados para `TXT`/`SPACE` (dívida de design −3, chão gravado). Cores novas
  na pele: `warnText` #9A4508 (5,51 sobre o warnSoft) e `affordance` #86847D (3,74).
- **Saiu:** o botão "Editar serviço", o toque longo na Escala, o "Editar" dos serviços extra (passou a "Ver"), o formulário na
  Escala. O formulário inteiro fica só na Simulação e na correção da importação (título "Corrigir a leitura"). O Início ("Registar
  o sign-off") abre as horas reais.
- **Não testado:** nada visto no iPhone; sem revisão independente (é UI — a verificação é no device). **Ver no iPhone:** Detalhe de
  um voo (Horário com "do calendário"; uma hora real registada com o selo REAL e a prevista); um repartido sem o alojamento
  (pílula Incerto, Completar a seguir ao FTL, cartão, folha das 3 opções → o PSV deixa de ser incerto); conta de cabine (linha da
  apresentação dos pilotos); "O calendário está errado?" → horas reais e "faltou um dado" num serviço sem apresentação; um dia com 2
  serviços (o 2.º abre o seu Detalhe e grava no sítio certo); a Escala sem o toque longo; o Início → "Registar o sign-off".

---

## 2026-11-08 — Os 4 que ficavam da triagem (Opus 5.5) — o Nuno: "corrigir isto"

Golden primeiro em cada um; `npm test` verde; pacote iOS gerado sem erros.
- **Noites seguidas (CS FTL.1.205(a)(1), 4 setores):** pela FAQ EASA 47617 ("'Consecutive' is referring to two night duties only
  separated by a rest period"): seguidas se só houver repouso entre elas → "excede" (antes "incerto" com noites livres pelo
  meio); quebra-se com uma recuperação (235(d)) ou um serviço não noturno pelo meio — PSV, escritório, formação, posicionamento
  ou assistência (105(10)); a reserva não conta (230). `dutyBetween` em data/simulation.js.
- **A-138 (TAP cabine):** a Cl. 23.ª, n.º 1, a) resolve — a folga de 48 h vale depois de QUALQUER PSV da rotação com 4
  aterragens → "excede" (antes "incerto", leitura estrita).
- **R3 (TAP cabine, C34):** os dias começam "às 0h00 locais" (Cl. 4.ª, n.º 9), hora "do local de onde o tripulante de cabine se
  encontra e realiza o descanso" (n.º 13), não a da base. Num voo entre fusos pela meia-noite, as duas leituras (partida e
  chegada): excede nas duas → excede; só numa → incerto, motivo `hora-local`. Pilotos ficam na base (Cl. 6.ª, n.º 9).
- **AVSEC (pilotos):** deixou de alargar o fim de semana para segunda (Reg. 1182/71, art. 3.º, n.º 4 — dúvida no pack, E8); a
  nota explica. Pack E4 e E8 atualizados (o que a app faz agora); Word gerado.
- **Revisão independente:** 5 erros + 6 reparos, corrigidos. Noites: o que fica ENTRE as duas noites decide-se em 3 casos —
  quebra (serviço claro de dia com ≥ 10 h de cada lado), não quebra (só repouso, ou serviço a < 3 h de um PSV: faz parte dele,
  ORO.FTL.215(a)), incerto (serviço sem horas, reserva ou assistência em casa — não são repouso, ORO.FTL.105(21) — ou 3–10 h);
  o texto do aviso diz qual. C34: as duas leituras combinam-se JANELA A JANELA (`rollingCheck2`/`calendarCheck2`/
  `calendarCheckU2`) — sem avisos duplicados nas janelas de 7 dias, e o "incerto" leva o intervalo. A-138: a Cl. 23.ª é de
  médio curso → no longo curso continua a dúvida. FAQ 47617 copiada para `fontes/easa/` (teste confere a citação); AVSEC: a
  Prova mostra o art. 3.º, n.º 4 citado na nota; saiu o código do salto de fim de semana.
  2.ª revisão: 4 erros, corrigidos — um PSV de dia pelo meio segue as mesmas regras dos intervalos (antes quebrava sempre);
  reserva/assistência em casa noturna também é dúvida; serviço sem horas no dia de uma das noites é dúvida; A-138 só certa
  com médio curso SABIDO (aeroporto desconhecido → incerto). O "agora" das 7 dias da cabine mostra a leitura maior. Fica (reparo):
  o valor "agora" do voo do mês continua pela leitura da partida; o máximo da assistência a 100 % no trimestre perde-se quando
  a leitura a 25 % já é "incerto" pela hora local (o estado está certo).
- **Ver no iPhone:** Simulação com duas noites e uma folga pelo meio; Escala/limites de uma conta TAP cabine com um voo
  dos Açores pela meia-noite; validade AVSEC a cair num sábado.

---

## 2026-11-07 — AUDITORIA, BLOCO 8b: os erros novos da triagem (Opus 5.5) — o Nuno: "corrige isto"

Golden primeiro em cada um; `npm test` verde (33 suites); pacote iOS gerado sem erros. ENGINE_VERSION 5 (o dayLog recalcula).
- **Segurança 1 — cabine com repouso a bordo:** a diferença de apresentação (ORO.FTL.205(c)) somava-se DEPOIS do teto da
  tabela CS FTL.1.205(c)(3) → classe 3 a 16:45 "dentro" ("Not allowed" acima de 16:00). Agora a classe e o repouso a bordo
  da cabine limitam o total já com a diferença; só o PSV da técnica recebe a diferença por cima (`cabCap`, `ftl/index.js`).
- **Segurança 2 — serviço pela meia-noite (A-173):** cada entrada do dayLog guarda `servicoNextMin`/`vooNextMin` (a parte
  depois das 00:00; o voo pelas pernas ou pelos calços, sem pernas fica no dia da apresentação) e as somas das janelas 7/14/
  28 dias, ano civil e 12 meses passam-na para o dia seguinte (`dayMin`, `nextMin`, `sumRangeMin`). A dúvida dias civis vs
  168 h continua no pack (anexo E-A, ANAC).
- **Segurança 3 — repartido com "Sala":** garantido = FAQ EASA 47628 (pausa ≥ 6 h ou no WOCL sem alojamento adequado não
  prolonga; sem a hora de início assume que toca o WOCL), possível = AESA ((e)(2)); facto em falta `splitAccRule`, só quando as
  leituras diferem. A 8 h de pausa com sala: 13:00 a 16:00 (a app dava 16:00 certo).
- **SNC da cabine:** `sncToRegister` (Escala) passa a ser `disruptionsByDuty` filtrado — uma só regra nos dois ecrãs.
- **VB dos pilotos TAP:** `indexRange` — mínimo (adiamento 2024/25 + só 2 %: 2024 ×1, 2025 ×1,02, 2026 ×1,02³) e máximo (+3 %
  a 1-jan: ×1,03, ×1,03², ×1,03³); o índice do motor é o MÍNIMO; `baseRange` com `reason: 'tapRaise'` → "incerto" com o
  motivo certo no "Quanto recebo?" e nas Estatísticas. 2024 passou a estimado. CTE 2024: 8 125,00 a 8 368,75 €.
- **Também:** texto "sem estimativas" da TAP cabine (A-101) → diz que o KPI de 2 % fica de fora; comentário das férias TAP.
- **RGPD/legal (o Nuno: "também vais corrigir isto?"):** "Abrangido pelo AE" SÓ no telemóvel (cache `cp_profile_*`; o Perfil
  manda `aeCovered: null` ao servidor e a app limpa a cópia antiga uma vez por conta, flag `cp_aecov_local_<uid>`); Termos §2
  sem "de legalidade"; PDF do 245 = "Registo pessoal · modelo do ORO.FTL.245" + declaração "tal como registados na
  aplicação"; Privacidade §3 com a linha do tempo, o vínculo, a largada, a entrada por código, o "Abrangido" (dispositivo) e
  as datas de baixa (dispositivo); marcadores dos e-mails tirados. Copiado para `web/site/` — **NÃO publicado** (falta o OK).
- **Pack:** `docs/pack-advogado.md` atualizado com estas mudanças; Word em `docs/pack-advogado.docx`.
- **Revisão independente (2.º agente, só com o código e as fontes):** 5 erros + 10 reparos. Corrigidos no mesmo dia, golden primeiro:
  E1 o Início/Números/notificações só viam o período que acaba hoje → com a parte de amanhã, o pior dos dois (`computeDutyTime`,
  `computeFlightTime`); E2 a Simulação/importação não viam o período que começa no dia seguinte → `limitsAround` com mais um
  período e o ano seguinte num voo de 31/12; E3 as 6 h da sala medem-se na pausa LÍQUIDA (CS 220(b)); E5 (já vinha de antes) a
  chegada depois da meia-noite convertia-se para Zulu com o fuso do dia anterior → na noite da hora de inverno o PSV saía com
  1 h a menos (22:00→04:00 = 7 h, dava 6 h) — `zuluTimingOf` usa o dia de cada hora; reparo 1 (a parte depois da meia-noite
  conta desde o início real do PSV na 2.ª notificação), 3 (rótulo da sala), 4 (Estatísticas pelo `AE_ID`), 6 (comentários do VB:
  a nota diz "mínima adicional" de 1 %).
- **Feito depois, no mesmo dia (o Nuno: "corrige isto"):** E4 — TAP pilotos: Natal, férias, subsídio pendente e `hourlyRange`
  (3 %/6 %) com o máximo do VB do ano (flag `tapRaise`; só com o índice do motor). Reparo 5 — TAP cabine 2026: o KPI dá
  "10 % face aos valores em vigor no final do ano de 2025" (a coluna tem 8 %) → máximo = fim de 2025 × 1,10 (CAB 3: 2 020,73 a
  2 058,16 €); S/C 1–7 (só existem desde 2026) = coluna × 1,10/1,08, leitura; CAB 0 fora (RMMG); `baseRange` reason `tapKpi`
  com o texto próprio no "Quanto recebo?". Reparo 2 — o voo depois da meia-noite reparte-se pelas horas Zulu das pernas no
  relógio da escala. Reparo 8 — a barra das 900 h das Estatísticas usa a soma legal do ano (`sumCalendarYearMin`, dia local);
  as horas do ano continuam pelo dia do serviço (logbook). Reparo 10 — CS FTL.1.225(b)(8): standby antes de um PSV com repouso
  a bordo ou repartido → 8 h. Reparo 7 — não se aplica: nenhum ecrã grava entradas manuais (as calculadoras foram apagadas).
  **Publicado** em crewpact.app (termos e privacidade novos, ainda com a marca RASCUNHO), verificado HTTP 200 e o texto novo.
  **2.ª revisão independente** (destes acertos): 6 erros + 9 reparos. Corrigidos: ENGINE_VERSION → 6 (sem isso os registos
  gravados não recalculavam); o relógio do voo depois da meia-noite é o da 1.ª perna do SERVIÇO (com posicionamentos);
  **tempo decorrido no longo curso** (já vinha de antes, GRAVE: o limite de 3 h ao ajuste deitava-o fora → LIS→GRU 21:15→05:30
  dava PSV 8:15 em vez de 12:15; agora até 12 h); **standby noturno (CS 225(b)(9))** sem a hora do contacto → garantido com a
  noite a contar, possível sem ela, facto em falta `standbyContact` (já vinha de antes); KPI da TAP cabine pela leitura MAIOR
  (coluna × 1,02, toda a tabela, também o CAB 0 — CAB 3 2 061,14 €; a outra leitura, fim de 2025 × 1,10, vai no pack D23);
  o texto do "até mais" separa a leitura do acordo da atualização do VB; o intervalo da base dos pilotos TAP só com o índice
  do motor.
  Ficam (reparos): `hourlyRange` e o `kpi` do `vh` sem ecrã que os mostre; o aviso das 18 h acordado do standby recalcula sobre
  o teto já reduzido e com 6 h (conservador); na barra das 900 h o número grande é pelo dia do serviço e a percentagem pelo dia
  local (podem não bater num voo de 31/12); o "incerto" do ANO nas Estatísticas atribui-se à TAP se a companhia atual é TAP;
  repartido com adiamento pode dar 8 h no standby sem a extensão (raro, não reproduzido); as telas que mostram Zulu ainda
  convertem a chegada depois da meia-noite com o dia da partida (só a vista).
  **Pack:** D23 (a leitura dos 2 % do KPI da TAP cabine e o CAB 0); Word num só ficheiro, `docs/pack-advogado.docx`.
  **Os reparos que ficavam — FEITOS (o Nuno: "corrigir isto"), ENGINE_VERSION 7:** a hora Zulu nos ecrãs (`legDay`/`legZulu`
  com `ref`: a partida antes da apresentação e a chegada antes da partida são do dia seguinte → o fuso desse dia; Detalhe,
  Escala e Início passam a apresentação); o aviso das 18 h acordado do standby deixou de reduzir o teto duas vezes (podia
  NÃO avisar — não era conservador); com adiamento o standby não leva as 8 h do repartido; o número das horas ao lado do
  teto de 900 h é a soma legal do ano; o motivo do "incerto" do ano vem dos meses (`uncertainReasons`). Ficam sem ecrã, mas
  certos e testados: `hourlyRange` (TAP pilotos) e o `kpi` do `vh` (TAP cabine) — depois mostrados na Biblioteca (ver abaixo).
  3.ª revisão (curta): apanhou a chegada passada para o dia seguinte DUAS vezes no motor (PSV errado 1 h nas VÉSPERAS das
  mudanças de hora) — corrigido, o motor usa o `legDay` uma só vez; golden de 23/10 e 27/03.
  **Limite do relógio e contas sem ecrã — FEITOS (o Nuno: "temos que corrigir isto"), ENGINE_VERSION 8:** a CADEIA do serviço
  (`legsChainMs`/`legsZulu`, data/zulu.js): cada hora é um instante UTC — a partida o 1.º candidato (D−1..D+2) que não vem antes
  do momento anterior (a apresentação ou a chegada anterior), a chegada o 1.º entre 0 e 22 h depois da partida. Já não depende
  de voo + fuso caber em 24 h nem da linha de mudança de data (LIS→NRT 16 h: PSV 17:15; NRT→HNL 7:30). O motor usa-a no tempo
  decorrido do PSV e no voo depois da meia-noite; Detalhe, Escala e Início nas horas Zulu. O valor horário (TAP pilotos L1/L2 e
  TAP cabine) aparece em € da tua categoria, com o intervalo, na Biblioteca → O teu AE (a explicação de cada item).
  4.ª revisão: a partida marcada uns minutos antes da chegada anterior saltava 24 h (PSV 9:00 em vez de 13:00) → folga de 3 h
  na cadeia, e o motor volta ao relógio se os instantes não fizerem sentido; "para ti" só com a categoria do perfil; a cadeia
  uma vez por serviço na Escala. Aeroporto da 1.ª partida sem fuso conhecido: com a Zulu do calendário, o fuso da apresentação
  sai da própria perna (`chainReportMs`, ENGINE_VERSION 9). Sem fuso NEM Zulu não há como saber: fica o relógio do telemóvel.
- **Era para depois (da revisão):** E4 — na TAP pilotos só a BASE mostra o intervalo; Natal, férias, `pendingAnnual` e as
  horas L1/L2 (3 %/6 % do VB) saem no mínimo como certos (conservador, mas devia ser intervalo); reparo 5 — TAP cabine 2026 sem
  o intervalo do KPI de 2 %; reparo 2 — o voo depois da meia-noite reparte-se pelas horas locais de cada aeroporto (longo curso:
  ~20 min mal repartidos; o total certo); reparo 7 — entradas manuais sem `src:'duty'` não repartem; reparo 8 — "horas do ano"
  nas Estatísticas (por data) e o ano civil do 210 (à meia-noite) diferem num voo de 31/12; reparo 10 (já vinha de antes) —
  standby anterior com repouso a bordo/repartido devia dar 8 h e não 6 h (CS 225(b)(8)), erro conservador. As telas que mostram
  Zulu (Detalhe, Escala, Família, Início) ainda convertem a chegada depois da meia-noite com o dia da partida (só a vista).
- **App.js:** o `.gitattributes` diz LF mas o ficheiro estava guardado com CRLF → normalizado num commit à parte.
- **Ver no iPhone:** Relatórios (o rótulo novo cabe?); "Quanto recebo?" e Estatísticas numa conta TAP piloto (incerto com o
  motivo); Perfil → Abrangido (grava e repõe ao reabrir); um repartido com Sala ("incerto" com o texto da sala); cabine com
  repouso a bordo e diferença de apresentação; Início/Números com um serviço noturno a passar a meia-noite.

---

## 2026-11-07 — AUDITORIA, BLOCO 8: o pack do advogado (Opus 5.5) — "vamos ao advogado"

**Feito:** `docs/pack-advogado.md`, escrito para o advogado (direito do trabalho + RGPD), com as perguntas numeradas:
A (antes do lançamento: entidade, Termos, Privacidade, art. 9.º, saúde, PDFs que o tripulante assina, sincronia de folgas) ·
B (licença SPAC/SNPVAC, marca) · C (citação de textos oficiais, CDADC art. 7.º) · D (22 dúvidas dos AE, com € e a leitura
conservadora) · E (8 dúvidas de limites TAP/FTL + peso das FAQ EASA + anexo de 5 perguntas para a ANAC). Nenhum código mudou.
Triagem feita por 2 agentes (Opus) contra o código atual e `fontes/`: das ~50 dúvidas da auditoria e ~30 pendências
"advogado", muitas já estavam RESOLVIDAS pelos blocos 1–7 ou pelo próprio texto (A-013, A-047, A-055, A-133, A-136, A-137,
A-141, A-157, A-175/257, A-176, A-177, A-219, A-283/284/287, Cl. 51.ª/4, abono dos 9/3, FA1 1345 €).

**Factos novos apurados:**
- A política publicada está DESATUALIZADA: não lista a linha do tempo, o vínculo, o "Abrangido pelo AE" (vai para o servidor
  em `user_metadata` — indício de filiação, art. 9.º), largada, frota, instrutor; nem a entrada por código. Os marcadores
  "confirmar/criar este endereço" já não fazem sentido (os e-mails existem). Corrigir depois da resposta do advogado.
- Os dias de doença (`aeEvents`) ficam SÓ no telemóvel (AsyncStorage); não vão para o servidor.
- Termos §2 diz "cálculo FTL de legalidade" (contradiz o §3); §12 remete para a plataforma europeia de litígios (encerrada
  em 2025, a confirmar).
- O PDF do 245 diz "registo legal" e o tripulante declara "com exatidão… em conformidade com o ORO.FTL.245" → advogado (A6).
- FAQ EASA respondem: 47617 ("consecutive" = só separados por repouso), 47599 (discrição sobre prolongamento), 47628
  (repartido pede alojamento ADEQUADO — a AESA espanhola diz o contrário).

**Erros novos encontrados na triagem (NÃO corrigidos — bloco 8b):**
- **Segurança:**
  1. Cabine com repouso a bordo: o gap de apresentação soma-se DEPOIS do teto, e passa o "Not allowed" da CS FTL.1.205(c)(3)
     (classe 3, PSV 16:40 → app "dentro"; `ftl/index.js:155`).
  2. A-173: o serviço que passa a meia-noite soma-se todo no dia do report → as janelas de 7/14/28 dias perdem horas
     (`sumWindowDaysMin`, `limitsAround`).
  3. Repartido com "Sala": a app dá a leitura da AESA como certa → devia ser intervalo/"incerto" (`splitCountedBreakMin`).
- Noites seguidas: "incerto" onde a FAQ 47617 diz consecutivo; `fdpsBetween` não vê serviços não-PSV; `nightOf` pelo
  relógio do telemóvel, não pelo fuso de aclimatação.
- TAP: A-138 a Cl. 23.ª n.º 1 a) resolve (devia dar "excede", dá "incerto"); R3 "Dia" da cabine pela base, contra a Cl. 4.ª
  n.º 13; AVSEC alarga pelo Reg. 1182/71 sem base clara.
- **Dinheiro:**
  1. SNC da cabine: `disruptionsByDuty` (Disrupção/Relatórios/Auditoria) e `sncToRegister` (Escala) dão respostas diferentes.
  2. Suspensão do contrato na cabine easyJet: a Cl. 86.ª/2 diz "superior a 30 dias", `suspensionShare` usa "mais de um mês".
  3. VB dos pilotos TAP 2024/2025 abaixo do mínimo do BTE (adiamento não publicado), 2024 sem marca de estimativa.
  4. `infoCatalog.js:120` "sem estimativas" (A-101).
  5. O `serviceStart` guarda SÓ o mês (`AAAA-MM-01`) — a linha 246 deste ficheiro dizia que tinha o dia.
  6. Comentário obsoleto em `ae/tapSpac.js:203`.
- Leituras não-conservadoras ainda em uso, à espera do advogado: RDP ≥ 119 e atraso operacional; ADTY de 4h00; CMP pela
  linha do chefe; bandas do per diem nos decimais; SBY/STBY pagos como ADTY.

**Decisões pendentes do Nuno (produto, não lei):** aviso "hora da sincronização" no SNC (A-085); campo "formação inicial"
(A-218); dia de admissão (ou "incerto" no 1.º mês, e o dia da largada em janeiro na TAP); mês do variável ("Ganhos da escala
de novembro" vs modo recibo, A-200); aplicar já a FAQ 47617 ("excede" em vez de "incerto"); aclimatação de partida = base;
radiação/estatísticas A-268/269/275/276. No pack ficaram 3 intenções a confirmar: E4 (passar o "Dia" da cabine TAP à hora do
local de descanso), D9 ("a confirmar" no SNC depois de 31-01-2027), D22 (mostrar os dois VB da TAP).
**Para preencher pelo Nuno no pack:** o apelido na linha de autor. **Pedir aos sindicatos/empresa:** Anexo D-A.
**Sugestão:** passar `aeCovered` a só-local já (cabe sem esperar pelo advogado).

---

## 2026-11-06 (noite) — AUDITORIA, BLOCO 7: textos e citações (Opus 5.5)

Golden primeiro: `scripts/citacoes-tap-ftl.test.js` (334 asserções), que corre no `npm run test:citacoes` depois do da
easyJet. Procura cada citação que o tripulante lê no texto oficial de `fontes/`. `npm test` verde (33 suites); pacote iOS
gerado sem erros. Nenhum valor em € nem nenhum limite mudou: só o que se lê.
- **TAP — o regulamento em cada citação.** No BTE da TAP cada regulamento recomeça a numeração. Uma "Cl. 7.ª" solta abria a
  "Direito à atividade sindical" (A-104). Agora: "RRRGS Cl. 9.ª", "RUPT Cl. 45.ª", "AE Cl. 37.ª" (clausulado geral, como o
  próprio BTE escreve "cláusula 49.ª do AE"). Corrigido na Biblioteca, na Prova, nos Cálculos dos módulos, nas prestações do
  mês (`cite`), no formulário, no valor do serviço (`perdiem.js`), no detalhe do serviço (limites do RUPT) e nos Números.
  O teste lê o BTE por regulamento e confirma a cláusula e o assunto.
- **Férias dos pilotos TAP (A-113):** "piso de 38 mesmo com faltas" estava errado. As ausências longas reduzem até 30 dias
  (RUPT Cl. 45.ª, n.os 5 e 6); os 38 são o piso da troca de faltas injustificadas por férias (AE Cl. 33.ª, n.º 2).
- **Baixa no Início (A-103, A-205):** a regra vem do acordo do perfil (`SICK_STATE` em cada módulo). TAP pilotos: AE Cl. 37.ª;
  TAP cabine: RRRGS Cl. 20.ª. Nos dois, dias 1–3 = o líquido, só em 3 ocorrências por ano; depois a TAP completa o subsídio
  da SS até ao líquido (a app não calcula líquidos, só diz a regra). Sem acordo modelado (Ryanair, Hi Fly): nenhuma frase
  sobre pagamento. "de 3 pagos" só nos pilotos easyJet.
- **Formulário do serviço (A-207, A-211):** as notas saíram para `data/aeTexts.js` (testável). ADTY dos pilotos pelo Anexo
  I.5 (não chamado 1 NS até 3h59, 2 a partir de 4 h; chamado: os setores, + 2 NS a partir de 4 h); ADTY da cabine pela Cl.
  58.ª; assistência em casa da cabine = Cl. 59.ª. A pernoita diz a regra de cada acordo; sem acordo, não diz "abono AE". A
  lista dos tipos deixou de prometer € ("+2 setores", "sem abono").
- **Biblioteca easyJet (A-012, A-048, A-073, A-210):** bónus dos pilotos = alvo de 10 % (CPT, SFO), 7,5 % (FO), 5 % (SO)
  da base anual (Art. 46.º, n.º 3), não "~2 semanas"; ADTY pilotos e cabine pelo texto; IDO da cabine = paragem noturna
  não programada num dia de folga, a folga é devida (Cl. 68.ª, n.º 3).
- **FTL:** Biblioteca com a alínea de cada número (1000 h = ORO.FTL.210(b)(3), A-213; 900 h (b)(2); 100 h (b)(1); 60/110/190
  h (a)(1)–(3); 12 h = 235(a)(1); PSV = 205(b)). Prova do PSV máximo com a hora de referência e o estado desconhecido
  (Quadro 3) (A-299); Prova do standby pela CS FTL.1.225 (25 %, 4 h e 6/8 h), sem o "230" da reserva (A-294); "calendar
  months" em inglês (A-300). Textos latentes do ecrã FtlDetail (corrigidos e, a seguir, apagados com o ecrã — ver abaixo): definição 8 em inglês copiada
  do JO, "CS FTL.1.205(g)" → (d), "psvExt" 205(b) → 205(d), ORO.FTL.205 c) com a frase da hora dos pilotos (A-298),
  repouso a bordo com 90 min consecutivos, 2 h aos comandos e os tetos dos pilotos (A-297), recuperação com 60 h, 2 dias
  locais e 72 h (A-295). O teste varre todo o código: cada "ORO.FTL.NNN(x)(n)(i)" / "CS FTL.1.NNN(…)" tem de existir.
  Apanhou "ORO.FTL.225(d)(e)" e "CS FTL.1.220(d)(e)" (escritos como subalíneas) → "(d) e (e)".
- **Radiação (A-277):** fontes novas — Diretiva 2013/59/Euratom (`fontes/eu/`) e DL 108/2018 republicado em 2022
  (`fontes/pt/`). Prova: 20 mSv = art. 9.º/2; acrescentado o nível de referência português, 10 mSv/ano (DL 108/2018, art.
  92.º e 93.º), também nos Números e na Biblioteca. A Prova da radiação deixou de dizer "FTL".
- **Valores brutos (A-198):** "estimado · bruto" no Início, "estimados · brutos" nos Números, "Total estimado (bruto)" no
  Perfil (os Anexos I dizem "valores brutos").
- **SNC/RDP (A-081):** a declaração do visto (ecrã e PDF) é a de cada acordo (`declarationFor`): SNC pilotos Art. 63.º, n.os
  4 e 5; SNC cabine Cl. 66.ª, n.os 3 e 4 (chamado de assistência; perturbação externa nas 12 h); RDP cabine Cl. 67.ª, n.º 2
  (os códigos LATE/NSO/…). A proposta "Registar SNC" da Escala diz as exclusões.
- **FtlDetail APAGADO (A-296; decisão do Nuno a 2026-11-07, por recomendação do Claude):** o ecrã do texto integral da lei não
  tinha entrada desde julho. A lei abre-se na fonte oficial (Biblioteca → Fontes; Prova de cada número), e uma cópia à mão
  desatualiza-se em silêncio (a auditoria encontrou lá erros). A tabela do repouso a bordo da cabine já vive no calculador da
  Simulação. Saíram: `screens/FtlDetailScreen.js` e as rotas; `FTL_SECTIONS`, `FTL_LIMITS`, `FTL_DEFINITIONS`, `FTL_ARTICLES` e
  `ftlSectionTitle` de `data/ftl.js` (as tabelas do motor ficam); as calculadoras desmontadas PsvCalc, LimitsCalc e RestCalc.
  O teste tranca a ausência (se voltar, volta com teste). Guardião do design: a dívida desceu (novo chão gravado).
  **Limpeza feita (2026-11-07):** 68 chaves `ftl.*` do i18n sem uso apagadas (pt e en; nenhum uso dinâmico; ficam as 78 em uso).
- **Revisão independente (2.º agente, só com o código e as fontes):** 0 erros, 7 reparos, todos aplicados — a exclusão do
  e-learning da TAP cabine é do RUPT Cl. 38.ª, n.º 5, b) e c) (só e-learning, não a formação presencial); a Prova do standby
  diz a regra da noite (CS FTL.1.225(b)(9)); "greve de uma agência externa ou de um subcontratante" na Escala; repouso mínimo
  = ORO.FTL.235(a)(1) e (b); cabine "45 % da base diária" (Cl. 61.ª); as 9 chaves do `VALUE_I18N` seguem os rótulos TAP novos;
  o lawTag do detalhe não repete "RUPT". Não conferido: a numeração dos artigos no texto original do DL 108/2018 (só na
  republicação de 2022, que está em `fontes/`).
- **Pendente:** o mosaico do mês no Início ("NOV · ESTIMADO") não diz "bruto" — não cabe; a linha por cima já diz. A-218
  (formação inicial sem pernoita, pilotos Art. 39.º/44.º e cabine Cl. 56.ª) é dinheiro, fica fora deste bloco.
- **Ver no iPhone:** Início em baixa (conta TAP e de cabine); notas do formulário por tipo (easyJet piloto/cabine, TAP);
  Biblioteca (bónus, ADTY, FTL); Prova do PSV, standby e radiação; Disrupção (o visto mais longo cabe?); o alerta do SNC na
  Escala (texto mais longo).

---

## 2026-11-06 (noite) — AUDITORIA, BLOCO 6: o dinheiro a menos, L1–L13 (Opus 5.5)

Golden primeiro (`scripts/dinheiro-menos.test.js`, 204, a 33.ª suite, `npm run test:dinheiro-menos`): cada valor sai do texto
oficial e o teste confirma a frase em `fontes/` (as linhas com acentos decompostos do BTE normalizam-se). `npm test` verde (33
suites); pacote iOS gerado sem erros. O L12 já tinha ficado no bloco 4. Achados fechados: L1–L11 e L13 (A-001, A-004, A-007,
A-015, A-021, A-022, A-026, A-033, A-039, A-040, A-043, A-044, A-046, A-049, A-050, A-054, A-063, A-065 a A-068, A-070, A-071,
A-091, A-093, A-095 a A-097, A-099, A-107, A-108, A-111, A-112, A-118, A-181, A-183, A-188 a A-191, A-193, A-196, A-206, A-208,
A-209, A-215, A-225, A-235 em parte, A-239, A-259, A-274).
- **Peças novas do motor:** `annualItems` em cada acordo (o que cai num mês certo: subsídios, prestação de abril, permanência,
  retenção) somado no `monthlyAe` (`annual`, `annualItems`) e nos Números/Início; `seniority` na TAP (VE e VS); `positioningOf`;
  `awayNights` (a noite de cada dia que acaba fora + a estadia até ao serviço seguinte que parte dali); `serviceMoney` (o € de
  UM serviço, com o índice do mês — os ecrãs deixaram de fazer contas à parte); `aeIndex`; `dayOffKind`/`minutesIntoNextDay`
  (pilotos); `pendingAnnual` (TAP: o subsídio de férias sem mês); ajudas em `ae/tables.js` (`ymShift`, `vacationPayYm`,
  `admissionShare`, `beforeStart`). `monthlyAe`, `aeMonthTotal`, `monthStats`, `yearStats` e `payStatus` aceitam
  `serviceStart`, `history`, `events` e `lifestyle`.
- **L1 subsídios:** easyJet (pilotos e cabine) 1/14 em junho e novembro, proporcional no ano da contratação; a média das
  variáveis (o acordo não diz que rubricas) e o 1/14 do subsídio de idioma (a app não sabe as línguas) ficam de fora e a linha
  diz "parte certa". Cabine no ano da contratação: junho paga os meses até junho, janeiro seguinte o resto (Cl. 51.ª/4). Pilotos
  contratados depois de junho: férias em dezembro (o Art. 36.º/2 manda a diferença desse ano para dezembro). 9/3: a média do
  ano. TAP: Natal em dezembro (pilotos RB; cabine VB + VS), férias no mês antes do 1.º dia de férias registado (cabine + 675 €;
  2024: 675 × 10/12, Cl. 39.ª); sem férias registadas, os Números dizem o valor e pedem as férias.
- **L2 posicionamento:** pilotos easyJet pelos setores (bandas do per diem, Art. 44.º); cabine easyJet pela tabela do Anexo
  I.18 (corrigida: 3 linhas × 3 colunas, sem CMP nem 'extra') — conta o curto (o mínimo) e mostra até ao longo (o acordo não
  define as durações); o CMP usa a linha do chefe (Cl. 33.ª/7). TAP: o dia de DHC já era AC1/per diem A (bloco 5). Cada DH
  dentro de um serviço de voo também paga. O formulário deixou de dizer "sem abono".
- **L3/L4 TAP:** pilotos RB = VB + VE (2 % × anuidades técnicas: a 1.ª no 1 de janeiro depois do ano completo, máx. 32) + VS
  (1,5 % × anos de companhia, todos os pilotos); cabine VB + VS (1 % por anuidade, à categoria de cada aniversário, pela linha
  do tempo). Sem a data de entrada: só o VB e os Números dizem que falta.
- **L5 TAP:** pilotos — assistência no aeroporto e simulador como aluno = A (coluna da frota); refrescamento/e-learning = B;
  formação sem o tipo = B certo, A possível (`perDiemMax`); o formulário pergunta o tipo (simulador · refrescamento ·
  e-learning, campo `trainingType`); médio/longo curso pela área do RUPT (`isMediumHaul`, a mesma regra dos limites; os 2000 NM
  só sem a posição de um aeroporto). Cabine — complemento da escala (aeroporto não acionado 2 × 40 €; casa, formação presencial,
  escritório 40 €; prevalece o maior, também sobre a AC2); chefia 8 % das AC1 + AC2 do mês anterior (S/C); tempo parcial do RTTP
  (`TP 10` … `TP 6`, 83,3 % … 50 %, vencimento e subsídios; férias pelo quadro).
- **L6** CTI-Flexi = 4 NS do chefe para todos · **L7** DDO/IDO: pilotos pelos 90 min (o formulário sugere pela hora do fim),
  cabine pela Cl. 68.ª/69.ª (textos por acordo) · **L8** férias 14-14 = 14, 21-7 = 21, 7-7 = 18 · **L9** SNC: pilotos com
  assistência antecipada ou trocada por serviço antes de início + 90 min (Art. 63.º/10); fim depois da meia-noite (SNC, RDP e
  a estabilidade da TAP) · **L10** índice do mês em todos os valores por serviço (Detalhe, Escala, formulário, importação,
  Simulação, Início, Auditoria; o cartão da Biblioteca mostra o NS com o IPC) · **L11** pilotos easyJet: prestação complementar
  em abril (× contrato nos PPY/14-14/21-7/7-7; o 5/4 inteira), prémio de permanência no mês do aniversário, retenção em maio
  (PPY não estilo de vida, contrato a 31 de agosto do ano anterior); o bónus (discricionário) não entra · **L13** noites fora
  com a estadia; posicionamento que acaba fora marca pernoita (importação, com a base e a rota).
- **Revisão independente** (2.º agente, só com o código e as fontes): 7 erros, todos corrigidos no mesmo dia (golden 216) — o
  € da TAP por serviço em vez de por dia (2 voos no dia = 2 AC1 na importação; um serviço a cruzar a meia-noite = um só A); a
  formação dos pilotos TAP sem tipo dava o B como certo (Cl. 10.ª/2 d): há formação sem per diem → 0 certo, até ao A; o
  formulário mostrava "Refrescamento" e gravava nada); o VE ignorava a mudança de função (Cl. 4.ª/10: CTE desde maio de 2025 →
  14 anuidades de OP + 1 de CTE); um aeroporto desconhecido tirava a AC1/A do dia inteiro; a antiguidade da TAP conta-se da
  LARGADA (cabine Cl. 14.ª/3; pilotos "largada conjunta"), não da entrada — o motor aceita `largada` e diz quando contou da
  entrada (`fromEntry`; os Números avisam); faltavam dependências (Início e Números ficavam com valores antigos ao mudar a
  data de entrada); a TAP mostrava "N paragens" ao lado do € das estadias. Também: a chefia pela categoria do mês das ajudas; o
  complemento registado à mão num dia de e-learning volta a contar.
- **Data da largada (TAP) — FEITO no mesmo dia** (o Nuno: "sim, quero"; `2a195bc`): linha "Largada" no Perfil, a mesma página da
  antiguidade (roda de mês e ano; não pode ser antes da entrada), gravada nos metadados e na exportação RGPD; o motor conta as
  anuidades e a senioridade dela. Sem ela conta da entrada e os Números pedem-na (ponto âmbar na linha).
- **Depois, também no mesmo dia** (o Nuno: "vê se consegues corrigir"):
  - **Natal numa baixa longa — deixou de ser dúvida:** o Código do Trabalho (PDF oficial do DR, arts. 263.º e 296.º juntos a
    `fontes/pt/`) diz que a doença de mais de um mês suspende o contrato e o Natal fica "proporcional ao tempo de serviço
    prestado no ano civil". Nos 4 acordos (`suspensionShare` em `ae/tables.js`): certo = a suspensão desde o 1.º dia; máximo =
    só depois do 1.º mês (n.º 3: suspende antes "no momento em que seja previsível" — a app não sabe quando). Os Números e o
    Início mostram o intervalo.
  - **TAP, rubricas que faltavam:** e-learning da cabine (Cl. 13.ª: 18,125 €/h até 24 h/ano, no mês seguinte; se as 24 h
    contam as 8 primeiras é dúvida); DHC fora de C/CL (Cl. 12.ª/4: 20 % da AC1 no mês seguinte — interruptor "DHC em
    económica" no posicionamento e no voo com DH); ato médico (escritório marcado "Ato médico": pilotos per diem B, Cl. 9.ª/1
    b) iii); cabine o complemento, Cl. 8.ª/1 f) e g)). Golden 238.
  - **Retenção do PPY e limite do e-learning — lidos no acordo inteiro, ficam como INTERVALO** (o Nuno: "descobrir na lei"):
    o acordo chama ao PPY "contrato de trabalho a tempo parcial" (Art. 25.º; Art. 66.º "Outras modalidades de trabalho a tempo
    parcial"), e a retenção paga-se "proporcionalmente para os que se encontrem em regime de tempo parcial" → certo = proporcional
    ao PPY (FO 8/12: 4 000 €), máximo = inteiro (6 000 €). E-learning (RUPT Cl. 38.ª, n.º 5, a), igual à Cl. 13.ª): "As demais
    horas (...) até ao limite de 24 horas por ano" → certo 24 h no total, máximo 8 + 24 h; e o n.º 5, b) e c): não pagam os
    cursos de qualificação ou conversão nem as ações só informativas. O texto não decide nenhuma das duas: continuam no pacote
    do advogado, mas a app já não escolhe uma leitura (golden 243).
- **Goldens antigos acertados à lei:** TAP pilotos (a base sem antiguidade = só o VB; VS para todos; assistência no aeroporto
  paga A), estatísticas (subsídio de Natal no fecho e no ano; a TAP do ano da mudança com Natal 8/12), doença do mês inteiro
  passou para outubro (em novembro entra o subsídio de Natal).
- **Pendências (para o advogado):** a divisão junho/janeiro das férias da cabine no ano da contratação; as férias dos pilotos contratados depois de junho em
  dezembro; o CMP na linha do chefe no Anexo I.18; a Cl. 68.ª/1 da cabine (DDO ou IDO?); a 1.ª anuidade técnica da TAP com a
  entrada em janeiro (a app conta o 1 de janeiro do ano a seguir ao ano completo); o 5/4 nas férias; da revisão: o valor das
  anuidades técnicas da função antiga (a app usa o VB da categoria de então, na tabela atual); a retenção do PPY 9/12 inteira ou
  proporcional (Art. 25.º/21 a)); o subsídio de férias da TAP no ano de admissão ("ajustado à totalidade dos dias de férias");
  as noites dos pilotos easyJet de estadia e depois de um posicionamento (Art. 39.º "entre serviços de voo").
- **Pendências (produto/código):** a média das variáveis nos subsídios easyJet (que rubricas e que período); o subsídio de
  idioma (campo no Perfil); a saída da companhia (subsídios proporcionais no ano da cessação); TAP: a AC2 por cancelamento
  tardio, a prestação complementar dos pilotos (Cl. 10.ª) e o exercício efetivo do VE (o recibo diz as
  anuidades: campo no Perfil, com Mobbin); WFLY + DDO no mesmo serviço (Cl. 67.ª/5: o modelo guarda um por dia); a formação
  fora da base da cabine na importação (o toggle à mão existe); a formação inicial (Art. 39.º/44.º, Cl. 57.ª/2) a app não
  sabe.
- **Ver no iPhone:** Números de junho e novembro (linha "Subsídios"), do ano (14/14) e de abril (prestação, piloto); fecho do
  Início em novembro (linha do subsídio de Natal); um posicionamento (Detalhe, Escala, Simulação — cabine com o intervalo);
  uma conta TAP piloto (RB com anuidades; formação com o tipo) e TAP cabine (VS, complemento de uma assistência, S/C com
  chefia, tempo parcial no Perfil); o formulário de um piloto easyJet com um voo que acaba depois da meia-noite (sugestão DDO/IDO);
  uma estadia de 2 noites (Pernoitas = 2).

---

## 2026-11-06 (noite) — AUDITORIA, BLOCO 5: o dinheiro a mais, M1–M11 (Opus 5.5)

Golden primeiro (`scripts/dinheiro.test.js`, 128, a 32.ª suite, `npm run test:dinheiro`): cada valor sai do texto oficial e
o teste confirma a frase em `fontes/`. Fontes novas em **`fontes/pt/`**: Código do Trabalho (art. 255.º), salário mínimo
2024–2026 (DL 107/2023, 112/2024, 139/2025) e o IPC de nov-2024 (2,3 %, DREM com o valor do INE). `npm test` verde (32
suites); pacote iOS gerado sem erros. Achados fechados: M1–M11 (A-002, A-003, A-005, A-006, A-009, A-016 a A-020, A-023,
A-024, A-041, A-042, A-045, A-047, A-052, A-060, A-064, A-072, A-076, A-078, A-079, A-084, A-088, A-089, A-092, A-109, A-110,
A-182, A-184 a A-187, A-192, A-194, A-203, A-204, A-219).
- **Decisões do Nuno:** doença — "faz como diz a lei": nos dias de baixa a empresa NÃO paga a base (Código do Trabalho, art.
  255.º, n.º 2, a): a falta por doença "determina a perda de retribuição"), pilotos e cabine; 9/3 e sazonais — "faz como
  achares melhor, e seguir a lei": o motor aceita as datas de atividade (`fullShare`) e, sem elas, o mês é a média com
  "incerto" e o intervalo. O campo das datas no Perfil fica para uma sessão de design (Mobbin primeiro).
- **Doença (M1, M2):** regista-se SEMPRE o episódio inteiro (à mão e na importação — o bloco 4 tirava os 3 primeiros dias da
  cabine; deixou de tirar). O motor (`eventCounts`) conta os dias PAGOS pela regra do acordo — pilotos: dias 1 a 3 a 60 %
  (Art. 48.º; do 4.º em diante só a Segurança Social) · cabine: do 4.º dia, 45 %, até 90 dias nos 12 meses para trás (Cl.
  61.ª; "12 meses em cada ano civil" → a leitura que nunca paga mais, advogado) — e TODOS os dias de baixa (`sickAbsentDays`)
  tiram a base do dia (base ÷ 30; o mês inteiro tira a base toda). Exemplo: FO com 10 dias de baixa em out-2025 → 2 535,45 €
  (a app dava 3 702,12 €). O subsídio da Segurança Social não entra (a app diz isso). Textos da regra vêm do acordo (`SICK_HINT`).
- **Contratos parciais (M3):** abono para falhas e doença da cabine pela base do contrato (9/3: a fórmula do Anexo I.4); o
  WFLY da cabine fica a tempo inteiro (Anexo I.14 o diz). Pilotos: DDO/IDO/WFLY e doença × fator do contrato (Art. 24.º/14,
  66.º/1 — a que não promete a mais; advogado).
- **9/3 e sazonais (M11):** `monthlyBase(..., { fullShare })` 100 %/25 % (9/3) ou 100 %/50 %/75 % (sazonais); sem datas,
  `baseRange` {min, max} → Números, Início e "Quanto recebo?" dizem "incerto" com o intervalo.
- **Tabelas dos meses passados (M4):** easyJet cabine fev-2024, abr-2024 (SNC), fev-2025, abr-2025 (benefícios 425 €),
  nov-2025; FA1 = salário mínimo de cada ano. Pilotos easyJet set-2023, fev-2024, abr-2024 (férias a 2 NS; antes € fixos e o
  SO sem valor); o IPC por MÊS (desde fev-2025) e 2,3 % (era 2,4 %). TAP cabine nov-2023 (VB 2024/2025 e AC), 2024
  (complemento), 2025; os S/C de 2026 não correspondem aos C/C e S/C antigos → sem valor antes de 2026. ANTES da 1.ª tabela
  → `null`, "sem tabela" (o `pickTable` deixou de usar a 1.ª): o mês não dá € e os Números dizem porquê.
- **Antes da admissão (M5):** `aeAt` dá null antes do 1.º período da linha da companhia (ou do início de serviço) → sem €.
- **TAP por dia de calendário (M6):** `tapCalendarDays` — um AC1/per diem A por dia com voo ou DHC a começar ou em curso
  (fim = sign-off ou calços + 30 min), por muitos serviços que tenha; AC2/B só nos dias SEM voo entre um serviço que acaba
  fora e o seguinte que parte dali. O "+ estadia" desapareceu dos dias de voo (formulário, Detalhe, Escala, Importação,
  Simulação, Início, radar da Auditoria) e a Prova diz a regra. O complemento extraordinário não conta num dia com AC1.
- **Instrutor (M7):** pilotos easyJet só em formação (terra/simulador), uma vez por dia; o formulário já não o oferece num voo.
  Os papéis por dia da cabine (CCLT, CTI) também uma vez por dia. **Upranker (M8):** só FA1 e FA.
- **"Soma ao mês" (M9):** `extrasMonthEur` — os extras que entram no mês corrente, pelo caminho do total ("Entra em <mês>").
- **SNC/RDP (M10):** `disruptionsByDuty` — um SNC e um RDP por serviço, o plano contra o final, no ecrã Disrupção, nos
  Relatórios e na Auditoria (a Escala já fazia assim).
- **Sem valor ≠ 0 €:** um item sem valor na tabela desse mês fica "sem valor", fora da soma.
- **Revisão independente** (2.º agente, só com o código e as fontes): 6 erros, todos corrigidos no mesmo dia — o mês inteiro
  de baixa mostrava a base no "Quanto recebo?"; a Escala mostrava o complemento cheio em cada dia de doença; o Início sem o
  "incerto" do 9/3; "sem valor" a 0,00 €; o complemento extraordinário da TAP somado à AC1; a linha da base dos dias de baixa
  com o código interno.
- **Pendências (do bloco e da revisão):**
  - **Dados antigos de cabine** gravados só com os dias pagos (bloco 4) perdem mais 3 dias ao serem lidos agora. Só há dados
    de teste: apagar e reimportar a doença de teste. Antes de haver contas reais não é preciso migração.
  - **Para o advogado:** a leitura dos 12 meses do teto; a base ÷ 30 por dia de baixa; DDO/IDO/WFLY dos pilotos parciais ×
    fator; o SNC da cabine contado antes das mudanças do próprio dia (mudança em D-1 desfeita em D dá SNC + RDP); o FA1 de
    fev-2024 impresso "1345,00 €" (usado 13,45 €).
  - **Mês da admissão:** quem entra a meio do mês recebe o mês inteiro na app (o `serviceStart` tem o dia) — proporcional ou "incerto".
  - **Abono dos 9/3 e sazonais** com as datas: fica na média do ano (Cl. 54.ª: 12 prestações); o Anexo I.4 deixa dúvida.
  - **TAP:** dias de estadia perdem-se se depois do voo houver outro serviço no mesmo dia; as horas da escala podem vir na hora
    do destino (a lei conta na hora da base). TAP doente: a Cl. 20.ª assegura a retribuição líquida (a app não tira a base —
    a TAP não tem eventos de doença).
  - **FA1 em 2027:** fica "sem tabela" até se juntar o salário mínimo de 2027 a `fontes/pt/rmmg.txt` e `NMW_BY_YEAR`.
  - **Perfil:** o campo das datas de atividade (9/3/sazonais), com Mobbin.
- **Ver no iPhone:** Números de um mês de 2024/2025 (valores da tabela da altura) e de antes de fev-2024 ("sem valores do
  acordo"); uma baixa de 5 dias numa conta de cabine (Extras, Início "dia N do episódio", total do mês com a base a sair); um
  FA 9/3 (Início e Números com "incerto"); o formulário de um voo de um comandante instrutor (sem o papel de instrutor); o
  ecrã Disrupção com duas alterações ao mesmo serviço (1 candidato); "Extras do mês" ("Entra em novembro").

---

## 2026-11-06 (noite) — AUDITORIA, BLOCO 4: a importação da escala (Opus 5.5)

Golden primeiro (`scripts/import.test.js`, 106, a 31.ª suite, `npm run test:import`), escrito a partir de `fontes/`;
`npm test` verde (31 suites); pacote iOS gerado sem erros. Achados fechados: S6 do lado da importação (A-220, A-221, A-222,
A-227, A-228), M12 (A-230, A-231, A-232), L12 (A-223, A-229, A-236), o DH (A-224, A-225, A-226, A-263) e ainda A-233, A-234
(pela importação), A-237, A-238 e A-254; a importação passa a usar o `simulateDuty`. ENGINE_VERSION 4.
- **Nenhum serviço sai dos acumulados (ORO.FTL.210):**
  - pernas do mesmo serviço: o limiar de 6 h morreu. Duas pernas são o mesmo serviço só quando o intervalo CERTAMENTE não é
    um repouso: menos de 10 h, o mínimo mais baixo que a lei admite (fora da base, ORO.FTL.235(b), e na base com alojamento
    adequado, 235(a)(2)) — o repartido de 7 h é um PSV ("O intervalo em terra deve contar todo como PSV", 220(b)). 10 h ou mais
    é um repouso, mesmo mais curto do que o serviço anterior (aí é um repouso CURTO, que a verificação aponta); e nunca um
    serviço de 24 h ou mais. Calendário e PDF usam a mesma regra (`buildDuties`);
  - evento de dia inteiro com horas no texto: as horas do texto (era a meia-noite: 24 h de voo, 0 h de assistência);
  - não-voo sem hora de fim (PDF) ou formação de vários dias num só evento: **a corrigir**, nunca "pronto" e fora dos 210.
    Um voo sem as horas das pernas também (o PDF não deixou casar rotas e horas);
  - dia com standby, formação ou escritório e voos: ficam os dois. O standby que acaba é a apresentação do voo (CS FTL.1.225(b)(5));
    o ADTY sem horas é serviço no aeroporto e o PSV conta desde a sua apresentação (225(d));
  - PDF: a apresentação é só a hora antes da 1.ª perna (nunca o Debrief, o bloco ou o atraso); as horas casam com a rota da
    mesma linha; perna "CNX" não é setor; um noturno partido em duas datas é um serviço (sem a pernoita inventada).
- **Posicionamento (DH) = perna `dh`** (calendário e PDF): fora dos setores e do tempo de voo; antes de operar é PSV (215(a));
  depois do último setor o PSV acaba nos calços desse setor (105(12)) e o serviço vai até à chegada do DH (`signOff`, 215(b));
  conta na rota (onde se dorme: a pernoita fica certa) mas não no per-diem (as distâncias saem só das pernas operadas,
  `sectorDistancesNM`: o per-diem é "em serviço de voo (setor)"); um DH sozinho é um serviço de posicionamento. A rota é feita
  perna a perna: pernas que não encadeiam ficam a corrigir (A-226). O motor ignora as pernas `dh` no setor mais longo, na
  pausa do repartido e no fim do PSV; o formulário guarda-as (setores, voo e calços só das operadas; o sign-off deriva da
  chegada do DH); o Detalhe e o "ao vivo" do Início também.
- **Reimportar:** o sign-off antigo sai quando as horas mudam; e-learning e OFC vão sempre e o 3-vias vê a mudança só do código
  (os snaps antigos não dão mudanças falsas); o manual igual ao lido não fica a dobrar; o extra guarda o papel, a folga
  trabalhada, os casos especiais e (com as mesmas horas) o sign-off.
- **Férias e doença:** cada dia do evento, com ou sem horas; o PDF também as sugere. A doença da **cabine** só sugere os dias
  pagos (do 4.º dia de cada episódio, Cl. 61.ª: "após os 3 (três) dias de ausência iniciais"); os pilotos o episódio (Art. 48.º).
  Isto fecha o lado da importação do M1; o registo manual em bloco fica para o bloco 5.
- **ADTY sem hora de fim:** paga o garantido (< 4 h). Antes presumia ≥ 4 h (A-220).
- **Verificação de cada candidato = a da Simulação** (`simulateDuty`, modo `scope: 'day'`): numa escala com TODOS os candidatos
  da leitura (24 dias seguidos davam 0 avisos na 1.ª leitura) e com o pós-voo do perfil. A linha mostra o 1.º aviso ("⚠ serviço
  64:00 em 7 dias (máx. 60 h)"). Os avisos que a leitura cria num dia que ela não aplica (ex.: o "mais de 168 h" num dia já
  guardado) passam para o candidato mais perto. 280 candidatos (12 meses) em 0,67 s no PC (era 4,2 s antes de calcular a escala
  uma vez).
- **Serviços sem apresentação:** o serviço deles é um MÍNIMO (calços a calços + pós-voo) e o máximo começa à meia-noite do dia.
  Um período do 210 só excede quando o mínimo passa; quando só o máximo passa, **incerto** ("falta a hora de apresentação de N
  serviços"). O PSV desses serviços é incerto ("falta a hora de apresentação"); o repouso a seguir/antes de um deles é incerto,
  ou curto se nem o mínimo mais baixo cabe (pendente do bloco 2).
- **Dados gravados pela leitura anterior** (snap sem versão; o snap novo leva `v: 2` e o fim do DH): com os mesmos voos e
  serviços, agrupados de outra maneira, o dia fica **"refresh"** — aplica-se (os dados ficam certos), mas não conta como mudança
  nem vai para o arquivo do SNC/RDP. O OFC e o e-learning a mudar são sempre mudança.
- **Revisão independente (2.º agente, só com o código e as fontes) — 7 erros confirmados, corrigidos no mesmo dia:** E1 o
  agrupamento juntava dois serviços separados por um repouso curto (e o serviço junto dava a volta ao relógio: PSV 03:25,
  "dentro"); E2 o DH entrava no per-diem da cabine como setor; E3 editar um serviço com DH transformava-o em setor; E4 um
  prolongamento planeado dava "excede" na importação (faltava o snap); E5 os avisos que caem num dia guardado perdiam-se; E6 o
  sign-off de um DH que saiu da escala ficava; E7 os dados da leitura anterior davam mudanças falsas que viravam SNC/RDP. E
  também os riscos R1 (PDF: fim de standby depois da saída), R2 (PDF: perna cancelada que parte o dia) e R9 (o DH no Detalhe e
  no "ao vivo"). **Riscos que ficam:** R3 um DH marcado só nas notas, com o nº de voo no título, conta como voo (sem amostra
  real); R5 um serviço sem apresentação no mesmo PSV repartido (só com dados manuais ou antigos); R6 o "incerto" não aparece na
  folha (só o "⚠ excede") e o Início/Números ignoram o máximo dos serviços sem apresentação; R7 o ADTY sem fim paga o garantido
  sem dizer "incerto"; R8 um candidato corrigido na folha não volta a ser verificado com os outros; R10/R11 papéis num serviço
  que mudou de lugar ou de hora; R12 pernoita pela paridade num candidato sem rota; a radiação reparte a dose pelo DH; os
  limites da TAP com pernas `dh` (a TAP está bloqueada na importação).
- **Fica de fora (outros blocos):** pagar o posicionamento (L2, bloco 6), a pernoita em posicionamento e formação (L13, A-235),
  o € do Confirmar import sem o IPC (L10, A-239), as dúvidas A-240 (ADTY de 4h00 na cabine) e A-241 (MTG/GND), e o formulário
  manual (A-249 a A-251: ordem das pernas e fusos no "Detetar").

**Ver no iPhone:** Confirmar import com o calendário sintético do guião (pausa de 7 h num repartido, DH antes e depois do voo,
HSBY + voo, evento de dia inteiro com horas, formação de 3 dias → 3 linhas "a corrigir", aviso "⚠" num dia que excede, um
repouso curto entre dois dias); o tempo de leitura de 12 meses; a linha da doença na cabine ("só os dias pagos, do 4.º dia");
reimportar depois de mudar as horas de um voo com sign-off; a 1.ª sincronização depois desta versão (dias "relidos com a regra
nova", sem SNC); editar um serviço com DH no formulário (a linha "DH ·", o sign-off derivado).

---

## 2026-11-06 (noite) — AUDITORIA, BLOCO 3, os pendentes (o Nuno: "tenta corrigir isto")

`npm test` verde (limites TAP 572); pacote iOS gerado sem erros.
- **Jornal Oficial (era para o advogado):** as 37 citações das validades, em pt e en, foram conferidas no PRÓPRIO ato publicado
  no JO de onde vem cada secção (a marca ▼/► da versão consolidada diz qual) — todas lá estão. Tabela em `fontes/README.md`.
- **Hora de referência da cabine no médio curso (era para o advogado):** o AE resolve-a — a Cl. 4.ª, n.º 14 define "Hora de
  referência" para todo o acordo ("Hora do local a que o tripulante de cabine está aclimatizado"). O quadro passa a uma só
  leitura: na base, a da base; depois de descanso num local a ≤ 2 h, a desse local (Cl. 23.ª, n.º 3 a) i)).
- **Assistência no aeroporto, pilotos (era para o advogado):** o texto resolve-o — o n.º 7 da Cl. 19.ª abre com "contam para os
  limites de serviço de voo" e a alínea a) diz "para todos os limites"; a b) tira a de casa "dos restantes limites". O n.º 5 diz
  de onde se conta e que linha do quadro. A app mantém os 50 % somados (citações e convenção na regra P27). Fica só a
  confirmação do advogado.
- **Tempo de voo sem as horas de cada perna, a passar da meia-noite:** a parte de cada dia fica num intervalo e os limites de voo
  (P25, P28, C34) dão "incerto" quando só o máximo passa (motivo `meia-noite`).
- **A-133** resolvido pelo texto: a Cl. 6.ª, n.º 53 define a zona horária como a faixa de 15° "geralmente coincidente com o
  fuso horário" — as zonas centradas que a app já usava (uma só contagem). A tabela geotime do ROV (Cl. 43.ª, n.º 5) não é pública. **A-134** um dia livre de 24 h não é folga semanal: mais de 5 dias entre duas folgas
  de 48 h → incerto. **A-135** RAD de 12 h com 36 a 39 h livres (o transporte) na leitura estrita. **A-136** já estava (bloco 1).
  **A-137** regra nova **P28** (pilotos: 75 h A320 / 80 h A330 de block por mês no planeamento, Cl. 15.ª, n.º 9; desde 1 ago
  2023). **A-138** folga de 48 h no regresso depois de um PSV de 4 aterragens que acabou fora — "incerto" (o AE não diz se é o
  PSV do regresso ou qualquer da rotação; o mesmo para o longo curso do n.º 13 b) e o n.º 14). **A-139** período crítico dos
  pilotos no longo curso pela Cl. 6.ª, n.º 21 (`pilotCritShifts`). **A-140** assistência em casa no trimestre a 25 % e a 100 %
  (incerto). **A-141** 5.º dia com assistência: chegada até às 20h00, entre as 18h00 e as 20h00 incerto.
- As regras P27, C23, C11, C15, C34, P32 e P53 ganharam as citações (conferidas na página do BTE) e as convenções das leituras.
- **Revisão independente — 5 erros, corrigidos:** o ecrã das horas mostrava o voo da meia-noite todo num dia (agora o
  intervalo, "Incerto · pode chegar a X"); o P28 contava voos saídos de assistências, que não são do planeamento (Cl. 15.ª, n.º 3);
  férias/doença pelo meio davam falso "folga-24h"; a assistência ativada contava duas vezes (acaba na apresentação: pilotos
  Cl. 19.ª, n.º 4; cabine Cl. 17.ª, n.º 5 a)); o A-138 dava "excede" por uma só leitura. **Depois, relidos no AE (o Nuno: "pesquisa novamente"):** o mês
  do P28 é o de calendário (Cl. 19.ª, n.º 16: "por cada mês de calendário ... em sede de planeamento mensal publicado"); o voo
  saído da assistência do 5.º dia segue só a alínea b) (a regra própria dele — a a) deixá-la-ia sem efeito); o P38 vale com as duas
  rotações de longo curso (Cl. 39.ª, "Rotações no longo-curso"), com uma de médio curso dá "incerto". **Fica só a tabela geotime
  do ROV** (Cl. 43.ª, n.º 5): não está publicada (pesquisa na internet sem resultado); a app segue a definição do AE (Cl. 6.ª, n.º 53).

---

## 2026-11-06 (noite) — AUDITORIA, BLOCO 3: limites TAP e validades "como diz a lei" (Opus 5.5)

Golden primeiro (`scripts/ae-tap-limits.test.js` 526, `scripts/validities.test.js` 211), escrito a partir de `fontes/`;
`npm test` verde (30 suites); pacote iOS gerado sem erros.

**Validades — decisão do Nuno: "não quero nada inventado. quero que seja como diz a lei" (e o OPC "sempre como diz a lei").**
- **Fontes novas em `fontes/eu/`** (extratos literais da EUR-Lex, pt e en, ver `fontes/README.md`): Reg. 965/2012 (ORO.FC,
  ORO.CC, ORO.GEN.110), Reg. 1178/2011 (Parte-FCL, MED, CC, ARA), Reg. 2015/1998 (11.4.3) e Reg. 1182/71 (art. 3.º, prazos).
  Cada prazo de `data/validities.js` cita o texto; o teste confere cada citação na secção, nas duas línguas.
- **Três maneiras, pela lei:** calculado da data feita onde a lei dá o prazo (OPC 6 m; line check 12 m; SEP do piloto 12 m;
  formação anual da cabine 12 m — SEP, CRM, primeiros socorros, segurança; módulos trienais da cabine 36 m; segurança do
  piloto 5 anos até ao mesmo dia); **data escrita** onde a lei manda escrever a data no documento ou deixa o prazo ao
  operador (type rating/LPC, IR, inglês e instrutor: ARA.FCL.215 c); médico; passaporte; DG — as Instruções Técnicas da ICAO
  não são públicas; CRM e primeiros socorros do piloto — o regulamento não lhes dá prazo); **referência** (licença: FCL.040;
  atestado de cabine: CC.CCA.105).
- **OPC, line check e SEP do piloto dependem do programa do operador:** regra geral (6/12/12), ATQP com prorrogação aprovada
  (12/24/24, ORO.FC.A.245 e)) ou EBT (módulo 12 m; line check e SEP valem 12 m mas o operador pode prorrogá-los com aprovação → data do operador, ORO.FC.231 h) e i)). O formulário pergunta;
  sem programa não há prazo. O antigo "Type rating · OPC/LPC" separou-se em OPC + Type rating · LPC.
- **Cabine, renovação nos 3 últimos meses** (ORO.CC.140 e) 2)): conta a partir da validade anterior, + 12 meses até ao mesmo dia
  (1182/71). Campo "Validade anterior"; ao renovar um item guardado a app SUGERE a guardada (só conta se o tripulante a escolher).
- **Segurança do piloto (AVSEC):** 5 anos até ao mesmo dia; sábado/domingo passa a segunda (1182/71, art. 3.º, n.º 4); feriados: nota.
- **"Expirado"** só no dia seguinte à validade (dias de calendário, A-281); datas impossíveis recusadas (A-288); lembretes por
  dias de calendário (A-286); o rótulo da cabine é "Médico" (A-217).
- **As validades já gravadas passam pela lei ao abrir a app** (`lawfulValidities`): os prazos calculados recalculam-se; um
  prazo que a app inventava (data feita num tipo de data escrita) fica "sem data" até o tripulante escrever a do documento.
- **Simulação:** avalia as validades no DIA DO SERVIÇO (A-253, A-280); Início e Simulação dizem "O que registaste está válido"
  (nunca "Tudo válido", A-285).

**Limites TAP (`ae/tapLimits.js`):**
- **Período de serviço de voo inteiro (`fdpChainsOf`):** no mesmo dia, menos de 11 h entre serviços = UM período; entre dias,
  só com menos de 8 h (o repouso mais curto que um AE admite, pilotos Cl. 36.ª) — de 8 h para cima é repouso e a regra do
  repouso julga-o. Entram o posicionamento antes do voo (A-124), dois voos do mesmo dia (A-126) e o DH depois do último voo no
  mesmo dia (cabine a 100 % desde calços + 30 min, Cl. 28.ª, n.º 3; pilotos a 50 %, Cl. 16.ª, n.º 1 b)). Pilotos: com e sem a
  espera entre o DH e a apresentação, e o quadro pela apresentação do DH ou do voo (o AE não diz; também no longo curso); mais de 3 h entre setores = split duty, só com autorização do SPAC
  (incerto). Cabine: o intervalo não pode ser na base; fora dela, o repartido (Cl. 25.ª) é uma segunda leitura.
- **Despertar (A-122):** o limite de 6 h fora da base também pela hora de despertar — pilotos apresentação − 30 min − transporte,
  cabine transporte − 1 h; o transporte não se vê, mas os dois AE limitam os dois sentidos a 3 h → "sim / talvez / não".
- **Cabine médio curso (A-123):** a janela das 2h00–5h59 na hora local da partida; o quadro na hora da base e na de referência
  (Cl. 23.ª, n.º 3 — vem depois do longo curso, por isso as duas leituras).
- **Assistência antes do voo (A-125):** pilotos +50 % da assistência no aeroporto; cabine nas instalações = limite pela hora de
  ativação (entre o início e a apresentação) + 16 h; em casa = redução depois de 6 h (8 h com descanso a bordo/split) e 22 h.
- **Repouso:** depois de posicionamento como depois de voo (A-128); +2 h depois de simulador de noite só na leitura estrita
  (a escala não separa o simulador da sala, A-127); dois serviços de voo no mesmo dia com repouso entre eles (A-126).
- **Noites "consecutivas"** pela noite que o serviço toca (A-129); **folga que atravessa o trimestre** conta onde acaba ou onde
  começa (A-130); **média da rotação** pela soma, sem arredondar (A-131); **horas repartidas pelos dias** (A-132).
- **Início e detalhe do serviço** passam o mapa inteiro ao `fdpForDuty` (antes tiravam os outros serviços do dia).
- **Revisão independente (2.º agente, só com o código e as fontes) — 13 erros confirmados, corrigidos no mesmo dia:** juntar
  serviços escondia repousos curtos entre dias (E1–E3: limiar de 8 h entre dias; o DH solto volta ao repouso); DH depois do voo
  (E4); DH antes no longo curso e o quadro pela apresentação do voo (E5–E7); assistência em casa até ao fim marcado (E8) e o
  contacto de madrugada (n.º 11 d)); média da rotação por períodos (E9); tempo de voo exato sem pernas UTC (E10); AVSEC ao fim de
  semana (E11); a nota do EBT dizia o contrário do ORO.FC.231 (E12); datas escritas antigas apagadas (E13); a validade anterior
  preenchida sozinha (R5); "Desfazer" repunha a vista da lei (R6); o resumo dizia "válido" com datas em falta (R7); rótulos sem
  o programa (R8). **Riscos que ficam:** R1 pilotos, 50 % da assistência no aeroporto somados ao TSV (Cl. 19.ª, n.os 5 e 7 a)) —
  advogado; R3 cabine, a meia-noite do "Dia" na hora local do tripulante (a app usa a da base); R4 a fronteira das 22h00/6h00 da
  Cl. 35.ª, n.º 3 (já era assim).

**Pendentes fechados no mesmo dia** — ver a entrada "BLOCO 3, os pendentes" acima.
**Ver no iPhone:** formulário das validades (programa do operador, validade anterior, a linha da lei, data escrita); validades
antigas que ficam "sem data"; "Validades em dia?" da Simulação num serviço futuro; limites TAP com DH antes do voo, dois voos
no mesmo dia e assistência antes do voo (Início, detalhe, Limites do acordo).

---

## 2026-11-06 (noite) — AUDITORIA, BLOCO 2: a Simulação ("Posso aceitar?") verifica tudo (Opus 5.5 Extra)

Golden primeiro (`scripts/simulation.test.js`, 77, a 30.ª suite), escrito a partir de `fontes/ftl/`; `npm test` verde; pacote
iOS gerado sem erros. Achados fechados: A-242, A-243, A-244, A-245, A-165, A-258 e o resto do A-248.
- **Motor novo `data/simulation.js` → `simulateDuty`**: o serviço entra na escala e verifica-se, com os MESMOS cálculos do
  Início: o PSV do seu bloco do dia (o herói mostra esse mesmo resultado), os outros dias que muda (ex.: o 3.º prolongamento
  em 7 dias), o repouso antes e depois, a recuperação (36 h com 2 noites locais, 168 h, 60 h, 2 dias locais, mudança de base —
  só os avisos que o simulado cria ou que caem no dia), 4 setores em noites seguidas, TODOS os períodos do 210 que contêm o dia
  (para trás e para a frente; ano civil; 12 meses) e, na TAP, o limite do acordo (o mais apertado dá a hora-limite de calços) e
  as outras regras do acordo que o simulado muda. O resultado e a projeção do formulário usam-no (os mesmos textos, `issueText`).
- **Dia ocupado = TROCAR (decisão do Nuno):** o preenchido fica no lugar do serviço guardado; os outros serviços do dia contam.
  O resumo diz "no lugar do serviço guardado". O motor já sabe juntar (`mode: 'append'`) — a UI fica para depois, com o Mobbin.
- **"Quanto falta aos limites?"** mostra o período mais apertado de cada limite que contém o dia, em h:mm (ex.: "Serviço
  52:30/60 h (7 d)"); **"Descanso mínimo a seguir?"** usa a regra do "Repouso até" do Início.
- **Extensão do repartido para baixo** (CS FTL.1.220(c), "up to 50 %"): 4:15 contáveis → +2:07 (era +2:08); as contas em
  minutos inteiros (as horas decimais perdiam 1 minuto).
- **Revisão independente (um 2.º agente, contra o texto oficial) — corrigido no mesmo dia, também no Início:**
  - Depois de um PSV REPARTIDO, o "período de serviço precedente" é o do bloco inteiro (ORO.FTL.235(a)(1)). O "Tenho
    descanso?" media só o último serviço. O golden A-160 (b) mudou: 06:00–10:00 + 18:00–23:30 → mínimo 17:30 (era 12:00).
  - O mínimo de 12 h/10 h é "antes de um PSV" (ORO.FTL.235(a)/(b)). Antes de um escritório, formação ou standby em casa a
    lei não fixa mínimo. O Início diz "sem mínimo (não é voo)". A noite local da CS 235(a)(1) é "between the 2 FDPs".
  - Duas noites com noites livres pelo meio, sem recuperação entre elas → INCERTO (o texto não define "consecutive").
  - Entre as duas metades de um repartido, o "Tenho descanso?" olha para o serviço seguinte, não para a 2.ª metade.
- **A importação** (`prospectiveDuty`, estado ok/aviso de cada candidato) ficou com a verificação leve, mas já com todos os
  períodos do 210. O repouso, a recuperação e as noites passam para ela no bloco 4.

**Para o advogado:** o que é "consecutive night duties" (CS FTL.1.205(a)(1)) — noites em dias seguidos? quebra-as uma
recuperação? e com noites livres pelo meio? (a app: seguidas = excede; com recuperação = não; com noites livres = incerto).
**Pendências:** UI "Juntar ao dia" na Simulação (com o Mobbin) · o import passa para o `simulateDuty` (bloco 4) · os períodos do
210 com serviços sem apresentação ("estimados") não dão "incerto" (bloco 4) · os 4 setores em noites seguidas ainda não entram
no "Dentro dos limites?" do Início nem no import · na TAP a Simulação demora ~45 ms no PC por cálculo (as regras do acordo
correm duas vezes); quando a TAP abrir, guardar o cálculo da escala sem o simulado.
**Por ver no iPhone:** Simulação num dia livre e num dia com serviço ("no lugar do serviço guardado"; simular o guardado sem
mudar nada = o mesmo do Início) · repouso antes curto (ex.: serviço até às 23:30 e simulado às 05:00 → "Excede · repouso antes
5:00 de 12:00") · o serviço de amanhã fica curto ("repouso antes de DD/MM") · "Quanto falta aos limites?" com o período mais
apertado · "Descanso mínimo a seguir?" · a projeção do formulário com os mesmos avisos · Início: "Tenho descanso?" depois de
um repartido e antes de um escritório.

---

## 2026-11-06 (fim) — "A LEI É QUE MANDA": sem valores inventados (Opus 5.5)

O Nuno recusou os valores por omissão "pelo lado seguro" do bloco 1. 7 commits (`1f36af7` … `2cf8776`), golden primeiro,
`npm test` verde (29 suites). ENGINE_VERSION = 3.
- **Intervalo e "incerto":** o motor dá o PSV máximo GARANTIDO e o POSSÍVEL quando falta um facto; "excede" só acima do
  possível. Factos: alojamento na pausa, dados da cabine com repouso a bordo, setor mais longo, apresentação dos pilotos,
  desconto do OM no repartido. Início, Detalhe, Simulação, formulário, importação, voo ao vivo e 245 dizem o que falta.
- **Cabine com repouso a bordo:** pilotos extra, classe deles e o seu repouso — obrigatórios no formulário.
- **ORO.FTL.205(c):** o PSV máximo da cabine baseia-se na apresentação dos pilotos (+ a diferença, até 1 h). Campo novo
  "Apresentação dos pilotos"; sem ele, 0 a 60 min → intervalo.
- **Repartido:** alojamento "por responder" por omissão (os registos antigos também), com as definições do 105(3)/(4);
  desconto da pausa = o do OM (desconhecido → sem extensão garantida).
- **205(d) prolongamento planeado (A-256):** a escala publicada (snap) é o plano → "dentro, com prolongamento" quando cabe
  na tabela, sem repouso a bordo nem repartido, e até 2 em 7 dias; +4 h de repouso entre dois seguidos (205(d)(2));
  marca "planeado pela companhia" para os serviços à mão. "Repouso até" do Início com a mesma regra da pílula.
- **105(2) hora de referência + 105(12) tempo decorrido:** pela Zulu das legs — a faixa lê-se na hora do aeroporto de
  apresentação (≤ 2 h da base); o PSV conta-se em tempo decorrido (hora de verão).
- **235(d) recuperação:** 36 h com 2 noites locais, ≤ 168 h, 60 h depois de 4 irregulares, tardio→matinal com noite
  local; no "Tenho descanso?". Tipo matinal/tardio desconhecido (≠ easyJet) → incerto.

**Feito depois (mesmo dia, 6 commits `6868725` … `fee412c`):** aclimatação no longo curso (Quadro 1 → B/D/X, Quadro 3; a
referência é a última apresentação a ≤ 2 h da base, 6 dias para trás; sem histórico → intervalo); noites locais na base
depois de rotações com 4 h ou mais e 3 noites entre rotações oeste/leste (CS 235(b)(3)(i)/(4)); 2 dias locais duas vezes por
mês (235(d)); 72 h com 3 noites ao mudar de base (CS FTL.1.200(b)); 2.ª notificação do adiamento (CS 205(d)(1)(ii)); o tipo
matinal/tardio só com fonte oficial (a easyJet deixou de ser assumida); pós-voo da TAP pelo AE (30 min).
**Ponto 4 completo.** Para o advogado: as duas leituras da CS 220(d)/(e); o serviço que passa a meia-noite nas janelas de
7 dias (dias civis ou 168 h); que hora adiada conta no máximo depois de uma 2.ª alteração.
**Limite assumido (escrito no código):** a aclimatação de partida é a da base (rotações que saem da base e voltam a ela).
**Por ver no iPhone (além da lista do bloco 1):** "Incerto" no Início/Detalhe/Simulação; os campos novos (pilotos,
apresentação dos pilotos, alojamento por responder, prolongamento planeado); "dentro, com prolongamento".

---

## 2026-11-06 — AUDITORIA, BLOCO 1: motor FTL corrigido (Opus 5.5)

Golden primeiro em todas as partes, escrito a partir de `fontes/ftl/`; 8 commits (`993bd2d` … `af4736a`); `npm test` verde
(29 suites). `ENGINE_VERSION` = 2: as entradas antigas do dayLog recalculam-se sozinhas ao abrir a app.
- **Repouso a bordo (S1, S2, A-149):** pilotos classe 3 a 14:00/15:00 (eram 14:15/15:15); +1 h com 1 setor de mais de 9 h
  e ≤ 2 setores (CS 205(c)(4)); cabine = o menor entre o PSV dos pilotos, a classe da cabine e o seu repouso a bordo.
  Formulário: a cabine indica pilotos extra, classe dos pilotos e o seu repouso. **Sem esses dados: o mais restritivo**
  (+1 piloto, classe 3, 1:30 → 14:00) — os registos antigos de cabine com repouso a bordo baixam para 14:00.
- **Standby (S3, A-166/167/234/246/247):** aeroporto = min(Quadro 2 − standby acima de 4 h, 16 h − standby); avisos com o
  PSV real; standby em casa, formação, escritório e posicionamento isolado já não são julgados pelo Quadro 2 (o standby em
  casa acima de 16 h tem aviso próprio); standby colado a um voo passa a `preStandby` do voo (PSV desde o report do voo).
- **Um só cálculo por serviço:** `ftlForDuty` (motor) — Início, Detalhe, importação, Simulação e registo 245 usam-no (A-175).
- **Repouso (S4, S8, S10):** `restAfterDuty` = a regra única ("Tenho descanso?", "Repouso até", intervalo entre serviços):
  desde o sign-off ou calços + pós-voo, o último serviço do dia, base/fora pela localização, em instantes; 14 h depois de
  repouso a bordo e fora da base com fuso ≥ 4 h (fuso tirado das legs); +2 h (ou +4 h sem saber o repouso antes) depois de
  PSV prolongado; os "2 em 7 dias" olham também para a frente; a discrição aplica-se sem o prolongamento de 205(d).
  Números: "repousos abaixo do mínimo" (acabou o limiar de 11 h e a frase "sem quebra do mínimo"). Prova e Biblioteca corrigidas.
- **Acumulados (S5, S6 no motor, A-174):** dayLog em minutos (`servicoMin`/`vooMin`), janelas somadas ao minuto, "faltam"
  nunca arredonda para cima, excesso em h:mm (também nos limites TAP, A-136), % das 900 h sem teto no texto. Voo sem report
  conta o voo e o serviço estimado. O dayLog recalcula-se quando mudam o motor, o pós-voo, a base ou o serviço.
- **Repartido (S9):** WOCL com a volta da meia-noite; sem hora, só até 6 h; alojamento em 3 níveis (Nenhum · Sala · Quarto).
  **Por omissão: nenhum → sem extensão** (CS 220(e)(1)). Os registos antigos "com alojamento" contam como quarto.
- **Registo 245 e carreira (S13):** Serviço até ao sign-off, Repouso = o que houve até ao serviço seguinte, sem PSV nos
  não-voos; carreira só com o que já aconteceu, serviço pesado como no FTL, horas do herói para baixo.
- **Teste novo `test:ftl-fontes`** (179 asserções): lê os `.txt` oficiais e confere cada número do motor (Quadros 1–4,
  prolongamento, repouso a bordo, fusos, 210, definições, 205/220/225/235). Com a classe 3 antiga falha (provado).

**Não feito no bloco 1** (ficam no relatório): estado de aclimatação e Quadro 3 no longo curso, hora de referência
(A-152/A-170), noites locais na base depois de rotações (235(b)(3)(i)), aviso das 36 h/168 h (A-151), segunda notificação do
adiamento (A-154), diferença de report cabine/pilotos (A-156/A-178), pré-voo do OM no repartido (A-158), PSV em relógio na
hora de verão (A-171, só o repouso passou a instantes), janelas pelo dia do report (A-173), correção manual com fusos (A-179).

**Por ver no iPhone:** formulário da cabine (pilotos e repouso a bordo) e o alojamento em 3 níveis; Início (Tenho descanso?,
Repouso até, PSV de um dia de escritório/standby); Detalhe ("não se aplica — sem setores"); Números (abaixo do mínimo,
faltam h:mm, % das 900 h); PDF 245 (Serviço/Repouso) e Processo de carreira; recálculo do dayLog na 1.ª abertura.

---

## 2026-11-04 a 06 — AUDITORIA DOS CÁLCULOS contra o texto oficial (Opus 5.5 · UltraCode)

- **Fontes FTL novas em `fontes/ftl/`:** Reg. (UE) 83/2014 (PT e EN, do Cellar, porque a EUR-Lex recusa descargas automáticas),
  CS-FTL.1 inicial (ED 2014/002/R) e a Alteração 1 (ED 2023/023/R), com SHA-256 e marcas de página. Um auditor conferiu o
  consolidado do 965/2012 de 25-05-2026: desde 2014 a subparte FTL só mudou no âmbito e na definição de tempo de voo (nenhum limite).
  O PDF PT original tem o Quadro 1 corrompido (só B e ≥48); vale o EN e o consolidado.
- **Workflow `auditoria-calculos`** (617 agentes, 3 retomas por limite do plano): 11 auditores por área + 5 que o crítico de
  completude pediu (importação, simulação, PDFs/radiação, validades, Biblioteca/Prova); cada achado com 2 verificadores
  (texto oficial + código em node).
- **O que está certo:** os números de hoje das tabelas principais (bases, setores nominais, bandas, pernoita, DDO/IDO/WFLY, SNC,
  RDP, matrizes ADTY, Quadros 1–4 do FTL, tabela de repouso a bordo da cabine) e o eixo piloto/cabine (nenhum valor trocado).
- **O que está errado:** as regras, o que falta modelar e os textos. Ver o relatório.
- **Não conferido:** nada no iPhone; IPC do INE, SMN e RMMG (não estão em `fontes/`); escalas reais eCrew/PDF; interpretações da EASA.
- Nada corrigido ainda. Ficheiros por gravar: `docs/auditoria-calculos*.md`, `fontes/ftl/`, `fontes/README.md`.

---

## 2026-11-04 (noite) — CITAÇÕES easyJet conferidas no texto oficial (Opus 5.5)

**Novo golden `npm run test:citacoes`** (`scripts/citacoes-easyjet.test.js`, 174 asserções, na cadeia do `npm test`): cada
citação da Biblioteca, da Prova e dos rótulos dos acordos é procurada em `fontes/ae-easyjet/` — prefixo certo (pilotos SPAC
numeram por **Artigo** → "Art. N"; cabine SNPVAC por **Cláusula** → "Cl. N.ª"), o artigo/cláusula/ponto do Anexo I existe, e
o título oficial bate com o assunto. Também confere que cada rótulo citado tem tradução no i18n.
- **Erro a sério (pilotos):** DDO/IDO citavam "Cl. 68" e WFLY "Cl. 69" — números da CABINE; no SPAC os Arts. 68/69 são
  férias. Corrigido: DDO/IDO → **Art. 54.º** ("Trabalho em dias de descanso"; valor no Anexo I.13 WIDO), WFLY → **Art. 62.º**
  ("Contacto em dias de folga", n.º 2). Nenhum valor € mudou.
- **Cabine:** "Art." → "Cl." em 14 rubricas da Biblioteca, 5 da Prova, nos rótulos do `ae/easyjetSnpvac.js` (+ i18n, chaves pt
  e valores en juntos) e no comentário de `data/aeEvents.js`. Os números estavam todos certos.
- **Formulário do serviço:** "Per-diem da rota (Art. 53)" aparecia também aos pilotos → agora Art. 37.º (pilotos) / Cl. 53.ª
  (cabine). Faltavam traduções de 4 rótulos da cabine (€115/€140 Cl. 68.ª, Cl. 34, Cl. 35) — acrescentadas.
- `npm test` verde (28 suites) · guardião do design sem dívida nova.

---

## 2026-11-04 (tarde) — SNC UM POR SERVIÇO · doença pela lei (Opus 5.5)

**Estados vistos ✅ no iPhone nesta tarde:** doença (piloto) · **standby** ("Se te chamarem agora: PSV até ~04:00" —
conservador: conta do início do standby) · **em voo com a linha do dia de serviço** (2 troços, ✈ no agora, "aterras com 6:00
de margem"; o alerta "Tenho descanso? Não · 10:15 (mín 12:00)" apareceu certo) · **pós-voo com o gráfico dos 7 dias** (7
letras, ontem a cinzento, hoje a tinta, "10 h de 60"). Afinações: o corte por baixo dos dígitos passa a depender do que vem
a seguir (rota 0,22 · frase 0,13 — o standby ficava a ~11 pt) · o recorte do ✈ a 16 pt (tapava o troço já voado) · o mosaico
do mês "NOV · ESTIMADO" (cortava). **Falta só:** a disrupção e o aviso de RDP (precisam de um atraso verdadeiro) e a conta de
CABINE (a doença Cl. 61.ª e o RDP só aparecem lá).

- **SNC — erro corrigido (golden primeiro, `test:disruption` 66):** o aviso "Registar +N SNC" depois da importação usava
  `shortNoticeCandidates` (qualquer mudança a ≤ 7 dias, sem 48 h nem 2 h, sem ver os já registados) → 3 SNC num só serviço
  de teste. Lei lida no BTE: **Art. 63.º SPAC n.º 4** (BTE 40/2023, agora em `fontes/ae-easyjet/`) e **Cl. 66.ª SNPVAC n.º 3**:
  "o pagamento será devido comparando o novo serviço com o planeado em escala nas 48 horas antecedentes" → **no máximo UM
  por serviço**, ≥ 2 h, sem assistência. Agora `sncToRegister` (data/disruption.js) no arquivo das mudanças; tira os dias
  já com SNC. Os SNC de teste a mais apagam-se à mão (a app nunca apaga registos).
- **Doença:** cabine passa a dizer o que recebe pela **Cl. 61.ª** (era "Art. 61" e uma instrução para a app): dias 1–3 sem
  complemento; do 4.º, 45 % do salário diário além do subsídio da SS (BTE 8/2024 p. 302). O número sem o "º" gigante:
  piloto "1 · de 3 pagos" (Art. 48). ✅ no iPhone (conta de teste = PILOTO).
- **Pendência:** a Biblioteca da cabine escreve "Art." em todas as rubricas (54, 61, 62, 65, 68, 69…) — o AE da cabine usa
  "Cl." — passagem própria com teste de citações contra `fontes/ae-easyjet/` (como o da TAP).

---

## 2026-11-04 — A BARRA DE BAIXO COMBINA COM O INÍCIO v6 (Opus 5.5)

Nuno: "o menu da app combina com o layout novo da aba Início?" No essencial sim (paleta, ícones, ponto amarelo = realce,
noturno herdado, 49 pt nativos, ícones inativos 4,51:1). Corrigido em `components/TabBar.js`:
- **＋ calmo** (escolha do Nuno; refs Breathwrk/Oura/Wabi/Paramount+ no Mobbin): fundo suave (`soft2`), ＋ a tinta, **sem
  sombra** — antes era um círculo preto com sombra a 20 pt da 1.ª tecla preta do Início (dois primários lado a lado).
  O primário do ecrã é a tecla. **Nas edições SPAC/SNPVAC o ＋ fica neutro** (a cor do sindicato fica na 1.ª tecla e no
  ponto da aba) — muda a nota de 2026-11-03 que punha o `action` também no ＋.
- Rótulos das abas **11 pt** (eram 9,5 — mais pequenos que tudo no Início) · espaço/cores/letra pelos tokens.
  Guardião: dívida **−4**, chão regravado.
**Logo a seguir — A PLACA FLUTUANTE (Nuno escolheu, mesma sessão; substitui o ＋ calmo):** a barra passa a ser uma
cápsula ESCURA como a placa do painel do Início (`PLATE.day`/`.night`), a aba ativa em `BRAND.onDark` (amarelo; nas
edições, a cor do sindicato sobre placa) com o ponto por baixo, inativas em `PLATE.sub` (~7:1), e o ＋ num círculo À
PARTE, à direita, da mesma placa, ＋ claro, sem sombra (refs Apple Fitness · Oura · Wabi). Continua EM LAYOUT e com a
mesma altura (o Início não perde espaço); o menu do ＋ abre à direita, por cima do círculo. Recusados: "painel de
partidas" só com palavras (pesa, lê-se pior sem ícones) e a barra plana afinada.
**Por ver no iPhone:** a placa de dia e de noite, o ponto amarelo na aba ativa, o ponto laranja da Escala, o menu do ＋
(o × cai em cima do círculo).

---

## 2026-11-04 (madrugada) — AUDITORIA DO TRIPULANTE · fecho do mês · RDP confirmado no BTE (Opus 5.5)

**Princípio novo (Nuno):** "todos os estados são informação para os tripulantes — piloto ou cabine". Escrito como
**princípio 8** em `docs/living-interface.md` §1 (5 perguntas) e aplicado em `docs/auditoria-tripulante.md` (11 estados).
- **Fecho do mês** (crítica externa, 6 pontos aceites): "Até hoje X € · resto do mês Y €" no lugar de "As parcelas somam o
  total" (`data/stats.js` monthSplit, golden `test:stats` 173) · Extras abrem a lista do que incluem · 2.º cartão =
  próximo serviço · "Tempo de voo · últimos 28 dias" com ✈ · teclas Registar um extra · Relatório do mês · Auditoria/Ver a
  escala · o tempo no topo só na folga e nos estados ao vivo.
- **Auditoria aplicada:** frases da véspera/pernoita só dizem "verificado/tratado" com o repouso ✓ (golden
  `test:statevoice` 73) · **a pílula REPOUSO da pernoita/pós-voo media o repouso errado — corrigido** (`data/today.js`
  restStatus, golden NOVO `test:reststatus`) · disrupção por papel (205 f: comandante vs FO/cabine) + margem com o atraso ·
  folga "Livre até … · report …" e horas com < 48 h · "Escala em dia" · "Partilhar o voo" · "Ver o serviço" · standby e
  férias com texto do tripulante.
- **RDP confirmado no texto oficial:** AE easyJet × SNPVAC, BTE 8/2024, **Cl. 67.ª** (p. 304–305) — descarregado do DRE
  para `fontes/ae-easyjet/` (SHA-256 no `fontes/README.md`, `.txt` versionado). Mede "o término do tempo de serviço (calços
  mais 30 minutos)" contra a escala programada e o n.º 3 fala de "atraso" → **um atraso operacional ≥ 119 min conta**.
  Na disrupção da cabine: "Possível RDP · Cl. 67.ª — reclama no RDF; a base aprova · até 23,00 €" (`liveRdp`, golden
  `test:disruption` 54 com a citação conferida). **Para o advogado:** a empresa pode ler "alterado" como mudança de
  escala; e o n.º 1 diz "119 ou mais" e logo a seguir "superior a 119" (a app usa "119 ou mais").
**Vistos ✅ no iPhone:** o fecho novo (Nuno "confirmo") · a folga com as horas ("11 h", "Escala em dia", Próximos serviços sem
repetir o herói, "Ver o serviço") · as **férias** (25 de 25, "pelos dias de férias que registaste", sem teclas nem cartões).
**Depois disso (por ver no iPhone):** a folga com "Livre até hoje/amanhã às 06:00" numa linha (partia em 2 ao lado da
pílula) · o cartão do mês **sem a barra** de dias (também no cartão largo) · a frase da folga à noite com serviço amanhã
passou a "Noite tranquila. Report amanhã às 08:15." (dizia "dorme sem alarmes"; golden `test:statevoice` 75).
**Falta ver (próxima sessão):** standby · disrupção e o aviso de RDP (precisam de dados verdadeiros) · doença · o gráfico
dos 7 dias no pós-voo · a linha do dia de serviço no em voo.
**Mais duas críticas externas (Nuno colou, 2026-11-04 ~01h) — aplicado:** férias com o PERÍODO ("férias de 28 out a 4 nov",
no lugar de "pelos dias que registaste") · ÚLTIMO dia de férias: "Último dia de férias. Amanhã: report às 08:15." (golden
`test:statevoice` 77) + Próximos serviços, sem repetir o regresso na linha cinzenta (✅ iPhone) · coluna ROTA com "→" (como o
resto) · folga em "11 h 28" (nunca "11:28", que se lê como hora) · férias por gozar a LARANJA de novembro em diante, com
"o ano acaba daqui a N dias" · cartão do mês com "variável até hoje +X €" (o total igual dia após dia é a PREVISÃO do mês,
não um número fixo). **Não era erro:** "25 de 25" no teste (não havia dias de férias registados) e "report daqui a 7 h"
(o BCN era quinta, a 31 h). **Pendência alargada:** os setores que não encaixam também ENTRE dias (pernoita em LGW e o
serviço seguinte a partir de LIS, sem posicionamento) — avisar na importação.

---

## 2026-11-03/04 (noite) — "TESTAR OS ESTADOS" NO IPHONE · Início v6 afinado (Opus 5.5)

**Vistos ✅ no iPhone:** configuração (com os 3 passos) · folga (com serviço) · véspera (com e sem report) · hoje
pré-report · em serviço antes da partida (com e sem report) · em voo · pernoita · pós-voo (o estado mais cheio: cabe sem
deslizar, ~48 pt de folga). Afinações e correções, todas por escolha do Nuno (refs do Mobbin em `referencias/inicio/`):
- **Configuração:** os 3 passos do 7.º passo da configuração (mesmas palavras) enchem o meio.
- **Arrumação "documento" + teclas presas ao fundo:** placa do tamanho do conteúdo, tudo encostado ao topo; as 3 teclas
  ficam no fundo (sempre no mesmo sítio para o polegar) — o espaço livre fica entre os cartões e as teclas. Recusado: o
  número centrado numa placa que crescia (flutuava numa caixa com aresta).
- **Ritmo da placa, MEDIDO nas capturas** contra o Tempo da Apple (~20 pt visíveis de cada lado do número): `TUNE.rhythm`
  (rótulo→número 12 · número→rota 8) · aparo assimétrico dos dígitos `TUNE.trimBottom` (ao vivo 0,22 · calmo 0,13 — por
  baixo dos dígitos há mais vazio) · `TUNE.destTrim` 0,15 (a rota e a linha de baixo são um grupo: ~9 pt). Lição: o
  espaço no código não é o que se vê — os dígitos grandes trazem vazio dentro da caixa; medir na captura.
- **Barra do em voo → a LINHA DO DIA DE SERVIÇO** (`data/dutyLine.js`, golden `test:dutyline` 25/25, 26.ª suite): do report
  ao limite do PSV (o MESMO "PSV até"), setores como troços, ✈ = agora, "aterras com 8:30 de margem" (vermelho se passa).
- **Pós-voo:** o número é uma DURAÇÃO — "5:00 h" + rótulo "PSV de hoje" ("05:00" lia-se cinco da manhã) · "Repouso até
  amanhã às 10:45" em destaque · sem a frase (repetia "Dia fechado") · teclas Registar o sign-off · Limites · Ver o
  serviço (saíram "Amanhã", que repetia o painel, e o € como tecla).
- **Mosaicos lado a lado** quando os 2 secundários são números (7 dias com 7 barrinhas do mesmo `dayLog` · mês só
  tipografia, "+€ hoje" a verde, sem a barra que contava dias); avisos de texto continuam com a largura toda.
- **"A seguir" aberto até 3** (desce para 2 se não couber — o ecrã mede-se), "Mais N ⌄" abre o resto; cabeçalho
  "REPORT" (era "HORA").
- Tempo no destino sem "19° a 19°".
**Erros a sério corrigidos (golden primeiro onde há motor):**
- Dia com 2 serviços: o Início só lia o 1.º (o 2.º voo aparecia sem rota, pernoita, hotel nem ganhos) → lê todos e
  mostra o próximo que ainda não acabou (`dayFlights`; quem lê o registo usa `flight.svc`, nunca `duties[dia]`).
- Serviço gravado sem hora de report: o Início largava o registo → usa-o, o relógio conta à partida, PSV "não calculado".
- Motor dos estados (`data/crewState.js`, `test:crewstate` 44 → 51): a pernoita decide-se pelo serviço que acaba por
  ÚLTIMO (não o 1.º) · um serviço sem report já "acaba" (âncora = partida) e o dia pode fechar.
**Pendências novas:**
- **Importação não avisa setores que não encaixam** (achado: "EZY9991 LIS-FNC" depois de aterrar em FNC deu
  "LIS-FNC-FNC" e pernoita em FNC, sem aviso) — avisar "o 2.º parte de LIS mas o 1.º aterrou em FNC".
- **3 × "Alteração de escala (SNC) +60,00 €"** no mesmo dia (das mudanças de teste) — confirmar no AE se cada mudança
  soma um SNC ou se conta a mais. Mexe em €: golden primeiro.
- **Voo noturno que aterra depois da meia-noite:** depois das 00:00 o Início já olha para o dia seguinte → a pernoita /
  pós-voo desse voo não aparece (o motor pensa dia a dia). Decidir a regra (o "dia de serviço" até ao repouso).
- **Escala:** a etiqueta do dia mostra a estação do 1.º serviço (dia com 2 serviços → errado) — rever com a Escala nova.
- **Pesquisa de hotel do Apple Maps** → `docs/dev-build.md` item 9 (Google recusado; OpenStreetMap recusado).
- **Linha do dia de serviço** também no pré-report e em serviço antes da partida (proposta, por decidir).
- **Atualizar o esboço `design/inicio-v6.html`** com o que mudou (teclas no fundo + documento, mosaicos, "A seguir",
  pós-voo, linha do dia) — os mockups mandam na hierarquia; e o guião `docs/verificacao-device.md` (pós-voo, em voo).
**Testado no PC:** `npm test` verde (26 suites) · guardião sem dívida nova. **Não verificado:** a coluna de hoje do
gráfico dos 7 dias (último ajuste, passou a meia-noite) · iPhone pequeno · letra dinâmica grande · VoiceOver.
**Depois da meia-noite (✅ no iPhone, no "hoje" pré-report):** os mosaicos alinhados (cima com cima, fundo com fundo) ·
**regra de cores** (Nuno "está bem"; escrita em `docs/design-system.md`): amarelo = agora/realce · **verde = bom** (dentro
dos limites e os **+€ de um dia** — ganhos de hoje/amanhã, esta noite; o total do mês fica a tinta) · laranja = atenção ·
vermelho = excede · tinta = o resto · a linha do dia de voo perdeu "pernoita em …" (a tecla Hotel já o diz). Gravado
`83dc3a4` + `ce81204` (ramo `inicio-v6`, sem push).
**A seguir (✅ no iPhone, Nuno "está tudo ok"):** a lista do que vem a seguir ganhou o título **"PRÓXIMOS SERVIÇOS"**
("serviços", não "voos": também há standby/formação) por cima das colunas, e a coluna **ROTA** mostra a rota inteira como
no eCrew ("LIS–FNC–LIS"; encolhe se for longa) — só o destino escondia os setores do meio (refs Fly Delta/Air NZ).
**PENDÊNCIA COM PRIORIDADE — MODO ESCURO DA APP TODA (decidido 2026-11-04, opção 2):** hoje a app ignora o modo escuro
do iPhone (`app.json` está em `automatic`, mas nenhum ecrã lê `useColorScheme`): os ecrãs ficam brancos e só o teclado,
os avisos (21 `Alert`) e a folha de partilhar ficam escuros. O problema real: às 4h, no pré-report, o Início está claro
(o noturno só entra na véspera/pernoita) e encandeia num quarto às escuras. **Projeto próprio, depois de acabar os
estados:** todos os ecrãs com versão escura (os tokens `PELE_NIGHT` são o ponto de partida), contraste medido, guardião
do design, refs do Mobbin ecrã a ecrã. Rever então a regra do canon ("o noturno é conduzido pelo ESTADO do dia, não pelo
sistema") — o significado "véspera/pernoita" tem de sobreviver (ex.: a placa noturna continua a dizê-lo). Recusado: só o
Início seguir o telemóvel (resolvia metade e mudava o significado do noturno).

---

## 2026-11-03 (noite, construção) — INÍCIO v6 NO CÓDIGO (Opus 5.5 Extra)

**Feito:** `screens/HomeScreen.js` reescrito pela anatomia aprovada (`design/inicio-v6.html`). Ficaram intactos o motor
(`data/crewState.js`), as frases (`data/stateVoice.js`), os cálculos (PSV, repouso 235, per-diem, pernoita, mês) e as
folhas (porquê, hotel, partilha, auditoria, boas-vindas, dica do ＋).
- **A placa:** ao vivo (véspera · hoje · disrupção · pernoita) escura, com a hora do próximo marco a amarelo (104) e a
  contagem no rótulo; calmo (folga · pós-voo · férias · doença · fecho · configuração) no papel, com o número a tinta (até
  150, encolhe pelo comprimento: "1 284,50 €" cabe). Fases do dia de voo: antes do report → hora do report; em serviço em
  terra → hora de partida; no ar → hora de chegada + barra do setor; aterrado → "falta o sign-off".
- **Linhas do painel:** hora do report · destino (ida-volta = a estação de fora; standby = SBY) · dia. No fecho do mês,
  as parcelas ocupam esse lugar.
- **Frase:** em letra normal; agora também na véspera, no pós-voo e na pernoita (as frases já existiam no motor, só
  estavam caladas). A disrupção não tem frase; as do "hoje" foram feitas a seguir (ver "Decidido a seguir").
- **Secundários (máx. 2):** fila de prioridade — calendário ilegível · alerta de lei (vermelho) · documento expirado ·
  limites com o atraso · voo desviado/atrasado · registo atrás do real · escala mudou (cala-se quando a frase já fala
  disso) · aeroporto com atrasos · documento a expirar · o que o momento pede (avião, tempo no destino, ganhos do dia,
  pernoita, semana de 7 dias, auditoria) · e nunca vazio: o mês estimado (sem acordo: voo em 28 dias).
- **3 teclas** (tabela da v4): folga Ver a escala · Limites · Simular | véspera **Lembrete 05:05** · Limites · Partilhar o
  voo | hoje Família · Limites · Hotel/Simular | em voo Partilhar a chegada | disrupção Avisar a família · Limites com o
  atraso · Simular | pernoita Hotel · mapas · Serviço de amanhã · Partilhar | pós-voo Registar o sign-off · **+€ hoje** ·
  Amanhã | fecho Registar um extra · Ver nos Números · Auditoria/Simular | configuração Ligar o calendário · Importar o
  PDF · Ver um exemplo | férias e doença: nenhuma. "Limites" abre o porquê de hoje (ou a margem, ou os Números).
- **Saíram:** halo/véu/candeeiro (sistema de luz), bilhete manuscrito, fantasma pálido, saudação, chip das horas, barra
  de ações, colunas de estado da folga (o saldo de férias deixou de aparecer na folga).
- **Tokens novos (`data/constants.js`):** `PLATE` (placa dia/noite e as pílulas sobre ela) · `PELE.greyOnSoft` ·
  `PELE.okText` · `PELE.plate` · **`BRAND.panel`** (a hora do painel, fixa no amarelo em todas as edições — opção 2).
  A 1.ª tecla usa `BRAND.action` (à noite, a tinta clara); o ponto "ao vivo" usa `BRAND.onDark`.
- **Movimento:** dígitos Solari (rotateX, 460 ms, cascata de 70 ms, native driver) ao entrar e quando um dígito muda;
  ponto "ao vivo" a pulsar só com o ecrã à vista; movimentos reduzidos = seco. A passagem calmo ↔ ao vivo com o
  ecrã aberto é uma troca seca (a "placa a escurecer do topo" do esboço **não foi feita**: rara, e a letra mudava de
  cor a meio).
- **Barra de estado do iPhone:** clara sobre a placa e à noite (corrige também a noite antiga, que tinha letra escura
  sobre fundo escuro).
- **Lembrete para acordar:** `scheduleWakeUp` em `data/reminders.js` (sobrevive ao `syncReminders`; sair da conta
  apaga). Na Expo Go diz, num aviso âmbar, que só funciona na app instalada → entra na lista do dev build. Dois tipos
  novos de aviso no `Toast` ('bell', 'alert').
**Medido no PC:** `npm test` verde (25 suites) · pacote iOS gera · guardião: Início 73 → 0 (chão gravado; total tipo
238→218 · <11 118→109 · espaço 463→434 · raio 61→57 · cores 76→65) · **contraste calculado** em 26 pares novos: falhavam
a pílula vermelha calma (4,47 → vermelha cheia com letra branca, 5,30) e a vermelha na placa noturna (4,04 → `#EC857B`
com fundo a 16 %, 5,07); a mais baixa que fica: pílula laranja na placa noturna 4,64 · **altura calculada** com as
métricas lidas das fontes (Barlow 1,2 em de linha e dígitos de 0,7 em; Hanken 1,30 em): o estado mais alto (pós-voo com
frase, 2 secundários com barra e 2 linhas) dá 703 pt nos 714 úteis a 390 × 844 (com 16 pt entre blocos dava 715 → 12).
**Não verificado:** nada no iPhone. iPhone pequeno (SE) vai deslizar · letra dinâmica grande · VoiceOver · o lembrete
(dev build). A posição dos dígitos dentro da caixa depende de como o iOS assenta a Barlow: o `TUNE.trim` (0,08) afina.
**Decidido a seguir (Nuno: "sim" às minhas recomendações, mesma sessão):**
- **Lembrete para acordar:** fica a tecla; o aviso de sucesso diz "Não substitui o despertador" (uma notificação pode
  não tocar em silêncio/modo Dormir). No dev build passa a **alarme a sério com o AlarmKit (iOS 26)** — `docs/dev-build.md`.
- **Placa a escurecer do topo:** não se faz (rara; os dígitos que mudam já viram). Revê-se só se no iPhone parecer brusco.
- **Saldo de férias:** vive nos Números (cartão "Férias 2026", já existia). No Início volta só na folga, **de outubro a
  dezembro, se sobram dias** ("Ficam 9 de 22 dias · gozam-se no ano (CT 240.º)" → Números), só com acordo que regista férias.
- **Frases do dia de serviço — FEITAS, golden primeiro** (`test:voice` 60 → 68): "Tudo pronto." só com o voo ao vivo sem
  atraso E os limites cumpridos; casaco a ≤ 10° e chuva com o tempo de AGORA no destino (nunca previsão inventada);
  em voo "Está a correr como previsto." só com o feed; aterrado/não-voo/tempo ameno sem feed = sem frase. A
  disrupção continua sem voz. O secundário do tempo no destino cala-se quando a frase já falou dele.
**Revisão independente do código (um agente à parte, só erros reais) — 0 que rebentem; corrigidos depois de os
confirmar no código:** o lembrete para acordar era apagado em cada arranque a frio (`cancelAllReminders` com o
utilizador ainda vazio) e ao desligar os lembretes → agora vive à parte (só sair da conta o apaga, `clearWakeUp`), com o
mesmo id (nunca duplicado) e ligado ao dia + report (`validateWakeUp` a cada mudança da escala: report mudado ou
serviço apagado → cai) · véspera sem hora de report mostrava a partida como "Report amanhã" → "Partida amanhã · sem hora
de report" · pernoita de 2 noites dizia "Report amanhã" → diz o dia · o cartão partilhado na véspera dizia "Hoje às" →
sem pílula para outro dia · as parcelas do fecho não somavam (faltava o abono para falhas) → entra nos Extras, como nos
Números · "Atraso +0" e hora riscada igual à nova → "Atrasado" e sem riscado · "rotação sem atraso" sem dados do inbound →
só a matrícula · o standby dizia "tempo de standby descontado (225)" sem o motor o aplicar → "Estimativa: PSV a 1 setor
desde o início do standby (225). Confirma na Simulação." · "Ver um exemplo" antes das 18h mostrava "Sem serviços
marcados" → a folga lê o voo de exemplo · VoiceOver: o herói e os secundários sem toque eram botões "esbatidos" (e o link
da privacidade ficava inalcançável) → blocos normais · em voo, "A seguir" repetia a 1.ª linha → só a pernoita · a tecla
"Registar o sign-off" abria o detalhe só de leitura → abre logo o formulário (`DutyDetail` aceita `edit`); com o sign-off já
registado diz "Ver o dia" · as interpolações do Solari passaram a ser criadas uma vez (sem saltos a meio).
**Ficou como está (decidido):** a tecla "Amanhã" do pós-voo repete a 1.ª linha do painel, mas está no esboço aprovado.
**Voo ao vivo segue o SETOR ATIVO — CORRIGIDO (Nuno: "corrigir isto", mesma sessão):** antes seguia o nº do 1.º setor
o dia todo e um atraso dele punha os setores seguintes em disrupção. Agora `activeLegIndex` (`data/flightDelay.js`,
teste primeiro em `test:flightstatus`, 51 → 66): o setor ativo avança pela chegada REAL/ESTIMADA do voo seguido (um setor
atrasado já não "acaba" no ar à hora planeada) e nunca volta atrás no mesmo dia (um setor que aterrou cedo fazia o feed
oscilar). Setor sem número → não se segue nada (nunca o de outro setor). O estado só vale para o voo pedido. O aviso
"o registo ainda tem o planeado" só se marca com o ÚLTIMO setor (é com os calços dele que o App o limpa); o PSV com o
atraso só é "facto" quando o último aterrou (antes é projeção). As horas reais do feed passam a valer em dias de
vários setores. O estado é pedido outra vez ao voltar ao Início (o servidor guarda 60 s) — antes só ao puxar.
**Pendente:** a Caveat continua no arranque (o detalhe do hotel usa-a) · a Escala na linguagem do Início · confirmar no
iPhone que `alignItems: 'baseline'` alinha a unidade com os dígitos animados.

---

## (feito acima) CONSTRUIR O INÍCIO v6 — o plano que esta sessão seguiu

**Modelo:** sessão nova em **Opus 5.5 Extra** (base nova de um ecrã — tabela do método).
**O que está aprovado:** `design/inicio-v6.html` (https://claude.ai/artifact/UBfuuAehZRYjjSbfR2TPJh, versão 3) — o
sistema "ao vivo / calmo", os 2 secundários, as 3 teclas e o Solari; detalhe nas duas entradas abaixo. A tabela de
atalhos por estado está em `design/inicio-v4.html`; os outros momentos desenhados também.
**Como:** `screens/HomeScreen.js` (1885 linhas) ganha a anatomia nova; ficam o motor `data/crewState.js`, as frases
`data/stateVoice.js` (golden), os cálculos e os avisos. Saem o halo (sistema de luz), o bilhete manuscrito, o fantasma
pálido, o chip das horas e a barra de ações. Tokens novos: `PELE.greyOnSoft`, `PELE.okText`, `PELE_NIGHT.plate` e os
fundos das pílulas. Movimento com a skill `animacoes`. Golden e guardião verdes; ver no iPhone ("testar os estados").
**Gravado nesta sessão:** `63726c9` (versões do Expo que o `expo start` propôs) · `ed2fd87` (Escala v2 + esboços).
**Depois:** a Escala segue a linguagem do Início (a escolha A/B/C da `escala-v3` fica para lá).
**Edições SPAC/SNPVAC no Início v6 (Nuno: "vamos usar as cores deles?") — estudo LOCAL `design/edicoes-inicio.html`
(não publicar):** Opção 1 = a cor deles em tudo (a hora fica azul: SNPVAC 7,5/6,6 noite · SPAC 5,6/**4,9** noite) ·
**Opção 2 (recomendada) = a hora do painel fica AMARELA em todas** (convenção do aeroporto, 10,6) e a cor deles vai para
o que se toca (1.ª tecla 6,4/5,0 · ＋ · aba) e para o ponto "ao vivo" (SNPVAC usa o tom do escuro #6FAAE3: o cobalto dá
2,9 na placa). Pede um papel novo em `BRAND` (cor do painel, separada de `onDark`). **✅ DECIDIDO: Opção 2 (Nuno,
2026-11-03).** Na construção do Início: criar o papel do painel (fixo no amarelo em todas as edições) e usar `action`
na 1.ª tecla e no ＋, `signal` na aba, `onDark` no ponto "ao vivo".
Continua a valer: só com autorização escrita de cada sindicato; advogado.

---

## 2026-11-03 (noite, mais tarde) — INÍCIO v4: "mais moderna e clean", informação certa para cada momento

**Contexto:** a Escala v2 FUNCIONA no iPhone (16/16) mas o Nuno achou-a "genérica"; ronda 3 da Escala (letra da casa ·
fantasma · poster no dia, `design/escala-v3.html`, https://claude.ai/artifact/FPXPLFY5bkPDFpqfoYBybj) ficou SEM escolha
porque o Nuno pediu a app inteira "mais moderna e clean, com animações e sugestões, acessos rápidos e atalhos" e quis
começar pelo Início. **A Escala segue a linguagem que o Início fixar.** O código da Escala v2 continua por gravar.
**Escolhido (Nuno):** direções 1 (cartão do momento) + 2 (sugestões do momento) e ver a 3 (mosaico). Pediu a minha
recomendação sobre o que fica → **fica** o tema noturno e o fantasma PROMOVIDO a número do momento; **sai** a letra
manuscrita (a frase fica em letra normal) e o halo de luz (o tempo fica como dado). Refs em `referencias/inicio/`.
**Esboço:** `design/inicio-v4.html` (https://claude.ai/artifact/29hpznanZfKssbwQikVY4Q): folga · véspera (noturno) ·
pré-report · folga+mosaico. Cartão escuro "ao vivo" quando há serviço, claro quando é calmo; atalhos por estado numa
tabela (regras fixas, sem AI); movimento com propósito. **Versão 2 do artifact (Nuno: "faz outras variantes" — li como os
outros estados):** + em voo (barra do setor), disrupção (+25, hora riscada, sem frase), standby (fim da janela + "se te
chamarem agora"), formação + aviso de documento, pós-voo (claro, sign-off), pernoita (noturno, estação + hotel), fecho do
mês + escala mudou (total + parcelas), férias e doença (sem atalhos), configuração.
**Depois (Nuno: "outras versões do desenho · gosto das coisas grandes · lembra-te do tipo de utilizador"):**
`design/inicio-v5.html` (https://claude.ai/artifact/AyCUmV1SeLYKEqN7fxSN8d) — 3 versões × 2 momentos (pré-report, folga):
**A · Uma coisa só** (Brick, Cash App: número de 150 pt, botão largo + 2 redondos ao polegar, o resto a deslizar) ·
**B · Cartão de embarque** (Apple Wallet: códigos a 72 pt, horas, picotagem, atalhos no cartão, próximos empilhados) ·
**C · Painel de partidas** (o aeroporto: hora amarela a 96 pt, destino, estado, linhas dos próximos dias, 3 teclas).
Regras para quem usa (valem para as três): um número enorme por ecrã · hora/sítio/"está tudo bem?" sem deslizar ·
atalhos ≥ 48 pt na metade de baixo · contraste alto · letra dinâmica.
**Nuno: "misturar. que achas?" → proposta (minha), `design/inicio-v6.html` (https://claude.ai/artifact/UBfuuAehZRYjjSbfR2TPJh):**
um só sistema com duas intensidades. AO VIVO (véspera, pré-report, em serviço, em voo, disrupção, standby, pernoita) =
placa escura do painel de partidas (C), a HORA do relógio a amarelo (104 pt), a contagem no rótulo, o estado numa
pílula (a horas · atraso +25 · repouso ✓). CALMO (folga, pós-voo, férias, doença, fecho, configuração) = fundo claro
e o número enorme a tinta (A, 150 pt: "2 dias", "7:45"). Sempre: as linhas do painel com o que vem a seguir (hora ·
destino · dia) e 3 TECLAS no mesmo sítio, ao polegar (a 1.ª a tinta; tabela de atalhos da v4). Movimento: dígitos
viram como o painel Solari quando a hora muda; calmo↔ao vivo escurece do topo; reduzido = seco. O cartão de embarque
(B) sai do Início → proposta para o cartão que a família recebe. Mostrado em 6 momentos.
**Versão 2 (Nuno: "na parte das frases tem imenso espaço até abaixo"):** o meio passa a ser os **2 SECUNDÁRIOS** da fila de
prioridades do motor (living-interface §2): documento a expirar, escala mudou, o avião, o tempo no destino, os
limites, a semana, o dinheiro do mês. Nunca vazio (sem nada urgente → o dinheiro do mês). O que está num secundário
não se repete numa tecla (folga: tecla do € → Limites; véspera: tecla do tempo → Limites). Medido: tudo cabe nos 714 pt
(a folga passou a 2 linhas no painel). **✅ APROVADO pelo Nuno ("sim gosto", 2026-11-03).**
**Cores e letra (Nuno: "fica assim?") — fica a identidade, com acertos MEDIDOS:** papel/tinta/amarelo e Barlow Condensed
+ Hanken Grotesk como hoje. Amarelo SÓ sobre a placa escura (= `BRAND.onDark`, 10,62; noturno 9,36 → as edições por
sindicato trocam-no sozinhas); no claro os números são a tinta. Placa: rótulos #A3A39B 7,25 · pílulas verde 6,26 /
laranja 5,27. **Falhavam e foram corrigidos no esboço (v3 do artifact):** cinzento sobre o suave 4,03 → **#5E5E57 (5,84)**;
verde de texto sobre o suave 3,92 → **#0B6E43 (5,64)**. **Tokens novos a criar na construção:** `PELE.greyOnSoft`,
`PELE.okText`, `PELE_NIGHT.plate` (#18212D) e os fundos das pílulas sobre a placa. Letra: números 104 (hora ao vivo) e
150 (calmo) = escala decorativa ≥ 48 (TUNE); 44 · 26 · 24 e os `TXT` estão na escala. A Caveat (letra manuscrita)
deixa de ser usada no Início → ver se sai do arranque (menos uma fonte a carregar).
**Construção (quando aprovado):** é a BASE do Início novo (HomeScreen tem 1885 linhas) → sessão própria em Opus 5.5
Extra; o motor `crewState`, as frases (`stateVoice`, golden) e os cálculos ficam; muda a pele e a anatomia.
**Respondido ao Nuno:** o Início tem 10 estados no motor (`data/crewState.js`) + 4 variantes do "hoje" (pré-report,
em serviço/voo, standby, formação) + 2 avisos (escala mudou, documento) = 15 situações, em 2 temas (dia/noite).

---

## 2026-11-03 (noite) — Escala: esboço v2 APROVADO ("sim") e passado para o código — falta o iPhone

**Código (por gravar no git):** `screens/EscalaScreen.js` reescrito pelo esboço; cálculos intactos (€, repouso 235/220,
pernoita, linha do tempo). Sai a folha "Detalhe do dia" (Modal): o dia vive por baixo da grelha, com a pega
(PanResponder + Animated no driver JS: altura e deslocação; scroll desligado durante o arrasto; toque alterna;
movimentos reduzidos = troca seca; VoiceOver = botão "Mostrar só a semana / Mostrar o mês"). Tocar num dia desliza
só o necessário (200 pt da folha à vista, sem esconder a linha tocada). Emoji fora (🏨 🗺 🌙 → ícones `bed`/`pin` e
"pernoita"). Folhas do hub e do seletor de meses passadas a `TXT`/`SPACE` (‹ › do ano = `IconButton`).
**Verificado no PC:** guardião 181 → 0 na Escala (total: tipo 275→238 · <11 136→118 · espaço 552→463 · raio 78→61 ·
cores 96→76), chão gravado (`--atualizar`) · `npm test` verde · pacote iOS gera. **Não verificado:** nada no iPhone
(lista no bloco C de `docs/05-verificacao.md`). `design/escala*.html` antigos → `design/arquivo/`; §9 sem exceção.
**A seguir:** o Nuno vê no iPhone; afinações; depois o formulário de serviço (107 de dívida).

**Medido** (fontes da app, 390 pt): código a 11 pt cabe ("LGW" 25,9 px em 35,7 úteis; 33,6 a 375), "2× LGW" não
(42,9) · "folga" nos dias vazios 1,78:1 · hoje = borda amarela 1,73:1 (indicador pede 3) · tons pastel dos tipos
1,05–1,31 · dias de fora do mês 1,35 · cinzento sobre o fundo suave 4,03 · laranja da faixa de repouso 2,74 · folha do
dia com emoji (🏨 🗺 🌙) e tamanhos soltos · rótulo lateral ainda lá. Noturno: a Escala não tem.
**Escolhido (Nuno):** opções 1 + 2 do Mobbin → `referencias/escala/` (Tonal, Todoist, Google Calendar) + coleção.
Etiqueta por baixo do número (não a célula pintada) · por baixo da grelha SÓ o dia escolhido (não a agenda).
**Esboço:** `design/escala-v2.html` (artifact https://claude.ai/artifact/CbE66bEiaQEbi1SNiA5oV7). Hoje = círculo de
tinta, escolhido = anel, dia vazio = só o número, etiqueta 11 pt (preta no voo, um tom claro no resto), lua dentro da
etiqueta, 2 serviços = segunda camada, "€" extra sai da grelha, uma ação "Ver tudo", Zulu só quando difere da local,
resumo a tinta. Medido no esboço: célula 47,7 × 46 · grelha de 6 semanas 286 · cartão do dia com 132 pt à vista ao abrir.
**Ronda 2 (Nuno: "mês está enorme", Mobbin outra vez):** escolhidos título "Novembro 2026" a 30 pt + ‹ › redondos
(IconButton) + resumo numa linha ("17 serviços · 2 pernoitas · 418,60 € per-diem"; sai "folgas") — Orbit/pliability;
botão "Hoje" fora do mês corrente — Joi; o dia é uma folha encaixada com pega que encolhe o mês para a semana —
Outlook/Todoist. Sai o fantasma "2026" da Escala (as outras abas mantêm o PeleHeader grande; a linha de cima fica
alinhada). Medido: do topo à grelha 228 → 154 pt; cartão do dia com 193 pt à vista ao abrir (mês de 6 semanas).
Mesmo artifact (versão 2). Refs em `referencias/escala/` + coleção.
**Feito a seguir ao "sim":** ver o bloco do código acima (a pega ficou com Animated + PanResponder, sem Reanimated: a app
não tem `GestureHandlerRootView` e o gesto é só um).

---

## (histórico) LAYOUT: a ESCALA (Nuno: "vamos ao layout", 2026-11-03) — passos 1–4 feitos (ver acima)

**Modelo:** sessão nova em **Opus 5.5 Extra** (ecrã com referências e esboço — tabela do método). O Nuno escreve
"vamos à Escala".
**Onde ficou o layout (bloco C, `docs/05-verificacao.md`):** feitos a entrada (Porta), a configuração (+ "Liga a tua
escala"), o Perfil em índice + Família e o Início em folga (no código, por ver no iPhone). Próximo ecrã: **Escala** —
a maior dívida do guardião (181: tipo 37 · espaço 89 · letra < 11 18), depois formulário de serviço (107), Números
(101) e Início (73).
**Passos (método, fase 4):**
1. Medir o ecrã (`screens/EscalaScreen.js`): tamanhos, espaços, contraste, 390 px, noturno.
2. Mobbin: 3 a 5 referências de calendários/escalas das melhores apps → o Nuno escolhe → `referencias/escala/`.
3. Esboço em `design/` (o mockup manda na hierarquia; os números vêm de `TXT`/`SPACE`).
4. Aprovado → código; baixar o chão do guardião (`node scripts/design.test.js --atualizar`).
**Decisão pendente que entra aqui:** a exceção da grelha da Escala (etiquetas a 8–9,5 pt, abaixo da escala) —
decidir no iPhone.
**Ainda por ver no iPhone (não bloqueia):** §0b–§0i do `docs/verificacao-device.md` (o §0i com o kit de longo curso).

---

## Sessão seguinte (dia 4, continuação) — LIMITES DA TAP, motor v2: LONGO CURSO (gravado: `602e004`)

**Pedido do Nuno:** "continua e fazemos só o longo curso por agora". Mesma regra: tudo do texto oficial; "Excede" só
quando viola o texto em qualquer leitura.

**FEITO:**
- **Horas locais pela UTC.** A escala importada traz a hora UTC de cada perna. O motor passa as horas para o relógio
  da base e calcula a hora legal de cada aeroporto (`airportOffsetMin` em `data/zulu.js`, com cache dos fusos:
  um ano de escala passou de 109 ms para 38 ms em Node). Sem UTC, o longo curso fica em "Ainda não avaliado"
  ("Longo curso sem hora UTC").
- **7 regras novas**, só quando há longo curso:
  - pilotos: P32 (tempo de serviço de voo, Cl. 43.ª, com aclimatização e reforço), P36 (rotações, Cl. 33.ª e 39.ª),
    P39 (noite antes do longo curso, Cl. 39.ª, n.º 5), P49 (repouso, Cl. 41.ª);
  - cabine: C26 (PSV, Cl. 23.ª, n.os 2 a 5, 10 e 11), C41 (repouso, Cl. 29.ª, n.os 8 a 10), C15 (folga e RAD no
    regresso, Cl. 20.ª e 30.ª).
- **Lacunas da v1 corrigidas:**
  - pilotos Cl. 34.ª: 9 h de voo para solo ("incerto" até às 12 h da Cl. 25.ª); +2 h se o voo tocar as 2h00–5h59
    de Lisboa, também na "próxima saída de calços";
  - cabine Cl. 20.ª, n.º 3: a folga só começa na hora certa seguinte ao repouso e à transição (C14);
  - a hora de Lisboa vem da UTC.
- **Ecrãs:** a secção dos Números deixa de dizer "Só o médio curso". O detalhe do serviço e o Início usam o limite
  do longo curso com a rotação (`fdpForDuty`) e explicam o "incerto" (aclimatização, reforço, descanso a bordo).
  Os Números passam a frota de cada dia (`crewAt(d).fleet`) para o reforço.
- **Golden 230 → 443.** Cada citação, linha e valor dos quadros novos confirmados no texto oficial; casos à mão
  de GRU, EWR e SFO, no inverno e no verão. 26 suites verdes · guardião sem dívida nova · pacote iOS.
- Detalhe em `docs/ae-tap-limites.md`, §8.

**Para o Nuno saber (leituras do texto):**
- **Pilotos, zonas geográficas (Cl. 43.ª, n.º 3):** Lisboa é a zona −1 e GRU a −3 → 2 zonas. Por isso, numa rotação
  a São Paulo o piloto fica aclimatizado pela alínea c), embora a hora legal difira 3 h. É o que o texto diz.
- **Cabine, "4" em duas linhas do quadro do n.º 4:** com 4 h de diferença (GRU no verão), a app faz as duas leituras.
- **"N/A" e "-" nos quadros** (4 aterragens a partir das 16h00): "incerto", porque o AE não dá valor.
- **Acima do quadro:** pilotos num wide-body (ou frota desconhecida) → "incerto" (reforço até +5 h); num
  narrow-body → excede. Cabine com 1 setor até 16h30 → "incerto" (descanso a bordo); mais setores ou mais de 16h30 →
  excede.

**Continua de fora:** os setores em DHC dentro de um serviço de voo (precisa dos códigos da escala da TAP).

**Continuação (Nuno: "ok avança. e faz a (a)"):**
- **4 regras novas dos pilotos:** P22 (folgas depois do longo curso, Cl. 38.ª), P38 (fusos entre rotações, Cl. 39.ª,
  n.º 2), P33 (20 h de reforço por mês, Cl. 42.ª, n.º 4), P37 (Atlântico Norte, Cl. 39.ª, n.º 1).
- **Atlântico Norte = (a):** a região da ICAO, NAT Doc 007 V.2026-1 (texto e SHA-256 em `fontes/icao/` e
  `fontes/README.md`; a citação é conferida pelo teste). Certas: EUA, Canadá, Islândia, Gronelândia. "Incerto": o resto
  a norte do equador e a oeste dos 20°W. **Diferença do que eu tinha dito:** o norte do Brasil fica de fora do
  "Incerto" (está a sul do equador).
- **Kit de teste:** `docs/kit-teste/longo-curso-tap.ics` (10 voos inventados, 16 nov a 23 dez 2026), gerado por
  `node scripts/kit-longo-curso.js`; a TAP fica escolhível na configuração **só em desenvolvimento** (Expo Go,
  `__DEV__`, etiqueta "teste"). Guião §0i reescrito com os resultados esperados à letra; o caminho
  .ics → leitura do calendário → importação → motor foi corrido no PC e bate certo.
- Golden 443 → 481. 26 suites verdes · guardião sem dívida nova · pacote iOS.

**Corrigido (Nuno: "temos que corrigir o 1 e o 2. o que diz as leis?"):**
1. **Importação:** saída depois da meia-noite com a apresentação na véspera → a apresentação passa para a véspera e o
   serviço fica com o dia da apresentação (o serviço começa na apresentação: pilotos Cl. 6.ª, n.º 40; cabine Cl. 4.ª,
   n.º 25). Golden do calendário 44 → 48. Quem já tinha um destes voos importado vê, na próxima sincronização, o
   serviço na véspera como novo e o antigo como cancelado: confirmar os dois. O kit de teste tem um (Newark, 22 dez).
2. **Hora local:** pilotos pela Cl. 6.ª, n.º 14 (base nas 48 h depois de sair da zona da base, depois a origem do voo;
   médio curso sempre base) no trabalho noturno (P53) e como uma das leituras do repouso do longo curso (P49); cabine
   pela Cl. 4.ª, n.º 13 (partida ou chegada → duas leituras) no serviço noturno (C36). Golden 481 → 488.
   - **Continua "incerto":** a ida e volta de longo curso com os dois voos a tocar o período crítico, porque o AE não
     define "consecutivos" (Cl. 22.ª e 27.ª). Confirmado (Nuno: "não há nada na lei sobre isso?"): também não o
     definem a regra europeia (ORO.FTL.105 define "serviço noturno", não "consecutivos") nem o Código do Trabalho.
     Quem interpreta é a **comissão paritária** de cada AE (CT art. 493.º; pilotos Cl. 10.ª, n.º 6: as deliberações
     "vinculam as partes nos mesmos termos deste AE"; cabine Cl. 35.ª, n.º 6: integram o AE e publicam-se no BTE). A
     única deliberação TAP × SPAC encontrada (20 jun 2023) é sobre a utilização externa (RRCE), não sobre isto.
     **Pendência:** perguntar ao SPAC e ao SNPVAC (e ao advogado) se há deliberação ou leitura assente; até lá, "incerto".

**A seguir:** device (guião §0i, com o kit); os códigos da escala da TAP quando houver um exemplo do calendário.

---

## Sessão seguinte (dia 4) — LIMITES DE ESCALA DA TAP, motor v1 (sem ecrãs ainda)

**Decisões do Nuno:** D1–D12 todas como recomendado. E a regra por cima de tudo: **"tem que ser seguir os pdfs
oficiais. tem que ser tudo oficial, nada inventado"**.

**FEITO:**
- **Fontes no repo:** `fontes/README.md`. Os PDF do BTE ficam no PC, identificados por SHA-256; o texto extraído
  é versionado.
- **Motor `ae/tapLimits.js`, puro, golden-first.** 15 grupos de regras, cada um com a cláusula, a página e a
  citação literal, e as convenções escritas em pt e en.
- **Teste `scripts/ae-tap-limits.test.js`** (`npm run test:taplimits`, no `npm test`), com 211 asserções:
  - Parte 1: cada citação existe letra a letra na página indicada do texto oficial, e os valores das tabelas
    aparecem no quadro (o teste já apanhou uma página errada);
  - Parte 2: casos calculados à mão.
- **Tudo no `docs/ae-tap-limites.md`, secção 7.**

**O que o texto oficial mostrou (para o Nuno saber):**
- Os limites de PSV dos dois AE contam até 30 min depois dos calços (pilotos Cl. 6.ª, n.º 40; cabine Cl. 4.ª,
  n.os 25 e 44). Hora-limite de calços pelo AE = apresentação + limite − 30 min.
- D2 e D3 ficaram respondidas pelas definições oficiais (mês, ano, semana, "duty time").
- **Convenções novas, a confirmar:**
  - C10: a folga seguinte começa até 120 h depois do fim da anterior;
  - "consecutivos" = em dias seguidos;
  - P06: o 6.º dia conta a partir do dia em que acaba o descanso anterior;
  - C14: uma folga por cada 48 h livres.

**Fora da v1, por falta de dados (nada inventado):**
- P07, P08 e P10 (folgas dos pilotos): a app não guarda os dias de folga assinalados na escala.
- A app só conhece os códigos da escala da easyJet: na TAP, as assistências, as reservas e as folgas não são
  reconhecidas. É preciso um exemplo do calendário da TAP (títulos dos eventos, com dados inventados).

**Respostas do Nuno (mesmo dia):**
1. **"não tenho ainda da TAP. podemos é bloquear enquanto a opção de escolher a TAP até termos isso."**
   FEITO: `ROSTER_PENDING = ['tap']` e `isRosterPending` em `data/rosterCodes.js`. Na configuração, a TAP aparece
   esbatida, com "brevemente" e "A app ainda não lê a escala desta companhia.", e não se escolhe. O `OptCard`
   ganhou o estilo inativo. Golden +3.
2. **"temos que seguir sempre os acordos. o que está na lei."** "Excede" só quando o caso viola o texto em
   qualquer leitura; o resto fica "incerto".
   - **C10 saiu:** o prazo de 120 h entre folgas era nosso; fica o n.º 4 da Cl. 20.ª (C11) e as 13 folgas por
     trimestre (C14).
   - **"Consecutivos" pelo próprio AE:** um serviço ou uma folga/descanso semanal pelo meio separa-os; em noites
     seguidas são consecutivos; o resto fica "incerto".
   - **P06:** a leitura com mais tempo.
   - **C14:** as equivalências do AE (96 h = 2 folgas, 72 h = 1 folga + 24 h).

   Golden 213. Detalhe no `docs/ae-tap-limites.md`, §7.

**Esboço dos ecrãs ("faz o esboço"):**
- **Referências escolhidas pelo Nuno ("vamos à tua recomendação"):** lista agrupada pelo resultado (Credit
  Karma) + gráfico com a linha do limite (bunq) + aviso no topo (YNAB). Estão em `referencias/limites/` e na
  coleção do Mobbin.
- **Esboço** `design/limites-ae.html` (https://claude.ai/artifact/NKER48N36sqPF31D2v3tmr), com 4 ecrãs:
  - a lista nos Números;
  - a folha de um limite de horas;
  - a folha de uma regra que excede;
  - o detalhe do serviço, com o mais apertado entre AE e EASA (D1).
- **APROVADO (Nuno):** os 4 ecrãs, com a etiqueta "Incerto".

**FEITO no código (o motor ligado aos ecrãs):**
- **`components/AeLimitsSection`:** a lista nos Números.
  - Aparece por baixo de Voo e Corpo, só com meses na TAP.
  - No topo, o aviso curto leva à 1.ª regra; depois os grupos Excede, Incerto e Dentro.
  - Cada cartão tem a regra · cláusula, a frase e "e mais N".
- **`components/AeLimitSheet`:** a folha da regra.
  - **Limite de horas:** o valor de hoje e quanto falta ou passou; o gráfico do mês (a soma da janela em cada
    dia, a escala publicada a cinzento, a linha tracejada do limite); as outras janelas; a regra europeia ao lado.
  - **Outras regras:** a palavra do resultado, a frase e, nos noturnos, os 7 dias em causa.
  - **Sempre:** o resumo do que o AE pede, a citação literal do BTE com a cláusula e a página, o botão para a
    fonte oficial (DRE, confirmado por SHA-256) e as convenções.
- **`data/tapLimitsText.js`:** as frases (pt e en), puras. O "incerto" da v1 (longo curso, 5+ aterragens,
  trimestre em curso) não é problema da escala e fica fora do grupo Incerto.
- **Detalhe do serviço:**
  - "PSV máx." e "Calços até às" mostram o mais apertado entre AE e EASA, com a marca "AE" e a Prova do acordo;
  - linha nova "Próxima saída de calços" (na base: repouso + 4 h);
  - "Excesso (acordo)";
  - a explicação com os dois valores e as duas fontes.
- **Início:** o "Dentro dos limites?" e a hora-limite de calços usam o mais apertado ("(acordo)"). Um PSV acima
  do AE dá "Não — excede o limite do acordo".
- **Motor:** `current` (o valor de hoje em cada janela), `series` (o mês para o gráfico), `nextOffBlockAfter`,
  e `where`/`dates`/`fromAt`/`toAt` nos resultados.
- **Golden:** 213 → 224 (frases, grupos, próxima saída de calços). Ensaio com um mês inventado de piloto e de
  cabine: nenhuma frase vazia, "undefined" ou "NaN".
- **Fontes:** os PDF em `fontes/` são os do DRE (mesmo SHA-256) — os mesmos endereços da Biblioteca.

**Correção pedida pelo Nuno ("os casos que a v1 não avalia não aparecem — corrigir isto?"):** nada fica em silêncio.
- **Longo curso e aeroporto desconhecido:** linha à parte no fim da lista, "Ainda não avaliado", com o número de
  serviços e "vale a regra europeia, que a app já calcula". Não é "Incerto": não é o AE que deixa a dúvida.
- **5 ou mais aterragens (cabine):** o AE não tem coluna. O resumo diz "N só pela regra europeia" e o detalhe do
  serviço explica-o (Cl. 23.ª, n.º 1). O detalhe também avisa no longo curso e no aeroporto desconhecido.
- **Trimestre em curso:** se a escala publicada cobre o trimestre todo, há veredicto "pela escala publicada"; se
  não cobre, fica "x de 13 até agora".
- Golden 224 → 230.

**Para testar no iPhone:** é preciso uma conta de teste na TAP. Como a TAP está bloqueada na configuração, usar
uma conta de teste que já esteja na TAP, ou tirar `'tap'` de `ROSTER_PENDING` só no PC, para o teste.
Guião §0h.

**Verificado no PC:** 26 suites verdes · guardião · pacote iOS. O motor ainda não está ligado a nenhum ecrã.
**A seguir:**
1. Os códigos da escala da TAP, quando o Nuno tiver um exemplo do calendário (desbloqueia a TAP e as regras de
   assistência e folgas).
2. O esboço de onde os limites aparecem (Início "Dentro dos limites?", detalhe do serviço, Números), com D1: o mais
   restritivo entre AE e EASA, com as duas citações.
3. Device.

---

## Sessão seguinte (dia 3) — LINHA DO TEMPO DO CONTRATO (companhia e base com datas) — FEITA

**Decisões do Nuno:**
- **3 linhas separadas** em vez de 1: categoria/contrato (a de sempre) · companhia+tipo · base. Cada mudança mexe só
  na sua linha, por isso uma transferência de base não estraga uma promoção posterior. Mudança em relação à proposta
  de ontem (1 linha com tudo), por esse motivo.
- **"Mudei ou corrigi"**, com o motor e os testes golden primeiro e o esboço depois.
- **Esboço** `design/linha-do-tempo.html` (https://claude.ai/artifact/5xJZWax4RgoDTuyxEmeCtL) **APROVADO** (5 ecrãs).
- **A janela "Mudar de companhia?" saiu:** a pergunta "O que aconteceu?" e o "Cancelar" do canto fazem esse papel.

**FEITO — motor (golden-first):**
- **`data/crewHistory.js`:** funções `resolveCompany`, `migrateCompany`, `companyStartYm`, `resolveBase`,
  `migrateBase`, `addBaseChange` (com `correct`, que corrige só desde a entrada na companhia atual),
  `startEmployment` ("mudei": períodos novos no mês de entrada; o que a antiga tinha marcado depois cai) e
  `moveEmploymentStart` (corrigir depois a data de entrada mexe na fronteira; com uma só companhia não muda nada).
- **`yearStats` aceita `aeAt`:** cada mês é somado com o seu acordo.
- **`reconcileDayLog` e `buildImportCandidates` aceitam `baseAt`:** a base em vigor em cada dia decide o repouso
  (12 h ou 10 h, ORO.FTL.235) e a pernoita.
- **Testes golden:**
  - stats 134 → 141;
  - FTL +3 (316);
  - importação +2 (67);
  - caso de referência: ano 2026 com jan–abr na easyJet FA e mai–dez na TAP CAB2. Dá 18 716,64 €
    (base 4×1346,57 + 8×1627,02, mais o abono só nos meses da easyJet). O cálculo antigo dava 19 524,24 €.
- **Migração suave:** sem linha guardada, fica 1 período com o valor atual, e os perfis antigos calculam como antes.
  As linhas vivem nos metadados da conta, como a `crewHistory`, e entram na exportação RGPD.

**FEITO — app:**
- **`App.js`:** `companyHistory`, `baseHistory`, `companyAt`, `aeAt` e `homeBaseAt` no contexto. `base` passa a
  ser a base em vigor hoje. O repouso de cada serviço gravado usa a base desse dia.
- **Cada ecrã usa o acordo, a companhia e a base do mês ou dia que mostra:**
  - Estatísticas (mês, ano, Auditoria e o nome da companhia no topo);
  - Escala (resumo, dia, códigos da grelha, hotel);
  - detalhe do serviço (€, Prova e hotel);
  - Extras;
  - folha do evento;
  - sino (resumo do mês);
  - Relatórios (disrupção e prova da promoção);
  - Disrupção;
  - formulário do serviço;
  - Simulação;
  - importação (base e € de cada dia);
  - hotéis.
- **Ecrãs:**
  - configuração em modo mudança com a pergunta "O que aconteceu?" e a data de entrada "Na TAP desde?" (com
    explicação easyJet/TAP e aviso se a data for antes da entrada na antiga);
  - Base no Perfil em 2 passos: a lista, com a atual marcada "atual", e "Porto, desde quando?" com "Mudei de base"
    (roda até ao mês atual, "Até … fica Lisboa", histórico) ou "Sempre foi esta";
  - o histórico da Categoria mostra só a companhia atual, por extenso;
  - "Na TAP desde" no Perfil mexe na fronteira das linhas.

**Verificado no PC:** 25 suites verdes · guardião sem dívida nova · pacote iOS.

**Fase 2, no mesmo dia (Nuno: "os três sim") — os limites que tinham ficado, também FEITOS:**
- **Frota com datas.** Vive no período da linha da categoria, como parte do posto:
  - `fleet` opcional;
  - uma promoção mantém a frota em vigor;
  - `yearStats`/`monthStats` usam a frota de cada mês;
  - os ecrãs usam `crewAt(data).fleet`;
  - Perfil → Frota no modelo da Categoria: cartões, "A partir de que mês?" e histórico.
  - Golden: piloto TAP OP3C, maio NB 202,50 + junho WB 225,00 = 427,50 (sem datas dava 450,00).
- **Vínculo com datas.** Vive no período da linha da companhia, porque faz parte da relação de trabalho:
  - `employment` opcional, `addEmploymentChange` e `coveredBy` (a regra do art. 496.º CT num só sítio);
  - o `aeAt` usa o vínculo de cada mês;
  - Perfil → Vínculo em 2 passos, como a Base: "Mudei de vínculo" ou "Sempre foi assim".
  - Golden: agência até 12/2024 → 2024 sem salário do AE; 2025 = 12×1346,57.
- **"Abrangido pelo AE" fica SEM datas.** Datar a filiação sindical é dado sensível (RGPD art. 9.º); vai para o
  pacote do advogado.
- **PDF da carreira.** O Percurso ganha três momentos novos:
  - "Entrada na TAP · categoria · Base Porto";
  - "Base Faro · transferência";
  - "Vínculo · contrato com a companhia".

  Também muda:
  - o "Início de serviço" mostra a companhia de então;
  - o fantasma do cabeçalho cobre a carreira toda;
  - o cabeçalho diz "Na companhia desde" depois de uma mudança;
  - a mudança de categoria do mês da entrada não aparece como promoção;
  - os nomes das categorias vêm do acordo de cada mês.

  Golden da carreira 45 → 60.
- **Verificado no PC:** 25 suites verdes (stats 161, FTL 316, AE 453, carreira 60) · guardião · pacote iOS.

**Falta:** iPhone (guião §0g). Não está no git (o Nuno pede quando quiser gravar).

---

## Sessão seguinte (dia 2) — a escala entra na configuração (ANTES da linha do tempo e da TAP, decisão do Nuno)

**Nuno (captura do Início vazio):** "falta esta parte da configuração". Ligar a escala acontecia depois das 6
perguntas, no Início, com o desenho antigo, e o rótulo "PRIVACID…" aparecia cortado.
- **Corrigido já:** a coluna do rótulo do Início tinha largura fixa de 70; passou a mínima.

**Esboço do 7.º passo:** `design/configuracao-escala.html` (https://claude.ai/artifact/PpoqP1hQTBuh24VWHwiVgk).
- O passo: título, 3 passos numerados e a linha do escudo; "Ligar ao calendário", "Importar o PDF" e "Agora não".
- A autorização do iPhone: proposta de frase nova, que fala dos limites e do salário.
- Escolher o calendário: a dica do eCrew vem ANTES; o calendário com serviços fica "sugerido".
- A escala encontrada: o número grande, a divisão por tipo e os voos sem rota; "Guardar a escala" e "Rever um a um".

Nada se grava sem confirmar. **APROVADO (Nuno):** os 4 ecrãs e o "sugerido".

**FEITO no código:**
- **`OnboardingScreen` tem a fase "escala" depois das perguntas, na mesma Porta:**
  - "Liga a tua escala" → autorização → escolher o calendário, com o sugerido contado → a escala encontrada →
    "Guardar a escala";
  - o perfil grava-se no fim das perguntas e só se entra na app no fim do passo 7 (ou com "Agora não");
  - "Guardar a escala" grava só o NOVO e PRONTO, mais férias e doença;
  - voos por corrigir, conflitos e cancelados ficam para "Rever um a um", que é a folha de sempre;
  - em "mudar de companhia" com calendário ligado, o passo salta-se.
- **Motor partilhado, sem cópias:**
  - `data/rosterRead.js`: janela, leitura e contagem;
  - `candidateKind` em `data/rosterImport.js`, golden +6;
  - a `RosterImportSheet` passou a usar os dois.
- **Correções de verdade:**
  - o esboço dizia que voos sem rota "entram e contam para os limites" — FALSO: ficam de fora até corrigir, e
    assim fica;
  - a frase do iPhone e a folha da Escala diziam "Nada sai do telemóvel", mas a escala sincroniza com a conta
    (tabela `duties`). Agora: "lê a tua escala… para calcular os limites e o salário" e "Lido no telemóvel".

**Verificado no PC:** testes (FTL golden 313) · pacote iOS · guardião; a configuração continua a zero.
**Mais 3 frases falsas corrigidas** (pergunta do Nuno):
- no Início sem escala, duas vezes, "Os teus dados ficam no teu telemóvel" → "O calendário é lido no teu telemóvel";
  a explicação passa a dizer que a escala fica na tua conta;
- na folha do PDF, "Nada sai do dispositivo" → "o ficheiro nunca sai do dispositivo".

"Guardado só no teu telemóvel" nos hotéis é VERDADE (só armazenamento local) e fica. A declaração à Apple foi para
`docs/dev-build.md`. **Regra:** nunca prometer "nada sai do telemóvel"; o que é verdade é que o calendário é LIDO no
telemóvel e os cálculos são feitos lá.
**Falta:** iPhone (guião §0f, com calendário de teste sintético).

---

## PRÓXIMA SESSÃO (Nuno: "amanhã, junto com a TAP") — ler isto primeiro

**1. Linha do tempo do contrato — ✅ FEITA (ver "dia 3", em cima). Fica aqui a proposta original, como registo.**
- **Problema:** só a categoria e o contrato têm linha do tempo (`crewHistory`, `crewAt(ym)`, 7 sítios). A companhia e a
  base valem o valor de hoje para todos os meses. Mudar de companhia faz os meses antigos serem calculados com o AE
  novo, e uma transferência de base mexe nas ajudas de custo, na Auditoria e no "fora da base" dos meses antigos. As
  pernoitas já gravadas por serviço estão a salvo.
- **Proposta:**
  - cada período de `crewHistory` passa a ter também `company`, `crewType` e `base` (os antigos herdam os atuais);
  - `aeAt(ym)` e `baseAt(ym)`; ~12 ficheiros que calculam dinheiro passam de `ae` para "o AE do mês".
- **Ecrãs:**
  - "Mudar de companhia" pergunta primeiro "Mudaste ou é correção?". Mudei = período novo a partir da data de entrada
    na nova companhia; correção = substitui tudo.
  - A base ganha "a partir de que mês?", com "sempre foi esta".
- **Golden-first:**
  - maio/2025 easyJet + maio/2026 TAP → o AE certo em cada mês;
  - transferência LIS→OPO em março não mexe em fevereiro.
- **Decisões do Nuno:** (1) o modelo; (2) a pergunta mudança/correção e a base com mês.

**2. Limites de escala do AE da TAP** — `docs/ae-tap-limites.md`: 69 regras de pilotos e 61 de cabine; as 12 decisões
D1–D12 estão resumidas no chat de 2026-11-03, com as minhas recomendações. Construir por cima da linha do tempo (os
limites dependem da companhia de cada mês).

**Ordem proposta:** linha do tempo (golden) → TAP v1 (as ~23 regras com os dados que já temos). Modelo: é arquitetura
de dados — o método pede Fable 5.1 Alto para arquitetura, ou Opus 5.5 Extra se for tratado como construção; dizer ao
Nuno ao abrir a sessão.

**Por ver no iPhone (de 2026-11-03):** §0c configuração · §0d hora-limite de calços e palavras · §0e Perfil e Família ·
§0f escala na configuração · §0g linha do tempo do contrato.
**A seguir:** limites de escala da TAP (D1–D12 por decidir), construídos com o `aeAt(mês)` da linha do tempo.

---

## 2026-11-03 — Perfil (índice em grupos) + limites de escala do AE da TAP (levantamento)

**Perfil — escolhida a opção 1 (Nuno): índice em grupos.**
- Identidade em cima.
- Grupos de linhas, cada uma com o valor atual: O teu trabalho · Acordo e serviço · Família · Ferramentas · Conta e
  segurança · Terminar sessão.
- Cada linha abre uma página à Flighty: título, explicação e os cartões da configuração, ou uma escolha rápida.
- Os diálogos "Segurança" e "Idioma & avisos" passam a linhas à vista.

Referências em `referencias/perfil/` e no Mobbin. **Esboço:** `design/perfil-v3.html`
(https://claude.ai/artifact/BrG9V5yDBHXccp8gyiYZxL).
**APROVADO (Nuno):** o índice, as 2 páginas-modelo e "Mudar de companhia" (reabre a configuração).

**FEITO no código:**
- **`SettingsScreen` = índice:**
  - `Linha`: ícone · rótulo · valor · ›;
  - saíram os mosaicos, as linhas com interruptores e os diálogos de categoria, contrato, base, data, "Segurança" e
    "Idioma & avisos";
  - ficaram as janelas de conta, que funcionam: e-mail, palavra-passe, apagar, terminar sessão e família.
- **`PerfilPaginaScreen` (rota `PerfilPagina`, 13 páginas):**
  - categoria e contrato: cartões + mês da promoção + Guardar;
  - antiguidade: roda + Guardar (o título deixou de dizer "na easyJet" a toda a gente);
  - base com pesquisa;
  - pós-voo em escolha rápida, com a fonte à vista;
  - férias com contador;
  - frota, PPY, instrutor, vínculo, abrangido, idioma, lembretes e bloqueio em cartões que gravam.
- **`hooks/usePerfilActions`:** as gravações de sempre, partilhadas.
- **`components/OptCard`:** o cartão da configuração, agora partilhado.
- **`components/Pagina`.**
- **`MonthYearWheel`:** `monthsAhead` (uma promoção pode estar marcada até 12 meses à frente).
- **Mudar de companhia:**
  - a configuração em modo mudança, com "Cancelar" no canto;
  - as respostas juntam-se ao perfil;
  - sem boas-vindas repetidas;
  - histórico de categoria NOVO — sem isto, o histórico da companhia antiga continuava a mandar.

**Verificado no PC:** testes · pacote iOS · guardião: dívida 284→278 tipo, 590→569 espaço, 105→100 cores; páginas,
hook e componentes a zero; o Perfil desceu (espaço 49→28).
**Fase 2 FEITA (Nuno, mesmo dia): página da Família** (`screens/FamiliaScreen`, rota `Familia`):
- uma pessoa por linha, com a última partilha;
- "Adicionar pessoa" no fundo;
- aviso no dia de voo;
- as janelas (partilhar um voo, registo, remover) e o cartão de envio vieram do Perfil com a lógica intacta;
- "Partilhar um voo" passou a ser o botão principal da app;
- no Perfil fica a linha "Chegada ao vivo", com o número de pessoas.

O Perfil passou de 1068 para 499 linhas. Dívida 278→275 tipo, 569→552 espaço, 100→96 cores; Família a zero.
**Falta:** iPhone (guião §0e). **A seguir (Nuno):** datas da companhia (effective-dating); TAP amanhã.
**Limitação conhecida (para depois):** a companhia não é effective-dated — ao mudar de companhia, os meses antigos
passam a ser calculados com o AE da companhia nova.

**Limites de escala do AE da TAP — levantamento FEITO:** `docs/ae-tap-limites.md`.
- 69 regras de pilotos e 61 de cabine, cada uma com a cláusula, a citação, o valor, a comparação com a EASA e um caso
  para teste golden. Quase tudo está no RUPT.
- Conferido por mim no texto oficial: pilotos 111 folgas/ano e 90/270/850 h de voo; cabine 13 h de repouso na base e
  285/900 h.
- O AE é mais restritivo que a EASA em quase tudo, mas mais permissivo em algumas tabelas de PSV (longo curso), por
  isso o motor tem de aplicar o mais apertado dos dois.
- O texto oficial tem gralhas e contradições (D5). Os dois AE vigoram até 31/12/2026.
- 12 pontos de decisão, D1–D12, no fim do documento.

**Próximo:** o Nuno decide os D1–D12 (resumo no chat). A construção (golden-first) fica para uma sessão própria.

---

## 2026-11-03 — Análise da concorrência (cálculos e apresentação)

**Análise em `docs/concorrencia-calculos.md`**, com fontes.

**Concorrentes diretos em Portugal, os dois só para a TAP:**
- **Roster Mate:** FTL + limites do AE da TAP + ajudas de custo; marca "legal/aviso/ilegal"; 5,99 €/mês.
- **FTLmate:** FTL + TAP-SPAC 2023, sem salário.

O SPAC e o SNPVAC não têm calculadora. Nenhuma app tem o AE da easyJet, da Ryanair ou da Hi Fly.

**Estamos à frente em:**
- 4 AE com a cláusula de cada número;
- tabelas datadas e tempo parcial;
- Auditoria do mês;
- 100/900/1000 h e horários disruptivos;
- escala automática e atrasos ao vivo.

**Lacunas, por prioridade:**
1. hora-limite de calços ("aterrar até às");
2. as palavras "Legal / Não legal / Ilegal" (Simulação, chip do Início), incoerentes com "a app estima, nunca declara
   legalidade";
3. aviso na Prova de que o esquema aprovado da companhia prevalece;
4. limites de escala do AE, começando pela TAP;
5. líquido estimado;
6. comparar com o recibo (v1.1).

**Decidido (Nuno): os pontos 1, 2 e 3 primeiro — FEITOS no mesmo dia:**
1. **Hora-limite de calços** = apresentação + PSV máximo efetivo, na mesma hora de relógio da apresentação, com "+1"
   se passa da meia-noite. A discrição não entra (é para imprevistos, 205 f).
   - **Golden-first:** 5 asserções novas no `ftl-golden` (06:00 → 19:00 · 18:00 → 05:00 +1 · sem apresentação →
     sem hora), escritas e a falhar antes do motor.
   - `computeDuty` devolve `latestOnBlock*`; `dutyToFtlDay` guarda-a no dia.
   - Aparece no detalhe do serviço ("Calços até às"), no chip do Início ("Calços até · 19:00"), na resposta
     "Dentro dos limites?" e na Simulação.
2. **Sem "legal/ilegal" como veredicto:**
   - "Estou legal?" → "Dentro dos limites?";
   - chip "Legal/Ilegal" → "Calços até" / "Limites · Dentro/Excede";
   - chip "Limite" → "Margem";
   - Simulação "Legal/Não legal" → "Dentro/Excede";
   - boas-vindas "A legalidade, calculada" → "Os limites, calculados";
   - mensagens do motor "Ilegal — acima…" → "Excede…";
   - formulário (discrição) e Validades reescritos.

   Ficam os termos da lei ("mínimo legal", "registo legal", "limite legal" da radiação, "base legal").
3. **Prova:** as provas FTL universais (PSV, repouso, limites, standby) mostram "O esquema da tua companhia prevalece"
   (OM-A, cap. 7). A radiação e as provas do AE não. Testado no `prova.test` (+6 asserções).

Verificado no PC: `npm test` verde · pacote iOS gera · guardião sem dívida nova. **Falta:** iPhone (guião §0d).
**Commit `1033b8a`.** **Próximo da lista:** limites de escala do AE (TAP primeiro). Em curso: um agente extrai as
cláusulas dos 2 AE da TAP (SPAC 2023, SNPVAC 2024); cada cláusula é conferida no texto oficial antes de entrar.

**Boas-vindas na Porta (Nuno, captura do iPhone):**
- O ecrã de boas-vindas ainda tinha o desenho antigo:
  - a marca ficava por baixo do relógio;
  - título em maiúsculas de 40 e botão feito à mão;
  - números 01–04 a amarelo sobre papel (1,7:1);
  - "ao CrewPact" e "Per-diems".
- Passou para a `Porta`, com o mesmo conteúdo aprovado:
  - "Bem-vindo, <nome>";
  - 4 linhas com ícones da casa;
  - `PrimaryButton` "Começar";
  - fade pelo driver JS.
- Dívida a zero no ficheiro. A captura mostrava também o texto antigo ("A legalidade, calculada"): o iPhone tinha um
  pacote antigo, por isso é preciso fazer Reload no Expo Go antes de testar.

---

## 2026-11-03 — Configuração (onboarding) na Porta

**Escolhida a opção 3 (Nuno): "toca e avança".** Cartões de opção com círculo vazio; tocar mostra o visto amarelo e, um
instante depois, passa à pergunta seguinte. Só a antiguidade tem botão ("Entrar").
**Detalhes recomendados:**
- progresso "Configuração · 2 de 6" + barra amarela na faixa de tinta;
- "Sair" no canto da faixa;
- títulos Barlow 30 sem maiúsculas;
- base com pesquisa e nomes em português (hoje "Lisbon");
- sem bandeiras emoji;
- antiguidade numa roda de mês e ano, feita por nós (a do iOS não tem "só mês e ano").

Referências em `referencias/onboarding/` e na coleção do Mobbin.
**Esboço:** `design/onboarding-v2.html` (https://claude.ai/artifact/9UAXxoN7JcW6cciqgxEk6D).
**Achado RGPD:** perguntar "és sócio de um sindicato?" = recolher filiação sindical (art. 9.º, dado sensível). Como a
licença serve sócios e não-sócios, a edição pode vir do tipo de tripulante (piloto → SPAC · cabine → SNPVAC), sem
pergunta. **Para o advogado** ("vamos ao advogado").
**APROVADO (Nuno).** SPAC = pilotos · SNPVAC = cabine (confirmado; o código já os separa assim: `easyjetSpac`/`tapSpac`
· `easyjetSnpvac`/`tapSnpvac`). Sindicato fora da configuração: a edição sairá do tipo de tripulante.

**FEITO no código:**
- **`OnboardingScreen` sobre a `Porta`:**
  - toca e avança (280 ms para se ver o visto);
  - cartões com círculo vazio;
  - ‹ com a escolha marcada;
  - na última pergunta, tocar grava e entra;
  - mudar de companhia limpa categoria, contrato, frota e base.
- **`Porta`:**
  - `progress` mostra "Configuração · 2 de 6" + barra amarela;
  - `stepKey` volta a folha ao topo a cada pergunta.
- **`components/MonthYearWheel.js`:**
  - mês e ano, nunca no futuro;
  - o valor só nasce quando a pessoa mexe;
  - o VoiceOver ajusta-a deslizando para cima e para baixo.
- **`baseCityName` em `data/countries.js`:** 26 cidades das bases em português.
- Contratos sem o código repetido no nome; bandeiras emoji fora.
- Gravação do perfil igual (caminho auditado).

**Verificado no PC:** `npm test` verde · pacote iOS gera · dívida 300→289 tipo, 610→598 espaço; configuração, roda e
Porta a zero.
**Falta:** iPhone (guião §0c, precisa de uma conta nova).

---

## 2026-11-02 — Layout do sistema de entrada (Mobbin + Flighty)

**Commit `6f068dc`** (login por código + prova de posse + DS 2.0 + Início + papéis da cor), antes de mexer no layout.
**Problemas medidos (6 ecrãs: Login, Conta criada, Face ID, Bloqueio, Reativar, OTP):**
- 3 formas de botão e 3 estilos de título;
- o alinhamento salta entre centro e esquerda;
- voltar é um link no meio do ecrã e o botão principal fica a meio (os dois contra o §10);
- a marca repete-se em cada passo;
- ícones dentro dos campos;
- 21 tamanhos de letra e 47 espaços fora da escala;
- o código não entra sozinho;
- o bloqueio só aceita a palavra-passe (não serve contas só-código).

**Flighty:** não tem login. Padrões tirados: e-mail em letra grande, linha do escudo, botão apagado até o e-mail estar certo.
**Escolhida a A (Nuno), passos limpos:** ‹ à esquerda, título Barlow 30 à esquerda, botão largo no fundo, código entra
sozinho, "Abrir o Mail". Referências em `referencias/login/` e na coleção do Mobbin.
**Nuno pediu também ver A+B.** A B "céu à Flighty" bate na recusa de julho (céu a ecrã inteiro no Início: mata o
tinta e amarelo, contraste variável, decoração). Por isso a A+B do esboço usa a **placa de tinta** + folha de papel.
**Esboço:** `design/login-v4.html` (https://claude.ai/artifact/5QoSNGwZf8WHWrhmaaxXgx).
**DECIDIDO (Nuno, "avança"): A+B + código entra sozinho.** Regra: a placa só existe **antes da app** (ecrã com
barra de abas nunca leva placa); dentro da folha manda o esqueleto da A, que é o da app toda (§10).

**FEITO no código:**
- **`components/Porta.js`:** placa `half`/`tall`/`band` + folha + ‹ + `footer`. A placa encolhe com o teclado (sem
  animar com os movimentos reduzidos) e a barra de estado fica branca. Exporta `portaTxt` (título, texto, rótulo,
  erro, ligação).
- **Login (7 vistas):**
  - na Porta;
  - e-mail grande + linha do escudo + Continuar apagado até o e-mail estar certo;
  - os 2 códigos entram sozinhos (código errado: abana e limpa);
  - "Abrir o Mail" (iOS);
  - rótulos por cima dos campos, sem ícones;
  - o "esqueci-me" leva o e-mail já escrito.
- **Bloqueio:** placa alta, "Sair da conta" no canto. A saída aceita palavra-passe OU código (`ProofField` +
  `proveOwnership`); antes não servia contas só-código.
- **Face ID:** símbolo a amarelo na placa, "Ligar o Face ID".
- **Reativar:** selo com a data, "Manter a minha conta".
- **Conta criada:** ícone da casa.
- **Botões:** `PrimaryButton` e `GhostButton` ganharam `glyph` (ícones da casa).
- **`OTPInput`:** caixas a toda a largura, 56 de altura (vale também no Perfil).
- **Texto corrigido:** "código de 8 dígitos" → 6.

**Verificado no PC:**
- `npm test` verde;
- pacote iOS gera;
- dívida de design 320→300 tipo, 652→610 espaço, Ionicons 14→10; os 6 ecrãs da entrada a zero (o login guarda só os
  logótipos Google/Apple).

**Falta:** iPhone (guião §0b) · onboarding na mesma Porta (próximo).
**1.º teste no iPhone (Nuno, captura):** ao passar do e-mail para o código, a folha ficava branca e depois o conteúdo
aparecia 28 pt à direita, com as caixas a sair do ecrã. Causa: a `LayoutAnimation` da placa, na arquitetura nova do
iOS, repunha o valor inicial da transição nativa entre passos (28 pt e transparente). Correção: a placa anima pelo
`Animated` (JS), e a transição do login e o véu do bloqueio passaram ao driver JS. O abanar do login passou a respeitar
os movimentos reduzidos. Testes ✓ · pacote iOS ✓. **Regra:** nunca `LayoutAnimation` num ecrã com animações nativas
de transparência ou posição. **Confirmado no iPhone (Nuno): corrigido ✓.**
**Commit `cc4fce2`.** **iPhone (Nuno) ✓:** a placa encolhe e cresce com o teclado · o código entra sozinho · "Abrir o
Mail" · bloqueio com "palavra-passe ou um código". **Próximo: onboarding na Porta** (referências do Mobbin primeiro).

---

## 2026-11-02 — Passo 2 das edições (papéis da cor) + revisão do login

**Ícones: em pausa** (decisão do Nuno). Ficam no quadro `design/icone-direcoes.html` (preferência: Amanhecer; o gosto dele
pende para o plano nas cores da app). Retomar depois das conversas com os sindicatos.

**Passo 2 FEITO — a cor de marca tem PAPÉIS (`BRAND` em `data/constants.js`):** `signal` (50 usos) · `onDark` (28) ·
`marker` (11) · `action` (1, fundo do botão principal). Na base todos valem o amarelo de hoje (e `action` a tinta) →
nada visível mudou. Incluídos os 3 PDFs (careerRecord · disruption · ftlRecord) e o catálogo da Biblioteca. Valores de
referência das edições SNPVAC/SPAC comentados ao lado. Guardião: **regra dura** — `PELE.yellow`/`#FFB800` fora do
`constants.js` falha (screens · components · data · hooks); `amareloTexto` 7 → 5 (moeda do Perfil e avatar passaram a
`onDark`, legítimos). Verificado: `npm test` verde · pacote iOS gera · imports todos presentes · regra provada.

**Revisão do login (análise; nada mudado):** bem feito — autofill completo (porta-chaves, palavra-passe forte, código do
Mail), código de 6 dígitos com cooldown, política NIST, sessão no SecureStore + PKCE, re-auth, apagar conta com graça.
Falta/desatualizado: Apple e Google desenhados mas DESLIGADOS com "brevemente" (controlos mortos no 1.º ecrã) · sem
passkeys (Supabase em beta desde 28/05/2026; `react-native-passkeys` exige dev build) · sem Associated Domains
(`webcredentials:crewpact.app` — passkeys, palavras-passe ligadas ao site, links universais) · login e criar conta
separados (as melhores apps: um campo de e-mail + Continuar) · proteção de palavras-passe vazadas (dashboard, plano pago).
**Decidido (Nuno "sim avança"):** avança a parte do Expo Go. FEITO: os botões Apple/Google "brevemente" deixaram de
aparecer (`SOCIAL_ENABLED` continua a ser o interruptor para o dev build). ESBOÇO publicado `design/login-v3.html`: um
campo de e-mail + Continuar → código de 6 dígitos para entrar E criar conta (sem dizer se o e-mail existe — evita
descobrir quem usa a app) · conta nova pede nome/apelido e segue para as 6 perguntas · palavra-passe como alternativa.
**APROVADO pelo Nuno, código primeiro — FEITO no código:** `data/auth.js` ganhou `requestEmailCode` · `verifyEmailCode`
(tipo 'email', com recurso a 'signup' para contas novas com confirmação) · `saveName`; saíram `register` · `verifySignupCode`
· `resendSignup`. `LoginScreen` abre na vista 'entry' (e-mail → CONTINUAR) → 'emailCode' (6 dígitos, reenviar aos 60 s) →
conta nova → 'name' → "Conta criada" → onboarding; o login com palavra-passe ficou como alternativa ('login'), e os
links de "criar conta" passaram a "entrar com um código". Termos aceites na entrada. Mensagem nova "aguarda um minuto".
Modelo `supabase/email-magic-link.html`. Verificado no PC: testes · pacote iOS · sintaxe · imports.
**Falta (Nuno):** colar o modelo "Magic Link" no dashboard · confirmar limites de envio (Supabase + Resend) · testar no
iPhone (`docs/verificacao-device.md` §0). **Pendência nova:** os 4 modelos de e-mail ainda têm o cabeçalho azul do tema
antigo — passá-los à pele de uma vez.
**Resolvido na mesma sessão — prova de posse por código:** apagar conta, mudar e-mail e mudar palavra-passe exigiam a
palavra-passe atual → contas criadas só por código ficavam SEM conseguir apagar a conta (a Apple exige-o dentro da app).
Novo `components/ProofField.js` (palavra-passe OU "Não tens palavra-passe? Confirmar com um código") + `proveOwnership`
em `data/auth.js`, nos 3 diálogos do Perfil. Contas só com código CRIAM a palavra-passe no "Mudar palavra-passe".
Verificado no PC: testes · pacote iOS · sintaxe · imports · guardião.
**Limites da Supabase vistos (captura do Nuno, 2026-11-02):** e-mails 30/h (projeto todo) · intervalo por pessoa 60 s
(= cooldown da app) · verificações 30/5 min por IP · entradas 30/5 min por IP · refresh 150/5 min. Campos editáveis →
SMTP próprio (Resend) ligado. Público: confirmação de e-mail LIGADA, registos permitidos. **Antes do lançamento:**
e-mails/h para centenas · entradas por IP acima de 30/5 min (salas e Wi-Fi partilhados) · Resend pago (o grátis pára
aos 100/dia). **Modelo "Magic Link" colado no dashboard pelo Nuno (2026-11-02).** Falta só o teste no iPhone (guião §0).
**1.º teste no iPhone:** o código não aparecia sugerido por cima do teclado e o toque longo nas caixas não dava "Colar".
Causas: (1) o campo invisível do `OTPInput` tinha `opacity: 0` → o iOS ignora toques em vistas com alpha < 0.01 (o
toque longo nunca chegava) — agora o campo é opaco e o TEXTO é transparente, com altura explícita; (2) teclado
`numeric` (decimal) → `number-pad`; (3) o assunto sugerido do "Magic Link" não tinha "código"/"code" — o iPhone
reconhece o e-mail por aí. Modelos "Magic Link" e "Confirm signup" ganharam o código também numa frase. **Nuno:**
voltar a colar os 2 modelos + pôr o assunto "O teu código CrewPact: {{ .Token }} · Your CrewPact code".
**Confirmado no iPhone (Nuno):** conta existente + código escrito à mão → ENTRA ✓ (o `verifyEmailCode` funciona). Por
confirmar depois da correção: sugestão "Do Mail" e "Colar"; conta nova; apagar conta só-código.
**2.º teste no iPhone — 2 erros meus, corrigidos:** (1) ecrã vermelho "setDelPw doesn't exist" ao tocar em Apagar conta —
restou uma chamada antiga (a procura não apanhou o D maiúsculo); (2) "Palavra-passe é obrigatória" no Mudar
palavra-passe em modo código — era a palavra-passe NOVA em falta; os exemplos "••••••••" pareciam já preenchidos. Agora:
exemplos com texto ("nova palavra-passe" · "repete a nova" · "a tua palavra-passe atual") e mensagens que dizem o que falta.
O código foi aceite (as 6 caixas encheram). **Guardião ganhou regra dura:** nenhum nome usado sem estar definido (apanha
exatamente este tipo de ecrã vermelho, que o pacote não apanha).
**Confirmado no iPhone (Nuno):** sugestão "Do Mail" e "Colar" no código funcionam ✓. Falta: conta nova · apagar
conta só-código · mudar palavra-passe por código (depois das correções).
**LOGIN FECHADO no iPhone (Nuno, 2026-11-02):** conta nova (e-mail → código → nome → "Conta criada" → 6 perguntas →
Face ID → Início) ✓ · mudar palavra-passe por código ✓ · apagar conta só-código ✓ (sem ecrã vermelho). Ficam para a
verificação completa (§0 do guião, não bloqueiam): reenviar aos 60 s · código errado · entrar com palavra-passe ·
mudar e-mail por código. **Próximo: onboarding** (depois o tema por edição e a app toda, ecrã a ecrã).
**SMTP visto (captura, 2026-11-02):** ligado · `noreply@crewpact.app` "CrewPact" · smtp.resend.com:465 · user `resend` ✓.
DNS: DKIM do Resend ✓ · SPF em send.crewpact.app ✓ · DMARC `p=none` (apertar depois do lançamento) · MX de crewpact.app =
encaminhamento Cloudflare (dá para criar suporte@/privacidade@ sem caixas pagas). **Para as leis:** o Resend envia da
região **eu-west-1 (Irlanda, UE)** — preenche o placeholder da região do subcontratante na Política de Privacidade.

---

## 2026-11-02 — DECISÃO: uma app, licenciada ao SPAC e ao SNPVAC

**Decidido pelo Nuno:** a app fica dele e **licencia-se** (não se vende) aos dois sindicatos — uma só app, edição por
sindicato (pilotos = SPAC, cabine = SNPVAC, escolha confirmada no onboarding; "nenhum" = edição base). Razões: um só
código/manutenção (AE já modelados por sindicato, FTL universal), os sindicatos não competem (segmentos diferentes),
serve não-sócios, tripulação inteira na mesma app. App própria de um sindicato só como extra pago, a partir do mesmo
código e na conta de programador DESSE sindicato (App Store 4.2.6). Ao advogado: responsável pelos dados = Nuno
(sindicatos não veem dados individuais); contrato de licença; números com marca do sindicato.
**Nome: FICA CrewPact** (decisão do Nuno, 2026-11-02). Verificado: nenhuma app com o nome (App Store PT/EUA/RU), nenhum
produto/empresa na web; `crewpact.app` é teu; `crewpact.com` é de terceiros e está à venda (Afternic); `.pt`/`.eu` parecem
livres. A fazer: pesquisa de marca INPI + EUIPO · reservar o nome na App Store Connect · registar `.pt`/`.eu`.
**Ícone REABERTO:** o Nuno não gosta do aprovado em julho (letra C + sublinhado). Novas direções em `design/icone-direcoes.html`.

---

## 2026-11-02 — Cores do SNPVAC? (estudo, decisão em aberto)

**Contexto (Nuno):** a app é, em princípio, para vender ao SNPVAC; pensar em usar as cores deles.
**Medido:** a cor do SNPVAC é **`#005EB8` azul-cobalto** (logótipo monocromático + 195 usos no CSS do site oficial),
NÃO azul-céu. Comporta-se ao contrário do nosso amarelo: texto sobre papel 6,38 ✓ · branco sobre ela 6,38 ✓ ·
mas tinta sobre ela 2,89 ✗ (marcador) · sobre a noite 2,92 ✗ · sobre placa preta 2,89 ✗.
**Estudo:** `design/snpvac-cores.html` (ficheiro LOCAL — marca de terceiros, não publicar). Três caminhos:
hoje · azul em tudo (falha 3 papéis) · **edição parceira (recomendada):** a pele CrewPact fica; o cobalto marca o que
se toca (botão, links, aba, ＋, barras); tinta clara `#C7DCEF` como marcador (13,08); `#6FAAE3` no escuro (7,57).
**Antes de decidir:** a app serve pilotos (SPAC) · com a marca do SNPVAC os números passam a ler-se como a palavra
do sindicato (→ advogado) · uso da marca exige autorização escrita · preparar o código: papéis de cor com nome
(86 usos do amarelo em 36 ficheiros) + 105 cores soltas.
**Achado à parte:** a cor das notificações no `app.json` é `#F5402C` (vermelho fora do tema) — corrigir.

**Evolução (Nuno: "fazemos o SPAC e o SNPVAC"):** SPAC = **`#0097D4` celeste** (+ marinho `#19232D`; logótipo com cruz
vermelha). Celeste: branco sobre ele 3,29 ✗ → no que se toca usa `#0077A8` (5,00); no escuro o original serve (5,66);
marcador `#C7E8F6` (14,30). Os dois azuis entre si = 1,94 (parecem o mesmo). **Recomendação:** login NEUTRO CrewPact
(Slack/Navan/Granola/Instacart Business não pintam o login) com uma linha "Em parceria com SNPVAC · SPAC" no fundo
(à Air NZ "A Star Alliance member"); a edição vem do SINDICATO (pergunta no onboarding, sugerida pelo tipo, "nenhum" =
CrewPact), não do tipo de tripulante. Esboço local `design/edicoes-sindicatos.html`. Pendente: autorização escrita dos
dois sindicatos, advogado, prova de pertença (código/n.º de sócio).

---

## 2026-11-02 (madrugada) — Início em folga passado para o código

**O Nuno aprovou o esboço** e entregou as três escolhas ao critério das melhores apps:
- **Sem nada marcado → sem fantasma** (o Flighty vazio mostra só duas linhas e a ação; nada decorativo).
- **Rótulo lateral sai do Início** (nenhuma app de referência roda texto; a data passou para o topo). Nos outros ecrãs
  sai na migração de cada um (design-system §2); onde é selo funcional (Simulação, exemplo) vira rótulo visível.
- **"OK" → "Em dia"** (palavra de estado concreta, como o "On Time" do Flighty) — escala e validades.

**Feito no código (`screens/HomeScreen.js`, `screens/hojeItems.js`):**
- Linha do topo: data legível + tempo (todos os estados; o tempo em folga/pernoita/férias). O brilho motivado do
  sistema de luz passou a nascer do tempo no topo (`TUNE.haloMot`).
- Saíram de TODOS os estados: o rótulo lateral, a seta/ícone amarelo do canto, o emoji da lua.
- Ênfase dos kicks a tinta em todos os estados (o amarelo sobre papel falhava a 1,73).
- Folga: fantasma = dias até ao próximo serviço + kick legível + linha com data/report/rota; sem nada = sem fantasma.
- Folga: estado em colunas rótulo + valor; "A seguir" à Flighty depois do dinheiro (absorve o cartão preto);
  atalho "Abrir a Escala" quando não há nada.
- Linha do dinheiro (todos os estados que a têm): número a tinta com € cinzento; anel → barra que diz o que mede
  ("Dia 2 de 30" no mês, "62%" no PSV).
- Outros estados: a frase de estado passou a "Legal: Sim · Escala: Em dia" (pergunta + resposta).
- Verificado no PC: `npm test` verde · pacote iOS gera · imports todos presentes · contagem de dias certa nas
  mudanças de hora e na passagem de ano · guardião: dívida desceu (tipo −5, letra<11 −5, espaço −5, amarelo −1).

**Por ver no iPhone (NÃO testado):** a folga sem nada marcado (o teu caso), a folga com serviço (precisa de um serviço
importado), e os outros 14 estados — mexi no topo, no canto, nos kicks e na linha do dinheiro de todos. É a sessão
"testar os estados".

---

## 2026-11-02 (fim de noite) — Revisão do Início com Flighty e as apps "do dia"

**Pedido do Nuno:** corrigir o layout da app toda, guiada pelas melhores (Flighty no Mobbin + concorrência),
mantendo a Living Interface. Análise feita sobre uma captura do Início em folga (20:14).

**Medido:** amarelo `#FFB800` sobre papel = **1,73:1** (chumba em qualquer tamanho); tinta sobre amarelo 10,62;
cinzento 4,51. 11 estilos de texto amarelo em 8 ficheiros (8 apanhados pela métrica nova).

**Feito (aprovado: "faz o que propões"):**
- **Regra nova (design-system §2 e §6):** o amarelo nunca é texto nem ícone informativo sobre papel; dinheiro e
  números herói a tinta. Exceção legítima marcada `// sobre-tinta` (placa preta).
- **Guardião:** métrica `amareloTexto` na roquete (chão = 8). Métrica nova não conta como subida até ao próximo
  `--atualizar`.
- **Referências** do Início guardadas: Flighty (lista e faixa de estado), Gentler Streak, The Outsiders, Oura —
  coleção Mobbin + `referencias/inicio-folga/` + índice em `referencias/README.md`.
- **Esboço** `design/inicio-folga-v3.html` (publicado como página privada): Agora · Proposta com serviço ·
  Proposta sem nada marcado, 10 mudanças numeradas e o contraste medido.

**Concorrência:** RosterBuster, CrewLog, Wingman, DutySheet, CONNECT, BeCrew, Layvr — nenhuma no Mobbin; vendem
funções, não desenho. A referência visual certa é o Flighty + apps de saúde que mudam com o dia.

**À espera do Nuno (o código do Início NÃO mudou):**
1. Aprovar a direção do esboço para o Início em folga.
2. Sem nada marcado: fantasma = dia do mês, ou sem fantasma.
3. Rótulo lateral (PeleSide): fica a cinzento/tinta com a contagem, ou sai do Início.
4. Pequena mudança de texto proposta: o valor da escala "OK" passa a "Em dia".

---

## 2026-11-02 (noite) — Design System 2.0 (ramo `design-system-2`, por guardar no git)

**Porquê:** o Nuno sentia problemas de layout, espaçamento, tipografia e posição dos botões. Medido:
675 tamanhos de letra à mão (29 pela escala), 149 estilos abaixo de 11, 924 espaçamentos fora da escala,
105 cores soltas, ✕ em 4 tamanhos e 2 formas, cabeçalho de janela copiado à mão em 6 sítios. Causa: cada
mockup portado "à letra" com os seus números.

**Decisões (aprovadas pelo Nuno: "faz o que recomendas"):**
- **Regra dos mockups mudou:** o mockup manda na hierarquia e na disposição; os números vêm da escala.
- **Escala fechada** em `data/constants.js`: `TXT` (13 estilos de texto com nome), `SPACE` em grelha 2/4,
  `TYPE` com os números condensados, `ICON_BTN`, `SCALE`. Densidade da casa mantida (corpo 13).
- **Componentes canónicos:** `IconButton` (36 redondo, toque 44, rótulo obrigatório) e `SheetHeader`.
- **Regras de posição** escritas (design-system §10) e **folha contra página modal** (§11).
- **Reanimated** alinhado com a skill `animacoes`: o `Animated` core fica; o Reanimated entra para
  animações de layout e gestos, ecrã a ecrã (motion §2). A razão antiga (SDK 54) acabou.
- **Guardião** `npm run test:design` no `npm test` e no pre-push: regras duras + roquete da dívida.
- **Mobbin** como referência em cada ecrã do bloco C (escolha do Nuno, guardada em `referencias/`).

**Feito e verificado no PC:**
- 13 ficheiros migrados para `IconButton`/`SheetHeader` (todas as janelas e ecrãs com ✕ ou ‹ de navegação).
  O ‹ do `PeleHeader` passa a seguir o tema noturno. O ponto do rótulo passa a amarelo (o vermelho era
  decoração, contra §2). Formulário de serviço: o ‹ que fechava a janela passou a ✕; o ‹ dos passos só
  aparece quando há para onde voltar (antes havia dois fechos).
- 6 animações de layout passaram a respeitar os movimentos reduzidos (formulário de serviço, calculadora FTL).
- 23 mockups recusados movidos para `design/arquivo/` (índice em `design/README.md`).
- `npm test` verde (25 suites) · pacote iOS gera · verificador de imports apanhou 2 erros reais
  (`SheetHeader` em falta nos cartões de partilha) — corrigidos e a regra entrou no guardião.

**Por ver no iPhone (não testado):** os cabeçalhos das 6 janelas (calendário, importar, notificações,
partilha de voo, partilha do ano, Simulação e o Avançado), o ✕/‹ novos (36 redondo) em todos os ecrãs, o
formulário de serviço (passo 1 com ✕ à direita; passos sem ‹ quando não há para onde voltar).

**Decididas pelo Nuno ("está bem", 2026-11-02):** 1 → **A** (✕ à direita) · 2 → **opção 2** (Guardar largo no
fundo; já é o padrão da app, exceto Validades e formulário de evento, que migram no bloco C). Referências em
`referencias/README.md` e na coleção do Mobbin. Fica pendente só o ponto 3.

**Opções que foram apresentadas (Mobbin, 2026-11-02):**
1. **✕ das janelas:** A) título à esquerda, ✕ à direita — Alan, Polarsteps, Beside, pliability
   (**recomendado**, é o que a app já faz) · B) ✕ à esquerda — Tinder, ElevenLabs, Insight Timer.
2. **Guardar nos formulários:** 1) Cancelar à esquerda e Guardar à direita no topo — Fi (iOS clássico) ·
   2) ✕ em cima e Guardar largo no fundo, acima do teclado — AllTrails, Mindtrip, Hypelist
   (**recomendado**: ao alcance do polegar e igual ao `PrimaryButton`) · 3) Cancelar e Guardar lado a lado
   no fundo — Perplexity · 4) Guardar e Cancelar empilhados — Expedia, X.
3. **Exceção da grelha da Escala** (etiquetas a 8–9,5): decidir no device na migração da Escala.

**Próximo:** bloco B (contas) continua primeiro. Depois o bloco C já com a revisão e a migração por ecrã.

---

## 2026-11-02 (tarde) — Atualização para o SDK 58

**Porquê:** a Expo Go do iPhone atualizou para o SDK 58 e recusa projetos no 57 ("Project is incompatible").
Sem isto, nenhuma verificação no device era possível.

**Feito no ramo `sdk-58` (por guardar no git):** `npx expo install expo@^58.0.0 --fix`. RN 0.86→0.88.1 ·
React 19.3 · reanimated 4.7.1 · worklets 0.13.0 · gesture-handler 2→3.3 · view-shot 5→6.1.1 · screens 4.30.
- `expo-doctor` 20/20 ✅ · `npm test` verde (exit 0) ✅ · pacote iOS gera sem erros (`expo export`) ✅.
- Revisto contra as mudanças do SDK 58: nenhuma API removida está em uso (InteractionManager, Modal
  `animated`, deep imports); file-system já usa `/legacy` (continua exportado); notificações têm handler
  explícito; o stack v6 ainda encontra o `PanGestureHandler` no gesture-handler 3; o view-shot 6 continua
  em pontos no iOS → a correção dos 1080 px de setembro mantém-se.
- Os 22 pacotes atrasados do bloco A ficaram resolvidos com a atualização.

**1.º arranque no iPhone → ecrã vermelho:** "InteractionManager has been removed" no `@react-navigation/stack`
v6 (Card, em cada transição). A revisão tinha procurado só no código da app, não nas bibliotecas.
- **Correção (sem tocar em `node_modules`):** `metro.config.js` faz o `react-native` resolver para
  `shims/react-native-sem-interaction-manager.js` **só** dentro do `@react-navigation/stack`; a camada devolve
  um InteractionManager vazio, igual ao que a v7 faz (`InteractionManager?.`). Provado no pacote dev: o Card
  usa a camada, nenhum outro módulo a usa. `expo-doctor` 20/20.
- **Pendência nova:** migrar para @react-navigation v7 (stack 7.12 já protege isto) e apagar a camada.
  Não agora: a v7 muda o `navigate` entre abas e ecrãs empilhados (42 chamadas a rever) — fazer depois da
  verificação, numa sessão própria.
- Lição: numa subida de RN, procurar as APIs removidas também em `node_modules` (`grep -rl` sem o próprio RN).

**2.º arranque:** compila e carrega. Aviso do Metro: `data/auth.js` importava `expo-auth-session/build/QueryParams`,
caminho interno que o SDK 58 fechou. A função (15 linhas) passou para dentro do `auth.js`; provada igual à
original em 5 URLs de retorno OAuth. Sem outros imports internos na app.

**Smoke no iPhone (Expo Go 58): ✅ confirmado pelo Nuno.** Ramo `sdk-58` junto ao `main` (local, sem push).
A pasta `android/` gerada está desatualizada; regenera-se com `npx expo prebuild --clean` quando o
Android entrar.

---

## 2026-11-02 — Ponto de situação e plano de verificação

**Estado do código:** `main` limpo, último commit 2026-09-03 (SDK 57 oficial + auditoria de segurança
corrigida). `npm test` → 24 suites, 0 falhas (FTL 302 · AE 453 · pdfRoster 65 · stats 104 · rosterDiff 33 ·
capabilities 56 · export 24 · flightDetect 33 · zulu 12 · registo 9 · disrupção 42 · biblioteca 26 ·
vigência ok · flightStatus 51 · calendar 44 · validades 54 · meteo 17 · radiação 38 · prova 33 ·
auditoria 18 · carreira 45 · voz 50 · crewState 43).

**Decisões desta sessão:**
- Criados `CLAUDE.md` do projeto e este `docs/decisoes.md` (o projeto é anterior ao método; passa a segui-lo).
- **Dev build fica para o FIM.** Tudo o que depende de build nativo (Face ID real, PDF por ficheiro, voo ao
  vivo nativo, IAP, login social, widgets, Live Activities, Android) espera. Lista canónica: `docs/dev-build.md`.
- **Verificação do resto primeiro**, por blocos, no Expo Go. Plano mestre em `docs/05-verificacao.md`
  (bloco A feito do PC hoje; B–G no device/leis).
- **Não atualizar os 22 pacotes Expo** que o `expo-doctor` aponta antes de fechar o bloco B: o smoke do
  SDK 57 (2026-09-03) foi feito com as versões atuais.

**Medido hoje do PC:** Hi Fly `long_haul=true` ✅ (pendência 5 fechada); 4 Edge Functions no ar (401 sem
sessão) ✅; `crewpact.app/termos` e `/privacidade` respondem mas com placeholders (5 e 4) ⚠️; links EUR-Lex ok ✅.

**Pendências (fora do dev build), por ordem:**
1. **Device · contas e segurança** — `docs/verificacao-device.md` §1–§3: reset de palavra-passe (OTP +
   cooldown), apagar conta + graça 7 dias + reativação (conta DESCARTÁVEL), mudar e-mail (2 passos no
   dashboard primeiro). Servidor já verificado (Edges + cron no ar).
2. **Device · passeio fino de julho/setembro** — tudo o que foi construído sem ser visto no telemóvel:
   Simulação em poster · Prova (§ inline + ProvaSheet) · Auditoria do mês · Radiação cósmica · Relatórios
   (PDF 245, CSV, logbook de carreira) · SNC/RDP (DisrupcaoScreen) · morph da pílula na Escala · Desfazer
   (3 fluxos) · marcos na voz + primeiro alerta · sistema de luz no Início · hotéis v2.
3. **Device · "testar os estados"** — estados da Living Interface 1 a 1, afinações no bloco `TUNE`.
4. **Device · "testar o calendário"** — pipeline com eventos sintéticos (`docs/verificacao-calendario.md`).
5. **Dashboard Supabase** — Auth → Email: desligar "Secure email change" + colar `email-change-address.html`
   (antes do bloco B §3). ~~Hi Fly long_haul~~ confirmado 2026-11-02.
6. **Leis** — `legal/termos.html` e `legal/privacidade.html` prontos com 7 placeholders 【…】: entidade
   responsável, e-mails suporte@/privacidade@, data de publicação, remover "RASCUNHO". Depois advogado, depois publicar.
7. **Nome novo da app** — rebatismo planeado; o ícone final e o PNG esperam a decisão. Bundle ID não muda.
8. **Prateleira (não bloqueia):** relógio solar real no Início · reconciliação na auditoria (v1.1) ·
   Validades parada à espera de documentos reais · sino fase 3 · Radar (ideia A).

**Do método global (análise 2026-11-02), a acrescentar ao caminho:**
- Verificação ganhou 4 itens que o método pede às aplicações: quem vê o quê com duas contas, modo avião,
  permissões do telemóvel, cópias de segurança. Já no `05-verificacao.md`.
- **Revisão de fora antes das lojas:** beta com 2–3 tripulantes reais pelo TestFlight (lição do Hub: quem
  desenha não deve ser o único a aprovar). Fica para a fase do dev build.
- **Página curta de descoberta** (opcional): que problema a app resolve, para quem, como se mede. As fases
  1–3 completas não se fazem retroativamente.
- **Para o método v1.4:** a CrewPact é o 1.º projeto completo. Candidatos a entrar no caminho das
  aplicações: golden-first, portão `pre-push`, citar a fonte legal, ficheiro de errata.
- Testar num Android verdadeiro e num iPhone pequeno e grande fica no fim, com o dev build.

**Prova sem sessão (PC):** todas as tabelas com dados pessoais devolvem vazio à chave pública. Encontradas
2 tabelas órfãs na BD (`rest_periods`, `user_additional_roles`), sem código nem SQL no repo: decidir.

**Sem decisão ainda:** data de lançamento; se há CI (a Constituição §9 diz que o `pre-push` local não chega).
