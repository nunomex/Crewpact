// Regulamento (UE) n.º 83/2014 da Comissão, de 29 de janeiro de 2014
// (altera o Reg. (UE) n.º 965/2012) — Subparte FTL.
// Texto integral reproduzido do Jornal Oficial da União Europeia (L 28, 31.1.2014).

export const FTL_SECTIONS = [
  { id: 'reg', badge: 'REG', title: 'Regulamento (UE) n.º 83/2014' },
  { id: 'aro', badge: 'ARO', title: 'Anexo I — Autoridade competente' },
  { id: 'gen', badge: 'S1',  title: 'Subparte FTL — Secção 1 · Disposições gerais' },
  { id: 'cat', badge: 'S2',  title: 'Subparte FTL — Secção 2 · Operadores CAT' },
];

// ─── Quadro 1 · Estado de aclimatação (ORO.FTL.105, ponto 1) ─────────────────
// Linhas = diferença horária; colunas = tempo decorrido desde a apresentação.
export const FTL_TABLE1 = {
  rowHeader: 'Diferença horária (h) entre a hora de referência e a hora local a que o tripulante inicia o turno seguinte',
  colHeader: 'Tempo decorrido desde a apresentação ao serviço na hora de referência',
  cols: ['≥ 48', '', '≥ 48', '', '≥ 48'],
  rows: [
    { diff: '< 4',  v: ['B', '< 4', 'B', '< 4', 'B'] },
    { diff: '≤ 6',  v: ['B', '≤ 6', 'B', '≤ 6', 'B'] },
    { diff: '≤ 9',  v: ['B', '≤ 9', 'B', '≤ 9', 'B'] },
    { diff: '≤ 12', v: ['B', '≤ 12', 'B', '≤ 12', 'B'] },
  ],
  legend: [
    '"B": aclimatado à hora local do fuso horário de partida,',
    '"D": aclimatado à hora local do lugar em que o tripulante inicia o turno seguinte, e',
    '"X": tripulante cujo estado de aclimatação é desconhecido;',
  ],
};

// ─── Quadro 2 · PSV máximo diário — Tripulantes aclimatados ──────────────────
export const PSV_SECTORS = ['1–2', '3', '4', '5', '6', '7', '8', '9', '10'];

export const PSV_ACCLIMATISED = [
  { start: '0600–1329', v: ['13:00', '12:30', '12:00', '11:30', '11:00', '10:30', '10:00', '9:30', '9:00'] },
  { start: '1330–1359', v: ['12:45', '12:15', '11:45', '11:15', '10:45', '10:15', '9:45', '9:15', '9:00'] },
  { start: '1400–1429', v: ['12:30', '12:00', '11:30', '11:00', '10:30', '10:00', '9:30', '9:00', '9:00'] },
  { start: '1430–1459', v: ['12:15', '11:45', '11:15', '10:45', '10:15', '9:45', '9:15', '9:00', '9:00'] },
  { start: '1500–1529', v: ['12:00', '11:30', '11:00', '10:30', '10:00', '9:30', '9:00', '9:00', '9:00'] },
  { start: '1530–1559', v: ['11:45', '11:15', '10:45', '10:15', '9:45', '9:15', '9:00', '9:00', '9:00'] },
  { start: '1600–1629', v: ['11:30', '11:00', '10:30', '10:00', '9:30', '9:00', '9:00', '9:00', '9:00'] },
  { start: '1630–1659', v: ['11:15', '10:45', '10:15', '9:45', '9:15', '9:00', '9:00', '9:00', '9:00'] },
  { start: '1700–0459', v: ['11:00', '10:30', '10:00', '9:30', '9:00', '9:00', '9:00', '9:00', '9:00'] },
  { start: '0500–0514', v: ['12:00', '11:30', '11:00', '10:30', '10:00', '9:30', '9:00', '9:00', '9:00'] },
  { start: '0515–0529', v: ['12:15', '11:45', '11:15', '10:45', '10:15', '9:45', '9:15', '9:00', '9:00'] },
  { start: '0530–0544', v: ['12:30', '12:00', '11:30', '11:00', '10:30', '10:00', '9:30', '9:00', '9:00'] },
  { start: '0545–0559', v: ['12:45', '12:15', '11:45', '11:15', '10:45', '10:15', '9:45', '9:15', '9:00'] },
];

// ─── Quadros 3 e 4 · estado de aclimatação desconhecido ──────────────────────
export const PSV_UNKNOWN_SECTORS = ['1–2', '3', '4', '5', '6', '7', '8'];
export const PSV_UNKNOWN     = ['11:00', '10:30', '10:00', '9:30', '9:00', '9:00', '9:00']; // Quadro 3
export const PSV_UNKNOWN_FRM = ['12:00', '11:30', '11:00', '10:30', '10:00', '9:30', '9:00']; // Quadro 4 (SGRF)

// ─── Referência rápida (ORO.FTL.210 / 235) ───────────────────────────────────
export const FTL_LIMITS = {
  duty: [
    { period: '7 dias consecutivos',  value: '60 h' },
    { period: '14 dias consecutivos', value: '110 h' },
    { period: '28 dias consecutivos', value: '190 h' },
  ],
  flight: [
    { period: '28 dias consecutivos',  value: '100 h' },
    { period: 'Ano civil',             value: '900 h' },
    { period: '12 meses consecutivos', value: '1000 h' },
  ],
  rest: [
    { label: 'Repouso mínimo na base',      value: '≥ serviço anterior ou 12 h (o maior)' },
    { label: 'Repouso mínimo longe da base', value: '≥ serviço anterior ou 10 h (o maior), c/ 8 h de sono' },
    { label: 'Repouso de recuperação',      value: '≥ 36 h c/ 2 noites locais · máx. 168 h entre eles' },
  ],
};

