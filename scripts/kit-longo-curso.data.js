// KIT DE TESTE — longo curso da TAP (guião docs/verificacao-device.md §0i). Voos INVENTADOS, nunca dados reais.
// Horas na hora de Lisboa, que em novembro e dezembro de 2026 é a UTC (inverno). `rep` vai para as notas
// ("RP 22:00"), como a escala lê a apresentação. O .ics gera-se com: node scripts/kit-longo-curso.js
module.exports = {
  duties: [
    // A · São Paulo (16 a 19 nov) + um médio curso cedo no domingo 22
    { date: '2026-11-16', rep: '22:00', legs: [['LIS', 'GRU', '23:15', '09:45']] },
    { date: '2026-11-18', rep: '19:45', legs: [['GRU', 'LIS', '21:00', '06:30']] },
    { date: '2026-11-22', rep: '02:00', legs: [['LIS', 'OPO', '03:00', '04:00'], ['OPO', 'LIS', '05:00', '06:00']] },
    // B · São Francisco (30 nov a 3 dez): regresso com saída às 05h00 de SFO
    { date: '2026-11-30', rep: '10:00', legs: [['LIS', 'SFO', '11:00', '23:00']] },
    { date: '2026-12-02', rep: '12:00', legs: [['SFO', 'LIS', '13:00', '00:00']] },
    // C · Luanda (7 a 11 dez): a seguir a SFO, 9 h de diferença
    { date: '2026-12-07', rep: '10:00', legs: [['LIS', 'LAD', '11:00', '18:00']] },
    { date: '2026-12-10', rep: '20:00', legs: [['LAD', 'LIS', '21:00', '04:30']] },
    // D · Newark (21 a 23 dez): regresso ao fim de 37 h
    { date: '2026-12-21', rep: '10:00', legs: [['LIS', 'EWR', '11:00', '19:00']] },
    { date: '2026-12-22', rep: '23:00', legs: [['EWR', 'LIS', '00:00', '09:20']] },   // saída à meia-noite, apresentação na véspera (a correção da importação)
  ],
};
