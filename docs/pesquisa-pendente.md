# Pesquisa pendente — factos que a lei deixa às companhias e às autoridades

Criado a 6 de novembro de 2026, depois da pesquisa na internet sobre os factos que faltam ao motor FTL.

**Porque importa.** A regra do projeto é "a lei é que manda": quando falta um facto de que a lei precisa, a app não
inventa um valor. Mostra o mínimo garantido e, perto do limite, "incerto", com o que falta. Cada facto abaixo que se
confirme tira um "incerto" da app.

**O que serve como fonte.** Só um documento oficial ou da própria companhia: o Manual de Operações (OM ou ROV), um acordo
de empresa publicado no BTE, ou uma decisão da autoridade (ANAC, Austro Control, IAA). Um fórum, um blogue ou um
"toda a gente sabe" não servem. Para cada valor encontrado, guardar o documento, a secção ou cláusula, a página e a frase
exata.

---

## 1. A cabine apresenta-se à mesma hora que os pilotos?

**A lei.** O PSV máximo da cabine baseia-se na hora de apresentação dos pilotos. Se a cabine se apresentar antes, o PSV
dela pode subir pela diferença, até 1 hora (ORO.FTL.205(c)).

**O que já se sabe.**
- A EASA diz que as horas mínimas de apresentação são "defined by the operator in the Operations manual" e que a da
  cabine "may be different" da dos pilotos (FAQ 47585, https://www.easa.europa.eu/en/faq/47585).
- O AE dos pilotos da TAP só dá o mínimo dos pilotos entre a apresentação e o voo: 60 min no médio curso, 75 min no longo
  curso à saída da base, 60 min fora da base (Cl. 18.ª, BTE 29/2023, p. 297). Não diz nada da cabine.

**O que falta.** Para a **easyJet** e para a **TAP**, quanto tempo antes da partida se apresenta a cabine e quanto tempo os
pilotos, ou a diferença entre os dois. Se variar (por frota, longo/médio curso, fora da base), a tabela completa.

**Onde procurar.** O Manual de Operações de cada companhia (parte A, capítulo 7 ou equivalente); o SNPVAC e o SPAC; um
tripulante de cada companhia com acesso ao OM.

**Até lá.** Na cabine, a app dá o PSV máximo garantido e "incerto" quando o resultado depende da hora dos pilotos. Cada
serviço pode levar a hora dos pilotos à mão (campo "Apresentação dos pilotos").

---

## 2. Quanto tempo o Manual de Operações desconta da pausa no serviço repartido?

**A lei.** A pausa em terra do serviço repartido exclui o pré-voo, o pós-voo e a deslocação. O mínimo é 30 minutos e "the
operator specifies the actual times in its operations manual" (CS FTL.1.220(b) e GM1).

**O que já se sabe.**
- O mínimo de 30 min também está na FAQ 47627 da EASA (https://www.easa.europa.eu/en/faq/47627).
- TAP cabine: o intervalo "exclui o tempo pós, pré-voo e o tempo de transporte", sem minutos (Cl. 4.ª, n.º 16, BTE 7/2024,
  p. 328); as regras do repartido estão na Cl. 25.ª (p. 343).
- TAP pilotos: o repartido não se planeia sem autorização prévia do SPAC (Cl. 15.ª, n.º 8, BTE 29/2023, p. 295).
- easyJet pilotos: o AE remete as regras de FTL para o Manual de Operações, Secção 7.

**O que falta.** Para a **easyJet** e a **TAP**, o tempo total (ou cada parcela) que o OM desconta da pausa.

**Onde procurar.** O Manual de Operações (a secção do repartido / split duty); o SNPVAC e o SPAC.

**Até lá.** Com uma pausa de 3 horas ou mais, a app não dá a extensão como certa: mostra o garantido (sem extensão) e
"incerto" quando o resultado depende disto.

---

## 3. Pós-voo da Ryanair e da Hi Fly

**A lei.** O serviço pós-voo conta como período de serviço, e "o operador deve especificar no seu Manual de Operações o
período de tempo mínimo para os serviços pós-voo" (ORO.FTL.210(c)).

**O que já se sabe.**
- **TAP: 30 min** pelo acordo de empresa, já aplicado na app (pilotos Cl. 6.ª, n.º 40, BTE 29/2023, p. 291; cabine
  Cl. 4.ª, n.º 44, BTE 7/2024, p. 329).
- **easyJet: 30 min** (OM, confirmado pelo Nuno). A cabine usa "calços mais 30 minutos" na Cl. 67.ª (RDP, BTE 8/2024).
- **Ryanair:** o AE dos pilotos (BTE 20/2023) diz só que o salário inclui os "relatórios pré e pós-voo", sem minutos.
- **Hi Fly:** nenhum AE nem documento público encontrado.

**O que falta.** O pós-voo da **Ryanair** (pilotos e cabine) e da **Hi Fly**.

**Onde procurar.** O Manual de Operações; o SPAC (AE da Ryanair); o SNPVAC; tripulantes das duas companhias.

**Até lá.** Para estas duas, a app assume 30 min e o Perfil diz "Assumido". **Decisão pendente:** perguntar o valor na
configuração inicial, a quem não for easyJet nem TAP.

---

## 4. Tipo de horário irregular: matinal ou tardio?

**A lei.** Cada autoridade decide qual dos dois tipos se aplica aos operadores que supervisiona (ARO.OPS.230, texto oficial
PT, p. 3). O tipo muda o que conta como "entrada matinal" e "largada tardia" (ORO.FTL.105(8)):
- **matinal:** entrada 05:00–05:59, largada 23:00–01:59;
- **tardio:** entrada 05:00–06:59, largada 00:00–01:59.

Isto pesa no repouso de recuperação: 4 ou mais serviços irregulares obrigam a 60 h (CS FTL.1.235(a)(2)).

**O que já se sabe (pesquisa de 11 de novembro de 2026).**
- **Irlanda (IAA): matinal ("early type"), com documento oficial.** OAM 06, Revision 00, de 11.08.17, secção 5, p. 2: "the
  Authority has decided that all Commercial Air Transport operators issued with an Irish AOC will be required to comply
  with the "early type" definition." Guardado em `fontes/autoridades/iaa-oam-06-2017.txt`. O documento é de 2017 e continua
  na lista do site da IAA; não se confirmou com a IAA que está em vigor. **Falta um facto para o usar na app:** sob que
  certificado voam os tripulantes da Ryanair baseados em Portugal (Ryanair DAC, irlandês, ou Malta Air, maltês).
- **Portugal (ANAC): não encontrado.** A página de regulamentação do site da ANAC não abriu à leitura automática. O
  Decreto-Lei n.º 25/2022 (limites de tempo de voo do pessoal navegante) remete, nos aviões, para a subparte FTL europeia;
  só se leu o preâmbulo, que não fala do tipo de horário irregular.
- **Áustria (Austro Control): não encontrado.** As páginas de avisos e de "Information Letter" não têm nada sobre FTL. Falta
  ver "Rechtsinformationen" no site.
- **Malta: não confirmado.** A OAN 03/15 da Transport Malta dirá "early type", mas o site recusa a leitura automática
  (erro 403): abrir no navegador.
- **EASA:** a FAQ 139489 diz só que vale o tipo que o Estado do operador determinou; a EASA não publica a lista dos Estados.

Pistas anteriores:
- Uma tabela secundária, sem data, dá a Áustria, a Irlanda e Malta como "matinal" e Portugal como "sem escolha publicada"
  (https://understandingeasa2016ftl.wordpress.com/easa-ftl/oro-ftl/aro-ops-230-determination-of-disruptive-schedules/).
- **Malta:** a Transport Malta OAN 03/15 diz "early type", segundo o índice da pesquisa. O site bloqueia a leitura
  automática; abrir no navegador: https://www.transport.gov.mt/Air-Regulation-Policy-Oan-OSC-OAN-No-03-15.pdf-f592
- **Irlanda:** a IAA tem uma "OAM 06 EASA Subpart FTL – Fatigue/Disruptive Schedule Determination" (2017), que não consegui
  abrir. Está na lista de OAM em https://www.iaa.ie/publications
- Itália (ENAC) e Suécia publicam a escolha (matinal), o que mostra que estas decisões existem por escrito.

**O que falta.** O documento da ANAC e o da Austro Control; confirmar o de Malta; e o certificado sob o qual voam os
tripulantes da Ryanair em Portugal.

**Onde procurar.** Os sites das autoridades (circulares, avisos, "information notices" sobre FTL). Ou pedir por escrito:
"Qual o tipo de horário irregular (ORO.FTL.105(8)) determinado ao abrigo do ARO.OPS.230 para os operadores de CAT sob a
vossa supervisão?". Os sindicatos também devem saber.

**Até lá.** A app avalia os dois tipos, para todas as companhias, também a easyJet. Um aviso que só um dos tipos dá fica
"incerto".

---

## 5. Interpretações da EASA para o advogado

Não são factos de companhia: são leituras do texto que a EASA pode ter esclarecido (FAQ ou AMC/GM). Procurar no site da
EASA (secção FAQ de "Flight Time Limitations") antes de levar ao advogado.

Pesquisa de 11 de novembro de 2026, na lista de FAQ da EASA (https://www.easa.europa.eu/en/the-agency/faqs/oroftl):

- **ORO.FTL.205(f) com 205(d): ESCLARECIDO.** FAQ 47599 (atualizada a 12/07/2018): "the use of commander's discretion is
  always based on the maximum daily FDP table ORO.FTL.205 (b) (1). For example, when 1 hour has already been added to the
  maximum daily FDP in accordance with ORO.FTL.205 (d), then only 1 hour is left for commander's discretion." É a leitura
  que a app já segue (a discrição conta do máximo sem o prolongamento). Guardada em `fontes/easa/faq-47599.txt`. Já não
  precisa de ir ao advogado; as FAQ não são vinculativas (pergunta E0).
- **CS FTL.1.220(d) e (e): não esclarecido.** Sem alojamento adequado, uma pausa de 6 horas ou mais (ou que toca o WOCL)
  ainda permite a extensão, só até 6 horas e fora do WOCL? Ou não permite extensão nenhuma? A FAQ 47628 repete a alínea
  (d) e não fala da (e); não há FAQ sobre a (e). A app segue a primeira leitura.
- **ORO.FTL.210: não esclarecido.** "7 dias consecutivos" são dias civis ou 168 horas? Nenhuma FAQ o diz (a 47580 define
  "local day" a propósito das folgas, a 47592 usa "7 consecutive days" sem o definir). Hoje um serviço que passa a
  meia-noite conta todo no dia da apresentação.

---

## 6. Outros factos (pesquisa de 11 de novembro de 2026)

- **Salário mínimo de 2027: ainda não publicado.** A página da DGERT lista até ao Decreto-Lei n.º 139/2025 (920 €, 2026).
  Pista, só pela imprensa: o relatório da proposta de Orçamento do Estado para 2027 fala em 970 €. Só o decreto-lei
  publicado em Diário da República serve (costuma sair na segunda metade de dezembro): **voltar a ver no fim de dezembro**
  e juntá-lo a `fontes/pt/rmmg.txt`, com o teste primeiro. Até lá, a base do 1.º ano da cabine easyJet em 2027 não se sabe.
- **Plataforma europeia de resolução de litígios em linha: encerrada.** Regulamento (UE) 2024/3228, art. 1.º: "O
  Regulamento (UE) n.o 524/2013 é revogado com efeitos a partir de 20 de julho de 2025"; art. 2.º, n.º 1: a plataforma "é
  descontinuada". Guardado em `fontes/eu/reg-2024-3228-pt.txt`. A frase dos termos (§12) que remetia para a plataforma
  saiu do rascunho; o que pôr no lugar (entidades de resolução alternativa de litígios, Lei n.º 144/2015, art. 18.º) é a
  pergunta A2.4 do pacote do advogado.
- **Tabela geotime do ROV da TAP: não é pública.** Não aparece em nenhuma fonte aberta. Fica no pedido aos sindicatos.

---

## Quando houver uma resposta

Diz-me o valor, o documento e a página. Eu meto-o na app com o teste golden primeiro:

| Facto | Onde entra no código |
|---|---|
| 1. Apresentação cabine vs pilotos | `cabinGapMin` em `App.js` (por companhia) |
| 2. Desconto da pausa do repartido | `splitAdminMin` em `App.js` (por companhia) |
| 3. Pós-voo | `postFlightDefaultFor` (OM) ou `postFlightAeFor` (AE) em `data/capabilities.js` |
| 4. Tipo matinal/tardio | `disruptiveType` no `recoveryStatus` (`data/today.js`), por companhia |
