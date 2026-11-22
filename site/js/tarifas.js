import { aDias, deDias, sumarDias, esFechaValida, formatoCorto } from './fecha.js';
import { CABANAS, TEMPORADAS, EXTRAS, MAX_NOCHES, PORCENTAJE_SENA, DESCUENTOS } from './datos.js';

export function cabanaPorId(id) {
  return CABANAS.find((c) => c.id === id) ?? null;
}

/** Temporada de una noche ('baja' | 'media' | 'alta') según su fecha. */
export function temporada(iso) {
  const n = aDias(iso);
  if (Number.isNaN(n)) return null;
  const f = new Date(n * 86400000);
  const mes = f.getUTCMonth() + 1;
  const dia = f.getUTCDate();
  if ((mes === 12 && dia >= 15) || mes === 1 || mes === 2) return 'alta';
  if (mes === 7 && dia >= 12 && dia <= 25) return 'alta';
  if ([3, 7, 8, 10, 11, 12].includes(mes)) return 'media';
  return 'baja'; // abril, mayo, junio, septiembre
}

/** Noches de una estadía: de la llegada hasta la víspera de la salida. */
export function listaNoches(llegada, salida) {
  const a = aDias(llegada);
  const b = aDias(salida);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return [];
  const noches = [];
  for (let d = a; d < b; d++) noches.push(deDias(d));
  return noches;
}

/** Rangos ocupados de ejemplo, siempre cerca de hoy para que la demo muestre algo. Cada noche entre desde y hasta (inclusive) está ocupada. */
export function ocupadasDemo(hoy) {
  const r = (a, b) => ({ desde: sumarDias(hoy, a), hasta: sumarDias(hoy, b) });
  return {
    pino: [r(6, 9), r(24, 28), r(50, 55)],
    lago: [r(2, 7), r(18, 25), r(45, 49)],
    cumbre: [r(12, 19), r(40, 47)],
  };
}

export function nocheOcupada(rangos, iso) {
  const n = aDias(iso);
  return rangos.some((r) => n >= aDias(r.desde) && n <= aDias(r.hasta));
}

export function hayChoque(rangos, llegada, salida) {
  return listaNoches(llegada, salida).some((n) => nocheOcupada(rangos, n));
}

/** Primera fecha de llegada, desde `desde`, con `noches` seguidas libres. Devuelve null si no hay en `limite` días. */
export function siguienteLibre(rangos, desde, noches, limite = 365) {
  for (let i = 0; i <= limite; i++) {
    const llegada = sumarDias(desde, i);
    const salida = sumarDias(llegada, noches);
    if (!hayChoque(rangos, llegada, salida)) return { llegada, salida };
  }
  return null;
}

/** Ocupación de los próximos `dias` días: un booleano por día (true = ocupado). */
export function tiraOcupacion(rangos, hoy, dias) {
  return Array.from({ length: dias }, (_, i) => nocheOcupada(rangos, sumarDias(hoy, i)));
}

export function descuentoPorNoches(noches) {
  const d = DESCUENTOS.find((x) => noches >= x.desdeNoches);
  return d ? d.pct : 0;
}

const pesos = (n) => '$' + Math.round(n).toLocaleString('es-AR');
export { pesos };

/**
 * Cotiza una estadía. Siempre devuelve { ok, errores, ... }: nunca lanza.
 * Cada noche se cobra con la tarifa de su propia temporada, así que una estadía que cruza de temporada se desglosa.
 */
