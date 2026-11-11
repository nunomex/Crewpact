# CrewPact — Questões para revisão jurídica

Preparado a 7 de novembro de 2026 por Nuno [apelido], autor da aplicação. Versão 1.

## Para que serve este documento

A CrewPact é uma aplicação de telemóvel (iOS, depois Android) para tripulantes de voo em Portugal: pilotos e
tripulantes de cabine da easyJet, TAP, Ryanair e Hi Fly. A aplicação lê a escala do tripulante a partir do calendário do
telemóvel e, **no próprio telemóvel**, faz duas coisas:

1. **Limites de fadiga:** compara a escala com o Regulamento (UE) n.º 965/2012, Anexo III, subparte FTL (introduzido pelo
   Regulamento (UE) n.º 83/2014), com as especificações de certificação CS FTL.1 da EASA e, na TAP, com os limites de
   escala dos acordos de empresa.
2. **Remuneração prevista:** estima a retribuição bruta do mês a partir dos acordos de empresa publicados no Boletim do
   Trabalho e Emprego (BTE).

É **consultiva**: estima, nunca declara a legalidade de uma escala nem processa salários. Não usa inteligência
artificial. Cada número sai de uma regra escrita que cita o artigo ou a cláusula de onde vem, e o tripulante pode abrir a
fonte oficial a partir de qualquer número. Ainda não está publicada nas lojas. Até agora só foi usada com dados de teste.

O modelo de negócio previsto é uma única aplicação, minha, **licenciada** ao SPAC (pilotos) e ao SNPVAC (cabine), com
uma "edição" de cada sindicato. A funcionalidade de segurança (limites de fadiga) fica sempre gratuita. Outras
funcionalidades poderão vir a ser pagas por subscrição nas lojas.

Peço-lhe:

- **Parte A** — o que tem de estar resolvido antes do lançamento: quem é o responsável, os Termos, a Política de
  Privacidade e os dados sensíveis.
- **Parte B** — o contrato de licença com os sindicatos.
- **Parte C** — propriedade intelectual e citação de textos legais.
- **Partes D e E** — dúvidas de leitura nos acordos de empresa e no regime europeu de limites de fadiga. Em cada uma, o
  texto admite mais do que uma leitura e a aplicação tem de escolher o que mostrar.

As partes A a C são as mais urgentes. As partes D e E podem ser respondidas por lotes. Cada questão tem um número (A1,
D3…) para facilitar a resposta.

Os documentos referidos estão em anexo ou publicados:

- Termos e Condições (rascunho publicado): https://crewpact.app/termos
- Política de Privacidade (rascunho publicado): https://crewpact.app/privacidade
- Textos oficiais usados pela aplicação: acordos de empresa (BTE), Código do Trabalho, regulamentos europeus. Envio cópia
  de qualquer um que precise.

---

## Parte A — Antes do lançamento

### A1. Quem fica como responsável

Os dois documentos têm o campo "【NOME/ENTIDADE RESPONSÁVEL】" por preencher. Hoje sou pessoa singular.

- Recomenda que a aplicação seja disponibilizada por mim, como pessoa singular (empresário em nome individual), ou por
  uma sociedade (por exemplo, unipessoal por quotas)? A aplicação estima dinheiro devido e limites de segurança de voo, e
  um erro pode levar um tripulante a reclamar (ou a não reclamar) um valor, ou a aceitar um serviço.
- Recomenda seguro de responsabilidade civil profissional?
- Que comarca indicar no foro (Termos, §12)? Vivo na Madeira.

### A2. Termos e Condições — revisão geral

Rascunho completo em https://crewpact.app/termos, publicado com a marca "RASCUNHO". Peço revisão geral e, em especial:

1. **Caráter consultivo (§3) e limitação de responsabilidade (§9).** Bastam para um serviço que estima retribuições e
   limites legais? A cláusula "tal como está" é válida perante um consumidor, sobretudo quando houver uma subscrição paga
   (regime dos conteúdos e serviços digitais, DL 84/2021)?
2. **Frase corrigida no §2:** dizia "o serviço de cálculo FTL **de legalidade** é gratuito", o que contradizia o §3 (a
   aplicação não declara legalidade). Passou a "O cálculo dos limites de tempo de voo e de repouso (FTL) é gratuito".
   Concorda?
3. **Compromisso de aviso de erros (§3):** "Quando identificamos um erro relevante num cálculo, procuramos corrigi-lo e
   (…) avisar os utilizadores potencialmente afetados." Esta frase cria uma obrigação que convenha moderar?
4. **Resolução de litígios (§12):** o rascunho remetia para a plataforma europeia de resolução de litígios em linha. A
   plataforma foi descontinuada: o Regulamento (UE) 2024/3228, de 19 de dezembro de 2024, revogou o Regulamento (UE)
   n.º 524/2013 «com efeitos a partir de 20 de julho de 2025» (art. 1.º). Tirei essa frase. Que informação sobre entidades
   de resolução alternativa de litígios (Lei n.º 144/2015, art. 18.º) tenho de dar no lugar dela?
5. **Idade mínima de 16 anos (§4):** adequada?
6. **Alterações aos termos (§11):** "o uso continuado após a entrada em vigor constitui aceitação". É suficiente, ou
   tenho de pedir nova aceitação expressa na aplicação?

### A3. Política de Privacidade — revisão geral

Rascunho completo em https://crewpact.app/privacidade. Factos verificados por mim:

- Contas e base de dados: Supabase, região UE (Irlanda). E-mails transacionais: Resend, região UE (Irlanda). A página
  pública de partilha de voos é servida pela Cloudflare (rede global).
- Os endereços suporte@crewpact.app e privacidade@crewpact.app já existem (os marcadores "confirmar/criar este endereço"
  do rascunho estão desatualizados).
- Os cálculos (limites e remuneração) fazem-se no telemóvel. O servidor guarda a conta, o perfil profissional e a escala
  (para sincronizar entre sessões).

**O rascunho publicado estava desatualizado em relação à aplicação.** Já corrigi o §3 no ficheiro (ainda não está
publicado). O perfil profissional guarda no servidor:

- a **linha do tempo** da companhia, da base, da categoria e do contrato, com datas (para calcular meses passados com a
  companhia e a categoria desse mês);
- o **vínculo**: por conta de outrem, agência ou independente;
- a data de entrada na companhia e, na TAP, a data da largada;
- a frota e a qualificação de instrutor.

Também mudou a entrada na conta: passou a ser por código enviado por e-mail, com palavra-passe opcional. O §3 passou a
dizê-lo, e ganhou duas linhas: o "Abrangido pelo AE" fica só no telemóvel (ver A4); os dias de baixa são só datas e ficam
no telemóvel.

Peço-lhe que confirme:

1. Os **fundamentos de licitude** do §5 estão certos: execução do contrato para a conta e a sincronização; consentimento
   para o calendário, as notificações e a partilha; interesse legítimo para a segurança.
2. O **§10** (transferências internacionais) está suficiente para a Cloudflare.
3. Preciso de um **registo das atividades de tratamento** (art. 30.º do RGPD) ou de uma **avaliação de impacto** (art.
   35.º)?

### A4. Dados que podem revelar filiação sindical (art. 9.º do RGPD)

