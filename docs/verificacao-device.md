# Guião de verificação no device — o que construímos (2026-07-01)

Passo-a-passo para confirmar no telemóvel o que não dá para verificar no Windows. Tudo corre em
**Expo Go** (não precisa de dev build). Marca ✅/❌ em cada linha; se ❌, diz-me o quê.

## Arrancar
1. No PC: `npm start` (na pasta do projeto).
2. Telemóvel: abre o **Expo Go** → lê o QR code do terminal.
3. A app abre. Se crashar logo no arranque → copia o erro vermelho e manda.

---

## 0 · Entrada por código (login novo, 2026-11-02 — esboço `design/login-v3.html`)
_Antes: dashboard Supabase → Auth → Emails → Templates → colar `supabase/email-magic-link.html` em "Magic Link"
(o "Confirm signup" já tem o código). Usa e-mails de TESTE._
- [ ] O 1.º ecrã é só o e-mail + **CONTINUAR** (sem botões Apple/Google, sem "brevemente"); os Termos no fundo.
- [x] **Conta que já existe:** e-mail → código chega pelo Resend → **ENTRAR** → entra no Início ✓ (2026-11-02, código escrito à mão).
- [x] O iPhone sugere o código por cima do teclado ("Do Mail") e o toque longo nas caixas mostra "Colar" ✓ (2026-11-02, após a correção).
- [x] **E-mail novo:** e-mail → código → **"Bem-vindo à CrewPact"** pede nome e apelido → "Conta criada" com o
      nome → as 6 perguntas do onboarding → oferta do Face ID → Início com as boas-vindas ✓ (2026-11-02).
- [ ] Reenviar só fica ativo aos **60 s**; pedir antes dá "Aguarda um minuto antes de pedir outro código".
- [ ] Código errado → banner vermelho; "Email errado? Corrigir" volta à entrada com o e-mail escrito.
- [ ] **Entrar com palavra-passe** (na entrada e no código) → o login antigo, com o e-mail já preenchido;
      falhar a palavra-passe → "Sem conta ou sem palavra-passe? Entrar com um código".
- [ ] A app NUNCA diz "esse e-mail não tem conta".
- [x] **Conta criada só por código** (sem palavra-passe): Perfil → Segurança → Apagar conta / Mudar e-mail /
      Mudar palavra-passe → "Não tens palavra-passe? Confirmar com um código" → Enviar código → 6 dígitos → a ação
      continua. No "Mudar palavra-passe" isto CRIA a primeira palavra-passe. "Usar a palavra-passe" volta ao campo.
      ✓ 2026-11-02: **Mudar palavra-passe** e **Apagar conta** por código (sem ecrã vermelho). Falta: **Mudar e-mail** por código.

### 0b · Layout novo da entrada — a Porta (2026-11-02, esboço `design/login-v4.html`)
_Fecha a sessão (Perfil → Terminar sessão) para ver a entrada. Usa a conta de teste._
- [ ] **Entrada:** placa preta em cima com CREWPACT; folha branca por baixo com "Qual é o teu e-mail?", o e-mail
      em letra grande sem caixa, a linha do escudo verde e "Entrar com palavra-passe". A barra de cima (hora,
      bateria) aparece **branca** sobre a placa.
- [ ] O botão **Continuar** está apagado até o e-mail estar certo; acende sozinho quando fica certo.
- [x] Tocar no e-mail: o teclado sobe, a placa **encolhe para uma faixa** (CREWPACT pequeno) e o Continuar fica
      logo acima do teclado. Fechar o teclado: a placa volta a crescer, sem saltos. ✓ 2026-11-02
- [x] Passar do e-mail para o código: o conteúdo entra alinhado e as 6 caixas cabem (sem branco, sem 28 pt à
      direita) ✓ 2026-11-02, depois da correção da animação.
- [x] **Código:** ‹ em cima à esquerda; as 6 caixas ocupam a largura toda. Ao 6.º dígito aparece "A verificar…"
      e **entra sozinho** (sem botão Entrar). Código errado → abana, as caixas limpam-se e a mensagem fica por baixo.
- [x] **Abrir o Mail** (no fundo) abre a app Mail do iPhone. "Reenviar em 60 s" conta para baixo.
- [ ] **Conta nova:** "Como te chamas?" com os rótulos NOME e APELIDO por cima dos campos; sem ‹.
- [ ] **Entrar com palavra-passe:** ‹ volta à entrada; "Esqueci-me da palavra-passe" à direita, por baixo dos campos;
      palavra-passe errada → mensagem a vermelho + "Sem conta ou sem palavra-passe? Entrar com um código".
- [ ] **Esqueci-me:** o e-mail já vem escrito; o código entra sozinho; "Palavra-passe nova" com o medidor.
- [ ] **Face ID (conta nova, depois das 6 perguntas):** placa com o símbolo do Face ID a amarelo; "Ligar o Face ID"
      no fundo, "Agora não" por baixo. (No Expo Go o Face ID cai no código do telemóvel — normal.)
