// "Validades & Documentos" — catálogo por função + o PRAZO DE CADA UM COMO DIZ A LEI + o estado.
// Módulo PURO (sem React Native), testável.
//
// REGRA (Nuno, 2026-11-06): "não quero nada inventado. quero que seja como diz a lei". Cada prazo guarda a
// citação literal do regulamento (fontes/eu/*.txt, extratos da EUR-Lex); scripts/validities.test.js confere
// cada citação no texto, na secção indicada, em português e em inglês. Há três maneiras de saber a validade:
//   · 'done'      — a lei dá o prazo e conta-se a partir da DATA FEITA (ex.: OPC 6 meses, ORO.FC.230 b) 3)),
//                   até ao fim do mês (ORO.FC.145 g); ORO.CC.140 e)) ou até ao mesmo dia (Reg. 1182/71, art. 3.º).
//   · 'date'      — a lei manda escrever a data no documento (licença: ARA.FCL.215 c); certificado médico;
//                   passaporte) ou deixa o prazo ao programa do operador: o tripulante escreve o "válido até".
//   · 'reference' — não expira (licença Part-FCL, atestado de cabine): guarda-se o n.º.
// Pilotos: o OPC, o line check e o SEP dependem do programa de formação do operador (regra geral, ATQP com
// prorrogação aprovada ou EBT): a app pergunta (sem o programa não há prazo).