A aplicação só calcula a remuneração do acordo de empresa a quem está abrangido por ele (art. 496.º do Código do
Trabalho). Quem trabalha por conta de outrem mas **não é filiado** no sindicato outorgante nem aderiu ao acordo pode
desligar o interruptor "Abrangido pelo AE". Esse "não" é, na prática, um indício de não filiação sindical. Por
precaução, **este dado passou a ficar só no telemóvel**: deixou de ir para o servidor, e a cópia que lá estava é apagada.
Também não tem datas, para não guardar quando a pessoa se filiou ou deixou de ser filiada.

1. Este sim/não é um dado de categoria especial (art. 9.º)?
2. Ficar só no telemóvel resolve? Ou seria aceitável guardá-lo no servidor com consentimento explícito (art. 9.º, n.º 2,
   a)), para o repor num telemóvel novo?
3. **Edição sindical sem perguntar a filiação.** Não pergunto "é sócio do sindicato?": a edição da aplicação deduz-se do
   tipo de tripulante (piloto → edição SPAC; cabine → edição SNPVAC), porque a licença serve sócios e não sócios. Esta
   dedução evita o problema do art. 9.º?

### A5. Doença, fadiga e radiação — dados de saúde?

- **Doença:** a remuneração depende dos dias de baixa (CT art. 255.º; complementos dos acordos). A aplicação regista só as
  datas dos dias de doença, sem atestados nem diagnóstico. Esses registos **ficam só no telemóvel**: não vão para o
  servidor.
- **Estimativas derivadas:** um indicador de fadiga e uma estimativa da dose de radiação cósmica, calculados no momento,
  no telemóvel, a partir da escala. Nunca se guardam nem se enviam. A Política (§3) já o diz e acrescenta que a dose
  oficial é obrigação da companhia (Diretiva 2013/59/Euratom; DL 108/2018).

Perguntas:

1. As datas de baixa são dados relativos à saúde? Se ficam só no telemóvel e eu nunca lhes tenho acesso, sou
   responsável pelo seu tratamento? O mesmo vale para as estimativas derivadas.
2. A redação do §3 ("Estimativas derivadas…") está correta e suficiente?

### A6. Documentos que a aplicação gera para o tripulante assinar

A aplicação gera dois PDF que o tripulante pode assinar e entregar:

1. **Registo de períodos de serviço.** No ecrã dizia "ORO.FTL.245 · registo legal" e terminava com: *"Declaro que os
   registos acima refletem com exatidão os meus períodos de serviço (…) em conformidade com o ORO.FTL.245."* O registo
   do ORO.FTL.245 é uma obrigação **do operador**; o PDF é do tripulante. Já mudei para "Registo pessoal · modelo do
   ORO.FTL.245" e: *"Declaro que os registos acima refletem os meus períodos de serviço, períodos de serviço de voo,
   tempos de voo e períodos de repouso tal como registados na aplicação, no período indicado."*
2. **Percurso de carreira** (logbook da cabine), com: *"Declaro que os registos acima refletem os meus períodos de serviço
   tal como registados na aplicação, no período de cobertura indicado."*

Há ainda um ecrã de **disrupção** (alterações de escala de curta antecedência, SNC, e atrasos, RDP, nos acordos da
easyJet). Esse ecrã mostra a frase de visto de cada acordo e gera um PDF de prova para o tripulante juntar à reclamação
interna.

Perguntas:

1. As novas frases chegam para não expor o tripulante (uma declaração inexata) nem a mim (parecer que a aplicação
   certifica conformidade)?
2. Algum cuidado com o PDF de prova da disrupção, que vai ser usado numa reclamação contra o empregador?

### A7. Ideia futura: sincronizar folgas entre colegas

Quero permitir que dois tripulantes vejam os dias de folga que têm em comum, sem mostrarem a escala inteira. Antes de
desenhar a parte técnica, preciso de saber o que o consentimento tem de cobrir:

- partilha de um dado derivado (as folgas em comum) entre dois utilizadores;
- consentimento mútuo e contínuo, e revogação imediata por qualquer um dos dois;
- o que tem de entrar na Política de Privacidade e nos Termos.

Nota técnica: o resultado (as folgas em comum) revela sempre algo da escala do outro. Não há forma de o esconder.

---

## Parte B — Licença aos sindicatos

### B1. Contrato de licença ao SPAC e ao SNPVAC

Modelo pensado: a aplicação é minha e licencio-a (não a vendo) a cada sindicato. Há uma só aplicação nas lojas. A edição
de cada sindicato muda a cor e mostra "Em parceria com SNPVAC · SPAC". Os sindicatos **não veem dados individuais**.
Uma aplicação própria de um sindicato seria um extra pago, publicada na conta de programador desse sindicato.

Peço-lhe:

1. A estrutura do contrato de licença: objeto, preço, exclusividade (não vou dar exclusividade a nenhum), duração, saída,
   e quem responde perante o tripulante quando um número estiver errado.
2. **Responsável pelo tratamento:** eu, e os sindicatos sem acesso a dados. O contrato tem de dizer isso? Se o sindicato
   divulgar a aplicação aos sócios, passa a ter algum papel no tratamento?
3. **Marca do sindicato:** autorização escrita para o logótipo e as cores. Com a marca do sindicato, os números podem ser
   lidos como "a palavra do sindicato". Como protejo as duas partes? Que aviso tem de aparecer?
4. **Não sócios:** um piloto não sócio do SPAC vê a edição SPAC (porque a edição sai do tipo de tripulante, ver A4). O
   contrato tem de autorizar mostrar a marca a não sócios?

### B2. Nome e marca CrewPact

O nome fica CrewPact. Não encontrei nenhuma aplicação nem empresa com o nome. O domínio crewpact.app é meu.

- Pode fazer, ou indicar quem faça, a pesquisa e o registo da marca (INPI e EUIPO)? Em que classes?
- Na aplicação aparecem os nomes das companhias (easyJet, TAP, Ryanair, Hi Fly), sem logótipos. Há algum cuidado a ter?

---

## Parte C — Propriedade intelectual e citações

### C1. Citar e resumir textos legais e acordos de empresa

Junto de cada número, a aplicação mostra a sua base legal: o artigo ou a cláusula, um **resumo da regra escrito por mim**
(apresentado como resumo, nunca entre aspas) e uma ligação para a fonte oficial (EUR-Lex, EASA, BTE, Diário da
República). Não reproduz o texto integral.

1. Este uso (paráfrase com citação e ligação) é seguro? Entendo que o art. 7.º do Código do Direito de Autor exclui da
   proteção os textos oficiais. Os **acordos de empresa publicados no BTE** cabem nessa exclusão? E as especificações de
   certificação e o material de orientação da EASA (CS, AMC/GM)?
2. Posso guardar na aplicação as tabelas de valores dos acordos (salários, ajudas de custo), que são a base dos cálculos?

---

## Parte D — Dúvidas de leitura nos acordos de empresa (remuneração)

Acordos em causa:

- **easyJet × SNPVAC** (tripulantes de cabine), BTE n.º 8/2024;
- **easyJet × SPAC** (pilotos);
- **TAP × SNPVAC** e **TAP × SPAC**. Os acordos da TAP têm regulamentos anexos (RRRGS, RUPT), cada um com a sua
  numeração.