- [x] **Bloqueio** (com o bloqueio ligado, sai da app 1 min e volta): placa preta alta com a marca, "Sair da conta"
      no canto; "Desbloquear com Face ID" no fundo. **"Usar a palavra-passe ou um código"** → "Confirma que és tu"
      com palavra-passe OU "Confirmar com um código" → desbloqueia **sem** sair da conta. ✓ 2026-11-02 (Nuno)
- [ ] Com **Reduzir movimento** ligado (Definições → Acessibilidade → Movimento), a placa muda de tamanho sem animar.

### 0c · Configuração (onboarding) na Porta (2026-11-03, esboço `design/onboarding-v2.html`)
_Precisa de uma conta NOVA (e-mail de teste que nunca entrou): e-mail → código → nome → "Conta criada" → aqui._
- [ ] Faixa preta em cima com **"CONFIGURAÇÃO · 1 DE 6"** e a barra amarela; "Sair" no canto (termina a sessão).
- [ ] **Toca e avança:** tocar numa companhia mostra o visto amarelo e, um instante depois, passa à pergunta seguinte.
      A barra amarela cresce a cada pergunta.
- [ ] **‹** volta à pergunta anterior com a escolha ainda marcada; tocar outra vez nela avança.
- [ ] Piloto/cabine: dois cartões grandes; o escolhido ganha borda preta e visto, o outro esbate.
- [ ] Categoria e contrato com o código à esquerda; o contrato já não repete o código no nome ("Tempo inteiro").
- [ ] **Base:** pesquisa por cidade ou código ("lis", "porto", "bcn"); Portugal primeiro; nomes em português
      (Lisboa, Málaga, Genebra); Faro com "base sazonal"; sem bandeiras.
- [ ] **Antiguidade:** roda de mês e ano. O "Entrar" só acende depois de rodares ou tocares; não deixa meses no
      futuro (no ano atual, o mês fica preso ao mês atual).
- [ ] **Entrar** grava e segue para a oferta do Face ID e o Início, com as boas-vindas.
- [ ] **Boas-vindas** (1× no Início, 2026-11-03): na Porta — placa com a marca (sem ficar por baixo do relógio),
      "Bem-vindo, <nome>", 4 linhas com ícones (sem números amarelos), botão "Começar". Começar fecha e não volta.
- [ ] Ryanair (sem AE modelado): só companhia → tipo → base, e tocar na base grava e entra.
- [ ] Com **Reduzir movimento** ligado, as perguntas trocam sem deslizar e a barra salta.

### 0d · Hora-limite de calços + palavras do veredicto + esquema da companhia (2026-11-03)
_Da análise da concorrência (`docs/concorrencia-calculos.md`)._
- [ ] **Detalhe de um serviço de voo:** logo a seguir a "PSV máx" aparece **"Calços até às 19:00"** (= apresentação +
      PSV máximo). Num serviço que acaba depois da meia-noite aparece "(+1)". Tocar abre a Prova do PSV.
- [ ] **Início, num dia de voo:** o chip passa a **"Calços até · 19:00"**; o chip das horas que faltam chama-se
      **"Margem"** (era "Limite"). A pergunta chama-se **"Dentro dos limites?"** e a resposta diz "Sim, dentro dos
      limites · calços até às 19:00".
- [ ] **Simulação** de um serviço dentro dos limites: a palavra grande é **"Dentro"** (era "Legal"), e por baixo
      "dos limites · PSV 9:10 / 13:00 · calços até às 19:00". Fora dos limites: **"Excede"** (era "Não legal").
- [ ] **Prova do PSV / repouso / limites / standby:** antes do rodapé aparece **"O esquema da tua companhia
      prevalece."** com a explicação do Manual de Operações (parte A, cap. 7). A Prova da radiação **não** o mostra.
