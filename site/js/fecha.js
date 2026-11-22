/** Fechas como texto 'AAAA-MM-DD'. Todo el cálculo es en días enteros UTC: no depende de la zona horaria ni del horario de verano. */
const MS_DIA = 86400000;

export function aDias(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!m) return NaN;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const f = new Date(t);
  // Rechaza fechas que no existen (31/02, 29/02 de un año no bisiesto).
  if (f.getUTCFullYear() !== y || f.getUTCMonth() !== mo - 1 || f.getUTCDate() !== d) return NaN;
  return t / MS_DIA;
}

export function deDias(n) {
  if (!Number.isFinite(n)) return '';
  const f = new Date(n * MS_DIA);
  const p = (x, l = 2) => String(x).padStart(l, '0');
  return `${p(f.getUTCFullYear(), 4)}-${p(f.getUTCMonth() + 1)}-${p(f.getUTCDate())}`;
}

export function sumarDias(iso, dias) {
  const n = aDias(iso);
  return Number.isNaN(n) ? '' : deDias(n + dias);
}

export function diferenciaDias(desde, hasta) {
  return aDias(hasta) - aDias(desde);
}

export function esFechaValida(iso) {
  return !Number.isNaN(aDias(iso));
}

/** La fecha de hoy en Buenos Aires, sin importar la zona del navegador. */
export function hoyBA(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ahora);
  const get = (t) => partes.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 'vie 5 dic' (con el año si no es el actual). */
export function formatoCorto(iso, anioActual = null) {
  const n = aDias(iso);
  if (Number.isNaN(n)) return '';
  const f = new Date(n * MS_DIA);
  const base = `${DIAS[f.getUTCDay()]} ${f.getUTCDate()} ${MESES[f.getUTCMonth()]}`;
  return anioActual != null && f.getUTCFullYear() !== anioActual ? `${base} ${f.getUTCFullYear()}` : base;
}