As páginas citadas são as do PDF e do BTE. Os valores são brutos, em euros, sem arredondar.

Termos usados nesta parte:

- **Categorias da cabine easyJet:** FA = tripulante de cabine; FA1 = 1.º ano; CMP = chefe de cabine em período
  experimental; CM = chefe de cabine.
- **Pilotos:** FO = copiloto; CPT = comandante.
- **NS (setor nominal):** valor fixo por voo que serve de unidade a vários pagamentos.
- **SNC:** alteração de escala com curta antecedência. **RDP:** alteração no dia da operação.
- **ADTY:** assistência no aeroporto. **DDO:** trabalhar num dia de descanso. **IDO:** dia de descanso infringido.
- **PPY:** contrato a tempo parcial anual dos pilotos (por exemplo 8/12 = 8 meses de atividade).
- **TAP:** VB = vencimento base; anuidades técnicas = diuturnidades por função.

Em cada questão indico a **leitura conservadora**: a que não promete ao tripulante dinheiro que pode não ser devido. A
aplicação nem sempre a usa hoje. Depois da sua resposta, corrijo o código para a leitura que indicar.

### easyJet — tripulantes de cabine

#### D1. RDP: "119 minutos ou mais" ou "superior a 119"? E o atraso operacional conta?

- **Texto:** Cl. 67.ª, n.º 1 (PDF p. 22 | BTE p. 304): «tiver sido alterado, no dia da operação, em 119 (cento e dezanove)
  minutos ou mais. Esta alteração desencadeará um pagamento se o término do tempo de serviço (calços mais 30 (trinta)
  minutos …) for superior a 119 (cento e dezanove) antes ou depois … de acordo com a escala de serviço programada». O n.º 3
  fala de «atraso de 2 (duas) horas». O n.º 2 exclui atrasos por motivos do tripulante.
- **Perguntas:**
  1. Um fim de serviço exatamente 119 minutos depois do programado dá direito ao RDP?
  2. "Alterado" inclui um atraso operacional sem mudança da escala (por exemplo, o avião chega 2h30 atrasado), ou só uma
     alteração feita pela empresa?
- **Exemplos:**
  - FA com chegada 2h30 depois do programado, sem alteração da escala: a aplicação propõe 21,00 € (CM 32,50 €). Na outra
    leitura, 0,00 €.
  - Fim exatamente 119 min depois: 21,00 € contra 0,00 €.
- **A aplicação hoje:** conta a partir de 119 e conta o atraso operacional (as duas leituras que pagam mais). Conservadora:
  só alterações da escala, e 120 minutos ou mais.

#### D2. Fronteira entre SNC e RDP

- **Texto:**
  - Cl. 66.ª, n.os 1 e 3 (PDF p. 22 | BTE p. 304): a alteração «ocorre no período de 48 (quarenta e oito) horas antes do
    serviço»; compara-se «o novo serviço com o planeado em escala nas 48 (quarenta e oito) horas antecedentes».
  - Cl. 67.ª, n.º 1: «no dia da operação».
- **Perguntas:**
  1. O SNC compara o plano de 48 horas antes com o serviço **final**, já com as alterações do próprio dia?
  2. Os dois pagamentos acumulam-se?
  3. O "dia da operação" é o dia do serviço ou a data do calendário? Um serviço com apresentação às 23h30 e alteração às
     00h30 está "no dia da operação"?
- **Exemplos:**
  - Na véspera, o serviço passa a acabar 3 h mais tarde; no próprio dia volta ao horário inicial. A aplicação dá SNC 20,00 €
    + RDP 21,00 € = 41,00 €, embora o serviço feito seja igual ao planeado. Na leitura conservadora, 0,00 €.
  - Apresentação às 23h30, alteração às 00h30: a aplicação não dá nada.
- **Conservadora:** comparar o plano de 48 h antes com o serviço final, e no máximo um pagamento por serviço.

#### D3. Complemento de doença: 90 dias "num período de 12 meses em cada ano civil"

- **Texto:** Cl. 61.ª (PDF p. 20 | BTE p. 302): «até um máximo de 90 (noventa) dias num período de 12 (doze) meses em cada
  ano civil».
- **Exemplo:** FA com 90 dias pagos entre 4 de setembro e 2 de dezembro de 2025 e nova baixa de 5 a 24 de janeiro de 2026.
  - 12 meses para trás (a leitura da aplicação, conservadora): 0,00 €.
  - Por ano civil: 17 dias × 20,20 € = 343,40 €.
- **Pergunta:** os 90 dias contam-se em 12 meses móveis ou em cada ano civil?

#### D4. "Base diária": por quanto se divide? (cabine e pilotos)

- **Texto:**
  - A base perde-se nos dias de baixa: cabine Cl. 86.ª, n.º 1, b) (PDF p. 28 | BTE p. 310); pilotos Art. 72.º, n.º 2 (PDF
    p. 23 | BTE p. 71); CT art. 255.º, n.º 2, a).
  - O complemento de doença é «45 % da remuneração base diária» (cabine, Cl. 61.ª) ou «60 % da retribuição base diária»
    (pilotos, Anexo I.10, PDF p. 27 | BTE p. 75).
  - O único divisor escrito é o do Art. 68.º, n.º 7 dos pilotos («dividindo a remuneração mensal por 30»), e só para as
    férias não gozadas na cessação. O CT art. 271.º dá a fórmula do valor horário.
- **Exemplos:**
  - FA, outubro de 2025, 10 dias de baixa: ÷ 30 desconta 433,67 €; ÷ 31 desconta 419,68 €.
  - FA, fevereiro de 2026: ÷ 30 desconta 448,86 €; ÷ 28 desconta 480,92 €.
  - FO, outubro de 2025, 10 dias: ÷ 30 desconta 1 163,05 €; ÷ 31 desconta 1 125,54 €.
- **A aplicação hoje:** base do mês ÷ 30 por dia; um mês inteiro de baixa desconta a base toda.
- **Pergunta:** a base diária é a base ÷ 30, ÷ dias do mês, ou outro cálculo? Vou também pedir um recibo real com dias de
  baixa para ver a prática.

#### D5. Chefe de cabine verificador de linha (CCLT): por dia ou por setor?

- **Texto:**
  - Cl. 35.ª, n.º 3, a) (PDF p. 12 | BTE p. 294): «complemento adicional de voo por setor voado, de acordo com o anexo I».
  - Anexo I.16 (PDF p. 32 | BTE p. 314): «25,00 € por dia de treino».
- **Exemplo:** CM com 4 setores num dia: 25,00 € (por dia, a leitura da aplicação, conservadora) contra 100,00 € (por
  setor).
- **Pergunta:** qual prevalece, a cláusula ou o anexo?

#### D6. Posicionamento: que linha da tabela paga o CMP?

- **Texto:**
  - Anexo I.18 (PDF p. 33 | BTE p. 315): só três linhas, «Tripulante de cabine 1.º ano / Tripulante de cabine / Chefe de
    cabine».
  - Cl. 33.ª, n.os 3, c) e 7 (PDF p. 11 | BTE p. 293): o CMP é categoria própria, «designado como chefe de cabine em
    período experimental».
  - Nas tabelas salariais (Anexos I.1 e I.2), o CMP tem linha própria.