- [ ] Em lado nenhum a app diz "Legal", "Ilegal" ou "Não legal" como veredicto (os termos da lei ficam: "mínimo
      legal", "registo legal", "limite legal" da radiação).

### 0e · Perfil como índice em grupos (2026-11-03, esboço `design/perfil-v3.html`)
- [ ] O Perfil mostra grupos com uma linha por definição e o valor atual à direita: **O teu trabalho** · **Acordo e
      serviço** · **Família** · **Ferramentas** · **Conta e segurança** · **Terminar sessão** (sem mosaicos).
- [ ] **Categoria:** abre a página com os cartões (a atual com a etiqueta "atual"), a roda "A partir de que mês?" e
      "Guardar a promoção" (só acende ao escolher outra). Guardar volta ao índice com a categoria nova; o histórico
      aparece na página. O **Contrato** funciona igual.
- [ ] **Base:** pesquisa, Portugal primeiro, nomes em português; tocar grava e volta sozinho.
- [ ] **Na companhia desde:** a roda; "Guardar" só acende quando mudas. O título diz o nome da TUA companhia
      (antes dizia "na easyJet" a toda a gente).
- [ ] **Serviço pós-voo:** 0 / 15 / 30 / 45 grava logo; a caixa diz "Assumido", "Definido por ti" ou "Do Manual".
- [ ] **Férias por ano** (easyJet): − / + grava a cada toque. **Vínculo**, **Abrangido pelo AE**, **Idioma**,
      **Lembretes**, **Bloqueio com Face ID**: cartões; tocar grava (o bloqueio pede o Face ID para ligar).
- [ ] **Conta e segurança:** E-mail, Palavra-passe ("Definir"), Exportar e Apagar conta abrem as janelas de sempre.
- [ ] **Família** (página própria, 2026-11-03): no Perfil, a linha "Chegada ao vivo" diz quantas pessoas há e abre a
      página — uma pessoa por linha com a última partilha, "Adicionar pessoa" no fundo. Tocar numa pessoa abre a janela
      de sempre (Partilhar um voo · Partilhas · Remover). Num dia de voo aparece "Hoje tens voo…".
- [ ] **Mudar de companhia** → "Mudar de companhia?" → **Mudar** abre a configuração com **"Cancelar"** no canto
      (não "Sair"). Cancelar volta ao Perfil sem mudar nada. Ir até ao fim grava a companhia nova, a categoria
      certa (o histórico antigo não manda) e NÃO mostra as boas-vindas outra vez.

### 0f · A escala na configuração — 7.º passo (2026-11-04, esboço `design/configuracao-escala.html`)
_Conta NOVA. Antes, no calendário do iPhone, cria um calendário de teste (ex.: "Escala teste") com 2 ou 3 voos
SINTÉTICOS (título do género "EZY1234 LIS-OPO", com horas) — nunca dados reais._
- [ ] Depois da antiguidade, o botão diz **"Continuar"** (não "Entrar") e aparece **"Liga a tua escala"** com
      "Configuração · 7 de 7": os 3 passos numerados, a linha do escudo, "Ligar ao calendário", "Importar o PDF da
      escala" e "Agora não".
- [ ] **Ligar ao calendário** → o iPhone pergunta (no Expo Go a frase é a do Expo Go) → **"Qual é o calendário da
      escala?"** com a dica do eCrew (easyJet) ou do portal (outras); o calendário com serviços aparece em primeiro,
      com "Sugerido · N serviços nos próximos 2 meses", e já escolhido.
- [ ] **Ler a escala** → **"A tua escala"**: o número grande, Voos / Standby / Outros (e férias/doença se houver) e,
      se algum voo não tiver rota, a caixa laranja "N voos por corrigir".
- [ ] **Guardar a escala** → oferta do Face ID → Início JÁ com os serviços (e as boas-vindas).
- [ ] **Rever um a um** abre a folha de importação de sempre; confirmar lá também entra na app.
- [ ] **Agora não** entra na app sem escala (o Início mostra as opções, sem "PRIVACID…" cortado).
- [ ] Calendário sem serviços → "Não encontrámos serviços…" com "Escolher outro calendário" e "Continuar sem escala".
- [ ] **‹** volta: da escolha ao passo, do passo à antiguidade (e "Continuar" volta a gravar).
- [ ] **Mudar de companhia** (Perfil) com o calendário já ligado: o 7.º passo NÃO aparece.

### 0f-bis · TAP bloqueada na configuração (2026-11-03, decisão do Nuno)
- [ ] Conta nova → "Voas para quem?": a TAP aparece **esbatida**, com "brevemente" e "A app ainda não lê a escala
      desta companhia."; tocar não faz nada (VoiceOver diz "indisponível"). As outras escolhem-se como antes.
- [ ] Perfil → Mudar de companhia → "Mudei de companhia": a TAP também não se escolhe.

### 0h · Limites do acordo (2026-11-03, esboço `design/limites-ae.html`)
_Conta de TESTE na TAP (a TAP está bloqueada na configuração: usar uma conta de teste que já esteja na TAP, ou tirar
`'tap'` de `ROSTER_PENDING` só no PC). Serviços INVENTADOS no calendário de teste._
- [ ] Números → por baixo de Voo e Corpo aparece "Limites do acordo", com o nome do regulamento (já sem "Só o médio curso").
- [ ] Com 3 noturnos em 7 dias (ex.: seg, qua e sex às 20h00–23h40, com serviço de dia pelo meio): aviso vermelho
      "1 excede" no topo; cartão "Trabalho noturno · Cl. 22.ª — 3 serviços noturnos em 7 dias, sem descanso semanal
      pelo meio" com as datas.
- [ ] Tocar no cartão → folha "Excede", os 7 dias com os noturnos a tinta, "O que o AE pede", a citação literal
      (com "sete 7 dias", tal como no BTE), "Abrir a fonte oficial" abre o PDF do DRE, "Como a app conta".
- [ ] Dentro → "Tempo de voo" → número de hoje ("x h de 90 h"), "faltam y h", gráfico do mês com a linha tracejada
      dos 90 h (dias futuros a cinzento, hoje a amarelo), trimestre, 52 semanas e a regra europeia (100 h).
- [ ] Um night-stop (LIS-OPO num dia, OPO-LIS no seguinte) → grupo "Incerto": "falta o tempo de transporte".
- [ ] Detalhe de um voo (apresentação 06:30, 2 setores) → "PSV máx. [AE] 10:30", "Calços até às [AE] 17:00",
      "Próxima saída de calços [AE] …", e a explicação "Acordo da TAP: 11:00 … Regra europeia: 13:00". Tocar abre a
      Prova com a cláusula do AE.
- [ ] Início, num dia com voo → "Dentro dos limites? Sim … calços até às 17:00 (acordo)".
- [ ] Longo curso: ver §0i (v2).
- [ ] Cabine com 5 aterragens num serviço: o resumo do PSV diz "· 1 só pela regra europeia"; o detalhe explica que o AE
      não tem limite para 5 ou mais aterragens.
- [ ] Escala publicada até ao fim do trimestre com menos de 13 folgas: "Pela escala publicada, N folgas semanais…".
- [ ] Inglês: as mesmas frases em inglês, sem "undefined".

### 0i · Limites do acordo — longo curso (v2, 2026-11-03) — com o KIT DE TESTE
_Voos INVENTADOS. Nunca no calendário da escala verdadeira._
**Preparar (uma vez):**
1. No iPhone, criar um calendário só para testes (Calendário → Calendários → Adicionar calendário → "Teste CrewPact").
2. Abrir `docs/kit-teste/longo-curso-tap.ics` no iPhone (por e-mail ou pelos Ficheiros) → "Adicionar tudo" → escolher
   "Teste CrewPact". São 10 voos "TP …" entre 16 nov e 23 dez de 2026 (gerados por `node scripts/kit-longo-curso.js`).
3. Na app em **Expo Go**, a TAP aparece na configuração com a etiqueta "teste" (só em desenvolvimento; na versão das
   lojas continua bloqueada). Conta de teste: TAP · piloto · comandante · base Lisboa · frota **NB**; ligar a escala
   ao calendário "Teste CrewPact" e importar.

**Piloto, frota NB → Números → Limites do acordo:**
- [ ] **Excede · Folgas depois do longo curso · Cl. 38.ª** — "Folga curta depois do longo curso de seg 16 nov: 47 h
      livres (o AE pede 3 dias)" e, por baixo, "4 dias de ocupação + 2 períodos críticos + 0 × 45° de longitude →
      3 dias de folga, a contar das 03:00 de sex 20 nov". Na folha, também o de seg 30 nov (69 h, "3 ou 4 dias").
- [ ] **Excede · Tempo de serviço de voo (longo curso) · Cl. 43.ª** — 4 serviços: seg 16 nov 12:15 (11:30), seg 30 nov
      13:30 (13:15), qua 2 dez 12:30 (9:30, não aclimatizado), ter 22 dez 10:50 (10:00, não aclimatizado).
- [ ] **Excede · Fusos entre rotações · Cl. 39.ª** — "Só 2 dias de folga entre rotações com 9 h de diferença (mín. 6)",
      "Da última pernoita em SFO à primeira em LAD".
- [ ] **Incerto · Repouso no longo curso · Cl. 41.ª** — GRU e SFO: "chega numa leitura do AE e não na outra" (GRU 35:15
      com 35:00 ou 37:15; SFO 38:00 com 34:00 ou 40:30 — a "hora local" da Cl. 6.ª, n.º 14 é uma das leituras); LAD e
      EWR: "falta o tempo de transporte".
- [ ] **Dentro** — "Rotações no Atlântico Norte · 2 de 8"; "Noite antes do longo curso · 2 serviços"; "Duração das
      rotações · 4 rotações". Tocar em "Rotações no Atlântico Norte": a citação do BTE **e** a da ICAO (NAT Doc 007).
- [ ] Detalhe do voo de seg 16 nov → "PSV máx." e "Calços até às" com o mais apertado (AE ou regra europeia) e a
      explicação "Acordo da TAP: 11:30…".
- [ ] Detalhe do voo de qua 18 nov (GRU→LIS) → "Acordo da TAP: 11:45…" (aclimatizado: GRU fica a 2 zonas geográficas
      de Lisboa).

**Piloto, frota WB** (Perfil → Frota): o tempo de serviço de voo passa a **Incerto** — "Só cabe com tripulação
reforçada (Cl. 42.ª)…"; aparece "Reforço por mês · x h de 20 h" (conta as 4 semanas até hoje: os acréscimos do kit
 somam 0:45 + 0:15 + 3:00 + 0:50).
