// Subparte FTL — Regulamento (UE) n.º 83/2014 (altera o Reg. 965/2012)
// Limitações do Tempo de Voo e de Serviço e Requisitos de Repouso.
// Conteúdo estruturado para consulta da tripulação de cabine.

export const FTL_SECTIONS = [
  { id: 'gen', n: 1, title: 'Disposições gerais' },
  { id: 'cat', n: 2, title: 'Operadores de transporte aéreo comercial' },
];

// ─── Tabela 2 · PSV máximo diário (tripulantes aclimatados) ──────────────────
// Linhas = hora de início do PSV; colunas = nº de setores.
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

// ─── Tabelas 3 e 4 · estado de aclimatação desconhecido ──────────────────────
export const PSV_UNKNOWN_SECTORS = ['1–2', '3', '4', '5', '6', '7', '8'];
export const PSV_UNKNOWN     = ['11:00', '10:30', '10:00', '9:30', '9:00', '9:00', '9:00']; // Quadro 3
export const PSV_UNKNOWN_FRM = ['12:00', '11:30', '11:00', '10:30', '10:00', '9:30', '9:00']; // Quadro 4 (com SGRF)

// ─── Limites duros (ORO.FTL.210) ─────────────────────────────────────────────
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
    { label: 'Repouso mínimo na base',     value: '≥ serviço anterior ou 12 h (o maior)' },
    { label: 'Repouso mínimo fora da base', value: '≥ serviço anterior ou 10 h (o maior), c/ 8 h de sono' },
    { label: 'Repouso de recuperação',     value: '≥ 36 h c/ 2 noites locais · máx. 168 h entre eles' },
  ],
};

// ─── Definições (ORO.FTL.105) — 28 termos ────────────────────────────────────
export const FTL_DEFINITIONS = [
  { term: 'Aclimatado', def: 'Tripulante cujo relógio biológico (WOCL) está sincronizado com o fuso onde se encontra. Considera-se aclimatado num fuso com diferença até 2 h da hora local do ponto de partida.' },
  { term: 'Hora de referência', def: 'Hora local no ponto de apresentação ao serviço, num fuso com até 2 h de diferença da hora local a que o tripulante está aclimatado.' },
  { term: 'Alojamento', def: 'Local calmo e confortável, não aberto ao público, com controlo de luz e temperatura, onde o tripulante pode dormir (para serviço de assistência e voo repartido).' },
  { term: 'Alojamento adequado', def: 'Quarto separado por tripulante, em local calmo, com cama, ventilação, regulação de luz/temperatura e acesso a alimentação.' },
  { term: 'Tripulação de voo reforçada', def: 'Tripulação com mais elementos do que o mínimo, permitindo que tripulantes descansem em voo e sejam substituídos por outros qualificados.' },
  { term: 'Intervalo', def: 'Período durante um PSV, inferior a um período de repouso, que conta como serviço e em que o tripulante é libertado de todas as tarefas.' },
  { term: 'Adiamento da hora de apresentação', def: 'Adiamento, pelo operador, de um PSV programado, antes de o tripulante ter partido do local de repouso.' },
  { term: 'Horário irregular', def: 'Escala que prejudica o sono no período ideal — por entrada matinal, saída tardia ou serviço noturno. Tipo matinal: início 05:00–05:59. Tipo tardio: fim 23:00–01:59.' },
  { term: 'Serviço noturno', def: 'Período de serviço que se sobrepõe a parte do período entre as 02:00 e as 04:59 no fuso a que a tripulação está aclimatada.' },
  { term: 'Serviço', def: 'Qualquer tarefa por ordem do operador: voo, trabalho administrativo, formação/qualificação, posicionamento e certos elementos do serviço de assistência.' },
  { term: 'Período de serviço', def: 'Começa quando o tripulante se apresenta ao serviço e termina quando é libertado de todas as tarefas, incluindo o serviço pós-voo.' },
  { term: 'Período de serviço de voo (PSV)', def: 'Começa quando o tripulante se deve apresentar, inclui um setor ou série de setores, e termina quando a aeronave imobiliza e os motores são desligados no último setor.' },
  { term: 'Tempo de voo', def: 'Tempo entre o primeiro movimento da aeronave para descolar e a sua imobilização final na posição de estacionamento, com motores/hélices desligados.' },
  { term: 'Base', def: 'Local atribuído pelo operador onde o tripulante normalmente inicia e termina o serviço, e onde o operador não é responsável pelo alojamento.' },
  { term: 'Dia local', def: 'Período de 24 horas que começa às 00:00, hora local.' },
  { term: 'Noite local', def: 'Período de 8 horas entre as 22:00 e as 08:00, hora local.' },
  { term: 'Tripulante em funções', def: 'Tripulante que presta serviço numa aeronave num setor.' },
  { term: 'Posicionamento', def: 'Deslocação de um tripulante que não desempenha funções, por ordem do operador, excluindo o trajeto casa↔apresentação e transferências locais.' },
  { term: 'Espaço de repouso', def: 'Beliche ou assento com apoio para pés e pernas, adequado para a tripulação dormir a bordo.' },
  { term: 'Reserva', def: 'Período em que o tripulante deve estar disponível para ser escalado, comunicado com pelo menos 10 horas de antecedência.' },
  { term: 'Período de repouso', def: 'Período contínuo, ininterrupto e definido, antes ou depois de um serviço, em que o tripulante é libertado de todas as tarefas (incl. assistência e reserva).' },
  { term: 'Rotação', def: 'Série de serviços com pelo menos um voo e repousos fora da base, que começa e termina na base.' },
  { term: 'Dia de folga único', def: 'Período livre de todas as tarefas, com um dia ou duas noites locais, comunicado com antecedência (Diretiva 2000/79/CE).' },
  { term: 'Setor', def: 'Segmento de um PSV entre o primeiro movimento para descolagem e a imobilização após a aterragem.' },
  { term: 'Serviço de assistência', def: 'Período definido e comunicado em que o tripulante deve estar disponível para ser escalado, sem repouso intermédio.' },
  { term: 'Serviço de assistência no aeroporto', def: 'Serviço de assistência prestado no aeroporto.' },
  { term: 'Outro serviço de assistência', def: 'Serviço de assistência na residência ou em alojamento adequado.' },
  { term: 'Período crítico do ritmo circadiano (WOCL)', def: 'Período entre as 02:00 e as 05:59 no fuso a que o tripulante está aclimatado.' },
];