- **Exemplo:**

  | Posicionamento | Linha do chefe (aplicação) | Linha do tripulante (conservadora) |
  |---|---|---|
  | Curto | 26,00 € | 16,00 € |
  | Longo | 48,75 € | 30,00 € |

- **Pergunta:** que linha paga o CMP?

#### D7. Ficar depois da meia-noite de um dia de descanso: DDO ou IDO?

- **Texto:**
  - Cl. 68.ª, n.º 1 (PDF p. 23 | BTE p. 305): ficar «após a meia-noite de um dia de descanso planeado, a Easyjet compensará
    o dia de descanso infringido com um pagamento …».
  - O n.º 3 atribui expressamente o IDO à paragem noturna não programada.
  - Anexo I.12: DDO 115,00 €. Anexo I.13: IDO 140,00 €.
- **Pergunta:** o n.º 1 paga DDO (115,00 €, a leitura da aplicação, conservadora) ou IDO (140,00 €)? O n.º 1 usa a
  expressão "dia de descanso infringido", que é o nome do IDO.

#### D8. Assistência no aeroporto de exatamente 4h00

- **Texto:** Cl. 58.ª (PDF p. 20 | BTE p. 302) e Anexo I.8: «até 3 horas e 59 minutos» e «superior a 4 horas». As 4h00
  certas não cabem em nenhum escalão. O acordo dos pilotos resolve-o ("+ 4'00 horas"); o da cabine não.
- **Exemplos:**

  | Caso | Escalão de cima (aplicação) | Escalão de baixo (conservador) |
  |---|---|---|
  | FA não chamado | 50,40 € | 25,20 € |
  | CM não chamado | 78,00 € | 39,00 € |

- **Pergunta:** que escalão paga uma assistência de 4h00 certas?

#### D9. SNC depois do fim da vigência (31 de janeiro de 2027)

- **Texto:**
  - Cl. 66.ª, n.º 5 (PDF p. 22 | BTE p. 304): «aplicável enquanto o atual AE estiver em vigor».
  - Anexo I.10: «Duração limitada correspondente à duração do AE».
  - Cl. 3.ª: vigência até 31 de janeiro de 2027; prorrogação e cessação «de acordo com a lei portuguesa».
- **Pergunta:** se o acordo entrar em sobrevigência (CT art. 501.º), o SNC (20,00 € por alteração) continua devido? Até
  saber, a aplicação vai dizer "a confirmar" a partir dessa data.

#### D10. Erro evidente na tabela (só confirmar)

O Anexo I.2 (PDF p. 31 | BTE p. 313) imprime o setor nominal do FA1 em fevereiro de 2024 como «1345,00 €». As restantes
colunas têm valores como 13,45 € e 19,37 €. A aplicação usa 13,45 €. Confirma que posso tratar isto como erro de escrita?

### easyJet — pilotos

#### D11. Bandas do per diem: os intervalos sem banda

- **Texto:** Art. 37.º (PDF p. 14 | BTE p. 62): «S < 400 NM 0.8 · 401 > S < 1000 NM 1.2 · 1001 > S < 1500 NM 1.5 · > 1501 NM
  S 2.5».
  - O texto deixa fora os valores 400, 1000, 1500 e 1501, e os intervalos entre 400 e 401, 1000 e 1001, 1500 e 1501.
  - O acordo da cabine (Cl. 53.ª) é mais claro («igual ou inferior a 400», «401 MN e 1000 MN inclusive») e diz que a
    empresa publica a lista das distâncias por rota.
- **Exemplo:** FO, 2025.

  | Distância | Banda de cima (aplicação) | Banda de baixo (conservadora) |
  |---|---|---|
  | 400,5 NM | 47,58 € | 31,72 € |
  | 1500,5 NM | 99,13 € | 59,48 € |

- **Pergunta:** em que banda caem esses valores? Vou também perguntar que distâncias a easyJet usa.

#### D12. Contratos a tempo parcial: percentagem da base de quem?

- **Texto:**
  - Anexo I.13 (PDF p. 28 | BTE p. 76): DDO «0,4 % salário base anual», IDO 0,8 %, WFLY (voar num dia de folga) 1 %.
  - Art. 24.º, n.º 14 (PDF p. 8 | BTE p. 56): «redução proporcional de todos os termos e condições … correspondente ao
    período de actividade realizado».
  - O acordo da cabine diz expressamente «remuneração base anual devida por tempo integral»; o dos pilotos não diz.
- **Exemplo:** FO com PPY 8/12, 2025.

  | Pagamento | Base do próprio piloto (aplicação, conservadora) | Base da tabela |
  |---|---|---|
  | DDO | 130,26 € | 195,39 € |
  | IDO | 260,52 € | 390,79 € |
  | WFLY | 325,65 € | 488,48 € |
  | Complemento de doença por dia | 46,52 € | 69,78 € |

- **Pergunta:** a percentagem incide sobre a base da tabela (tempo inteiro) ou sobre a base do contrato do piloto?

#### D13. O regime 5/4 é uma "modalidade de contrato"?

- **Texto:**
  - Art. 68.º, n.º 1 (PDF p. 21 | BTE p. 69): «O periodo de férias será proporcional para as diferentes modalidades de
    contrato».
  - Art. 59.º, n.os 1 e 2 (PDF p. 18 | BTE p. 66): «variação de escala de 5/4 … salário base equivalente a 92 %».
  - O Art. 24.º, n.º 1 trata o 5/4 como "escala", e o quadro de contratos do Art. 66.º não o inclui.
- **Exemplos** (a aplicação hoje aplica o fator 0,92 a tudo):

  | Valor | Com 0,92 (aplicação) | Sem redução |
  |---|---|---|
  | Férias | 23 dias | 25 dias (2 × 79,30 € = 158,60 €/ano) |
  | DDO | 179,76 € | 195,39 € |
  | Prémio de permanência (CPT, 5 anos) | 11 482,15 € | 12 480,60 € |

- **Pergunta:** o 5/4 reduz só o salário base, ou também as férias e as outras prestações?

#### D14. Instrutor em simulador: 120,00 € ou 120,00 € + 3 setores nominais?

- **Texto:**
  - Art. 42.º (PDF p. 15 | BTE p. 63): «Adicionalmente a qualquer acréscimo … será ainda efetuado um pagamento, por cada
    dia … em terra, incluindo em simulador».
  - Art. 43.º: «por quaisquer deveres executados em benefício da empresa … Este pagamento é igualmente devido para
    serviços de formação em terra e simulador».
- **Exemplo:** CPT em 2025: 120,00 € (só o Art. 42.º, a leitura da aplicação, conservadora) contra 361,68 € (com os 3 setores
  do Art. 43.º).
- **Pergunta:** os dois pagamentos acumulam-se?

#### D15. Paragens noturnas fora da base: quais pagam?

- **Texto:**
  - Art. 39.º (PDF p. 14 | BTE p. 62): «paragens noturnas fora da base, entre serviços de voo … não será devido durante a
    formação inicial (curso de type rating)».
  - Art. 44.º: «posicionamentos com paragens noturnas enquadra-se no regime de pagamento dos per diem para efeitos de
    tributação».
  - O acordo da cabine é mais largo: «em voo, formação e outras funções».