// ── as citações (f = ficheiro em fontes/eu sem "-pt/-en.txt"; s = secção; q = texto pt; en = texto en) ──
const OPS = 'reg-965-2012', FCL = 'reg-1178-2011', AVSEC = 'reg-2015-1998', PRAZOS = 'reg-1182-71';
const L = {
  fc145g: { f: OPS, s: 'ORO.FC.145', q: 'Os períodos de validade exigidos na presente subparte contam a partir do final do mês em que foi concluída a atualização, a formação ou o controlo.', en: 'The validity periods required in this Subpart shall be counted from the end of the month in which the recency, training or check was completed.' },
  opc6: { f: OPS, s: 'ORO.FC.230', q: 'Os controlos de proficiência do operador têm uma validade de 6 meses.', en: 'The validity period of the operator proficiency check shall be 6 calendar months.' },
  line12: { f: OPS, s: 'ORO.FC.230', q: 'O período de validade da prova de voo de linha é de 12 meses.', en: 'The validity period of the line check shall be 12 calendar months.' },
  sep12: { f: OPS, s: 'ORO.FC.230', q: 'Os controlos e a formação relativos ao equipamento de segurança e de emergência têm um período de validade de 12 meses;', en: 'The validity period of an emergency and safety equipment training and checking shall be 12 calendar months.' },
  crmFc: { f: OPS, s: 'ORO.FC.230', q: 'Os temas mais importantes da formação em CRM devem constar de sessões de formação por módulos distribuídos tão uniformemente quanto possível por cada período de três anos;', en: 'All major topics of CRM training shall be covered by distributing modular training sessions as evenly as possible over each 3-year period.' },
  atqp: { f: OPS, s: 'ORO.FC.A.245', q: 'Após dois anos de operações com um ATQP aprovado, o operador pode, mediante aprovação da autoridade competente, prorrogar a validade dos controlos previstos na subsecção ORO.FC.230 do seguinte modo:', en: 'After 2 years of operating with an approved ATQP, the operator may, with the approval of the competent authority, extend the validity periods of the checks referred to in point ORO.FC.230 as follows:' },
  atqpOpc: { f: OPS, s: 'ORO.FC.A.245', q: 'Controlo de proficiência do operador – 12 meses.', en: 'Operator proficiency check to 12 calendar months.' },
  atqpLine: { f: OPS, s: 'ORO.FC.A.245', q: 'Prova de voo de linha – 24 meses.', en: 'Line check to 24 calendar months.' },
  atqpSep: { f: OPS, s: 'ORO.FC.A.245', q: 'Controlos relativos ao equipamento de emergência e de segurança – 24 meses.', en: 'Emergency and safety equipment checking to 24 calendar months.' },
  ebtSub: { f: OPS, s: 'ORO.FC.231', q: 'O operador pode substituir os requisitos da secção ORO.FC.230 através do estabelecimento, da execução e da manutenção de um programa EBT adequado aprovado pela autoridade competente.', en: 'The operator may substitute the requirements of ORO.FC.230 by establishing, implementing and maintaining a suitable EBT programme approved by the competent authority.' },
  ebt12: { f: OPS, s: 'ORO.FC.231', q: 'O período de validade de um módulo EBT é de 12 meses;', en: 'The validity period of a EBT module shall be 12 months;' },
  ebtLine: { f: OPS, s: 'ORO.FC.231', q: 'O período de validade de uma avaliação de linha de competência é de 12 meses.', en: 'The validity period of a line evaluation of competence shall be 12 months.' },
  ebtLineExt: { f: OPS, s: 'ORO.FC.231', q: 'O operador aprovado para EBT pode, com a aprovação da autoridade competente, prorrogar a validade da avaliação de linha de competência até:', en: 'The operator approved for EBT may, with the approval of the competent authority, extend the validity of the line evaluation of competence to:' },
  ebtSep: { f: OPS, s: 'ORO.FC.231', q: 'A cada 12 meses, todos os pilotos devem ser sujeitos a:', en: 'Every 12 calendar months, each pilot shall undergo:' },
  ebtSepExt: { f: OPS, s: 'ORO.FC.231', q: 'O operador pode, com a aprovação da autoridade competente e mediante avaliação dos riscos, prorrogar o período de avaliação e formação no local e de utilização de todo o equipamento de segurança e de emergência a bordo da aeronave para 24 meses', en: 'The operator may, with the approval of the competent authority and subject to a risk assessment, extend the period of assessment and training on the location and use of all emergency and safety equipment carried on the aircraft to 24 months' },
  dgTi: { f: OPS, s: 'ORO.GEN.110', q: 'O operador deve estabelecer e manter programas de formação do pessoal sobre mercadorias perigosas, conforme previsto nas instruções técnicas.', en: 'The operator shall establish and maintain dangerous goods training programmes for personnel as required by the technical instructions.' },
  cc140a: { f: OPS, s: 'ORO.CC.140', q: 'Os tripulantes de cabina devem completar uma formação periódica e submeter-se a controlos todos os anos;', en: 'Each cabin crew member shall complete annually recurrent training and checking.' },
  cc140crm: { f: OPS, s: 'ORO.CC.140', q: 'gestão do pessoal de bordo,', en: 'crew resource management;' },
  cc140faid: { f: OPS, s: 'ORO.CC.140', q: 'aspetos da medicina aeronáutica e primeiros socorros, incluindo equipamentos conexos,', en: 'aero-medical aspects and first aid including related equipment;' },
  cc140sec: { f: OPS, s: 'ORO.CC.140', q: 'procedimentos de segurança;', en: 'security procedures.' },
  cc140e1: { f: OPS, s: 'ORO.CC.140', q: 'A validade da formação periódica anual é de 12 meses a contar do final do mês em que foi efetuado o controlo.', en: 'The annual recurrent training validity period shall be 12 calendar months counted from the end of the month when the check was taken.' },
  cc140e2: { f: OPS, s: 'ORO.CC.140', q: 'Se a formação periódica e os controlos previstos na alínea a) forem efetuados nos três últimos meses do prazo de validade, o novo prazo de validade começa a contar a partir da data de termo inicial.', en: 'If the recurrent training and checking required in (a) are undertaken within the last three calendar months of the validity period, the new validity period shall be counted from the original expiry date.' },
  cc140e3: { f: OPS, s: 'ORO.CC.140', q: 'No que respeita aos módulos de formação adicional trienal, conforme especificado nas alíneas c), ponto 2), e d), ponto 2), o prazo de validade é de 36 meses a contar do final do mês em que os controlos foram efetuados.', en: 'For the additional triennial training elements specified in (c)(2) and (d)(2), the validity period shall be 36 calendar months counted from the end of the month when the checks were taken.' },
  fcl040: { f: FCL, s: 'FCL.040', q: 'O exercício dos privilégios conferidos por uma licença depende da validade das qualificações nela averbadas, se for o caso, e do certificado médico, consoante os privilégios exercidos.', en: 'The exercise of the privileges granted by a licence shall be dependent upon the validity of the ratings contained therein, if applicable, and of the medical certificate as appropriate to the privileges exercised.' },
  fcl055a: { f: FCL, s: 'FCL.055', q: 'O averbamento deve indicar a língua, o nível de proficiência e a data de validade', en: 'The endorsement shall indicate the language, the proficiency level and the validity date' },
  fcl055c: { f: FCL, s: 'FCL.055', q: 'Exceto no caso dos pilotos que tenham demonstrado possuir proficiência linguística de nível superior (nível 6),', en: 'Except for pilots who have demonstrated language proficiency at the expert level (level 6)' },
  fcl625: { f: FCL, s: 'FCL.625', q: 'A IR é válida por um ano.', en: 'An IR shall be valid for 1 year.' },
  fcl740: { f: FCL, s: 'FCL.740', q: 'O período de validade de uma qualificação de classe e de tipo será de um ano', en: 'The validity period of class and type ratings shall be 1 year' },
  fcl940: { f: FCL, s: 'FCL.940', q: 'os certificados de instrutor serão válidos por um período de 3 anos.', en: 'instructor certificates shall be valid for a period of 3 years.' },
  ara215c: { f: FCL, s: 'ARA.FCL.215', q: 'A autoridade competente, ou um examinador especificamente autorizado para o efeito pela autoridade competente, apõe a data de validade na licença ou no certificado.', en: 'The competent authority, or an examiner specifically authorised for that purpose by the competent authority, shall enter the expiry date on the licence or the certificate.' },
  med045: { f: FCL, s: 'MED.A.045', q: 'Os certificados médicos de classe 1 são válidos por um período de 12 meses.', en: 'Class 1 medical certificates shall be valid for a period of 12 months.' },
  med045b: { f: FCL, s: 'MED.A.045', q: 'o período de validade dos certificados médicos de classe 1 deve ser de seis meses para os titulares de licenças que:', en: 'the period of validity of class 1 medical certificates shall be 6 months for licence holders who:' },
  medC005: { f: FCL, s: 'MED.C.005', q: 'Cada tripulante de cabina será submetido a uma avaliação aeromédica antes de lhe serem atribuídas funções pela primeira vez numa aeronave e, subsequentemente, a intervalos máximos de 60 meses;', en: 'Each cabin crew member shall undergo an aero-medical assessment before being first assigned to duties on an aircraft, and after that at intervals of maximum 60 months.' },
  cca105: { f: FCL, s: 'CC.CCA.105', q: 'O certificado de tripulante de cabina é emitido por um período ilimitado', en: 'The cabin crew attestation shall be issued with unlimited duration' },
  avsec5: { f: AVSEC, s: '11.4.3', q: 'pelo menos uma vez em cada 5 anos', en: 'at least once every 5 years' },
  prazo34: { f: PRAZOS, s: 'Art.3', q: 'Se o último dia de um prazo fixado por outra forma que não em horas for um dia feriado, um domingo ou um sábado, o prazo termina com o decurso da última hora do dia útil seguinte.', en: 'Where the last day of a period expressed otherwise than in hours is a public holiday, Sunday or Saturday, the period shall end with the expiry of the last hour of the following working day.' },
  prazo3c: { f: PRAZOS, s: 'Art.3', q: 'termina com o decurso da última hora do dia que, na última semana, mês ou ano, tenha a mesma denominação ou o mesmo número que o dia do início do prazo.', en: 'shall end with the expiry of the last hour of whichever day in the last week, month or year is the same day of the week, or falls on the same date, as the day from which the period runs.' },
};
export const VALIDITY_LAW = L;   // para o teste das fontes