- [ ] Confirmado.

**Cabine** (outra conta de teste: TAP · cabine · base Lisboa, mesmo calendário):
- [ ] **Excede · Folga depois do longo curso · Cl. 20.ª** — "Folga curta depois do serviço de qua 18 nov: 51 h livres (o AE
      pede 72 h)", "Folga de 48 h + RAD de 24 h, a contar das 23:00 de qui 19 nov"; e o de qua 2 dez ("96 h").
- [ ] **Excede · Repouso no longo curso · Cl. 29.ª** — "Menos de 36 h com duas noites locais em SFO".
- [ ] **Incerto · Período de serviço de voo (longo curso) · Cl. 23.ª** — "Só cabe com descanso a bordo (Cl. 24.ª, n.º 2)…".
- [ ] Detalhe do voo de ter 22 dez (EWR→LIS) → "Acordo da TAP: 11:30…" (ao fim de 37 h ainda conta a hora de Lisboa).

**Os dois:**
- [ ] **Importação (a correção):** na Escala, o EWR→LIS aparece em **ter 22 dez**, apresentação 23:00, saída 00:00
      (o voo sai à meia-noite e a apresentação é na véspera).
- [ ] "Trabalho noturno" (piloto) e "Serviço noturno" (cabine) → **Incerto** em seg 16 e qua 18 nov: "sem outro serviço
      pelo meio mas em noites diferentes: o AE não diz se contam como seguidos".
