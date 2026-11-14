/*
 * Golden do PERFIL (data/profileCards.js) — PURO, sem rede nem React. O que vai para onde na página da aba Perfil, a W1
 * "como um voo" de design/perfil-6.html (escolhida pelo Nuno a 2026-11-14), com as regras que a tornam honesta:
 *   · o topo é o das outras abas: o galão e a base em grande, os factos "na <companhia> desde" e o contrato — e cabe no
 *     tamanho comum das três abas (data/homeCards.js · topGiant), lado a lado;
 *   · a validade mais perto de caducar: o "a expirar" é o da app (30 dias, data/validities.js · validityStatus), não uma
 *     percentagem; a BARRA do tempo gasto só existe quando a lei dá o prazo e se sabe de onde conta (os tipos "data feita");
 *     no certificado médico, no passaporte e na licença a app só tem o "válido até" — sem barra (seria inventada);
 *     um PONTO por documento (as referências que não expiram ficam de fora);
 *   · a carreira como uma perna de voo: a entrada na companhia atual, as promoções (as mudanças de categoria na linha do
 *     tempo) como escalas, a categoria de hoje e a duração;
 *   · o acordo em números (pós-voo, férias, vínculo) e o chip de abrangido;
 *   · a família em círculos com as INICIAIS (a app não guarda fotos) e nunca "quem está a seguir" (o link não o regista);
 *   · as companhias "em breve" = as que a app ainda não sabe ler (data/rosterCodes · isRosterPending), como na entrada.
 * Executar:  node scripts/profilecards.test.js   (ou: npm run test:profilecards)
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require(path.resolve('node_modules/@babel/core'));
const cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs');
const origJs = Module._extensions['.js'];
Module._extensions['.js'] = function (m, filename) {
  if (filename.includes('node_modules')) return origJs(m, filename);
  m._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, babelrc: false, configFile: false, plugins: [cjsPlugin] }).code, filename);
};
const { profileTop, nearestValidity, careerLeg, agreementFacts, familyCircles, familyInitials, soonAirlinesText } = require(path.resolve('data/profileCards.js'));
const { topGiant, commonGiant } = require(path.resolve('data/homeCards.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) ok++; else { fail++; console.log(`✗ ${label}\n    tem:    ${g}\n    devia:  ${e}`); }
};
const yes = (label, cond, extra = '') => { if (cond) ok++; else { fail++; console.log(`✗ ${label}${extra ? ` — ${extra}` : ''}`); } };
const TODAY = new Date('2026-11-14T12:00:00');

// ═══ O TOPO — o das outras abas ═══
const TOP = profileTop({ lang: 'pt', crewType: 'pilot', name: 'Rita Almeida', category: 'FO', categoryLabel: 'Primeiro-oficial', base: 'LIS', companyName: 'easyJet', startISO: '2019-03-01', contract: '12/12', contractLabel: 'Tempo inteiro' });
eq('topo · as pílulas: a função e a companhia (sem ação)', [TOP.pill, TOP.pill2], [{ text: 'Piloto', live: false }, { text: 'easyJet', iso: null }]);
eq('topo · a frase: o nome e a categoria', TOP.what, 'Rita Almeida · primeiro-oficial');
eq('topo · o número: o galão e a base (a cinzento)', TOP.giant, { l1: 'FO', unit: null, l2: 'LIS', l2Grey: true });
// o contrato: o CÓDIGO e o rótulo curto — o nome por extenso ("14 dias de trabalho, 14 de folga") não cabia ao lado do número na cabine;
// vai por extenso no cartão de tripulante
eq('topo · os factos: desde quando e o contrato (o código)', TOP.facts, [{ v: '2019', l: 'na easyJet desde', tone: null }, { v: '12/12', l: 'contrato', tone: null }]);
eq('topo · cabine', profileTop({ lang: 'pt', crewType: 'cabin', category: 'CMP', categoryLabel: 'Chefe de cabine principal', base: 'OPO', companyName: 'easyJet' }).pill.text, 'Cabine');
eq('topo · sem nome: só a categoria', profileTop({ lang: 'pt', crewType: 'pilot', category: 'FO', categoryLabel: 'Primeiro-oficial', base: 'LIS', companyName: 'easyJet' }).what, 'primeiro-oficial');
eq('topo · sem entrada nem contrato: sem factos (nada inventado)', profileTop({ lang: 'pt', crewType: 'pilot', category: 'FO', base: 'LIS' }).facts, []);
eq('topo · sem categoria: um traço, nunca vazio', profileTop({ lang: 'pt', crewType: 'pilot' }).giant.l1, '—');
eq('topo · em inglês', profileTop({ lang: 'en', crewType: 'pilot', name: 'Rita', category: 'FO', categoryLabel: 'First Officer', base: 'LIS', companyName: 'easyJet', startISO: '2019-03-01', contract: '12/12', contractLabel: 'Full time' }).facts.map((f) => f.l), ['with easyJet since', 'contract']);
for (const [k, t] of [['FO/LIS', TOP],
  ['PPY 9/12', profileTop({ lang: 'pt', crewType: 'pilot', name: 'X', category: 'SFO', categoryLabel: 'Primeiro-oficial sénior', base: 'FAO', companyName: 'easyJet', startISO: '2010-01-01', contract: 'PPY 9/12', contractLabel: 'Sazonal 9 meses' })],
  ['CMP/OPO', profileTop({ lang: 'pt', crewType: 'cabin', name: 'X', category: 'CMP', categoryLabel: 'Chefe de cabine principal', base: 'OPO', companyName: 'easyJet', startISO: '2015-06-01', contract: '14-14', contractLabel: '14 dias de trabalho, 14 de folga' })]]) {
  const a = topGiant(t, 350), b = topGiant(t, 335);
  yes(`topo · ${k} · no tamanho comum das três abas, com os factos ao lado (390 e 375)`, a.size === commonGiant(350) && b.size === commonGiant(335) && a.fits && b.fits, `${a.size}/${b.size}`);
}

// ═══ A VALIDADE MAIS PERTO — o "a expirar" da app (30 dias); a barra só com o prazo da lei ═══
const VS = [
  { id: 'v1', type: 'medical', expiry: '2026-12-27' },                                                         // "válido até" escrito
  { id: 'v2', type: 'opc', program: 'geral', doneDate: '2026-06-10', expiry: '2026-12-31', expiryFrom: 'done' },                 // data feita → a lei dá o prazo
  { id: 'v3', type: 'passport', expiry: '2031-04-02' },
  { id: 'v4', type: 'licence' },                                                                                 // referência: não expira
];
const nv = nearestValidity(VS, { isPilot: true, today: TODAY, lang: 'pt' });
eq('validade · a mais perto (43 dias), sem "a expirar" (a janela é de 30)', [nv.item.id, nv.item.days, nv.item.band], ['v1', 43, 'valid']);
eq('validade · o certificado médico não tem barra (só o "válido até")', nv.bar, null);
eq('validade · um ponto por documento, do mais perto ao mais longe (a licença não conta)', nv.dots, ['valid', 'valid', 'valid']);
eq('validade · as contagens', nv.counts, { total: 3, valid: 3, expiring: 0, expired: 0, none: 0 });
const nv2 = nearestValidity([{ id: 'o', type: 'opc', program: 'geral', doneDate: '2026-06-10', expiry: '2026-12-31', expiryFrom: 'done' }], { isPilot: true, today: TODAY });
yes('validade · o OPC tem barra: o tempo gasto desde a data feita (a lei dá 6 meses)', nv2.bar != null && nv2.bar > 0.7 && nv2.bar < 0.8, String(nv2.bar));
const nv3 = nearestValidity([{ id: 'a', type: 'medical', expiry: '2026-11-30' }, { id: 'b', type: 'passport', expiry: '2026-11-01' }, { id: 'c', type: 'medical' }], { isPilot: true, today: TODAY });
eq('validade · o caducado vem primeiro; o sem data no fim', [nv3.item.id, nv3.item.band, nv3.dots], ['b', 'expired', ['expired', 'expiring', 'none']]);
eq('validade · a 16 dias está "a expirar"', nearestValidity([{ id: 'a', type: 'medical', expiry: '2026-11-30' }], { isPilot: true, today: TODAY }).item.band, 'expiring');
eq('validade · sem documentos: nada', nearestValidity([], { isPilot: true, today: TODAY }), null);
eq('validade · só sem data: os pontos, sem "a mais perto"', nearestValidity([{ id: 'a', type: 'medical' }], { isPilot: true, today: TODAY }).item, null);

// ═══ A CARREIRA — uma perna de voo: a entrada, as promoções como escalas, hoje ═══
const CH = [{ category: 'SO', contract: '12/12', from: '2019-03' }, { category: 'FO', contract: '12/12', from: '2021-05' }];
const leg = careerLeg({ crewHistory: CH, serviceStart: '2019-03-01', today: TODAY, lang: 'pt' });
eq('carreira · a partida: o ano e a categoria de entrada', leg.from, { year: '2019', category: 'SO' });
eq('carreira · a escala: a promoção a FO em 2021', leg.stops.map((s) => [s.year, s.category]), [['2021', 'FO']]);
yes('carreira · a escala no sítio certo da perna (26 de 92 meses)', Math.abs(leg.stops[0].pct - 26 / 92) < 0.01, String(leg.stops[0].pct));
eq('carreira · a chegada: a categoria de hoje', leg.to, { category: 'FO' });
eq('carreira · a duração', [leg.months, leg.text], [92, '7 anos e 8 meses']);
eq('carreira · em inglês', careerLeg({ crewHistory: CH, serviceStart: '2019-03-01', today: TODAY, lang: 'en' }).text, '7 years 8 months');
eq('carreira · um só período: sem escalas', careerLeg({ crewHistory: [{ category: 'FO', from: '2024-01' }], serviceStart: '2024-01-15', today: TODAY }).stops, []);
eq('carreira · 1 ano certo', careerLeg({ crewHistory: [{ category: 'FO', from: '2025-11' }], serviceStart: '2025-11-14', today: TODAY }).text, '1 ano');
eq('carreira · menos de um mês', careerLeg({ crewHistory: [{ category: 'FO', from: '2026-11' }], serviceStart: '2026-11-01', today: TODAY }).text, 'menos de um mês');
eq('carreira · sem data de entrada: nada', careerLeg({ crewHistory: CH, today: TODAY }), null);
eq('carreira · a entrada vem da linha da companhia quando não há data', careerLeg({ crewHistory: CH, companyHistory: [{ company: 'x', crewType: 'pilot', from: '2019-03' }], today: TODAY }).from.year, '2019');
eq('carreira · uma promoção antes da entrada na companhia atual não é escala', careerLeg({ crewHistory: [{ category: 'FO', from: '2015-01' }, { category: 'CPT', from: '2018-01' }], serviceStart: '2020-01-01', today: TODAY }).stops, []);

// ═══ O ACORDO — os números e o chip ═══
const ag = agreementFacts({ lang: 'pt', postFlightMin: 30, postFlightAssumed: true, vacationDaysYear: 22, showVacation: true, employment: 'employee', showEmployment: true, covered: true });
eq('acordo · pós-voo (com o ponto: é assumido), férias, vínculo', ag.items.map((x) => [x.k, x.v, x.unit, x.l, !!x.dot]), [['posvoo', '30', 'min', 'pós-voo', true], ['ferias', '22', 'dias', 'férias por ano', false], ['vinculo', 'Empresa', null, 'vínculo', false]]);
eq('acordo · o chip', ag.chip, 'ABRANGIDO');
eq('acordo · sem AE: só o pós-voo, sem chip', (() => { const a = agreementFacts({ lang: 'pt', postFlightMin: 0 }); return [a.items.map((x) => x.k), a.chip]; })(), [['posvoo'], null]);
eq('acordo · não abrangido', agreementFacts({ lang: 'pt', showEmployment: true, employment: 'agency', covered: false }).chip, 'NÃO ABRANGIDO');

// ═══ A FAMÍLIA — círculos com as iniciais; nunca "quem está a seguir" ═══
// a regra que a página da Família já usava (uma palavra → a inicial; várias → a 1.ª e a última) — agora uma só, aqui
eq('família · as iniciais', ['Ana Ribeiro', 'João', 'Mãe', '  ', 'maria de sousa'].map(familyInitials), ['AR', 'J', 'M', '?', 'MS']);
const fam = familyCircles([{ id: 1, label: 'Ana Ribeiro' }, { id: 2, label: 'João' }, { id: 3, label: 'Pai' }]);
eq('família · três pessoas: três círculos', fam.people.map((p) => [p.initials, p.label]), [['AR', 'Ana Ribeiro'], ['J', 'João'], ['P', 'Pai']]);
eq('família · sem "a seguir" (o link não regista quem o abre)', fam.people.some((p) => 'live' in p || 'following' in p), false);
const fam5 = familyCircles([1, 2, 3, 4, 5].map((i) => ({ id: i, label: `P ${i}` })));
eq('família · cinco pessoas: três círculos e "+2"', [fam5.people.length, fam5.more], [3, 2]);
eq('família · sem ninguém', familyCircles([]), { people: [], more: 0 });
eq('família · ainda a carregar (null) ou sem rede (false)', [familyCircles(null), familyCircles(false)], [{ people: [], more: 0 }, { people: [], more: 0 }]);

// ═══ AS COMPANHIAS "EM BREVE" — as que a app ainda não sabe ler (como na entrada) ═══
const AIR = [{ id: 'e', name: 'easyJet', slug: 'easyjet' }, { id: 't', name: 'TAP Air Portugal', slug: 'tap' }, { id: 'r', name: 'Ryanair', slug: 'ryanair' }];
eq('companhias · a TAP ainda não se lê', soonAirlinesText(AIR, 'e', 'pt'), 'TAP Air Portugal em breve');
eq('companhias · em inglês', soonAirlinesText(AIR, 'e', 'en'), 'TAP Air Portugal coming soon');
eq('companhias · a atual nunca entra', soonAirlinesText(AIR, 't', 'pt'), null);
eq('companhias · sem catálogo', soonAirlinesText([], 'e', 'pt'), null);

console.log(`profilecards: ${ok} ok, ${fail} falhou`);
if (require.main === module) process.exit(fail ? 1 : 0);