const t = (pt, en) => ({ pt, en });
// Regras (calc 'done' = a partir da data feita; from 'eom' = conta-se do fim do mês; 'day' = mesmo dia, 1182/71).
const R = {
  opc6: { calc: 'done', months: 6, from: 'eom', law: [L.opc6, L.fc145g] },
  opcAtqp: { calc: 'done', months: 12, from: 'eom', law: [L.atqp, L.atqpOpc, L.fc145g] },
  ebt12: { calc: 'done', months: 12, from: 'eom', law: [L.ebtSub, L.ebt12, L.fc145g] },
  line12: { calc: 'done', months: 12, from: 'eom', law: [L.line12, L.fc145g] },
  lineAtqp: { calc: 'done', months: 24, from: 'eom', law: [L.atqp, L.atqpLine, L.fc145g] },
  sep12: { calc: 'done', months: 12, from: 'eom', law: [L.sep12, L.fc145g] },
  sepAtqp: { calc: 'done', months: 24, from: 'eom', law: [L.atqp, L.atqpSep, L.fc145g] },
  // Com EBT: 12 meses, que o operador pode prorrogar com aprovação da autoridade (que a app não vê) → a data do operador.
  ebtLine: { calc: 'date', law: [L.ebtSub, L.ebtLine, L.ebtLineExt], note: t('Com EBT, a avaliação de linha vale 12 meses, e o operador pode prorrogá-la com aprovação da autoridade: escreve a data que o operador marca.', 'Under EBT, the line evaluation is valid for 12 months, and the operator may extend it with the authority\'s approval: enter the date your operator records.') },
  ebtSep: { calc: 'date', law: [L.ebtSub, L.ebtSep, L.ebtSepExt], note: t('Com EBT, o equipamento de emergência é a cada 12 meses, prorrogável para 24 com aprovação da autoridade: escreve a data que o operador marca.', 'Under EBT, emergency equipment training is every 12 months, extendable to 24 with the authority\'s approval: enter the date your operator records.') },
  ccAnnual: (el) => ({ calc: 'done', months: 12, from: 'eom', window3: true, law: [L.cc140a, ...(el ? [el] : []), L.cc140e1, L.cc140e2] }),
};