- [ ] Só na cabine, mais dois **Incerto** "conforme a hora local" (seg 30 nov e qua 2 dez; seg 21 e ter 22 dez): os
      voos tocam as 2h00–5h59 numa das leituras da hora local (partida ou chegada, Cl. 4.ª, n.º 13) e não na outra.
- [ ] A secção abre depressa (o cálculo das horas locais é o mais pesado).
- [ ] Inglês: as frases novas em inglês, sem "undefined" nem "NaN".
- [ ] No fim: apagar o calendário "Teste CrewPact" e as contas de teste.

_Escalas já importadas com um voo destes (saída depois da meia-noite, apresentação na véspera): na próxima
sincronização aparece o serviço na véspera como novo e o antigo como cancelado — confirmar os dois._

### 0g · Linha do tempo do contrato — companhia e base com datas (2026-11-03, esboço `design/linha-do-tempo.html`)
_Conta de TESTE com serviços sintéticos em vários meses (ex.: easyJet cabine FA, base Lisboa, voos LIS-OPO em
fevereiro e março, e alguns voos em abril e maio). Nunca dados reais._
- [ ] **Base, mudei:** Perfil → Base → tocar **Porto** → o visto e, logo a seguir, **"Porto, desde quando?"** com
      "Mudei de base" escolhido e a roda no mês atual (não passa do mês atual). Pôr **março 2026** → aparece "Até
      fevereiro de 2026 a tua base fica Lisboa" e o histórico → **Guardar a base**.
- [ ] Voltar a abrir a Base: Porto com "atual"; o histórico diz "Lisboa desde … · Porto desde março de 2026".
- [ ] Escala: em **fevereiro** o voo LIS-OPO mostra o código OPO (acaba fora); em **março** mostra LIS (acaba em casa).
- [ ] **Base, sempre foi esta:** Base → outra cidade → "Sempre foi esta" → a caixa diz "Corrige a base desde que
      entraste na easyJet, em …" (sem roda) → Guardar → o histórico fica só com essa cidade.
- [ ] **‹** no "desde quando?" volta à lista (não sai da página); tocar na base atual volta ao Perfil sem mudar nada.
- [ ] **Mudar de companhia, mudei:** Perfil → Mudar de companhia → **SEM janela de confirmação**; abre a Porta com
      "Mudar de companhia · 1 de N" e **"O que aconteceu?"** ("Hoje estás na easyJet, cabine, desde …").
      "Mudei de companhia" → TAP → cabine → categoria → base → **"Na TAP desde?"** (explicação easyJet/TAP) →
      maio 2026 → por baixo "Os serviços de antes continuam a mostrar o dinheiro da easyJet" → Continuar.
- [ ] Estatísticas, vista **Mês**: **abril** diz "EASYJET · AE" e o dinheiro da easyJet; **maio** diz "TAP · AE".
      Vista **Ano**: soma os dois. Detalhe de um serviço de abril: o € e a Prova são da easyJet.
- [ ] Perfil → Categoria: o histórico só mostra a categoria da TAP (não a FA da easyJet).
- [ ] Perfil → **Na TAP desde** → abril 2026 → Guardar → Estatísticas de abril passam a TAP.
- [ ] **Cancelar** no "O que aconteceu?" volta à app sem mudar nada.
- [ ] **Estou a corrigir** → as respostas substituem tudo (abril e maio passam a ser da companhia nova).
- [ ] "Na … desde?" antes da data de entrada na companhia antiga → aparece "Isto é antes de entrares na easyJet…".
- [ ] **Vínculo:** Perfil → Vínculo → Agência → "Agência, desde quando?" (Mudei de vínculo · Sempre foi assim) →
      mês atual → Guardar. Estatísticas: o mês atual fica sem salário do AE e os meses ANTES continuam com ele.
      "Sempre foi assim" → todos os meses na companhia atual sem salário do AE.
- [ ] **Frota (piloto TAP de teste):** Perfil → Frota → WB, a partir de um mês com voos → Guardar. Nesse mês, a
      ajuda de custo por dia de voo é a WB; no mês antes continua a NB. O histórico mostra "NB desde … · WB desde …".
- [ ] **PDF da carreira** (Perfil → Relatórios → Carreira), na conta com a mudança: o Percurso diz "Início de
      serviço · easyJet", "Base Porto · transferência" (se houve), "Entrada na TAP · CAB 2 · Base Porto"; o
      cabeçalho diz "Na companhia desde"; nenhuma "mudança de categoria" no mês da entrada.

## 1 · Reset de palavra-passe (OTP + cooldown do reenviar)
_Ecrã de login → "Esqueci-me da palavra-passe"._
- [ ] Escreves o email → **Verificar** → passa ao ecrã de **inserir código**.
- [ ] Por baixo do botão **VERIFICAR** aparece **"Reenviar em 30s"** (esbatido, a contar para baixo).
- [ ] Aos 0s → vira **"Reenviar código"** (tocável). Tocas → banner **verde** "Código reenviado." + o cooldown recomeça.
- [ ] Código **errado** → banner **vermelho** de erro.
- [ ] O link **"‹ Mudar e-mail"** volta atrás para reintroduzir o email.
- [ ] Com o código REAL do email (chega pelo Resend) → nova password → entra.