- **Pergunta:** pagam também
  1. as noites de formação periódica fora da base?
  2. a noite depois de um posicionamento, antes de voar?
  3. cada noite de uma estadia de várias noites, ou só uma por paragem?
- **Exemplo:** FO, 2025, 79,30 € por noite. Uma estadia de 2 noites: 158,60 € (a aplicação) contra 79,30 €.
- **Conservadora:** só entre dois serviços de voo, uma por paragem.

#### D16. Subsídio de férias de quem entra depois de junho

- **Texto:** Art. 36.º, n.os 1 e 2 (PDF p. 13–14 | BTE p. 61–62): «pagos proporcionalmente nos anos de contratação»; «(o que
  poderá ocorrer com trabalhadores que sejam contratados após abril), a diferença será calculada e paga com a retribuição
  do mês de dezembro».
- **A aplicação hoje:** paga a parte proporcional em dezembro (FO admitido em setembro de 2025: 1 163,05 € em dezembro de
  2025).
- **Pergunta:** é dezembro, ou o junho seguinte? O total é o mesmo; muda o mês.

#### D17. Prémio de retenção dos pilotos com contrato PPY

- **Texto:** Art. 24.º, n.º 20, a) e Art. 25.º, n.º 21, a) (PDF p. 8 | BTE p. 56 e PDF p. 10 | BTE p. 58): «pagos
  proporcionalmente para os que se encontrem em regime de tempo parcial ou em regime de 7/7 ou se o período de actividade
  for prolongado». O Art. 24.º, n.º 14 chama ao PPY «relação de trabalho a tempo parcial anual». Se todo o PPY for tempo
  parcial, nenhum PPY receberia o prémio inteiro.
- **Exemplo:**

  | Contrato | Proporcional | Inteiro |
  |---|---|---|
  | FO, PPY 8/12 | 4 000,00 € | 6 000,00 € |
  | CPT, PPY 9/12 | 9 000,00 € | 12 000,00 € |

- **A aplicação hoje:** mostra os dois valores.
- **Pergunta:** o PPY recebe o prémio inteiro ou proporcional?

### TAP

#### D18. Pilotos: a 1.ª anuidade técnica de quem começa em janeiro

- **Texto:** RRRGS Cl. 4.ª, n.os 2, 5 e 7 (PDF p. 54 | BTE p. 315).
  - N.º 2: a contagem «tem início na data de largada conjunta».
  - N.º 5: a anuidade «vence-se após ser completado 1 ano de antiguidade de serviço, no dia 1 de janeiro imediatamente
    seguinte».
  - N.º 7: «por referência ao exercício efetivo da função no ano anterior».
- **Pergunta:** com largada a 1 de janeiro de 2024, a 1.ª anuidade vence a 1 de janeiro de 2025 ou a 1 de janeiro de 2026?
  Para um OP1 em 2025: 91,05 €/mês contra 0,00 €. A aplicação usa 2026, a leitura conservadora.

#### D19. Pilotos: valor das anuidades ganhas numa função anterior

- **Texto:**
  - RRRGS Cl. 4.ª, n.º 1: «produto do número de anuidades técnicas na função pelo respetivo valor inscrito na tabela em
    vigor em cada momento».
  - Tabela A-3.1 (PDF p. 69 | BTE p. 330): «2 % do VB».
  - O n.º 4 (prevalecem as anuidades das funções mais recentes) sugere que anuidades de funções diferentes valem coisas
    diferentes.
- **Exemplo:** comandante (CTE) desde maio de 2025, com largada em 2010 e anuidades acumuladas como copiloto (de OP1 a
  OP3C). Valor em março de 2026:

  | Leitura | Valor mensal |
  |---|---|
  | Cada anuidade ao VB da subcategoria desse ano (aplicação, conservadora) | 2 005,04 € |
  | Todas as anuidades de copiloto ao VB de OP3C | 2 166,33 € |
  | Todas ao VB de CTE | 2 663,52 € |

- **Pergunta:** qual é o valor certo? E as subcategorias OP1, OP2 e OP3 são "funções" diferentes?

#### D20. Cabine: formação por e-learning, 8 + 24 horas ou 24 horas?

- **Texto:** RRRGS Cl. 13.ª, n.º 2 (PDF p. 43 | BTE p. 313) e RUPT Cl. 38.ª, n.º 5, a) (PDF p. 80 | BTE p. 350): «145,00 € …
  referente a 8 horas»; «As demais horas … até ao limite de 24 horas/ano … 18,125 €/hora».
- **Exemplo:** 32 horas de e-learning num ano: 435,00 € (24 h no total, conservadora) contra 580,00 € (8 + 24 h).
- **A aplicação hoje:** mostra os dois valores.
- **Pergunta:** as "demais horas" contam depois das 8 primeiras, ou o limite de 24 h inclui-as?

#### D21. Férias e subsídio de férias no ano de admissão

- **Texto:**
  - AE Cl. 22.ª, n.º 2 (PDF p. 10 | BTE p. 280): «3 dias de férias por cada mês de duração do contrato, até ao máximo de 26
    dias e, de compensação de dias feriado, até ao máximo de 10 dias». O n.º 5 diz «mês completo».
  - Subsídio: cabine RRRGS Cl. 18.ª, n.os 2 e 3: «um mês de vencimento fixo mensal, ajustado à totalidade dos dias de férias
    a que tiver direito», «acrescido de 675,00 €». Pilotos RRRGS Cl. 7.ª, n.º 2: «subsídio equivalente à totalidade dos dias
    de férias a que tiver direito».
- **Exemplo:** tripulante de cabine CAB 3 admitido em abril de 2026.

  | Leitura | Subsídio |
  |---|---|
  | Mês inteiro (aplicação) | 2 695,73 € |
  | Ajustado a 36/42 dias | 2 407,05 € |
  | Ajustado a 26/42 dias (conservadora) | 1 925,93 € |

- **Perguntas:**
  1. No ano de admissão, o subsídio ajusta-se aos dias de férias?
  2. Os meses contam-se como meses de calendário ou como meses completos?
  3. Os 10 dias de compensação de feriados contam no ano de admissão?

#### D22. Atualização salarial votada em assembleia e não publicada

A aplicação usa, nos pilotos da TAP, um adiamento da atualização salarial de 2024/2025 votado em assembleia do SPAC (22
de março de 2024). Esse adiamento não está publicado no BTE. A tabela publicada (A-3.1) prevê atualização de 2 % a 1 de
janeiro de cada ano.

- **Pergunta:** um acordo destes, não publicado no BTE, altera a convenção perante o trabalhador?
- Vou pedir ao SPAC a ata ou o protocolo e recibos reais. Até lá, a aplicação passará a mostrar os dois valores.

#### D23. TAP cabine: os "2 %" de 2026 (KPI)