const PILOT = [
  { id: 'medical', label: t('Médico Classe 1', 'Class 1 Medical'), rule: { calc: 'date', law: [L.med045, L.med045b], note: t('A validade é a do certificado: 12 meses, ou 6 a partir dos 60 anos (e dos 40 em operação monopiloto com passageiros).', 'The validity is the one on the certificate: 12 months, or 6 from age 60 (and from 40 in single-pilot passenger operations).') } },
  { id: 'licence', label: t('Licença (nº)', 'Licence (no.)'), noExpiry: true, rule: { calc: 'reference', law: [L.fcl040], note: t('A licença não expira: o que expira são as qualificações averbadas e o certificado médico.', 'The licence does not expire: the ratings on it and the medical certificate do.') } },
  { id: 'opc', label: t('OPC', 'OPC'), labelEbt: t('Módulo EBT', 'EBT module'), programs: { geral: R.opc6, atqp: R.opcAtqp, ebt: R.ebt12 } },
  { id: 'lineCheck', label: t('Line check', 'Line check'), programs: { geral: R.line12, atqp: R.lineAtqp, ebt: R.ebtLine } },
  { id: 'sep', label: t('SEP · equipamento de emergência', 'SEP · emergency equipment'), programs: { geral: R.sep12, atqp: R.sepAtqp, ebt: R.ebtSep } },
  { id: 'typeRating', label: t('Type rating · LPC', 'Type rating · LPC'), rule: { calc: 'date', law: [L.fcl740, L.ara215c], note: t('A validade é a que o examinador escreve na licença (1 ano, até ao fim do mês).', 'The validity is the date the examiner enters on the licence (1 year, to the end of the month).') } },
  { id: 'ir', label: t('IR · instrumentos', 'Instrument Rating (IR)'), rule: { calc: 'date', law: [L.fcl625, L.ara215c], note: t('A validade é a que o examinador escreve na licença (1 ano, até ao fim do mês).', 'The validity is the date the examiner enters on the licence (1 year, to the end of the month).') } },
  { id: 'lang', label: t('Inglês ICAO', 'ICAO English'), level: true, rule: { calc: 'date', law: [L.fcl055a, L.fcl055c], note: t('A validade é a escrita no averbamento da licença. O nível 6 não expira.', 'The validity is the date on the licence endorsement. Level 6 does not expire.') } },
  { id: 'crm', label: t('CRM', 'CRM'), rule: { calc: 'date', law: [L.crmFc], note: t('O regulamento não dá validade ao CRM dos pilotos: são módulos repartidos por cada período de 3 anos. Escreve a data que o operador marca.', 'The regulation gives pilots\' CRM no validity period: modules spread over each 3-year period. Enter the date your operator records.') } },
  { id: 'dg', label: t('Dangerous Goods', 'Dangerous Goods'), rule: { calc: 'date', law: [L.dgTi], note: t('O prazo vem das Instruções Técnicas da ICAO, que não são públicas: escreve a data do certificado.', 'The period comes from the ICAO Technical Instructions, which are not public: enter the certificate date.') } },
  // Revisão do 8b: o alargamento ao dia útil seguinte (Reg. 1182/71, art. 3.º, n.º 4) não se sabe se vale para uma periodicidade
  // de formação (pack do advogado, E8) → a app usa o próprio dia (a leitura que nunca deixa a formação caducar sem aviso).
  { id: 'asec', label: t('Segurança (AVSEC)', 'Aviation Security'), rule: { calc: 'done', years: 5, from: 'day', law: [L.avsec5, L.prazo3c, L.prazo34], note: t('Formação contínua pelo menos uma vez em cada 5 anos (ou antes de voltar, depois de mais de 6 meses sem estas funções). A app conta até ao mesmo dia, mesmo que calhe a um fim de semana: se a regra dos prazos (Reg. 1182/71, art. 3.º, n.º 4) se aplica a esta formação, pode ir até ao dia útil seguinte — confirma com o operador.', 'Recurrent training at least every 5 years (or before resuming, after more than 6 months without these duties). The app counts to the same day, even at a weekend: if the time-limit rule (Reg. 1182/71, Art. 3(4)) applies to this training, it may run to the next working day — check with your operator.') } },
  { id: 'faid', label: t('Primeiros socorros', 'First Aid'), rule: { calc: 'date', law: [L.fc145g], note: t('O regulamento não dá aos pilotos um prazo próprio de primeiros socorros: escreve a data que o operador marca.', 'The regulation sets pilots no separate first-aid period: enter the date your operator records.') } },
  { id: 'passport', label: t('Passaporte', 'Passport'), rule: { calc: 'date', law: [] } },
];
const CABIN = [
  { id: 'medical', label: t('Médico', 'Medical'), rule: { calc: 'date', law: [L.medC005], note: t('A validade é a do relatório da avaliação aeromédica (no máximo 60 meses).', 'The validity is the one on the aero-medical assessment report (60 months at most).') } },
  { id: 'cca', label: t('Atestado de cabine (nº)', 'Cabin Crew Attestation (no.)'), noExpiry: true, rule: { calc: 'reference', law: [L.cca105], note: t('Emitido por período ilimitado; deixa de valer se for suspenso, ou se não voares 60 meses em nenhum tipo de avião.', 'Issued with unlimited duration; it lapses if suspended, or if you do not fly for 60 months on any aircraft type.') } },
  { id: 'sep', label: t('SEP · formação periódica anual', 'SEP · annual recurrent'), rule: R.ccAnnual(null) },
  { id: 'crm', label: t('CRM', 'CRM'), rule: R.ccAnnual(L.cc140crm) },
  { id: 'faid', label: t('Primeiros socorros', 'First Aid'), rule: R.ccAnnual(L.cc140faid) },
  { id: 'asec', label: t('Segurança', 'Security'), rule: R.ccAnnual(L.cc140sec) },
  { id: 'triennial', label: t('Módulos trienais (fogo, fumo, portas)', 'Triennial modules (fire, smoke, doors)'), rule: { calc: 'done', months: 36, from: 'eom', law: [L.cc140e3] } },
  { id: 'dg', label: t('Dangerous Goods', 'Dangerous Goods'), rule: { calc: 'date', law: [L.dgTi], note: t('O prazo vem das Instruções Técnicas da ICAO, que não são públicas: escreve a data do certificado.', 'The period comes from the ICAO Technical Instructions, which are not public: enter the certificate date.') } },
  { id: 'passport', label: t('Passaporte', 'Passport'), rule: { calc: 'date', law: [] } },
];
// Papel ADICIONAL (opt-in no perfil): o certificado de instrutor (Part-FCL). Só pilotos.
const INSTRUCTOR = { id: 'instructor', label: t('Instrutor · TRI/TRE', 'Instructor · TRI/TRE'), rule: { calc: 'date', law: [L.fcl940, L.ara215c], note: t('A validade é a escrita no certificado (3 anos, até ao fim do mês).', 'The validity is the one on the certificate (3 years, to the end of the month).') } };

