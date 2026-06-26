// Exportação completa dos dados pessoais (RGPD — direito de acesso/portabilidade,
// Art. 15/20): um JSON estruturado de TUDO o que a app guarda sobre o utilizador —
// conta, perfil, escala (duties), histórico FTL (dayLog) e extras AE. Módulo PURO
// (sem React Native) → testável por golden. Não inclui flags internas de sync
// (dirty/snap/updated_at) nem duties apagadas; é uma cópia limpa dos dados do user.

const cleanDuties = (duties = {}) => {
  const out = {};
  for (const date in duties) {
    const d = duties[date];
    if (!d || d.deleted) continue;
    out[date] = {
      date,
      report_time: d.report_time || null,
      block_off: d.block_off || null,
      block_on: d.block_on || null,
      sectors: d.sectors || 0,
      flight_minutes: d.flight_minutes || 0,
      route: d.route || null,
      kind: d.kind || 'flight',
      nightStop: !!d.nightStop,
      source: d.source || 'manual',
    };
  }
  return out;
};

export const buildDataExport = ({ account = {}, profile = {}, duties = {}, dayLog = {}, aeExtras = {}, generatedAt = null } = {}) => {
  const d = cleanDuties(duties);
  return {
    app: 'CrewPact',
    schema: 1,
    exportedAt: generatedAt || new Date().toISOString(),
    account: { email: account.email || null, name: account.name || null },
    profile: {
      company: profile.company || null,
      crewType: profile.crewType || null,
      category: profile.crewCategory || null,
      contract: profile.crewContract || null,
      crewHistory: profile.crewHistory || null,   // linha do tempo categoria/contrato (effective-dated)
      base: profile.base || null,
      serviceStart: profile.serviceStart || null,
      lifestyle: !!profile.lifestyle,
      instructorRated: !!profile.instructorRated,
    },
    duties: d,
    ftlDayLog: dayLog || {},
    aeExtras: aeExtras || {},
    counts: {
      duties: Object.keys(d).length,
      ftlDays: Object.keys(dayLog || {}).length,
      aeMonths: Object.keys(aeExtras || {}).length,
    },
  };
};

// JSON indentado (pronto para partilha/ficheiro).
export const dataExportJson = (input) => JSON.stringify(buildDataExport(input), null, 2);