## 2 · Apagar conta + período de graça + reativação  ⚠️ usa uma CONTA DESCARTÁVEL
_As 2 Edge Functions + o cron já estão no ar._
- [ ] Cria/entra numa conta de teste com 1-2 serviços na escala.
- [ ] **Aba Perfil** → cartão **"Segurança"** → **"Apagar conta"** (a vermelho, última linha). _(O avatar e a
      secção "Os meus dados" morreram — 2026-07-09.)_
- [ ] Diálogo: texto dos **7 dias** (desativada agora, reativável) + campo **palavra-passe** (re-auth,
      auditoria 2026-09-03) + campo "Escreve **APAGAR**". Com o teclado aberto o corpo ROLA, nunca corta.
- [ ] O botão vermelho **só ativa** com APAGAR certo **e** password preenchida; password errada → erro no diálogo.
- [ ] Confirmas → **popup "Conta desativada — eliminada de vez a [data]..."** → **OK** → volta ao login.
- [ ] **Entras de novo** (mesma conta) → aparece o **ecrã de reativação** ("eliminada em X dias — [data]", botões Reativar / Sair).
- [ ] **Reativar** → entra na app normal, **escala intacta**.
- [ ] (Opcional, dashboard: **Auth → Users** → o `app_metadata.deletion_scheduled_at` aparece ao agendar e some ao reativar.)

## 3 · Mudar e-mail  ⚠️ precisa de 2 passos no dashboard PRIMEIRO
_Dashboard: Auth → Email → **desligar "Secure email change"** + colar o template `email-change-address.html` em "Change Email Address"._
- [ ] **Perfil → Segurança → "Mudar e-mail"** (mostra o email atual).
- [ ] Passo 1: pede a **palavra-passe** (re-auth) → Continuar.
- [ ] Passo 2: escreves o **e-mail novo** → Enviar código.
- [ ] Passo 3: **código de 6 dígitos** (chega ao email NOVO) + reenviar com cooldown → Confirmar.
- [ ] "E-mail alterado" → o **cabeçalho/cartão do Perfil mostra o email novo**.

## 4 · FTL — toggle de alojamento no formulário
_Escala → toca num dia de voo importado → **toque longo = Editar** (correção de importados). O
"+ adicionar serviço" MORREU a 2026-07-10 — o calendário é a fonte; não há criação à mão._
- [ ] No formulário, abre **"Casos especiais (FTL)"** (o disclosure).
- [ ] No fundo há o toggle **"Alojamento na pausa (split)"** com o selo **220(d)(e)**.
- [ ] Ligado → mostra a dica ("só conta se houver pausa em terra ≥3h…").
- [ ] O ponto vermelho no cabeçalho do disclosure acende com o toggle ligado.

## 5 · Escala / split-duty (relance)
_Como chegar (o calendário é a fonte): no calendário de teste, hoje, `HSBY` 05:00–09:00 + `EZY7841 LIS-FNC`
14:00–15:35 — intervalo ≥ 6 h → 2 serviços SEPARADOS (não fundem). ⚠️ Ao criar o evento, confirma o
campo **Calendário = CrewPact Teste**: o iPhone grava no calendário PREDEFINIDO, e a app só lê o ligado
(armadilha real, 2026-09-03). Se "não deteta", é quase sempre isto — o diagnóstico "Ver o que está no meu
calendário" mostra o que a app recebe._
- [ ] Um dia com **2 serviços** mostra "N×" na grelha; o detalhe empilha os serviços (standby, depois voo).
- [x] Botão **Sincronizar** (se tens calendário ligado) → toast "em dia" / "X mudanças". _(✅ device 2026-09-03, API legacy do SDK 57)_
- [ ] Os veredictos de PSV ("estou legal?") aparecem coerentes (sem falsos-ilegais óbvios). _Variante: voo a chegar 23:30 → dia 05:00–23:30 com o standby a contar da chamada; continua coerente._

---

## 6 · Cifra-em-repouso — ~~VALIDAR~~ **FEITO E REPROVADO (2026-07-02)** → `ENCRYPT=false` definitivo
_A v1 (AES em JS) corrompia emoji e congelava o "Guardar serviço" no Hermes; recuou sem perda. A v2 é
cifra NATIVA no dev build (`docs/dev-build.md` item 5). A checklist abaixo fica como guião da v2. A
SESSÃO Supabase, essa, já vive no Keychain por fatias (2026-09-03, `data/supabase.js`)._
_Isto liga a cifra a sério. Testa com calma; se falhar, recua sem perda._
1. Em `data/secureStorage.js`, muda `const ENCRYPT = false` → **`true`**. Recarrega a app.
2. - [ ] **Entrar** → funciona.
   - [ ] **Reiniciar a app** (fechar/abrir) → a **sessão restaura** (não pede login de novo).
   - [ ] **Editar a escala** → grava e lê bem.
   - [ ] **Reinstalar a app** → arranca **limpo** (login) e **re-sincroniza** a escala do servidor.