export const PROGRAMS = ['geral', 'atqp', 'ebt'];
export const programLabel = (p, lang = 'pt') => {
  const M = { geral: t('Regra geral', 'General rule'), atqp: t('ATQP', 'ATQP'), ebt: t('EBT', 'EBT') };
  return M[p] ? M[p][lang === 'en' ? 'en' : 'pt'] : '';
};

// Catálogo conforme a FUNÇÃO (piloto/cabine) + PAPÉIS adicionais do perfil (ex. instrutor).
export const validityCatalog = (isPilot, { instructorRated = false } = {}) => {
  const base = isPilot ? PILOT : CABIN;
  return (isPilot && instructorRated) ? [...base, INSTRUCTOR] : base;
};
const defOf = (typeId, isPilot) => {
  const own = (isPilot ? [...PILOT, INSTRUCTOR] : CABIN).find((d) => d.id === typeId);
  return own || [...PILOT, ...CABIN, INSTRUCTOR].find((d) => d.id === typeId) || null;
};

// Rótulo de um tipo no catálogo DA FUNÇÃO (a cabine tem "Médico", o piloto "Médico Classe 1"); fallback ao id.
export const validityLabel = (typeId, isPilot, lang = 'pt', program = null) => {
  const d = defOf(typeId, !!isPilot);
  if (!d) return typeId;
  const lb = program === 'ebt' && d.labelEbt ? d.labelEbt : d.label;
  return lang === 'en' ? lb.en : lb.pt;
};