// ─── ORO.FTL.105 — Definições (texto integral) ───────────────────────────────
export const FTL_DEFINITIONS = [
  { term: '1) Aclimatado', def: 'Estado de um tripulante cujo relógio biológico circadiano (WOCL) está sincronizado com o fuso horário do local em que se encontra. Considera-se que um tripulante está aclimatado a um fuso horário com uma diferença de até duas horas em relação à hora local no ponto de partida. Quando a hora local no lugar de entrada ao serviço tem uma diferença superior a 2 horas em relação à hora local no lugar de início do serviço seguinte, o tripulante, para efeitos de cálculo do período de serviço de voo máximo diário, considera-se aclimatado de acordo com os valores constantes do quadro 1.' },
  { term: '2) Hora de referência', def: 'Hora local no ponto de apresentação ao serviço num fuso horário com até duas horas de diferença em relação à hora local no lugar a que o tripulante está aclimatado;' },
  { term: '3) Alojamento', def: 'Para efeitos de um serviço de assistência e de um serviço de voo repartido, um local calmo e confortável não aberto ao público, com possibilidade de controlar a luminosidade e a temperatura, equipado com mobiliário adequado, no qual o tripulante pode dormir, que tem capacidade suficiente para acomodar todos os tripulantes presentes em simultâneo e garante alimentação e bebidas;' },
  { term: '4) Alojamento adequado', def: 'Para efeitos do serviço de assistência, do serviço de voo repartido e do período de repouso, um quarto separado para cada tripulante, localizado num lugar calmo e equipado com uma cama, com ventilação suficiente e dispositivos para regular a temperatura e a intensidade da luz e acesso a alimentação e bebidas;' },
  { term: '5) Tripulação de voo reforçada', def: 'Tripulação de voo composta por um número de pessoas superior ao mínimo exigido para operar a aeronave, em que os tripulantes de voo podem abandonar o seu posto para descansar em voo e ser substituídos por outros tripulantes de voo devidamente qualificados;' },
  { term: '6) Intervalo', def: 'Período de tempo durante um período de serviço de voo inferior a um período de repouso que conta como serviço e durante o qual o tripulante é libertado de todas as tarefas;' },
  { term: '7) Adiamento da hora de apresentação ao serviço', def: 'O adiamento, pelo operador, de um período de serviço de voo programado, antes de um tripulante ter partido do local de repouso;' },
  { term: '8) Horário irregular', def: 'Escala de serviço de um tripulante que prejudica a possibilidade de dormir durante o período de sono ideal dado incluir um período de serviço de voo ou uma combinação de períodos de serviço de voo que se sobrepõem, começam ou terminam durante qualquer porção do dia ou da noite a que o tripulante está aclimatado. Um horário pode ser irregular devido a entrada matinal ou a saída tardia do serviço ou à prestação de serviços noturnos.\n\na) Por horário irregular de "tipo matinal" entende-se:\ni) em caso de "entrada ao serviço matinal": um período de serviço que começa entre as 05h00 e as 05h59 no fuso horário a que o tripulante está aclimatado, e\nii) em caso de "largada de serviço tardia": um período de serviço que termina entre as 23h00 e as 01h59 no fuso horário a que o tripulante está aclimatado.\n\nb) Por horário irregular de "tipo tardio" entende-se:\ni) em caso de "entrada ao serviço matinal": um período de serviço que começa entre as 05h00 e as 06h59 no fuso horário a que o tripulante está aclimatado; e\nii) em caso de "largada de serviço tardia": um período de serviço que termina entre as 00h00 e as 01h59 no fuso horário a que o tripulante está aclimatado;' },
  { term: '9) Serviço noturno', def: 'Um período de serviço que se sobrepõe a parte do período entre as 02h00 e as 04h59 no fuso horário a que a tripulação está aclimatada;' },
  { term: '10) Serviço', def: 'Qualquer tarefa executada por um tripulante por ordem do operador, incluindo o serviço de voo, o trabalho administrativo, a formação e a qualificação - tanto na qualidade de formando como de formador, o posicionamento e certos elementos do serviço de assistência;' },
  { term: '11) Período de serviço', def: 'Período que começa no momento em que, por ordem do operador, um tripulante se apresenta ao serviço ou inicia um serviço e que termina quando esse tripulante é libertado de todas as tarefas, incluindo o serviço pós-voo;' },
  { term: '12) Período de serviço de voo (PSV)', def: 'Um período que começa quando um tripulante se deve apresentar ao serviço, que inclui um setor ou série de setores, e que termina quando a aeronave fica finalmente imobilizada e os motores são desligados, no final do último setor em que o tripulante desempenha funções;' },
  { term: '13) Tempo de voo', def: 'No caso dos aviões e dos motoplanadores, o tempo decorrido entre o primeiro movimento de saída de uma aeronave do lugar de estacionamento com o objetivo de descolar e a sua imobilização na posição de estacionamento designada, com todos os motores ou hélices desligados;' },
  { term: '14) Base', def: 'O local atribuído ao tripulante pelo operador, a partir do qual o tripulante normalmente inicia e termina um período de serviço ou uma série de períodos de serviço e no qual, em circunstâncias normais, o operador não é responsável pelo alojamento do tripulante em causa;' },
  { term: '15) Dia local', def: 'Um período de 24 horas que começa às 00h00, hora local;' },
  { term: '16) Noite local', def: 'Um período de 8 horas compreendido entre as 22h00 e as 08h00, hora local;' },
  { term: '17) Tripulante em funções', def: 'Um tripulante que presta serviço numa aeronave num setor;' },
  { term: '18) Posicionamento', def: 'A deslocação de um tripulante que não está a desempenhar funções de um local para outro, por ordem do operador, excluindo\n— o tempo de deslocação entre um local de repouso privado e o local de apresentação ao serviço indicado e vice-versa, e\n— o tempo de transferência local entre um local de repouso e o início do serviço e vice-versa;' },
  { term: '19) Espaço de repouso', def: 'Um beliche ou assento com apoio para pés e pernas, adequado para a tripulação poder dormir a bordo de uma aeronave;' },
  { term: '20) Reserva', def: 'Período de tempo durante o qual um tripulante deve estar disponível, por ordem do operador, para ser escalado para um período de serviço de voo, um posicionamento ou outro serviço, comunicado com pelo menos 10 horas de antecedência;' },
  { term: '21) Período de repouso', def: 'Período de tempo contínuo, ininterrupto e definido, antes ou depois de um serviço, durante o qual um tripulante é libertado de todas as tarefas, incluindo os serviços de assistência e reserva;' },
  { term: '22) Rotação', def: 'Um serviço ou série de serviços, incluindo pelo menos um serviço de voo e períodos de repouso fora da base, que começa na base e termina com o regresso à base para um período de repouso, em que o operador deixa de ser responsável pelo alojamento do tripulante;' },
  { term: '23) Dia de folga único', def: 'Para efeitos do cumprimento do disposto na Diretiva 2000/79/CE do Conselho, um período em que o tripulante é libertado de todas as tarefas, incluindo o serviço de assistência, composto por um dia ou duas noites locais, e que é comunicado com antecedência. Pode incluir um período de repouso;' },
  { term: '24) Setor', def: 'O segmento de um período de serviço de voo compreendido entre o primeiro movimento de uma aeronave para efeitos de descolagem e a sua imobilização após a aterragem na posição de estacionamento designada;' },
  { term: '25) Serviço de assistência', def: 'Período de tempo definido e previamente comunicado durante o qual, por ordem do operador, um tripulante deve estar disponível para ser escalado para um voo, um posicionamento ou outro serviço sem período de repouso intermédio;' },
  { term: '26) Serviço de assistência no aeroporto', def: 'Um serviço de assistência prestado no aeroporto;' },
  { term: '27) Outro serviço de assistência', def: 'Um serviço de assistência na residência ou num alojamento adequado;' },
  { term: '28) Período crítico do ritmo circadiano (WOCL)', def: 'Período compreendido entre as 02h00 e as 05h59 no fuso horário a que o tripulante está aclimatado.' },
];