// ─── Artigos ─────────────────────────────────────────────────────────────────
export const FTL_ARTICLES = [
  {
    code: 'ORO.FTL.100', section: 'gen', title: 'Âmbito',
    sub: 'A quem se aplica a subparte FTL.',
    body: [
      'Estabelece as regras a cumprir pelos operadores e tripulações quanto às limitações dos tempos de voo e de serviço e aos requisitos de repouso aplicáveis aos tripulantes.',
      'Aplica-se às operações de transporte aéreo comercial (CAT) com aviões. Táxi aéreo, emergência médica e CAT monopiloto seguem regimes próprios (subparte Q / requisitos nacionais).',
    ],
  },
  {
    code: 'ORO.FTL.105', section: 'gen', title: 'Definições',
    sub: '28 termos-chave: aclimatação, PSV, setor, WOCL, repouso…',
    defs: true,
    body: ['Termos usados ao longo da subparte FTL. Consulta a lista completa abaixo.'],
  },
  {
    code: 'ORO.FTL.110', section: 'gen', title: 'Responsabilidades do operador',
    sub: 'Planeamento de escalas, repouso e horários irregulares.',
    body: [
      'Publicar as escalas com antecedência para permitir planear o repouso.',
      'Planear os PSV de forma a manter os tripulantes suficientemente repousados em quaisquer circunstâncias.',
      'Definir horas de apresentação com tempo suficiente para as tarefas em terra.',
      'Ter em conta o efeito acumulado de serviços longos combinados com repousos mínimos.',
      'Evitar práticas que perturbem gravemente o sono (ex.: serviços diurnos/noturnos alternados).',
      'Cumprir as regras de horários irregulares (ARO.OPS.230).',
      'Prever repousos longos para recuperar de serviços anteriores e comunicar repousos de recuperação com antecedência.',
      'Alterar horário/composição da tripulação se o serviço efetivo exceder o PSV máximo em mais de 33 % dos voos do horário sazonal.',
    ],
  },
  {
    code: 'ORO.FTL.115', section: 'gen', title: 'Responsabilidades dos tripulantes',
    sub: 'Aproveitar o repouso e cumprir a Parte CAT.',
    body: [
      'Cumprir o disposto na secção CAT.GEN.MPA.100, alínea b) (Parte CAT).',
      'Aproveitar ao máximo as oportunidades e instalações de repouso, planeando e utilizando devidamente os períodos de repouso.',
    ],
  },
  {
    code: 'ORO.FTL.120', section: 'gen', title: 'Gestão dos riscos associados à fadiga (SGRF)',
    sub: 'Quando exigido, o operador mantém um SGRF no sistema de gestão.',
    body: [
      'Quando exigido, o operador deve estabelecer, implementar e manter um Sistema de Gestão dos Riscos associados à Fadiga (SGRF), integrado no seu sistema de gestão e descrito no Manual de Operações.',
      'O SGRF deve prever melhoria contínua e incluir: política de GRF; documentação dos processos; princípios e conhecimentos científicos; identificação de perigos e avaliação de riscos; estratégia de redução de riscos com medidas corretivas e monitorização; processos de garantia e de promoção da segurança.',
      'Deve ser proporcional à dimensão e complexidade da atividade do operador. Se a garantia da segurança mostrar perda de desempenho, devem ser tomadas medidas de mitigação.',
    ],
  },
  {
    code: 'ORO.FTL.125', section: 'gen', title: 'Planos que especificam os tempos de voo',
    sub: 'Aprovados pela autoridade competente antes de aplicar.',
    body: [
      'O operador deve estabelecer e manter planos de tempos de voo adequados às operações, cumprindo o Reg. 216/2008, esta subparte e demais legislação (incl. Diretiva 2000/79/CE).',
      'Os planos (e o SGRF, se aplicável) devem ser aprovados pela autoridade competente antes de implementados.',
      'O operador deve respeitar as especificações de certificação da Agência; qualquer desvio exige descrição completa e avaliação prévia entregue à autoridade.',
    ],
  },
  {
    code: 'ORO.FTL.200', section: 'cat', title: 'Base',
    sub: 'O operador designa uma base para cada tripulante.',
    body: ['O operador deve designar uma base de afetação para cada tripulante.'],
  },
  {
    code: 'ORO.FTL.205', section: 'cat', title: 'Período de serviço de voo (PSV)',
    sub: 'PSV máximo diário, prolongamentos e prerrogativas do comandante.',
    psv: true,
    body: [
      'O PSV máximo diário de base, para tripulantes aclimatados e sem prolongamentos, depende da hora de início e do número de setores (ver tabela).',
      'Estado de aclimatação desconhecido: aplicam-se as tabelas 3 e 4 (esta última quando há SGRF).',
      'Tripulação de cabine vs. voo: se a cabine precisar de mais tempo de briefing, o seu PSV pode prolongar-se pela diferença de horas de apresentação, até 1 hora.',
      'Prolongamentos sem repouso a bordo: até +1 h, no máximo 2 vezes por 7 dias; exige aumentar o repouso pré e pós-voo em 2 h, ou o pós-voo em 4 h. Limitado a 5 setores (sem WOCL), 4 setores (WOCL ≤ 2 h) ou 2 setores (WOCL > 2 h).',
      'Prolongamentos por repouso a bordo: definidos no plano, conforme nº de setores, repouso a bordo concedido, tipo de espaço e reforço da tripulação.',
      'Prerrogativas do comandante (circunstâncias imprevistas): o PSV máximo pode aumentar até +2 h (+3 h com tripulação reforçada); o repouso seguinte pode reduzir-se, mas nunca abaixo de 10 h. Em caso de fadiga extrema, o comandante reduz o PSV e/ou aumenta o repouso, após consultar a tripulação. Aumentos > 1 h são reportados à autoridade em até 28 dias.',
    ],
  },
  {
    code: 'ORO.FTL.210', section: 'cat', title: 'Tempos de voo e períodos de serviço',
    sub: 'Limites de 60/110/190 h de serviço e 100/900/1000 h de voo.',
    limits: true,
    body: [
      'Serviço: máximo de 60 h por 7 dias, 110 h por 14 dias e 190 h por 28 dias (distribuídas tão regularmente quanto possível).',
      'Tempo de voo: máximo de 100 h por 28 dias, 900 h por ano civil e 1000 h por 12 meses consecutivos.',
      'O serviço pós-voo conta como período de serviço; o Manual de Operações define a sua duração mínima.',
    ],
  },
  {
    code: 'ORO.FTL.215', section: 'cat', title: 'Posicionamento',
    sub: 'Conta como serviço; só conta como PSV em certos casos.',
    body: [
      'O posicionamento depois da apresentação mas antes da entrada em funções conta como PSV, mas não conta como setor.',
      'Todo o tempo de posicionamento conta como período de serviço.',
    ],
  },
  {
    code: 'ORO.FTL.220', section: 'cat', title: 'Serviço de voo repartido',
    sub: 'Intervalo em terra para prolongar o PSV.',
    body: [
      'Para prolongar o PSV com um intervalo em terra, o plano define a duração mínima do intervalo e a forma de prolongamento, conforme as instalações de descanso e outros fatores.',
      'O intervalo em terra conta todo como PSV.',
      'Após um repouso reduzido não pode prestar-se serviço de voo repartido.',
    ],
  },
  {
    code: 'ORO.FTL.225', section: 'cat', title: 'Serviços de assistência e no aeroporto',
    sub: 'Standby: contagem como serviço e impacto no PSV.',
    body: [
      'Os serviços de assistência devem constar da escala, com horas de entrada/saída comunicadas previamente.',
      'A assistência no aeroporto conta por inteiro como período de serviço (para ORO.FTL.210 e .235); o PSV conta a partir da apresentação no aeroporto.',
      'O operador deve prever alojamento para a assistência no aeroporto.',
      'O plano define: duração máxima da assistência; impacto do tempo de assistência no PSV máximo; repouso mínimo após assistência que não gera PSV; e a contagem de outras assistências nos serviços acumulados.',
    ],
  },
  {
    code: 'ORO.FTL.230', section: 'cat', title: 'Reserva',
    sub: 'Deve constar da escala; duração e dias definidos no plano.',
    body: [
      'A reserva deve constar da escala de serviço.',
      'O plano define a duração máxima de cada período de reserva e o número de dias de reserva consecutivos atribuíveis.',
    ],
  },
  {
    code: 'ORO.FTL.235', section: 'cat', title: 'Períodos de repouso',
    sub: '12 h na base, 10 h fora; recuperação ≥ 36 h.',
    rest: true,
    body: [
      'Na base: repouso mínimo igual ao serviço anterior, ou 12 h (o que for maior). Pode reduzir-se a 10 h se houver alojamento adequado na base.',
      'Fora da base: repouso mínimo igual ao serviço anterior, ou 10 h (o que for maior), incluindo 8 h de sono além do tempo de deslocação e necessidades fisiológicas.',
      'Repouso reduzido: o plano pode prever reduções com aumento do repouso seguinte e redução do PSV subsequente.',
      'Repouso de recuperação prolongado: mínimo 36 h com 2 noites locais; nunca mais de 168 h entre dois; aumenta para 2 dias locais duas vezes por mês.',
      'Repousos adicionais para compensar fusos horários, prolongamentos do PSV, fadiga de horários irregulares e mudança de base.',
    ],
  },
  {
    code: 'ORO.FTL.240', section: 'cat', title: 'Alimentação',
    sub: 'Refeições e bebidas durante o PSV.',
    body: [
      'Durante o PSV deve haver possibilidade de refeições e bebidas, sobretudo se o PSV exceder 6 horas.',
      'O Manual de Operações especifica como são asseguradas as refeições durante o PSV.',
    ],
  },
  {
    code: 'ORO.FTL.245', section: 'cat', title: 'Registos',
    sub: 'Conservação de tempos de voo, serviço e repouso por 24 meses.',
    body: [
      'O operador conserva por 24 meses os registos individuais: tempos de voo; início, duração e fim de cada serviço e PSV; repousos e dias de folga; base atribuída; e relatórios de PSV prolongados / repousos reduzidos.',
      'A pedido, fornece cópias dos registos ao tripulante e a outro operador para quem o tripulante passe a prestar serviço.',
    ],
  },
  {
    code: 'ORO.FTL.250', section: 'cat', title: 'Formação em gestão da fadiga',
    sub: 'Formação inicial e contínua sobre fadiga.',
    body: [
      'O operador prevê formação inicial e contínua em gestão da fadiga para a tripulação, planeadores de escalas e gestão envolvida.',
      'A formação consta do Manual de Operações e aborda causas, consequências e contramedidas da fadiga.',
    ],
  },
];

export const ftlSectionTitle = (id) => FTL_SECTIONS.find(s => s.id === id)?.title ?? '';
export const ftlSectionN     = (id) => FTL_SECTIONS.find(s => s.id === id)?.n ?? 0;
