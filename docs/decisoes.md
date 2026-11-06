# CrewPact — Decisões e pendências

Ficheiro vivo. Cada sessão acaba a atualizá-lo (regra 3 do método). As entradas mais recentes em cima.
A história anterior a novembro de 2026 vive na memória do Claude e nos docs de `docs/`; aqui fica o
ponto de situação consolidado a partir de 2 de novembro de 2026.

---

## PRÓXIMA SESSÃO (ler isto primeiro · atualizado 2026-11-06)

**Auditoria dos cálculos FEITA → corrigir.** O Nuno: "é crucial todos os cálculos e contas estarem certos, no tripulante de
cabine como no de piloto". Relatório em **`docs/auditoria-calculos.md`** (ler primeiro), detalhe em
`docs/auditoria-calculos-achados.md` (A-001…A-300). 300 achados: **143 erros, 100 riscos e 43 dúvidas confirmados** (2
verificadores cada); agrupados, cerca de 70 problemas.
**Bloco 1 (motor FTL) FEITO a 2026-11-06** — ver a entrada abaixo. Falta vê-lo no iPhone (lista na entrada).
**Bloco 2 (Simulação) FEITO a 2026-11-06** — ver a entrada "BLOCO 2" abaixo. Falta vê-lo no iPhone (lista na entrada).
**Bloco 3 (limites TAP e validades) FEITO a 2026-11-06** — ver a entrada "BLOCO 3" abaixo. Falta vê-lo no iPhone (lista na entrada).
**A seguir, pela ordem do relatório** (golden-first a partir do texto oficial em `fontes/`; um bloco por sessão):
4. **Importação** — **Opus 5.5 Extra, sessão nova.** (S6 do lado do import: A-220–A-228, M12, L12; e passar o `buildImportCandidates` para o `simulateDuty`) · 5. Dinheiro a mais (M1–M11,
   primeiro a doença da cabine) · 6. Dinheiro a menos (L1–L13: subsídios, posicionamento, VE/VS da TAP) · 7. Textos e citações ·
   8. Dúvidas → advogado.
**Regra do Nuno (2026-11-06): "a lei é que manda", sempre.** Sem um facto de que a lei precisa → perguntar, ou "incerto"
com o que falta. Nunca um valor inventado, nem "o mais restritivo". Ver a entrada "A LEI É QUE MANDA" abaixo.
**Factos por saber — pesquisa na internet de 2026-11-06** (até lá a app dá "incerto" perto do limite). A lista para
pesquisar, com onde procurar e onde entra no código, está em **`docs/pesquisa-pendente.md`**.
(1) Apresentação cabine vs pilotos (ORO.FTL.205(c)): só no Manual de Operações (EASA FAQ 47585: "defined by the operator
in the Operations manual"); não é público. AE TAP pilotos Cl. 18.ª dá só o MÍNIMO dos pilotos (60/75/60 min, BTE 29/2023 p. 297).
(2) Desconto da pausa do repartido (CS FTL.1.220(b)): só no OM; mínimo 30 min (EASA FAQ 47627). AE TAP cabine Cl. 4.ª n.º 16
diz o que se exclui, sem minutos; AE TAP pilotos Cl. 15.ª n.º 8: repartido só com autorização do SPAC.
(3) Pós-voo: TAP = 30 min pelo AE (FEITO, `38340d2`); easyJet = 30 (OM, confirmado pelo Nuno; a Cl. 67.ª da cabine usa
"calços mais 30 minutos"); Ryanair e Hi Fly: nada público → perguntar na configuração (decisão do Nuno).
(4) Tipo matinal/tardio (ARO.OPS.230: decide a autoridade): sem fonte oficial para ANAC, Austro Control nem IAA; só uma
tabela secundária (Áustria/Irlanda/Malta = matinal; Portugal = sem escolha publicada). Transport Malta OAN 03/15 bloqueia
leitura automática. A easyJet deixou de ser assumida matinal: os dois tipos para todos, até haver documento oficial.
**Depois disso:** o esboço `design/inicio-v6.html` e o modo escuro (adiados pela auditoria).
**Por ver no iPhone (de antes):** a disrupção e o aviso de RDP; uma conta de CABINE.

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

**Pendente:** o tempo de voo de um voo que passa da meia-noite SEM as horas de cada perna ainda conta no dia em que começa
(resto do A-132: devia ser "incerto"); A-133 a A-141 (dúvidas de leitura → Nuno/advogado). **Para o advogado:** conferir no
Jornal Oficial as secções de `fontes/eu/` (a EUR-Lex diz que o consolidado não tem efeito jurídico) e a leitura da Cl. 23.ª,
n.º 3 (cabine) no médio curso.
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
