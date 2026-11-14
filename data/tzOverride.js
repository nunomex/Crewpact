// Fusos dos aeroportos que o tz-lookup (pelas coordenadas) erra — perto de fronteiras e no mar. Conferidos contra a tabela
// oficial da IANA (fontes/iana/: zone.tab, zone1970.tab, backward — tzdb, descarregadas a 2026-11-08) pelo teste de
// scripts/zulu.test.js, que tranca o catálogo todo: cada aeroporto num fuso do seu país, ou com as mesmas horas que um deles.
// Emendas à mão: Trail (BC) e o Yukon têm regras próprias; Wrangell é hora do Alasca (Sitka); a China tem uma só hora oficial.
// Hyder (WHD, Alasca) fica de fora de propósito: vive na hora do Pacífico, como Stewart (BC).
// IATA e ICAO (quando existe) → fuso IANA.  Cidade (país): o que o tz-lookup dava.
export const TZ_OVERRIDE = {
  BTZ: 'Asia/Bangkok', VTSY: 'Asia/Bangkok',   // Betong (TH): Asia/Kuala_Lumpur
  YZZ: 'America/Vancouver',   // Trail (CA): America/Los_Angeles
  YXQ: 'America/Whitehorse', CYXQ: 'America/Whitehorse',   // Beaver Creek (CA): America/Anchorage
  IAM: 'Africa/Algiers', DAUZ: 'Africa/Algiers',   // In Aménas (DZ): Africa/Tripoli
  DIO: 'America/Nome',   // Diomede (US): Asia/Anadyr
  LRL: 'Africa/Lome', DXNG: 'Africa/Lome',   // Niamtougou (TG): Africa/Porto-Novo
  KTQ: 'Europe/Helsinki', EFIT: 'Europe/Helsinki',   // Kitee (FI): Europe/Moscow
  SWX: 'Africa/Gaborone', FBSW: 'Africa/Gaborone',   // Shakawe (BW): Africa/Luanda
  DUE: 'Africa/Luanda', FNDU: 'Africa/Luanda',   // Chitato (AO): Africa/Lubumbashi
  KGJ: 'Africa/Blantyre', FWKA: 'Africa/Blantyre',   // Karonga (MW): Africa/Dar_es_Salaam
  NDU: 'Africa/Windhoek', FYRU: 'Africa/Windhoek',   // Rundu (NA): Africa/Luanda
  JCU: 'Africa/Ceuta', GECE: 'Africa/Ceuta',   // Ceuta (ES): Africa/Casablanca
  TCP: 'Africa/Cairo', HETB: 'Africa/Cairo',   // Taba (EG): Asia/Amman
  LKG: 'Africa/Nairobi', HKLK: 'Africa/Nairobi',   // Lokichogio (KE): Africa/Juba
  RUA: 'Africa/Kampala', HUAR: 'Africa/Kampala',   // Arua (UG): Africa/Lubumbashi
  HUL: 'America/New_York', KHUL: 'America/New_York',   // Houlton (US): America/Moncton
  MQC: 'America/Miquelon', LFVM: 'America/Miquelon',   // Miquelon (PM): America/St_Johns
  FSP: 'America/Miquelon', LFVP: 'America/Miquelon',   // Saint-Pierre (PM): America/St_Johns
  KZS: 'Europe/Athens', LGKJ: 'Europe/Athens',   // Kastelorizo Island (GR): Europe/Istanbul
  LMP: 'Europe/Rome', LICD: 'Europe/Rome',   // Lampedusa (IT): Africa/Tunis
  ETM: 'Asia/Jerusalem', LLER: 'Asia/Jerusalem',   // Eilat (IL): Asia/Amman
  GDT: 'America/Grand_Turk', MBGT: 'America/Grand_Turk',   // Cockburn Town (TC): America/Santo_Domingo
  SLX: 'America/Grand_Turk', MBSY: 'America/Grand_Turk',   // Salt Cay (TC): America/Santo_Domingo
  CHX: 'America/Panama', MPCH: 'America/Panama',   // Changuinola (PA): America/Costa_Rica
  HOG: 'America/Havana', MUHG: 'America/Havana',   // Holguin (CU): America/Nassau
  MOA: 'America/Havana', MUMO: 'America/Havana',   // Moa (CU): America/Nassau
  PPG: 'Pacific/Pago_Pago', NSTU: 'Pacific/Pago_Pago',   // Pago Pago (AS): Pacific/Apia
  BAH: 'Asia/Bahrain', OBBI: 'Asia/Bahrain',   // Manama (BH): Asia/Tehran
  GAM: 'America/Nome', PAGM: 'America/Nome',   // Gambell (US): Asia/Anadyr
  PSG: 'America/Sitka', PAPG: 'America/Sitka',   // Petersburg (US): America/Vancouver
  WRG: 'America/Sitka', PAWG: 'America/Sitka',   // Wrangell (US): America/Vancouver
  PCR: 'America/Bogota', SKPC: 'America/Bogota',   // Puerto Carreño (CO): America/Caracas
  BJO: 'America/La_Paz', SLBJ: 'America/La_Paz',   // Bermejo (BO): America/Argentina/Salta
  CIJ: 'America/La_Paz', SLCO: 'America/La_Paz',   // Cobija (BO): America/Rio_Branco
  PEM: 'America/Lima', SPTU: 'America/Lima',   // Puerto Maldonado (PE): America/La_Paz
  EOZ: 'America/Caracas', SVEZ: 'America/Caracas',   // Elorza (VE): America/Bogota
  GDO: 'America/Caracas', SVGD: 'America/Caracas',   // Guasdualito (VE): America/Bogota
  LFR: 'America/Caracas', SVLF: 'America/Caracas',   // La Fria (VE): America/Bogota
  PYH: 'America/Caracas', SVPA: 'America/Caracas',   // Puerto Ayacucho (VE): America/Bogota
  VMI: 'America/Asuncion',   // Puerto Vallemi (PY): America/Campo_Grande
  KEP: 'Asia/Kathmandu', VNNG: 'Asia/Kathmandu',   // Nepalgunj (NP): Asia/Kolkata
  KAW: 'Asia/Yangon', VYKT: 'Asia/Yangon',   // Kawthoung (MM): Asia/Bangkok
  OKL: 'Asia/Jayapura', WAJO: 'Asia/Jayapura',   // Oksibil (ID): Pacific/Port_Moresby
  UAI: 'Asia/Dili', WPDB: 'Asia/Dili',   // Suai (TL): Asia/Makassar
  DIL: 'Asia/Dili', WPDL: 'Asia/Dili',   // Dili (TL): Asia/Makassar
  OEC: 'Asia/Dili', WPOC: 'Asia/Dili',   // Oecussi-Ambeno (TL): Asia/Makassar
  CWJ: 'Asia/Shanghai', ZPCW: 'Asia/Shanghai',   // Lincang (Cangyuan) (CN): Asia/Yangon
  LZY: 'Asia/Shanghai', ZUNZ: 'Asia/Shanghai',   // Nyingchi (Mainling) (CN): Asia/Kolkata
  // 2026-11-14: os 3 599 aeroportos que entraram no catálogo (todos os com IATA, o Nuno: "a app tem que reconhecer todos") —
  // 46 perto de fronteiras davam o fuso do vizinho. País de um só fuso = o desse país; EUA, Indonésia, Mongólia e Antártida pelo sítio
  // (Plentywood MT = Denver; Limestone ME = New York; Taku Lodge AK = Juneau; a Papua = Jayapura; Sabang = Jakarta; Bulgan (Khovd)
  // = Hovd; Union Glacier vive na hora do Chile, a de Palmer). O teste de scripts/zulu.test.js confere cada um contra a IANA.
  TMQ: 'Africa/Ouagadougou', DFEM: 'Africa/Ouagadougou',   // Tambao (BF)
  IRO: 'Africa/Bangui', FEFI: 'Africa/Bangui',   // Birao (CF)
  IMO: 'Africa/Bangui', FEFZ: 'Africa/Bangui',   // Zemio (CF)
  MKI: 'Africa/Bangui', FEGE: 'Africa/Bangui',   // Mboki (CF)
  PGI: 'Africa/Luanda', FNCH: 'Africa/Luanda',   // Chitato (AO)
  CEH: 'Africa/Blantyre', FWCD: 'Africa/Blantyre',   // Chelinda (MW)
  OMG: 'Africa/Windhoek', FYOE: 'Africa/Windhoek',   // Omega (NA)
  EGN: 'Africa/Khartoum', HSGN: 'Africa/Khartoum',   // Geneina (SD)
  RUF: 'Asia/Jayapura',   // Amgotro (ID)
  PWD: 'America/Denver', KPWD: 'America/Denver',   // Plentywood (US)
  VDA: 'Asia/Jerusalem', LLOV: 'Asia/Jerusalem',   // Eilat (IL)
  LMZ: 'Africa/Maputo',   // Palma (MZ)
  GKD: 'Europe/Istanbul', LTFK: 'Europe/Istanbul',   // Gökçeada (TR)
  LIZ: 'America/New_York',   // Limestone (US)
  BWW: 'America/Havana', MUBR: 'America/Havana',   // Cayo Santa Maria (CU)
  BQI: 'Africa/Windhoek',   // Bagani (NA)
  NND: 'Africa/Maputo',   // Nangade (MZ)
  DAZ: 'Asia/Kabul', OADZ: 'Asia/Kabul',   // Darwaz (AF)
  KWH: 'Asia/Kabul', OAHN: 'Asia/Kabul',   // Khwahan (AF)
  SGA: 'Asia/Kabul', OASN: 'Asia/Kabul',   // Shiveh (AF)
  AML: 'America/Panama',   // Puerto Armuelles (PA)
  PBT: 'America/Asuncion',   // Puerto Leda (PY)
  PCJ: 'America/Asuncion', SGLV: 'America/Asuncion',   // Puerto La Victoria (PY)
  UGL: 'Antarctica/Palmer', SCGC: 'Antarctica/Palmer',   // Union Glacier (AQ)
  OLK: 'America/Asuncion', SGOL: 'America/Asuncion',   // Fuerte Olimpo (PY)
  VAB: 'America/Bogota',   // Yavarate (CO)
  TIB: 'America/Bogota', SKTB: 'America/Bogota',   // Tibú (CO)
  ALD: 'America/Lima', SPAR: 'America/Lima',   // Fortaleza (PE)
  SYC: 'America/Lima', SPSY: 'America/Lima',   // Shiringayoc (PE)
  SKM: 'America/Guyana', SYSK: 'America/Guyana',   // Skeldon (GY)
  TKL: 'America/Juneau', PTFK: 'America/Juneau',   // Taku Lodge (US)
  ZZE: 'Asia/Baku', UBBZ: 'Asia/Baku',   // Zangilan (AZ)
  IXQ: 'Asia/Kolkata', VEKM: 'Asia/Kolkata',   // Manik Bhandar (IN)
  IXN: 'Asia/Kolkata', VEKW: 'Asia/Kolkata',   // Khowai (IN)
  TEI: 'Asia/Kolkata', VETJ: 'Asia/Kolkata',   // Tezu (IN)
  DAP: 'Asia/Kathmandu', VNDL: 'Asia/Kathmandu',   // Darchula (NP)
  LTG: 'Asia/Kathmandu', VNLT: 'Asia/Kathmandu',   // Langtang (NP)
  SRU: 'Asia/Yangon', VYFS: 'Asia/Yangon',   // Falam (MM)
  BXM: 'Asia/Jayapura', WAJG: 'Asia/Jayapura',   // Batom (ID)
  SEH: 'Asia/Jayapura', WAJS: 'Asia/Jayapura',   // Senggeh (ID)
  MDP: 'Asia/Jayapura', WAKD: 'Asia/Jayapura',   // Mindiptana-Papua Island (ID)
  SBG: 'Asia/Jakarta', WITN: 'Asia/Jakarta',   // Sabang (ID)
  AUT: 'Asia/Dili', WPAT: 'Asia/Dili',   // Vila (TL)
  MPT: 'Asia/Dili', WPMN: 'Asia/Dili',   // Maliana (TL)
  YJS: 'Asia/Pyongyang', ZKSE: 'Asia/Pyongyang',   // Samjiyŏn (KP)
  HBU: 'Asia/Hovd', ZMBS: 'Asia/Hovd',   // Bulgan (MN)
};