export function cotizar({ cabanaId, llegada, salida, huespedes, extras = {}, hoy, ocupadas = {} }) {
  const errores = [];
  const campos = new Set();
  const err = (mensaje, campo) => {
    errores.push(mensaje);
    if (campo) campos.add(campo);
  };
  const cabana = cabanaPorId(cabanaId);
  if (!cabana) return { ok: false, errores: ['Elegí una cabaña.'], campos: ['cabana'] };

  if (!esFechaValida(llegada)) err('Elegí la fecha de llegada.', 'llegada');
  if (!esFechaValida(salida)) err('Elegí la fecha de salida.', 'salida');
  if (errores.length) return { ok: false, errores, campos: [...campos], cabana };

  if (esFechaValida(hoy) && aDias(llegada) < aDias(hoy)) err('La llegada no puede ser anterior a hoy.', 'llegada');
  if (aDias(salida) <= aDias(llegada)) err('La salida tiene que ser después de la llegada.', 'salida');
  if (errores.length) return { ok: false, errores, campos: [...campos], cabana };

  const noches = listaNoches(llegada, salida);
  if (noches.length > MAX_NOCHES) err(`La estadía máxima es de ${MAX_NOCHES} noches. Para más tiempo, escribinos.`, 'salida');

  const personas = Number(huespedes);
  if (!Number.isInteger(personas) || personas < 1) err('Indicá cuántas personas son.', 'huespedes');
  else if (personas > cabana.capacidad) err(`${cabana.nombre} aloja hasta ${cabana.capacidad} personas.`, 'huespedes');

  const tempLlegada = temporada(llegada);
  const minimo = TEMPORADAS[tempLlegada].minimoNoches;
  if (noches.length < minimo) err(`En ${TEMPORADAS[tempLlegada].nombre.toLowerCase()} la estadía mínima es de ${minimo} noches.`, 'salida');

  let sugerencia = null;
  const rangos = ocupadas[cabanaId] ?? [];
  if (!errores.length && hayChoque(rangos, llegada, salida)) {
    err(`${cabana.nombre} no está disponible en esas fechas.`, 'llegada');
    campos.add('salida');
    const libre = siguienteLibre(rangos, llegada, noches.length);
    if (libre) sugerencia = libre;
  }
  if (errores.length) return { ok: false, errores, campos: [...campos], cabana, noches: noches.length, sugerencia };

  // Desglose por temporada, respetando el orden en que aparecen.
  const desglose = [];
  for (const n of noches) {
    const t = temporada(n);
    const ult = desglose[desglose.length - 1];
    if (ult && ult.temporada === t) ult.noches += 1;
    else desglose.push({ temporada: t, noches: 1, precio: cabana.precios[t] });
  }
  for (const d of desglose) d.subtotal = d.noches * d.precio;

  const alojamiento = desglose.reduce((s, d) => s + d.subtotal, 0);
  const descuentoPct = descuentoPorNoches(noches.length);
  const descuento = Math.round((alojamiento * descuentoPct) / 100);

  const lineasExtras = [];
  for (const [clave, activo] of Object.entries(extras)) {
    const e = EXTRAS[clave];
    if (!activo || !e) continue;
    const importe = e.porPersonaPorNoche ? e.precio * personas * noches.length : e.precio;
    lineasExtras.push({ clave, nombre: e.nombre, importe });
  }
  const totalExtras = lineasExtras.reduce((s, e) => s + e.importe, 0);

  const total = alojamiento - descuento + totalExtras;
  return {
    ok: true,
    errores: [],
    campos: [],
    cabana,
    noches: noches.length,
    huespedes: personas,
    desglose,
    alojamiento,
    descuentoPct,
    descuento,
    extras: lineasExtras,
    totalExtras,
    total,
    sena: Math.round(total * PORCENTAJE_SENA),
  };
}

/** Texto listo para pegar en un mensaje de consulta. */
export function resumenConsulta(c, { llegada, salida, nombre = '' }, anioActual = null) {
  if (!c?.ok) return '';
  const lineas = [
    nombre.trim() ? `Hola, soy ${nombre.trim()}.` : 'Hola.',
    `Quiero consultar por la ${c.cabana.nombre}:`,
    `- Llegada: ${formatoCorto(llegada, anioActual)}`,
    `- Salida: ${formatoCorto(salida, anioActual)} (${c.noches} ${c.noches === 1 ? 'noche' : 'noches'})`,
    `- Personas: ${c.huespedes}`,
  ];
  for (const e of c.extras) lineas.push(`- Extra: ${e.nombre}`);
  lineas.push(`Total estimado: ${pesos(c.total)} (seña de ${pesos(c.sena)}).`);
  return lineas.join('\n');
}