3. Se algo falhar (logout forçado, dados em falta) → volta a `ENCRYPT = false` (recua sem perda — o fallback lê o plaintext antigo) e diz-me.

---

**Prioridade se tiveres pouco tempo:** 1 (reset), 2 (apagar/reativar), 4 (toggle) — são os que mexem em fluxos novos. O 6 (cifra) é o mais delicado, faz devagar. O 3 (mudar-email) só depois dos passos do dashboard.

---

# Guião · TESTAR OS ESTADOS da Living Interface (2026-07-09)

_Quando disseres **"testar os estados"**, percorremos isto juntos, um estado de cada vez._
_Alavanca: `FORCE_HOME_STATE` no topo do `screens/HomeScreen.js` ('setup' | 'folga' | 'hoje' |
'disrupcao' | 'vespera' | 'posvoo' | 'pernoita' | null=real). O Fast Refresh aplica ao guardar.
**No fim, voltar a `null`.** Para conteúdo realista, melhor combinar a alavanca com dados reais._

> **Revisto a 2026-11-02 (Design System 2.0).** Em TODOS os estados do Início: data legível + tempo na linha do
> topo · SEM rótulo rodado · SEM seta/ícone amarelo no canto · destaques do kick a TINTA (nunca texto amarelo
> sobre papel) · linha do € a tinta com barra que diz o que mede (era anel). Onde um item abaixo ainda diga
> "amarelo", "donut" ou "rótulo", vale isto; cada estado é reescrito quando chega a sua vez.

## 0 · Setup (primeira vez)
_Dados reais: conta sem calendário ligado. Ou `FORCE='setup'`._
- [ ] "Bem-vindo, <nome>" + fantasma = AVIÃO + "Olá!" + kick amarelo do calendário.
- [ ] Passo "1 Ligar o calendário" (toca → fluxo de ligar na Escala) + placa amarela da dica eCrew.
- [ ] Donut 15% SETUP · chip "PASSO 1" · ações **Ligar calendário** (preta) / **Ver exemplo**.
- [ ] "Ver exemplo" mostra um dia demo (desaparece ao trocar de app — é espreitadela).

## 1 · Folga  (Design System 2.0 — esboço `design/inicio-folga-v3.html`)
_Dados reais: hoje sem serviço. Primeiro SEM nada marcado (o caso de 2026-11-02), depois COM serviço futuro._

**Sem nada marcado**
- [ ] Topo: "SEGUNDA · 2 NOVEMBRO" à esquerda (tinta) + tempo à direita (ícone + min–máx); por baixo a saudação.
- [ ] Sem rótulo rodado na margem direita · sem seta amarela no canto.
- [ ] SEM fantasma · "Folga" grande + "Sem serviços marcados" a tinta · o topo não deixa um buraco.
- [ ] Bilhete manuscrito com o marcador amarelo (como antes).
- [ ] Estado em colunas: LEGAL · Sim / ESCALA · Em dia / FÉRIAS · 22 de 22 — cada coluna abre o seu porquê.
- [ ] € do mês a tinta com "€" cinzento + "NOVEMBRO · ESTIMADO"; à direita "Dia 2 de 30", barra amarela fina, "MÊS".
- [ ] "A SEGUIR" + atalho "Abrir a Escala · Sincronizar ou importar a escala" → abre a Escala.
- [ ] Brilho do sistema de luz centrado à volta do tempo no canto superior direito.

**Com serviço futuro**
- [ ] Fantasma = dias até ao próximo serviço · kick "Próximo serviço daqui a N dias" (N a tinta) + "Qui 5 nov · report 06:10 · LIS-FNC".
- [ ] "A SEGUIR": até 3 linhas, contagem à esquerda (N / dias), rota · voo + data · report · setores · pernoita à
      direita; tocar abre o detalhe do dia.

## 2 · Véspera 🌙 (NOTURNO)
_Dados reais: serviço amanhã com report cedo + serem ≥18h. Ou `FORCE='vespera'` (com o serviço criado)._
- [ ] Ecrã ESCURO (azul-noite) + **glow de candeeiro** no topo · avatar visível · rótulo claro.
- [ ] Fantasma = countdown H:MM · "Amanhã" · kick "report às 05:30 · Z · repouso mínimo ✓ · acordar ~04:15".
- [ ] Horas de amanhã em neutro · útil "Amanhã" · **chip INVERTIDO** (placa clara, dígitos escuros).
- [ ] SEM € do mês (noite calma) · voz "está tudo verificado — dorme."
- [ ] Legibilidade geral no escuro (o teste das 22h no sofá).

## 3 · Pré-report (hoje)
_Dados reais: serviço HOJE ainda por começar._
- [ ] Fantasma = countdown ao report · "Report" · kick "às HH:MM · Z" (+ "avião ✓ · aeroporto ✓" se live limpo).
- [ ] Horas PARTIDA/CHEGADA grandes (verdes com live ok) + **tempo do destino** na célula da chegada (ícone desenhado).
- [ ] Per-diem de hoje + donut PSV · chip report·Z · ações **Partilhar**/Hotel(se 🌙)/Simular.
- [ ] Partilhar abre o cartão editorial + envia imagem+link.