// Tipo que NÃO expira → documento de REFERÊNCIA (sem alarme, sem lembrete): licença Part-FCL (FCL.040), CCA (CC.CCA.105).
export const isNoExpiryType = (typeId) => [...PILOT, ...CABIN].some((d) => d.id === typeId && d.noExpiry);

// A regra de um tipo: { calc: 'done'|'date'|'reference'|'program', months?, years?, from?, window3?, law, note? }.
// 'program' = o tipo depende do programa do operador e ele ainda não foi escolhido.
export const ruleForType = (typeId, isPilot, program = null) => {
  const d = defOf(typeId, !!isPilot);
  if (!d) return { calc: 'date', law: [] };                    // tipo desconhecido (custom): data escrita
  if (d.programs) return PROGRAMS.includes(program) ? d.programs[program] : { calc: 'program', law: [] };
  return d.rule;
};
export const needsProgram = (typeId, isPilot) => { const d = defOf(typeId, !!isPilot); return !!(d && d.programs); };

// Meses (ou anos × 12) do prazo de um tipo; null se a validade é escrita ou não expira.
export const renewMonthsForType = (typeId, isPilot = false, program = null) => {
  const r = ruleForType(typeId, isPilot, program);
  if (r.calc !== 'done') return null;
  return r.months || (r.years ? r.years * 12 : null);
};

