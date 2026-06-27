/*
 * Sonda MANUAL da API de estado de voo (AirLabs) — valida se a fonte serve o card de
 * "voo atrasado" (estipulado vs real). NÃO faz parte da app; é só para TESTES.
 *
 * Key GRÁTIS (1000 pedidos/mês, SEM cartão): regista em https://airlabs.co/ → API key.
 *
 * Uso (Node 18+):
 *   AIRLABS_KEY=xxxxx node scripts/flight-api-probe.js EZY1234
 *   node scripts/flight-api-probe.js EZY1234 xxxxx
 *
 * Dica: corre com um voo easyJet que esteja A DECORRER ou perto do report (a API
 * devolve a instância mais próxima). Confirma se vêm `dep_estimated`/`dep_delayed`.
 */
const flight = (process.argv[2] || '').trim().toUpperCase();
const key = (process.argv[3] || process.env.AIRLABS_KEY || '').trim();

if (!flight || !key) {
  console.error('Uso: AIRLABS_KEY=xxxx node scripts/flight-api-probe.js <FLIGHT_IATA>   (ex. EZY1234 / U21234)');
  console.error('Key grátis (sem cartão): https://airlabs.co/');
  process.exit(1);
}

const url = `https://airlabs.co/api/v9/flight?flight_iata=${encodeURIComponent(flight)}&api_key=${encodeURIComponent(key)}`;

(async () => {
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.error) { console.error('Erro da API:', JSON.stringify(json.error)); process.exit(1); }
    const f = json.response || json;
    if (!f || (Array.isArray(f) && !f.length)) { console.error('Sem dados para', flight, '(voo não está a decorrer? tenta outro).'); process.exit(1); }
    const v = Array.isArray(f) ? f[0] : f;
    const g = (k) => (v[k] == null ? '—' : v[k]);

    console.log(`\n── ${g('flight_iata')} · ${g('airline_iata')} · status: ${g('status')} ──`);
    console.log('PARTIDA', g('dep_iata'));
    console.log('  agendada   dep_time      :', g('dep_time'), '   (UTC:', g('dep_time_utc') + ')');
    console.log('  estimada   dep_estimated :', g('dep_estimated'));
    console.log('  real       dep_actual    :', g('dep_actual'), '  ← pode não existir no AirLabs');
    console.log('  atraso     dep_delayed   :', v.dep_delayed != null ? v.dep_delayed + ' min' : '—');
    console.log('  gate/term  dep_gate/term :', g('dep_gate'), '/', g('dep_terminal'));
    console.log('CHEGADA', g('arr_iata'), '· atraso', v.arr_delayed != null ? v.arr_delayed + ' min' : '—');

    const delayed = (Number(v.dep_delayed) > 0) ||
      (v.dep_estimated && v.dep_time && v.dep_estimated !== v.dep_time);
    console.log('\nVEREDICTO p/ o card:', delayed
      ? '⚠ ATRASADO → o card de aviso APARECERIA (há desvio estipulado↔real)'
      : '✓ a horas — ou sem dados de atraso (campo vazio)');

    // Para o card precisamos de PELO MENOS: dep_time (agendada) + (dep_estimated OU dep_delayed).
    const ok = v.dep_time && (v.dep_estimated || v.dep_delayed != null);
    console.log('Campos suficientes p/ a feature?', ok ? 'SIM ✓' : 'NÃO — faltam estimada/atraso (fonte pode não servir p/ easyJet)');

    console.log('\n── RESPOSTA CRUA (p/ inspeção) ──');
    console.log(JSON.stringify(v, null, 2));
  } catch (e) {
    console.error('Falhou a chamada:', e.message);
    process.exit(1);
  }
})();