## 3b · Disrupção
_Difícil de forçar com dados reais (precisa de atraso ao vivo) — `FORCE='disrupcao'` mostra o esqueleto; o teste verdadeiro é num dia de atraso a sério._
- [ ] Banda laranja com a CAUSA · fantasma "+N" · "Atenção" laranja.
- [ ] Horas com a planeada **rasurada** → ~nova · "derrapa/projeção" · chip "0̶6̶:̶4̶0̶ ~07:05".
- [ ] NUNCA aparece "a tempo ✓" em lado nenhum.

## 4 · Standby (hoje)
_Dados reais: serviço standby/reserva HOJE._
- [ ] Linha do serviço (tipo + janela) + linha **"SE CHAMADO → PSV até HH:MM"** com o máx por baixo.

## 5 · Pós-voo
_Dados reais: serviço de HOJE já terminado (report 06:00, fim 10:00). Na BASE (sem 🌙)._
- [ ] Fantasma = duty total · "Fechado" · kick = veredicto legal (PSV real/máx · dentro ✓).
- [ ] DUTY · BLOCK · SETORES (toque → detalhe do dia) · per-diem hoje + donut PSV.
- [ ] Útil "Fecho": repouso + próximo serviço + nudge do sign-off · ações **Sign-off**/Simular.
- [ ] Multi-serviço (2 serviços no dia): só fecha quando os DOIS acabam; fechado NÃO mostra números de 1 só.

## 6 · Pernoita 🌙 (NOTURNO)
_Dados reais: serviço de hoje terminado com 🌙 fora da base. Ou `FORCE='pernoita'`._
- [ ] Escuro com candeeiro · fantasma = **ESTAÇÃO** (FNC) + tempo de lá no expoente.
- [ ] Kick: hotel a amarelo + "amanhã report HH:MM" · meio = cartão do hotel (toque→mapas · longo→editar; sem hotel → convite).
- [ ] Útil "Fora": repouso 10h (235) · pernoita +€ (cêntimos) · temperatura na estação.
- [ ] Ações **Hotel**(preta)/**Partilhar**(o voo que aterrou — o link diz "Aterrou ✓")/Simular.

## Transversais (em todos)
- [ ] Início sem rótulo rodado em nenhum estado; nos outros ecrãs o rótulo ainda existe até à migração de cada um (bloco C).
- [ ] Fantasma nunca pisa o rótulo · nunca desaparece após uns segundos (o bug do re-render morreu).
- [ ] Banda de alerta só quando há motivo; aviso de documento crítico vive AO PÉ do Estado (vermelho).
- [ ] Pull-to-refresh funciona · trocar de aba e voltar não parte nada.
- **Afinações prováveis (diz o número):** posição do expoente do tempo · força do halo · `top` do rótulo (344) · tamanhos do fantasma (190/160/140).

## 4b · Em voo (upgrade)
_Dados reais: serviço HOJE com o report ja passado (setor a decorrer)._
- [ ] Barra de PROGRESSO do setor (amarela, anda com o relogio; com live 1-setor usa partida real→ETA).
- [ ] Util: "PSV 05:12 / max 13:00" a ACUMULAR ao vivo.
- [ ] Standby aeroporto: util diz com/sem alojamento.
- [ ] Formacao com papel instrutor: util diz "papel: instrutor — conta no mes (AE)".

## 7b · Ferias
_Dados reais: evento de ferias HOJE (mini-+ → Extra → Ferias, bloco com hoje dentro). Ou FORCE='ferias'._
- [ ] Fantasma = dias que RESTAM no ano + tempo no expoente; "Ferias"; kick "ficam 9 de 22 · regressas sexta 18".
- [ ] Halo + voz "ferias a serio." · SEM acoes · chip = dias restantes.

## 7c · Doenca
_Dados reais: evento de doenca HOJE. Ou FORCE='doenca'._
- [ ] Fantasma = dia N do episodio; "As melhoras" (coracao amarelo); kick Art. 48 (piloto: 1-3 pago).
- [ ] Tom baixo: sem halo, sem numeros a gritar; acao unica Extra (estender); voz "cuida de ti."

## 7d · Fecho do mes
_Dados reais: ultimos 3 dias do mes com AE. Ou FORCE='fecho'._
- [ ] Fantasma = dias p/ fechar; "Fecho do mes"; kick "estimado ate agora **N NNN,NN €**" (amarelo, centimos).
- [ ] Meio = PARCELAS (BASE·PER-DIEM·PERNOITAS·EXTRAS — somam; toque → Estatisticas).
- [ ] Datarow = total € + donut do mes · util nudge "faltam extras? regista no +".
- [ ] Acoes Extra (preta) / Numeros.

## 8b · Repouso-ate + escala-mudou
- [ ] Pos-voo/pernoita: util e chip dizem "repouso ate HH:MM (+1 se vira o dia) (235)" — confere com o motor.
- [ ] Com alteracoes de escala por rever: banda "A tua escala mudou — N por rever" (toca → Escala).