// ─── Artigos (texto integral) ────────────────────────────────────────────────
export const FTL_ARTICLES = [
  // ── O Regulamento ──
  {
    code: 'Considerandos', section: 'reg', title: 'Considerandos',
    sub: 'Preâmbulo do Regulamento (UE) n.º 83/2014.',
    body: [
      '(1) O Regulamento (UE) n.º 965/2012 da Comissão, que estabelece os requisitos técnicos e os procedimentos administrativos para as operações aéreas, substituiu o anexo III do Regulamento (CEE) n.º 3922/91 do Conselho, com exceção da subparte Q, relativa às limitações do tempo de voo e de serviço e aos requisitos de repouso.',
      '(2) Em conformidade com o artigo 22.º, n.º 2, do Regulamento (CE) n.º 216/2008, as regras de execução aplicáveis aos tempos de voo e de serviço e aos requisitos de repouso devem, desde o início, incluir todas as disposições substantivas do anexo III, subparte Q, do Regulamento (CEE) n.º 3922/91, tendo em conta os últimos progressos científicos e técnicos.',
      '(3) O presente regulamento constitui uma medida de execução referida no artigo 8.º, n.º 5, e no artigo 22.º, n.º 2, do Regulamento (CE) n.º 216/2008. Por conseguinte, em conformidade com o artigo 69.º, n.º 3, do Regulamento (CE) n.º 216/2008, a subparte Q do anexo III do Regulamento (CEE) n.º 3922/91 deve ser eliminada. Contudo, a subparte Q do anexo III do Regulamento (CEE) n.º 3922/91 deve continuar a ser aplicável até os períodos transitórios previstos no presente regulamento terem caducado e para os tipos de operações em relação às quais não tenham sido estabelecidas medidas de execução.',
      '(4) O presente regulamento não prejudica os limites, nem as normas mínimas já estabelecidas pela Diretiva 2000/79/CE do Conselho, nomeadamente as disposições relativas ao tempo de trabalho e dias de folgas, que devem ser sempre respeitadas no caso do pessoal móvel da aviação civil. As disposições do presente regulamento, e outras que tenham sido aprovadas em aplicação do mesmo, não têm por objetivo justificar quaisquer reduções dos atuais níveis de proteção do pessoal móvel. As disposições do presente regulamento não impedem e são sem prejuízo de eventuais regras sociais e convenções coletivas de trabalho nacionais cujo nível de proteção seja mais elevado no que respeita às condições laborais e em matéria de higiene e segurança no trabalho.',
      '(5) Os Estados-Membros podem derrogar ou desviar-se do disposto no presente regulamento ou das especificações de certificação conexas respetivamente, aplicando disposições com um nível de segurança pelo menos equivalente ao previsto no presente regulamento, a fim de melhor responderem a circunstâncias ou práticas operacionais nacionais particulares. As derrogações e os desvios ao disposto no presente regulamento devem ser notificados e tratados em conformidade com os artigos 14.º e 22.º do Regulamento (CE) n.º 216/2008, que preveem decisões transparentes e não discriminatórias, baseadas em critérios objetivos.',
      '(6) A Agência Europeia para a Segurança da Aviação (a seguir designada por «Agência») elaborou um projeto de regras de execução, que apresentou à Comissão na forma de um parecer, em conformidade com o artigo 19.º, n.º 1, do Regulamento (CE) n.º 216/2008.',
      '(7) O Regulamento (UE) n.º 965/2012 deve, por conseguinte, ser alterado de modo a incluir as limitações do tempo de voo e de serviço e os requisitos de repouso.',
      '(8) As medidas previstas no presente regulamento são conformes com o parecer do comité instituído pelo artigo 65.º do Regulamento (CE) n.º 216/2008,',
    ],
  },
  {
    code: 'Artigo 1.º', section: 'reg', title: 'Alterações ao Regulamento 965/2012',
    sub: 'O Regulamento (UE) n.º 965/2012 é alterado.',
    body: [
      'O Regulamento (UE) n.º 965/2012 é alterado do seguinte modo:',
      '1) No artigo 2.º, é aditado o seguinte ponto 6: «6) "Operação de táxi aéreo", para efeitos das limitações dos tempos de voo e de serviço, as operações de transporte aéreo comercial não regulares realizadas a pedido com aviões de configuração operacional máxima (MOPSC) até 19 lugares de passageiros, inclusive.».',
      '2) O artigo 8.º passa a ter a seguinte redação: «Artigo 8.º — Limitações do tempo de voo. 1. As operações de CAT realizadas com aviões devem cumprir o disposto na subparte FTL do anexo III. 2. Em derrogação do n.º 1, as operações de táxi aéreo, os serviços médicos de emergência e as CAT com aviões monopiloto devem cumprir o disposto no artigo 8.º, n.º 4, do Regulamento (CEE) n.º 3922/91 e no anexo III, subparte Q, do Regulamento (CEE) n.º 3922/91, bem como nas derrogações nacionais correspondentes baseadas em avaliações dos riscos para a segurança efetuadas pelas autoridades competentes. 3. As operações CAT com helicópteros devem cumprir os requisitos nacionais.».',
      '3) É aditado o seguinte artigo 9.º-A: «Artigo 9.º-A. A Agência deve efetuar uma análise permanente da eficácia das disposições relativas às limitações do tempo de voo e de serviço e aos requisitos de repouso que constam dos anexos II e III. A Agência deve apresentar um primeiro relatório com os resultados dessa análise até 18 de fevereiro de 2019. Essa análise, que deve envolver especialistas na área científica, deve basear-se nos dados operacionais recolhidos com a assistência dos Estados-Membros, numa perspetiva de longo prazo, a partir da data de aplicação do presente regulamento. A análise referida no n.º 1 deve avaliar o impacto no estado de alerta da tripulação de voo, pelo menos, dos seguintes fatores: — turnos de duração superior a 13 horas, no período mais favorável do dia, — turnos de duração superior a 10 horas, no período menos favorável do dia, — turnos de duração superior a 11 horas para os tripulantes cujo estado de aclimatação seja desconhecido, — turnos que comportam um grande número de setores (> 6), — serviços de guarda, nomeadamente os serviços de assistência ou de reserva seguidos de serviços de voo, e — horários irregulares.».',
      '4) O anexo II é alterado em conformidade com o anexo I do presente regulamento.',
      '5) O anexo III é alterado em conformidade com o anexo II do presente regulamento.',
    ],
  },
  {
    code: 'Artigo 2.º', section: 'reg', title: 'Entrada em vigor',
    sub: 'Aplicável a partir de 18 de fevereiro de 2016.',
    body: [
      'O presente regulamento entra em vigor no vigésimo dia seguinte ao da sua publicação no Jornal Oficial da União Europeia.',
      'É aplicável a partir de 18 de fevereiro de 2016.',
      'Em derrogação do disposto no segundo parágrafo, os Estados-Membros podem optar por não aplicar o disposto no anexo III, secção ORO.FTL.205, alínea e), do Regulamento (UE) n.º 965/2012 e continuar a aplicar as disposições nacionais em vigor relativas ao repouso a bordo até 17 de fevereiro de 2017.',
      'Se um Estado-Membro aplicar o disposto no terceiro parágrafo, deve notificar a Comissão e a Agência e descrever as razões da derrogação, a sua duração e o plano de execução, do qual devem constar as ações previstas e o respetivo calendário.',
      'O presente regulamento é obrigatório em todos os seus elementos e diretamente aplicável em todos os Estados-Membros.',
      'Feito em Bruxelas, em 29 de janeiro de 2014. Pela Comissão, O Presidente, José Manuel BARROSO.',
    ],
  },

  // ── Anexo I — ARO.OPS ──
  {
    code: 'ARO.OPS.230', section: 'aro', title: 'Determinação dos horários irregulares',
    sub: 'Anexo I — aditado ao anexo II do Reg. 965/2012.',
    body: [
      'Para efeitos das limitações do tempo de voo, a autoridade competente deve determinar, em conformidade com as definições de horário irregular do "tipo matinal" e do "tipo tardio" constantes do anexo III, secção ORO.FTL.105, qual dos dois tipos de horários se aplica aos operadores de CAT sob a sua supervisão.',
    ],
  },
  {
    code: 'ARO.OPS.235', section: 'aro', title: 'Aprovação dos planos que especificam os tempos de voo',
    sub: 'Anexo I — aprovação pela autoridade competente.',
    body: [
      'a) A autoridade competente deve aprovar os planos individuais que especificam os tempos de voo propostos pelos operadores de CAT se o operador demonstrar a conformidade com o Regulamento (CE) n.º 216/2008 e com o anexo III, subparte FTL, do presente regulamento.',
      'b) Sempre que o plano que especifica os tempos de voo proposto por um operador se desviar das especificações de certificação aplicáveis definidas pela Agência, a autoridade competente deve adotar o procedimento descrito no artigo 22.º, n.º 2, do Regulamento (CE) n.º 216/2008.',
      'c) Sempre que o plano que especifica os tempos de voo proposto por um operador se desviar das especificações de certificação aplicáveis, a autoridade competente deve adotar o procedimento descrito no artigo 14.º, n.º 6, do Regulamento (CE) n.º 216/2008.',
      'd) As derrogações e desvios autorizados devem, uma vez aplicados, ser sujeitos a uma avaliação para determinar se devem ser confirmados ou alterados. A autoridade competente e a Agência devem realizar uma avaliação independente, com base nas informações fornecidas pelos operadores. A avaliação deve ser proporcionada, transparente e basear-se nos princípios e conhecimentos científicos.',
    ],
  },

  // ── Subparte FTL — Secção 1 ──
  {
    code: 'ORO.FTL.100', section: 'gen', title: 'Âmbito',
    sub: 'Regras aplicáveis aos operadores e tripulações.',
    body: [
      'A presente subparte estabelece as regras a cumprir pelos operadores e pelas respetivas tripulações no que respeita às limitações dos tempos de voo e de serviço e aos requisitos de repouso aplicáveis aos tripulantes.',
    ],
  },
  {
    code: 'ORO.FTL.105', section: 'gen', title: 'Definições',
    sub: 'Para efeitos da presente subparte, entende-se por… (28 definições).',
    defs: true,
    body: ['Para efeitos da presente subparte, entende-se por:'],
  },
  {
    code: 'ORO.FTL.110', section: 'gen', title: 'Responsabilidades do operador',
    sub: 'O operador deve…',
    body: [
      'O operador deve:',
      'a) Publicar as escalas de serviço com antecedência suficiente, de modo a permitir aos tripulantes planearem um repouso adequado;',
      'b) Assegurar que os períodos de serviço de voo sejam planeados de modo a permitir que os tripulantes estejam suficientemente repousados para poderem prestar serviço de acordo com níveis satisfatórios de segurança em quaisquer circunstâncias;',
      'c) Definir horas de apresentação ao serviço que permitam dispor de tempo suficiente para as tarefas em terra;',
      'd) Ter em conta a relação entre a frequência e o padrão dos períodos de serviço de voo e de repouso e os efeitos acumulados da prestação de tempos de serviço longos combinados com períodos de repouso mínimos;',
      'e) Atribuir turnos de serviço que evitem práticas geradoras de graves desregulamentos dos padrões de sono/trabalho, nomeadamente serviços diurnos/noturnos alternados;',
      'f) Cumprir as disposições aplicáveis aos horários irregulares em conformidade com o disposto na secção ARO.OPS.230;',
      'g) Prever períodos de repouso suficientemente longos que permitam à tripulação superar os efeitos de serviços anteriores e estar bem repousada no início do período de serviço de voo seguinte;',
      'h) Planear períodos de repouso de recuperação prolongados recorrentes e comunicá-los à tripulação com antecedência suficiente;',
      'i) Planear os serviços de voo de modo a terminarem no período de serviço de voo admissível, tendo em conta o tempo necessário para a realização das tarefas pré-voo, o setor e os tempos de rotação entre voos;',
      'j) Alterar um horário e/ou a composição da tripulação quando o período de operação efetivo exceder o período de serviço de voo máximo em mais de 33 % dos serviços de voo nesse horário durante um período de programação sazonal.',
    ],
  },
  {
    code: 'ORO.FTL.115', section: 'gen', title: 'Responsabilidades dos tripulantes',
    sub: 'Os tripulantes devem…',
    body: [
      'Os tripulantes devem:',
      'a) Cumprir o disposto na secção CAT.GEN.MPA.100, alínea b), do anexo IV (Parte CAT); e',
      'b) Tirar o máximo proveito das oportunidades e das instalações disponibilizadas para o repouso e planear e utilizar devidamente os seus períodos de repouso.',
    ],
  },
  {
    code: 'ORO.FTL.120', section: 'gen', title: 'Gestão dos riscos associados à fadiga',
    sub: 'Sistema de gestão dos riscos associados à fadiga (SGRF).',
    body: [
      'a) Quando requerido pela presente subparte ou por uma especificação de certificação aplicável, o operador deve estabelecer, implementar e manter um sistema de gestão dos riscos associados à fadiga (SGRF), como parte integrante do seu sistema de gestão. O SGRF deve garantir o cumprimento dos requisitos essenciais constantes do ponto 7, alíneas f) e g), e do ponto 8, alínea f), do anexo IV do Regulamento (CE) n.º 216/2008. O SGRF deve constar do Manual de Operações.',
      'b) O SGRF, tal como estabelecido, implementado e mantido, deve prever a melhoria contínua do seu nível de desempenho global e incluir:',
      '(1) Uma descrição da filosofia e dos princípios do operador com respeito à GRF, designados por política de gestão dos riscos associados à fadiga;',
      '(2) A documentação dos processos de gestão dos riscos associados à fadiga, incluindo um processo de sensibilização do pessoal para as respetivas responsabilidades e o procedimento de alteração dessa documentação;',
      '(3) Os princípios e conhecimentos científicos;',
      '(4) Um processo de identificação dos perigos e de avaliação dos riscos que permita a gestão contínua dos riscos operacionais para o operador decorrentes da fadiga dos tripulantes;',
      '(5) Uma estratégia de redução dos riscos que preveja a adoção imediata das medidas corretivas necessárias para reduzir eficazmente os riscos operacionais decorrentes da fadiga dos tripulantes e a monitorização contínua e avaliação regular da redução dos riscos de fadiga alcançada com essas ações;',
      '(6) Processos de garantia da segurança do SGRF;',
      '(7) Processos de promoção do SGRF.',
      'c) O SGRF deve corresponder à dimensão do operador e à natureza e complexidade da sua atividade, tendo em conta os perigos e riscos associados a estas atividades e o plano que especifica os tempos de voo.',
      'd) Se o processo de garantia da segurança no âmbito do SGRF mostrar que o operador não mantém o nível de desempenho de segurança requerido, deverão ser tomadas medidas de mitigação.',
    ],
  },
  {
    code: 'ORO.FTL.125', section: 'gen', title: 'Planos que especificam os tempos de voo',
    sub: 'Estabelecimento, aprovação e desvios.',
    body: [
      'a) Os operadores devem estabelecer, implementar e manter planos que especificam os tempos de voo adequados aos tipos de operações realizadas e cumprir o disposto no Regulamento (CE) n.º 216/2008, na presente subparte e na restante legislação aplicável, nomeadamente a Diretiva 2000/79/CE.',
      'b) Antes de serem implementados, os planos que especificam os tempos de voo, incluindo os sistemas de gestão dos riscos associados à fadiga correspondentes, se necessário, devem ser aprovados pela autoridade competente.',
      'c) Para demonstrar o cumprimento do Regulamento (CE) n.º 216/2008 e da presente subparte, o operador deve respeitar as especificações de certificação aplicáveis adotadas pela Agência. Alternativamente, caso pretenda desviar-se dessas especificações de certificação ao abrigo do artigo 22.º, n.º 2, do Regulamento (CE) n.º 216/2008, o operador deve, previamente à sua implementação, fornecer à autoridade competente uma descrição completa do desvio previsto. A descrição deve incluir a eventual revisão dos manuais ou procedimentos em causa e uma avaliação para comprovar o cumprimento dos requisitos estabelecidos no Regulamento (CE) n.º 216/2008 e na presente subparte.',
      'd) Para efeitos do disposto na secção ARO.OPS.235, alínea d), no prazo de 2 anos a contar da data de aplicação do desvio ou da derrogação, o operador deve recolher os dados relativos aos desvios e derrogações aplicados e analisar esses dados de acordo com princípios científicos, com vista a avaliar os efeitos desses desvios ou derrogações no nível de fadiga das tripulações. Essa análise deve ser apresentada à autoridade competente na forma de um relatório.',
    ],
  },

  // ── Subparte FTL — Secção 2 ──
  {
    code: 'ORO.FTL.200', section: 'cat', title: 'Base',
    sub: 'O operador deve designar uma base para cada tripulante.',
    body: ['O operador deve designar uma base para cada tripulante.'],
  },
  {
    code: 'ORO.FTL.205', section: 'cat', title: 'Período de serviço de voo (PSV)',
    sub: 'PSV máximo diário, prolongamentos e prerrogativas do comandante.',
    psv: true,
    body: [
      'a) O operador deve:',
      '(1) Definir horas de apresentação ao serviço adequadas a cada operação específica, tendo em conta o disposto na secção ORO.FTL.110, alínea c);',
      '(2) Estabelecer procedimentos que especifiquem a forma como o comandante deve, em circunstâncias especiais suscetíveis de causar fadiga extrema, e após consulta dos tripulantes interessados, reduzir o PSV efetivo e/ou aumentar o período de repouso, a fim de eliminar quaisquer consequências prejudiciais para a segurança do voo.',
      'b) PSV máximo diário de base',
      '(1) O PSV máximo diário sem prolongamentos para tripulantes aclimatados deve observar o disposto no Quadro 2 (ver tabela).',
      '(2) O PSV máximo diário quando os tripulantes se encontram num estado de aclimatação desconhecido deve ser conforme com o Quadro 3 (ver tabela).',
      '(3) O PSV máximo diário quando os tripulantes se encontram num estado de aclimatação desconhecido e o operador implementou um SGRF deve ser conforme com o Quadro 4. Os valores que constam do quadro podem aplicar-se desde que o SGRF do operador monitorize continuamente o cumprimento do nível de desempenho de segurança exigido (ver tabela).',
      'c) PSV com horas de apresentação ao serviço diferentes para a tripulação de voo e para a tripulação de cabina: Se a tripulação de cabina necessitar de mais tempo do que a tripulação de voo para as instruções pré-voo no mesmo setor ou série de setores, o PSV da tripulação de cabina pode ser prolongado pelo tempo correspondente à diferença entre a hora de apresentação ao serviço da tripulação de cabina e da tripulação de voo. Essa diferença não deve ser superior a 1 hora. O PSV máximo diário da tripulação de cabina deve basear-se na hora a que a tripulação de voo se apresenta para o seu PSV, mas o PSV começa a contar na hora a que a tripulação de cabina se deve apresentar ao serviço.',
      'd) PSV máximo diário para tripulantes aclimatados com recurso a prolongamentos sem repouso a bordo',
      '(1) O PSV máximo diário pode ser prolongado até uma hora não mais do que duas vezes em cada período de 7 dias consecutivos. Nesse caso: i) os períodos mínimos de repouso pré-voo e pós-voo devem ser aumentados de duas horas, ou ii) o período de repouso pós-voo deve ser aumentado de quatro horas.',
      '(2) Caso os prolongamentos sejam utilizados para PSV consecutivos, os períodos de repouso adicionais pré e pós-voo entre dois PSV com prolongamento, ao abrigo do n.º 1, devem ser consecutivos.',
      '(3) Os prolongamentos devem ser planeados com antecedência e ser limitados a um máximo de: i) 5 setores, em caso de não sobreposição com o WOCL, ou ii) 4 setores, em caso de sobreposição com o WOCL por um período máximo de duas horas, ou iii) 2 setores, em caso de sobreposição com o WOCL por um período superior a duas horas.',
      '(4) O prolongamento do PSV máximo diário de base sem repouso a bordo não deve ser combinado com prolongamentos por motivo de repouso a bordo ou de serviço de voo repartido no mesmo período de serviço.',
      '(5) Os planos que especificam os tempos de voo devem definir limites para os prolongamentos dos PSV máximos diários de base, em conformidade com as especificações de certificação aplicáveis ao tipo de operação, tendo em conta: i) o número de setores voados, e ii) a sobreposição do WOCL.',
      'e) PSV máximos diários com recurso a prolongamento por motivo de repouso a bordo: Os planos que especificam os tempos de voo devem definir as condições para os prolongamentos dos PSV máximos diários de base com repouso a bordo, em conformidade com as especificações de certificação aplicáveis ao tipo de operação, tendo em conta: i) o número de setores voados, ii) o período mínimo de repouso a bordo concedido a cada tripulante, iii) o tipo de espaço para repouso a bordo, e iv) o reforço da tripulação de voo mínima.',
      'f) Circunstâncias imprevistas nas operações de voo — prerrogativas do comandante',
      '(1) As condições de alteração, pelo comandante, dos limites aplicáveis ao serviço de voo, períodos de serviço e períodos de repouso em caso de circunstâncias imprevistas durante as operações de voo, que tenham lugar no momento ou depois da apresentação ao serviço, são as seguintes: i) o período de serviço de voo máximo diário que resulta da aplicação do disposto na secção ORO.FTL.205, alíneas b) e e), ou na secção ORO.FTL.220, não pode ser aumentado em mais de duas horas, exceto se a tripulação de voo tiver sido reforçada, caso em que o período de serviço de voo máximo pode ser aumentado, no máximo, de três horas, ii) se, no último setor de um PSV, o aumento autorizado for excedido devido a circunstâncias imprevistas após a descolagem, o voo pode prosseguir até ao destino planeado ou a um aeródromo alternativo, e iii) o período de repouso subsequente ao PSV pode ser reduzido, mas nunca poderá ser inferior a 10 horas.',
      '(2) Em circunstâncias imprevistas suscetíveis de causar fadiga extrema, o comandante deve reduzir o período de serviço de voo efetivo e/ou aumentar o período de repouso, de modo a eliminar eventuais consequências prejudiciais para a segurança do voo.',
      '(3) O comandante deve consultar toda a tripulação sobre os seus níveis de alerta antes de decidir introduzir as alterações previstas nos n.os 1 e 2.',
      '(4) O comandante deve apresentar um relatório ao operador sempre que, no exercício das suas prerrogativas, decidir aumentar um PSV ou reduzir um período de repouso.',
      '(5) Caso o aumento do PSV ou a redução do período de repouso seja superior a uma hora, deve ser enviada cópia do relatório com as observações do operador à autoridade competente, no prazo máximo de 28 dias após a ocorrência.',
      '(6) O operador deve implementar um processo não punitivo para a utilização das prerrogativas descritas na presente disposição e descrevê-lo no Manual de Operações.',
      'g) Circunstâncias imprevistas durante as operações de voo — adiamento da hora de apresentação ao serviço: O operador deve estabelecer os procedimentos a aplicar em caso de adiamento da apresentação ao serviço e descrevê-los no Manual de Operações, em conformidade com as especificações de certificação aplicáveis ao tipo de operação.',
    ],
  },
  {
    code: 'ORO.FTL.210', section: 'cat', title: 'Tempos de voo e períodos de serviço',
    sub: 'Limites de 60/110/190 h de serviço e 100/900/1000 h de voo.',
    limits: true,
    body: [
      'a) As escalas de serviço que podem ser atribuídas aos tripulantes não podem ultrapassar:',
      '(1) 60 horas de serviço por período de 7 dias consecutivos;',
      '(2) 110 horas de serviço por período de 14 dias consecutivos; e',
      '(3) 190 horas de serviço por período de 28 dias consecutivos, distribuídas tão regularmente quanto possível ao longo de todo o período.',
      'b) O tempo total de voo nos setores atribuídos aos tripulantes não pode ultrapassar:',
      '(1) 100 horas de tempo de voo por período de 28 dias consecutivos;',
      '(2) 900 horas de tempo de voo por ano civil; e',
      '(3) 1 000 horas de tempo de voo por período de 12 meses consecutivos.',
      'c) O serviço pós-voo deve contar como período de serviço. O operador deve especificar no seu Manual de Operações o período de tempo mínimo para os serviços pós-voo.',
    ],
  },
  {
    code: 'ORO.FTL.215', section: 'cat', title: 'Posicionamento',
    sub: 'Regras de contagem do posicionamento.',
    body: [
      'Em caso de posicionamento de um tripulante, o operador deve aplicar as seguintes regras:',
      'a) O posicionamento após a apresentação ao serviço mas antes da entrada em funções é contabilizado como um PSV mas não conta como um setor.',
      'b) O tempo gasto no posicionamento conta todo como período de serviço.',
    ],
  },
  {
    code: 'ORO.FTL.220', section: 'cat', title: 'Serviço de voo repartido',
    sub: 'Condições para prolongar o PSV com intervalo em terra.',
    body: [
      'Para prolongar o PSV máximo diário de base, em caso de realização de um intervalo em terra, devem ser satisfeitas as seguintes condições:',
      'a) Os planos que especificam os tempos de voo devem definir os seguintes elementos para o serviço de voo repartido em conformidade com as especificações de certificação aplicáveis ao tipo de operação: (1) A duração mínima dos intervalos em terra; e (2) A possibilidade de prolongar o PSV prescrita na secção ORO.FTL.205, alínea b), tendo em conta a duração do intervalo em terra, as instalações disponibilizadas para o tripulante poder descansar e outros fatores pertinentes.',
      'b) O intervalo em terra deve contar todo como PSV.',
      'c) Após um repouso reduzido não pode ser prestado serviço de voo repartido.',
    ],
  },
  {
    code: 'ORO.FTL.225', section: 'cat', title: 'Serviços de assistência e serviços no aeroporto',
    sub: 'Standby: contagem como serviço e impacto no PSV.',
    body: [
      'Caso o operador atribua serviços de assistência ou qualquer serviço no aeroporto aos tripulantes, aplicam-se as condições a seguir enumeradas, de acordo com as especificações de certificação aplicáveis ao tipo de operação:',
      'a) Os serviços de assistência e outros eventualmente prestados no aeroporto devem constar da escala de serviço e a hora de entrada e de saída do serviço de assistência deve ser previamente definida e comunicada ao tripulante em causa, de modo a este poder planear um repouso adequado.',
      'b) Considera-se que um tripulante está de serviço de assistência no aeroporto desde o momento em que se apresenta ao serviço no local para o efeito até ao final do período de assistência no aeroporto que lhe tenha sido comunicado.',
      'c) O serviço de assistência no aeroporto conta por inteiro como período de serviço para efeito das secções ORO.FTL.210 e ORO.FTL.235.',
      'd) Os serviços prestados no aeroporto contam por inteiro como períodos de serviço. O PSV começa a contar a partir da hora de apresentação ao serviço no aeroporto.',
      'e) O operador deve prever alojamento para os tripulantes em serviço de assistência no aeroporto.',
      'f) Os planos que especificam os tempos de voo devem definir os seguintes elementos: (1) A duração máxima do serviço de assistência; (2) O impacto do tempo despendido a prestar serviço de assistência no PSV máximo passível de constar da escala de serviço, tendo em conta as instalações disponibilizadas ao tripulante para repousar, e outros fatores relevantes, nomeadamente: — a necessidade de disponibilidade imediata para o serviço por parte do tripulante, — a interferência do serviço de assistência com o período de sono, e — a necessidade de notificar o tripulante com uma antecedência suficiente para este poder dormir entre a convocação para o serviço e o PSV para o qual está escalado; (3) O período mínimo de repouso após um serviço de assistência que não conduz à atribuição de um PSV; (4) A contagem do tempo de serviço de assistência que não o serviço de assistência no aeroporto para efeitos de cálculo dos períodos de serviço acumulados.',
    ],
  },
  {
    code: 'ORO.FTL.230', section: 'cat', title: 'Reserva',
    sub: 'Condições do serviço de reserva.',
    body: [
      'Caso o operador atribua um serviço de reserva aos tripulantes, aplicam-se as condições a seguir enumeradas, de acordo com as especificações de certificação aplicáveis ao tipo de operação:',
      'a) O serviço de reserva deve constar da escala de serviço;',
      'b) Os planos que especificam os tempos de voo devem definir os seguintes elementos: (1) A duração máxima de cada período de reserva; (2) O número de dias de reserva consecutivos que podem ser atribuídos a um tripulante.',
    ],
  },
  {
    code: 'ORO.FTL.235', section: 'cat', title: 'Períodos de repouso',
    sub: '12 h na base, 10 h fora; recuperação ≥ 36 h.',
    rest: true,
    body: [
      'a) Período de repouso mínimo na base',
      '(1) O período de repouso mínimo previsto antes de um PSV com início na base de afetação deve ser pelo menos igual ao período de serviço precedente, ou de 12 horas, conforme o período que for mais longo;',
      '(2) Em derrogação do disposto no ponto 1, o repouso mínimo previsto na alínea b) aplica-se se o operador previr alojamento adequado para o tripulante na sua base de afetação.',
      'b) Período de repouso mínimo longe da base: O período de repouso mínimo previsto antes de iniciar um PSV que começa longe da base deve ser pelo menos igual ao período de serviço precedente, ou de 10 horas, conforme o período que for mais longo. Este período deve incluir a possibilidade de 8 horas de sono para além do tempo necessário para a deslocação e a satisfação de necessidades fisiológicas.',
      'c) Repouso reduzido: Em derrogação do disposto nas alíneas a) e b), os planos que especificam os tempos de voo podem prever reduções dos períodos de repouso mínimos de acordo com as especificações de certificação aplicáveis ao tipo de operação e tendo em conta os seguintes elementos: (1) O período mínimo de repouso reduzido; (2) O aumento do período de repouso subsequente; e (3) A redução do PSV a seguir ao repouso reduzido.',
      'd) Períodos de repouso de recuperação prolongados recorrentes: Os planos que especificam os tempos de voo devem prever períodos de repouso de recuperação prolongados recorrentes para compensar a fadiga acumulada. O período de repouso compensatório prolongado recorrente mínimo é de 36 horas, incluindo 2 noites locais, sendo que o período que medeia entre o final de um período de repouso de recuperação prolongado recorrente e o início do período de repouso de recuperação prolongado recorrente seguinte não poderá, em caso algum, ser superior a 168 horas. O período de repouso de recuperação prolongado recorrente deve aumentar para dois dias locais duas vezes por mês.',
      'e) Os planos que especificam os tempos de voo devem prever períodos de repouso adicionais de acordo com as especificações de certificação aplicáveis, de modo a compensar: (1) Os efeitos das diferenças de fuso horário e dos prolongamentos do PSV; (2) A fadiga acumulada adicional decorrente de horários irregulares; e (3) Uma mudança da base de afetação.',
    ],
  },
  {
    code: 'ORO.FTL.240', section: 'cat', title: 'Alimentação',
    sub: 'Refeições e bebidas durante o PSV.',
    body: [
      'a) Durante o PSV deve haver possibilidade de tomar refeições e bebidas, de modo a evitar a diminuição do nível de desempenho do tripulante, especialmente se o PSV for superior a seis horas.',
      'b) O operador deve especificar no seu Manual de Operações a forma de assegurar as refeições dos tripulantes durante o PSV.',
    ],
  },
  {
    code: 'ORO.FTL.245', section: 'cat', title: 'Registos relativos à base, tempos de voo, serviço e repouso',
    sub: 'Conservação de registos por 24 meses.',
    body: [
      'a) O operador deve conservar por um período de 24 meses:',
      '(1) Os registos individuais de cada tripulante, incluindo: i) os tempos de voo, ii) o início, a duração e o fim de cada período de serviço e de cada PSV, iii) os períodos de repouso e os dias de folga, e iv) a base de afetação atribuída.',
      '(2) Os relatórios sobre os períodos de serviço de voo prolongados e os períodos de repouso reduzidos.',
      'b) Mediante pedido, o operador deve disponibilizar cópias dos registos dos tempos de voo, períodos de serviço e períodos de repouso: (1) Ao tripulante interessado; e (2) A outro operador, sobre tripulantes que prestem ou passem a prestar serviços para o operador interessado.',
      'c) Os registos a que se refere a secção CAT.GEN.MPA.100, alínea b), ponto 5, relacionados com tripulantes que desempenham funções para mais de um operador, devem ser conservados por um período de 24 meses.',
    ],
  },
  {
    code: 'ORO.FTL.250', section: 'cat', title: 'Formação em gestão da fadiga',
    sub: 'Formação inicial e contínua em gestão da fadiga.',
    body: [
      'a) O operador deve prever formação inicial e contínua em gestão da fadiga para a tripulação, o pessoal responsável pela preparação e manutenção das escalas de serviço e o pessoal de gestão interessado.',
      'b) Essas ações de formação devem fazer parte de um programa de formação definido pelo operador e descrito no Manual de Operações. O programa de formação deve focar as possíveis causas e consequências da fadiga e as contramedidas a adotar para a combater.',
    ],
  },
];

export const ftlSectionTitle = (id) => FTL_SECTIONS.find(s => s.id === id)?.title ?? '';
