// WOCL e serviço noturno (ORO.FTL.105).
import { WOCL, NIGHT } from '../constants/tables';
import { overlapsWindow } from '../utils/time';

// O serviço [reportMin, endMin] sobrepõe-se ao WOCL (02:00–05:59)?
export const overlapsWOCL = (startMin, endMin) =>
  startMin != null && endMin != null && overlapsWindow(startMin, endMin, WOCL.start, WOCL.end);

// É serviço noturno? (sobrepõe-se a 02:00–04:59)
export const isNightDuty = (startMin, endMin) =>
  startMin != null && endMin != null && overlapsWindow(startMin, endMin, NIGHT.start, NIGHT.end);