- **Texto:** RRRGS Cl. 3.ª, n.º 3 (PDF p. 39 | BTE p. 309): «Se o resultado líquido da empresa (…) se revelar positivo em
  2025, os valores da tabela salarial de vencimento base para 2026 terão uma atualização salarial adicional (KPI (…)) de
  2 %, resultando numa atualização global para o ano de 2026 de 10 % face aos valores em vigor no final do ano de 2025.
  Esta atualização está dependente da efetiva implementação das alterações à composição de tripulações constantes do
  Regulamento de Composição de Tripulações (RCT).»
- **As duas leituras:** a coluna de 2026 publicada já tem +8 % sobre 2025.
  - Leitura A, "2 %" sobre a coluna: CAB 3 2 020,73 € × 1,02 = 2 061,14 €.
  - Leitura B, "10 % face a 2025": 1 871,05 € × 1,10 = 2 058,16 € (só +1,85 % sobre a coluna).
- **Casos especiais:**
  - O CAB 0 está na tabela, mas é "indexado à RMMG" (920 €): o KPI aplica-se-lhe?
  - O S/C 4 de 2026 vem do C/C 3 com 4 anos ou mais (Cl. 17.ª): pela leitura B ficaria abaixo da própria coluna.
- **A aplicação hoje:** mostra a coluna como valor principal e a leitura A como máximo, com "incerto", em todas as
  categorias.
- **Perguntas:**
  1. Qual das leituras é a certa?
  2. O KPI aplica-se ao CAB 0?

### Entrada, saída e subsídios (todos os acordos)

#### D24. Mês da entrada: como se paga um mês incompleto

- **Texto:** os acordos não dizem como se paga o mês em que o tripulante entra a meio. Dizem só que os subsídios são «pagos
  proporcionalmente nos anos de contratação e cessação» (easyJet cabine Cl. 51.ª, n.º 1; pilotos Art. 36.º, n.º 1) ou «na
  proporção do tempo de trabalho prestado» (TAP: RRRGS Cl. 17.ª e Cl. 8.ª, n.º 2). A «remuneração base diária» aparece como
  a base do mês a dividir por 30 (complemento de doença da cabine easyJet, Cl. 61.ª; férias não gozadas dos pilotos).
- **A aplicação hoje:**
  - Vencimento do mês da entrada: base ÷ 30 × os dias desde a entrada, nunca mais do que o mês.
  - Subsídios desse ano: os meses desde a entrada, o da entrada pela parte trabalhada (dias trabalhados ÷ dias do mês).
- **Exemplo:** tripulante de cabine easyJet (FA, 2026, base de 1 346,57 €) que entra a 16 de março: março 718,17 € (16 dias);
  Natal 1 067,85 € (9 meses e 16/31).
- **Pergunta:** a divisão por 30 serve para o mês da entrada, ou devem contar-se os dias do próprio mês? Nos subsídios, o
  mês da entrada conta inteiro ou pela parte trabalhada?

#### D25. Ano da saída: subsídio de férias e de Natal

- **Texto:**
  - Os mesmos acordos: «pagos proporcionalmente nos anos de contratação e cessação».
  - Código do Trabalho, art. 245.º, n.º 1: na cessação, o trabalhador recebe a retribuição de férias e o subsídio
    «correspondentes a férias vencidas e não gozadas» e os «proporcionais ao tempo de serviço prestado no ano da cessação».
    Art. 263.º, n.º 2, b): Natal proporcional no ano da cessação.
- **As duas leituras (férias):**
  - Leitura do acordo: só o proporcional do ano (meses até à saída ÷ 12).
  - Leitura do Código do Trabalho: as férias vencidas a 1 de janeiro por inteiro, mais o proporcional do ano.
- **Exemplo:** FA easyJet que sai no fim de abril de 2026. Natal: 448,86 € (4/12). Férias: 448,86 € (acordo) contra
  1 795,43 € (Código do Trabalho: 1 346,57 € + 448,86 €).
- **A aplicação hoje:** no mês da saída mostra o Natal proporcional e as férias com o valor do acordo como certo e o do
  Código do Trabalho como máximo. Na TAP, o acordo é expresso (AE Cl. 22.ª, n.º 6 cabine e n.º 3 pilotos: «Se o contrato
  cessar antes de gozado o período de férias vencido no início do ano da cessação, o tripulante terá ainda direito a receber
  a retribuição correspondente a esse período, bem como o respetivo subsídio»): mostra o subsídio das férias vencidas como
  certo, se ainda não foi pago nesse ano, e o proporcional do ano como máximo.
- **Natal com baixa no ano da saída ou da entrada:** a aplicação conta o tempo de serviço prestado como os meses de contrato
  menos os dias de contrato suspenso a dividir pelos dias do ano (art. 263.º, n.º 2). Está certo somar as duas reduções
  desta maneira?
- **Pergunta:** qual das leituras vale? O acordo pode dar menos do que o art. 245.º?
- **Conservadora:** a do acordo (o valor mais baixo como certo).

#### D26. easyJet: a "média do pagamento variável" nos subsídios

- **Texto:**
  - Cabine, Cl. 51.ª, n.º 2 (BTE 8/2024): o subsídio de férias é «um mês de salário base (1/14 da remuneração base anual)
    acrescido de uma média do pagamento variável do tripulante («CPV/crew variable pay») e 1/14 do subsídio de idioma,
    quando aplicável, com base na média dos últimos 12 (doze) meses».
  - Pilotos, Art. 36.º, n.º 2 (BTE 40/2023): os dois subsídios são 1/14 da base anual «acrescido da média das prestações
    variáveis e das prestações permanentes pagas mensalmente».
- **O que falta:** o acordo não diz que rubricas são «pagamento variável» (setores, per diem, pernoitas, DDO, comissões de
  vendas?). Nos pilotos não diz o período da média, e a média entra também no Natal; na cabine só nas férias.
- **A aplicação hoje:** mostra só a parte certa (1/14 da base) e avisa que falta a média.
- **Pergunta:** que rubricas entram na média, em cada acordo? Nos pilotos, que período?

#### D27. TAP pilotos: prestação retributiva complementar e "disponibilidade"

- **Texto:** regulamento de retribuições, Cl. 10.ª (BTE 29/2023, p. 316–317): o piloto «com disponibilidade para o efeito»
  que não seja nomeado para serviços com per diem A ou B «que ocupem, no mínimo, 5 dias de calendário em cada mês» recebe o
  per diem A «por cada dia em que não seja escalado até ao limite de 5 dias». O n.º 2 equipara a disponível quem está de
  baixa «desde o 11.º dia», em assistência em casa, em formação sem per diem, e outros casos; o n.º 5 afasta a cláusula
  quando a operação for 50 % inferior ao mês homólogo.
- **A aplicação hoje:** com menos de 5 dias de per diem no mês, soma o per diem A pelos dias em falta. Com férias ou baixa
  no mês, ou no mês da entrada, mostra o valor só como máximo (a disponibilidade fica em dúvida).
- **Exemplo:** oficial piloto NB com 2 dias de voo em maio de 2026: 3 × 202,50 € = 607,50 €.
- **Pergunta:** um mês com férias (ou com baixa até ao 10.º dia) dá direito à prestação pelos dias em falta, por inteiro ou
  em proporção?

#### D28. Passar de tripulante de cabine a piloto na mesma companhia

- **Situação:** um tripulante de cabine que passa a piloto na mesma companhia muda de acordo de empresa (do acordo com o
  SNPVAC para o acordo com o SPAC) sem mudar de empregador.
