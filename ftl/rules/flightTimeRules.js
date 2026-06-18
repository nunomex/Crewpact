// Limites cumulativos (ORO.FTL.210).
// Serviço (a): 60/110/190 h em 7/14/28 dias. Voo (b): 100/900/1000 h.
export const DUTY_WINDOWS = [
  { id: '7d',  days: 7,  limit: 60 },
  { id: '14d', days: 14, limit: 110 },
  { id: '28d', days: 28, limit: 190 },
];

export const FLIGHT_WINDOWS = [
  { id: '28d',  days: 28,             limit: 100 },
  { id: 'year', kind: 'calendarYear', limit: 900 },
  { id: '12m',  kind: 'months12',     limit: 1000 },
];