// ── datas (puras, em UTC para não depender do fuso) ──────────────────────────────────────────────
const p2 = (n) => String(n).padStart(2, '0');
const isoUTC = (dt) => `${dt.getUTCFullYear()}-${p2(dt.getUTCMonth() + 1)}-${p2(dt.getUTCDate())}`;
const parts = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? [+m[1], +m[2], +m[3]] : null; };
// Uma data que existe mesmo (31/04, 30/02 e 29/02 de ano comum não existem).
export const isRealISODate = (iso) => {
  const p = parts(iso);
  if (!p) return false;
  const dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  return dt.getUTCFullYear() === p[0] && dt.getUTCMonth() === p[1] - 1 && dt.getUTCDate() === p[2];
};
export const buildISODate = (d, m, y) => {
  const dd = +d, mm = +m, yy = +y;
  if (!dd || !mm || !yy || yy < 2000 || yy > 2100) return null;
  const iso = `${yy}-${p2(mm)}-${p2(dd)}`;
  return isRealISODate(iso) ? iso : null;
};
// Data feita + meses, até ao FIM DO MÊS (ORO.FC.145 g); ORO.CC.140 e) 1) e 3)). null se faltar algo.
export const deriveExpiry = (doneISO, months) => {
  const p = parts(doneISO);
  if (!p || !months || !isRealISODate(doneISO)) return null;
  return isoUTC(new Date(Date.UTC(p[0], p[1] - 1 + months + 1, 0)));   // dia 0 = último do mês
};
// Data feita + anos, até ao MESMO DIA (Reg. 1182/71, art. 3.º, n.º 2 c)); se esse dia não existir no último
// mês (29 de fevereiro), acaba no último dia desse mês.
export const addYearsSameDay = (doneISO, years) => {
  const p = parts(doneISO);
  if (!p || !years || !isRealISODate(doneISO)) return null;
  const y = p[0] + years;
  const last = new Date(Date.UTC(y, p[1], 0)).getUTCDate();
  return `${y}-${p2(p[1])}-${p2(Math.min(p[2], last))}`;
};
// Data + meses, até ao MESMO DIA (Reg. 1182/71, art. 3.º, n.º 2 c)); se esse dia não existir, o último do mês.
export const addMonthsSameDay = (iso, months) => {
  const p = parts(iso);
  if (!p || !months || !isRealISODate(iso)) return null;
  const y = p[0] + Math.floor((p[1] - 1 + months) / 12), m = ((p[1] - 1 + months) % 12) + 1;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${p2(m)}-${p2(Math.min(p[2], last))}`;
};
// Nos "três últimos meses do prazo de validade" (meses de calendário: ORO.CC.140 e) 2)).
export const inLastThreeMonths = (doneISO, prevExpiryISO) => {
  const d = parts(doneISO), e = parts(prevExpiryISO);
  if (!d || !e) return false;
  const start = isoUTC(new Date(Date.UTC(e[0], e[1] - 3, 1)));
  return doneISO >= start && doneISO <= prevExpiryISO;
};

// A validade como diz a lei. { type, isPilot, program, doneISO, prevExpiryISO } →
// { expiry, from: 'done' | 'prev' } para os tipos 'done'; null nos outros (a validade é escrita).
export const computeExpiry = ({ type, isPilot = false, program = null, doneISO, prevExpiryISO = null } = {}) => {
  const r = ruleForType(type, isPilot, program);
  if (r.calc !== 'done' || !isRealISODate(doneISO)) return null;
  if (r.years) { const e = addYearsSameDay(doneISO, r.years); return { expiry: e, from: 'done', rule: r }; }
  if (r.window3 && isRealISODate(prevExpiryISO) && inLastThreeMonths(doneISO, prevExpiryISO)) {
    return { expiry: addMonthsSameDay(prevExpiryISO, r.months), from: 'prev', rule: r };   // "a partir da data de termo inicial"
  }
  return { expiry: deriveExpiry(doneISO, r.months), from: 'done', rule: r };
};

// As validades guardadas, com a validade COMO DIZ A LEI: nos tipos 'done' recalcula-se sempre a partir da data
// feita (uma correção da lei chega às validades já gravadas); nos outros fica a data escrita. Um item antigo
// cuja data foi CALCULADA pela app (tem data feita) num tipo em que a lei manda escrever a data perde essa data
// (era inventada): fica "sem data" até o tripulante a escrever. Os tipos com programa sem programa: "sem data".
// O 'typeRating' antigo (OPC/LPC juntos) passa a ser só o type rating/LPC (data da licença).
export const lawfulValidities = (items = [], isPilot = false) => (items || []).map((v) => {
  if (!v || !v.type) return v;
  const r = ruleForType(v.type, isPilot, v.program || null);
  if (r.calc === 'done') {
    if (!v.doneDate) return v;                       // só o "válido até" que o tripulante escreveu: fica (não é inventado)
    const c = computeExpiry({ type: v.type, isPilot, program: v.program || null, doneISO: v.doneDate, prevExpiryISO: v.prevExpiry || null });
    return c ? { ...v, expiry: c.expiry, expiryFrom: c.from } : { ...v, expiry: null };
  }
  if (r.calc === 'program') return { ...v, expiry: null, needsProgram: true };
  if (r.calc === 'reference') return { ...v, expiry: null };
  if (r.calc === 'date' && v.doneDate) return { ...v, expiry: null, doneDate: null, legacyDerived: true };
  return v;
});

// Que campos o formulário mostra para cada tipo:
//  done       — DATA FEITA → validade calculada pela lei     date — "VÁLIDO ATÉ" escrito
//  reference  — não expira, só nº                            program — escolher o programa do operador (pilotos)
//  prev       — validade anterior (renovação nos 3 últimos meses, cabine)   number/nationality/aircraft/limitations/level/instrKind — extras
export const fieldsForType = (typeId, isPilot = false, program = null) => {
  const r = ruleForType(typeId, isPilot, program);
  const extra = {
    medical: { limitations: true, number: true }, passport: { number: true, nationality: true },
    licence: { number: true }, cca: { number: true }, lang: { level: true }, typeRating: { aircraft: true },
    instructor: { instrKind: true },
  }[typeId] || {};
  const base = r.calc === 'reference' ? { reference: true } : r.calc === 'done' ? { done: true } : r.calc === 'program' ? {} : { date: true };
  return { ...base, ...(needsProgram(typeId, isPilot) ? { program: true } : {}), ...(r.window3 ? { prev: true } : {}), ...extra };
};

// Proficiência linguística (FCL.055 c)): nível 4 = reavaliação a cada 4 anos · nível 5 = 6 anos · nível 6 = não expira.
// (A validade é a escrita no averbamento — FCL.055 a); isto é só a informação mostrada.)
export const LANG_LEVELS = [4, 5, 6];
export const langRenewMonths = (level) => (level === 6 ? null : level === 5 ? 72 : 48);

// Tipos de certificado de instrutor/examinador (Part-FCL) — para o piloto escolher qual tem.
export const INSTRUCTOR_KINDS = ['TRI', 'TRE', 'FI', 'SFI'];

// Códigos de limitação médica (Part-MED), crew-aware — os mais comuns na linha (o resto vai na nota).
const MED_CODES_PILOT = [
  { code: 'VDL', pt: 'óculos p/ longe + sobresselente', en: 'distance glasses + spare' },
  { code: 'VML', pt: 'multifocais + sobresselente',     en: 'multifocals + spare' },
  { code: 'VNL', pt: 'óculos p/ perto disponíveis',     en: 'reading glasses available' },
  { code: 'OML', pt: 'só multipiloto',                  en: 'multi-pilot only' },
  { code: 'OCL', pt: 'só como copiloto',                en: 'co-pilot only' },
  { code: 'HAL', pt: 'com aparelho auditivo',           en: 'with hearing aid' },
  { code: 'TML', pt: 'validade reduzida',               en: 'time-limited' },
  { code: 'SIC', pt: 'exames médicos extra',            en: 'special medical exams' },
];
const MED_CODES_CABIN = [
  { code: 'CCL', pt: 'só lentes de contacto',           en: 'contact lenses only' },
  { code: 'HAL', pt: 'com aparelho auditivo',           en: 'with hearing aid' },
  { code: 'MCL', pt: 'só tripulação múltipla',          en: 'multi cabin-crew only' },
  { code: 'OAL', pt: 'restrito ao tipo de avião',       en: 'aircraft-type restricted' },
  { code: 'TML', pt: 'validade reduzida',               en: 'time-limited' },
  { code: 'SIC', pt: 'exames médicos extra',            en: 'special medical exams' },
];
export const medCodes = (isPilot) => (isPilot ? MED_CODES_PILOT : MED_CODES_CABIN);
export const medCodeHint = (code, isPilot, lang = 'pt') => {
  const def = [...MED_CODES_PILOT, ...MED_CODES_CABIN].find((c) => c.code === code);
  return def ? (lang === 'en' ? def.en : def.pt) : '';
};

// Estado de um item pela data de validade, em DIAS DE CALENDÁRIO: o dia da validade vale por inteiro (a validade
// vai até ao fim do mês: ORO.FC.145 g); ORO.CC.140 e); ARA.FCL.215). `ref` = o dia de referência (hoje, ou o dia
// de um serviço); só conta a data de `ref`, não a hora. warnDays = janela "a expirar" (default 30).
// band: 'valid' (verde) · 'expiring' (âmbar) · 'expired' (vermelho) · 'none' (sem data).
export function validityStatus(expiryISO, ref = new Date(), warnDays = 30) {
  const e = parts(expiryISO);
  if (!e || !isRealISODate(expiryISO)) return { band: 'none', days: null };
  const r = ref instanceof Date ? ref : new Date(ref);
  if (isNaN(r.getTime())) return { band: 'none', days: null };
  const days = Math.round((Date.UTC(e[0], e[1] - 1, e[2]) - Date.UTC(r.getFullYear(), r.getMonth(), r.getDate())) / 86400000);
  const band = days < 0 ? 'expired' : days <= warnDays ? 'expiring' : 'valid';
  return { band, days };
}
// O dia de um serviço (ISO) como referência — meio-dia local, para a data nunca escorregar.
export const refOfDay = (iso) => (isRealISODate(iso) ? new Date(`${iso}T12:00:00`) : new Date());
// O dia (hora local) de um lembrete N dias de calendário antes da validade — sem somar dias de 24 h (que
// escorregam um dia na mudança para a hora de verão).
export const reminderDate = (expiryISO, daysBefore, h = 9, m = 0) => {
  const e = parts(expiryISO);
  return e && isRealISODate(expiryISO) ? new Date(e[0], e[1] - 1, e[2] - daysBefore, h, m, 0, 0) : null;
};

// O resumo das validades num dia (Início, Simulação): o pior item e quantos não têm data. Fora: as referências
// (licença, CCA) e o inglês de nível 6 (não expiram).
export const validitySummary = (items = [], ref = new Date()) => {
  const RANK = { expired: 0, expiring: 1, valid: 2, none: 3 };
  const tracked = (items || []).filter((v) => v && !isNoExpiryType(v.type) && !(v.type === 'lang' && v.level === 6));
  if (!tracked.length) return null;
  const withSt = tracked.map((v) => ({ ...v, st: validityStatus(v.expiry, ref) }));
  const worst = withSt.reduce((a, b) => ((RANK[a.st.band] ?? 3) <= (RANK[b.st.band] ?? 3) ? a : b));
  return { worst, withSt, missing: withSt.filter((v) => v.st.band === 'none').length };
};

// Ordena itens: primeiro os que pedem atenção (expirado → a expirar → válido → sem data),
// e dentro de cada grupo por data mais próxima. Puro (devolve novo array).
export function sortValidities(items = [], ref = new Date()) {
  const RANK = { expired: 0, expiring: 1, valid: 2, none: 3 };
  return [...items].sort((a, b) => {
    const sa = validityStatus(a.expiry, ref), sb = validityStatus(b.expiry, ref);
    const r = (RANK[sa.band] ?? 3) - (RANK[sb.band] ?? 3);
    if (r !== 0) return r;
    if (sa.days == null) return 1;
    if (sb.days == null) return -1;
    return sa.days - sb.days;
  });
}