- **Texto:** os acordos pagam os subsídios «proporcionalmente nos anos de contratação e cessação» (as cláusulas da D24 e da
  D25) e não dizem se esta mudança é uma cessação. Código do Trabalho, art. 263.º, n.º 2: o subsídio de Natal é proporcional
  «no ano de admissão» e «no ano de cessação do contrato».
- **As duas leituras:**
  - Continuidade: o contrato é o mesmo, ou a antiguidade mantém-se. Não há acerto de saída, e cada subsídio paga-se por
    inteiro, pelo acordo em vigor no mês em que é pago.
  - Cessação e nova admissão: no mês da mudança há um acerto de saída pelo acordo da cabine (proporcionais e férias
    vencidas), e esse ano conta como ano de admissão no acordo dos pilotos.
- **A aplicação hoje:** segue a continuidade.
- **Exemplo:** mudança em setembro de 2026. Subsídio de férias de junho por inteiro, pelo acordo da cabine; subsídio de Natal
  de novembro por inteiro, pelo acordo dos pilotos; nenhum acerto em setembro.
- **Pergunta:** qual das leituras vale em regra? Depende de ter sido assinado um contrato novo? A antiguidade conta desde a
  entrada na companhia ou desde a mudança?
- **Conservadora:** a continuidade (não mostra um acerto de saída que pode não existir).

### Anexo D-A — Factos que vou pedir aos sindicatos e à empresa (para contexto)

Estas questões não pedem uma leitura jurídica. Pedem um documento ou uma prática.

- Que significam os códigos de assistência da escala easyJet (SBY, STBY, STANDBY, RESERVE) e os códigos GND e MTG?
  A assistência em casa não é paga.
- Um recibo real de cada acordo com dias de baixa (D4) e com o mês em que o variável é pago.
- A lista de distâncias por rota que a easyJet usa no per diem (D11).
- TAP cabine: aplicou-se em 2026 a atualização adicional de 2 % ligada ao resultado de 2025 (RRRGS Cl. 3.ª, n.º 3)?
- TAP pilotos: o documento do adiamento salarial (D22).
- Deliberações das comissões paritárias da TAP (E5, E6).
- Dois números do Manual de Operações de cada companhia (easyJet e TAP), que o regime europeu deixa ao operador:
  - no serviço repartido, quanto tempo de pré-voo, pós-voo e deslocação se desconta da pausa em terra (CS FTL.1.220(b): no
    mínimo 30 minutos, "the operator specifies the actual times in its operations manual");
  - quanto tempo antes dos pilotos se apresenta a tripulação de cabine (ORO.FTL.205(c): o PSV máximo da cabine conta-se pela
    apresentação dos pilotos, com uma diferença de até 1 hora).

---

## Parte E — Dúvidas de leitura nos limites de fadiga

Termos usados nesta parte:

- **PSV** (período de serviço de voo): da apresentação até aos calços do último voo.
- **Repouso:** o período livre entre dois serviços.
- **Período crítico** (WOCL): as horas da madrugada em que o corpo está menos alerta, das 2h00 às 5h59.
- **RUPT e RRRGS:** dois dos regulamentos anexos ao acordo da TAP. Cada regulamento do BTE recomeça a numeração das
  cláusulas, por isso cito sempre o regulamento.

Quando o texto não decide e falta um facto, a aplicação mostra as duas leituras e diz "incerto". Não escolhe uma leitura
em silêncio.

### E0. Peso das perguntas frequentes da EASA

A EASA publica respostas a perguntas frequentes (FAQ) sobre o regime europeu dos limites de fadiga. Algumas respondem a
dúvidas que eu tinha. Pelo menos numa, a autoridade espanhola (AESA) publicou a leitura contrária.

1. Que valor jurídico têm as FAQ da EASA perante um tripulante, um operador e a ANAC? Posso apresentá-las na aplicação
   como "leitura da EASA"?
2. Quando a EASA e outra autoridade divergem, como peço à ANAC a leitura que aplica em Portugal? Há um meio formal?
   O anexo E-A lista as perguntas que penso enviar-lhe.

### E1. TAP cabine: um dia livre de 24 horas interrompe os "5 dias consecutivos"?

- **Texto:**
  - Cl. 4.ª, n.º 12 (BTE p. 327): "Folga semanal - Período livre de serviço, de, no mínimo, 48 (quarenta e oito) horas
    consecutivas, dentro de cada 7 (sete) dias consecutivos, gozado ininterruptamente na base".
  - RUPT Cl. 20.ª, n.º 4 (BTE p. 339): "entre 2 (dois) períodos de folga semanal, apenas podem ser planeados 5 (cinco) dias
    consecutivos de utilização".
- **Exemplo:** 5 dias de voo, 1 dia livre, 5 dias de voo, 2 dias livres.
  - Leitura A: o dia livre interrompe os dias consecutivos. A escala está dentro.
  - Leitura B: entre duas folgas semanais há 10 dias de utilização, e várias janelas de 7 dias não têm 48 h livres. A
    escala excede.
- **A aplicação hoje:** "incerto". A leitura B é a que protege o tripulante.
- **Pergunta:** qual das leituras está certa?

### E2. TAP cabine: assistência em casa no limite do trimestre

- **Texto:** Cl. 17.ª, n.º 11, c) (BTE p. 337): "As horas de assistência fora das instalações da empresa contam a 25 % para
  efeitos dos limites semanais, mensais e anuais de tempos de trabalho". O trimestre não é mencionado.
- **Exemplo:** um trimestre com 460 h de serviço e 60 h de assistência em casa.
  - A 25 %: 475 h, dentro das 480 h.
  - A 100 %: 520 h, excede.
- **A aplicação hoje:** calcula as duas e diz "incerto" quando só a de 100 % excede. A de 100 % é a que protege.
- **Pergunta:** que peso tem a assistência em casa no limite trimestral: 25 %, 100 % ou nenhum?

### E3. TAP pilotos: assistência no aeroporto antes de um voo (só confirmar)

- **Texto:** RUPT Cl. 19.ª (BTE p. 297).
  - O n.º 5 diz que o piloto chamado "fica sujeito aos tempos máximos de serviço de voo (…) fazendo-se o início da
    respetiva contagem à hora de apresentação".
  - O n.º 7, a) diz: "Quando a assistência se realize nas instalações da TAP a 50 % para todos os limites".
  - O n.º 7, b) diz, da assistência em casa: "não contando para os restantes limites".
- **Exemplo:** assistência das 8h00 às 12h00 e apresentação às 12h00; o limite diário é de 12h15.
  - Somando 50 % da assistência, os calços têm de ser até às 21h45.
  - Contando só a partir da apresentação, até às 23h45.
- **A aplicação hoje:** soma os 50 %, a leitura que protege.
- **Pergunta:** a soma está certa? Entendo que "todos os limites" inclui o limite diário.

### E4. TAP cabine: em que hora começa o "dia"

- **Texto:** Cl. 4.ª (BTE p. 327).
  - N.º 9: "Dia - Período de 24 (vinte e quatro) horas que começa às 0h00 locais".
  - N.º 13: "Hora local - Hora do local de onde o tripulante de cabine se encontra e realiza o descanso".
  - Nos pilotos o texto é diferente: "às zero horas locais da base".
- **Exemplo:** descanso em Ponta Delgada (uma hora a menos do que Lisboa). Um serviço acaba às 00h30 de Lisboa, que são
  23h30 locais. Esses 30 minutos contam no dia anterior (hora do local de descanso) ou no seguinte (hora da base)?
- **A aplicação hoje:** usa a hora local (já não a da base). Num voo entre fusos que passa a meia-noite calcula as duas
  leituras, a hora da partida e a da chegada: diz "excede" só se as duas excedem, e "incerto" se só uma excede.
- **Pergunta:** num voo que passa a meia-noite entre dois fusos, sem descanso pelo meio, conta a hora do local de partida
  ou a do local de chegada?

### E5. TAP: "períodos noturnos consecutivos"

- **Texto:**
  - Pilotos, RUPT Cl. 22.ª: "não pode efetuar mais de dois períodos de trabalho noturno consecutivos" (n.º 1), e "só um
    deles pode incluir (…) o período crítico" (n.º 2).
  - Cabine, Cl. 27.ª, n.º 2: "Destes, dois poderão ser consecutivos desde que entre eles e o outro exista uma folga
    semanal".
  - Nenhum dos acordos define "consecutivos", nem a regra europeia, nem o Código do Trabalho. No regime europeu, a FAQ da
    EASA 47617 diz que "consecutivos" são serviços noturnos "separados apenas por um período de repouso".
- **Exemplo:** um piloto de longo curso voa Lisboa–São Paulo de noite, a tocar o período crítico. Descansa 48 h em São
  Paulo e regressa de noite, também a tocar o período crítico, sem nenhum serviço pelo meio. São consecutivos? Se forem,
  excede o n.º 2.
- **A aplicação hoje:**
  - noites em dias seguidos são consecutivas;
  - com outro serviço ou uma folga pelo meio, não são;
  - no caso do exemplo, diz "incerto".
- **Perguntas:**
  1. Que leitura defende?
  2. Quem interpreta é a comissão paritária de cada acordo: pilotos, AE Cl. 10.ª, n.º 6 ("vinculam as partes nos mesmos
     termos deste AE"); cabine, AE Cl. 35.ª, n.º 6 ("tomadas por maioria (…) integrando o presente AE"). Sabe de alguma
     deliberação publicada?
  3. O Código do Trabalho (art. 493.º) exige unanimidade nas deliberações da comissão paritária? A cláusula da cabine
     diz "por maioria".

### E6. TAP: gralhas e contradições no texto publicado

O texto do BTE tem gralhas. Em cada caso indico a leitura que protege o tripulante e o que a aplicação faz.

| Onde | O texto | O que a aplicação faz |
|---|---|---|
| Pilotos, RUPT Cl. 35.ª, n.º 2, b) | "nas 2h60 que antecedem a hora de apresentação" | ainda não usado |
| Cabine, Cl. 23.ª, n.º 1, c) contra Cl. 24.ª, n.º 3 | "igual ou superior a três (3) dias" contra "superior a 3 dias" | usa 3 ou mais (protege) |
| Cabine, tabela de aclimatização | "Até 4" e "4, 5 e 6" (o 4 aparece nas duas linhas) | duas leituras; com 4 h, "incerto" |
| Cabine Cl. 29.ª contra pilotos | "a partir da terceira" hora contra "além da terceira" zona | duas leituras |
| Cabine Cl. 30.ª, n.º 2, b) | "diferença horária (…) de 6 horas": exatamente 6, ou 6 ou mais? | "incerto" |
| Cabine, remissões | Cl. 20.ª, n.º 7 ("número 4"); Cl. 20.ª, n.º 10, a) ("em 9)"); Cl. 24.ª, n.º 4, a), i) ("cláusula 14.ª, «Serviço de reserva»") apontam para o sítio errado | ainda não usadas |
| Pilotos, RUPT Cl. 21.ª, n.º 3 | remete para a Cl. 38.ª, que não tem um número de dias por mês | ainda não usado |

**Pergunta:** há uma leitura assente, uma deliberação da comissão paritária ou uma retificação publicada para alguma
destas?

### E7. TAP: duas dúvidas menores

1. **Cabine, folga depois de um serviço longo:** RUPT Cl. 20.ª, n.os 13, b) e 14. A folga devida depois de um PSV de
   longo curso, ou com mais de 6 h de diferença horária, refere-se ao PSV de regresso ou a qualquer PSV da rotação? A
   aplicação diz "incerto"; "qualquer um" protege.
2. **Pilotos, período crítico no longo curso:** RUPT Cl. 6.ª, n.º 21, "numa faixa de três zonas horárias". Com 2 ou 3
   zonas de diferença, conta a hora da base ou já a regra das 48 h? A aplicação calcula as duas e diz "incerto".

### E8. Validades: o Regulamento 1182/71 aplica-se aos prazos de formação?

- **Texto:**
  - Regulamento (UE) 2015/1998, 11.4.3, a): formação de segurança "pelo menos uma vez em cada 5 anos".
  - Regulamento (CEE, Euratom) n.º 1182/71, art. 3.º, n.º 4: "Se o último dia de um prazo (…) for um dia feriado, um
    domingo ou um sábado, o prazo termina com o decurso da última hora do dia útil seguinte".
- **A aplicação hoje:** não alarga. A validade acaba no próprio dia, mesmo ao fim de semana, e a nota explica que pode ir
  até ao dia útil seguinte se o art. 3.º, n.º 4 se aplicar.
- **Pergunta:** uma periodicidade de formação é um "prazo" para o 1182/71? Se for, passo a alargar.

### Anexo E-A — Perguntas que penso enviar à ANAC (para a sua opinião)

São perguntas de interpretação do regime europeu. Quem responde é a autoridade, não o advogado. Junto-as para me dizer
se as devo enviar e como.

1. **Serviço repartido sem quarto (CS FTL.1.220(d) e (e)).** Uma pausa em terra de 6 h ou mais, ou que toca o período
   crítico, permite prolongar o PSV se o operador der só uma sala com condições, e não um quarto? A FAQ da EASA 47628 diz
   que é preciso um quarto; a AESA diz que basta a sala, e que não conta a parte da pausa acima de 6 h ou dentro do
   período crítico. Exemplo: com sala, o máximo é 15h30; sem extensão, 12h30.
2. **Janelas de 7, 14 e 28 dias (ORO.FTL.210(a)).** "7 dias consecutivos" são 7 dias locais (em que fuso?) ou qualquer
   período de 168 horas?
3. **Prolongamento "planeado com antecedência" (ORO.FTL.205(d)(3)).** Uma alteração feita na véspera conta como planeada,
   ou só o que está na escala publicada?
4. **Segundo adiamento da apresentação (CS FTL.1.205(d)(1)(ii)).** Depois de um segundo aviso, o máximo calcula-se pela
   primeira hora adiada ou pela hora final?
5. **Cabine com repouso a bordo (CS FTL.1.205(c)(3)).** O limite da tabela ("Not allowed" acima de um certo PSV)
   aplica-se ao PSV da própria cabine, já com a diferença de apresentação em relação aos pilotos?
