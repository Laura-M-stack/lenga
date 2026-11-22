const clamp01 = (x) => Math.max(0, Math.min(1, x));

/**
 * Progreso (0 a 1) de una pista alta con un escenario fijo adentro.
 * `offset` es el borde superior donde queda fijo el escenario (el alto del encabezado).
 */
export function progresoPista({ top, height }, alturaEscena, offset = 0) {
  const recorrido = height - alturaEscena;
  if (![top, height, alturaEscena, offset].every(Number.isFinite) || recorrido <= 0) return 0;
  return clamp01((offset - top) / recorrido);
}

/** Zoom de una capa: 1 al empezar, `final` al terminar. Las más cercanas crecen más. */
export function escalaCapa(p, final) {
  return 1 + (final - 1) * clamp01(p);
}

/** Subida (px) de una capa lejana: una fracción del alto del escenario. Negativo = hacia arriba. */
export function subidaCapa(p, fraccion, alto) {
  return -(clamp01(p) * fraccion * alto) + 0; // + 0 evita devolver -0
}

/** Con pantallas angostas se atenúa el efecto: menos zoom y menos desplazamiento. */
export function factorPantalla(ancho) {
  return ancho < 720 ? 0.6 : 1;
}

/** Desplazamiento vertical (px) de una capa según qué tan lejos está su contenedor del centro de la pantalla, limitado a ±max. */
export function desplazamiento({ top, height }, viewportAlto, speed, max = Infinity) {
  if (![top, height, viewportAlto, speed].every(Number.isFinite)) return 0;
  const distancia = top + height / 2 - viewportAlto / 2;
  const limite = Math.abs(max);
  return Math.max(-limite, Math.min(limite, distancia * speed)) + 0;
}

export function visible({ top, height }, viewportAlto, margen = 200) {
  return top < viewportAlto + margen && top + height > -margen;
}

/** Posición horizontal (px) de una banda de niebla que se desliza con el scroll, siempre dentro de un ciclo para no crecer sin límite. */
export function derivaX(scrollY, velocidad, ciclo) {
  if (!(ciclo > 0) || !Number.isFinite(scrollY) || !Number.isFinite(velocidad)) return 0;
  const x = -(scrollY * velocidad) % ciclo;
  return (x > 0 ? x - ciclo : x) + 0;
}

const suave01 = (x) => clamp01(x);

/**
 * Posición de un pájaro (en % del escenario) según el progreso. Cruzan el cielo de izquierda a derecha de día
 * y se van perdiendo al caer la tarde.
 */
export function posicionAve(p, i) {
  const q = clamp01(Number.isFinite(p) ? p : 0);
  const x = ((8 + i * 27 + q * (70 + i * 18)) % 120) - 10;
  const y = 12 + ((i * 13) % 24) + 3 * Math.sin(q * 11 + i * 2);
  return { x: x + 0, y, op: suave01((0.6 - q) / 0.12) };
}

/** Corrimiento horizontal (px) de una capa según la posición del puntero (nx de -1 a 1), limitado a ±amp. */
export function corrimientoPuntero(nx, amp) {
  const n = Number.isFinite(nx) ? nx : 0;
  return Math.max(-amp, Math.min(amp, n * amp)) + 0;
}

/** Zoom mínimo para que el corrimiento del puntero no deje un hueco en los bordes. */
export function coberturaX(amp, ancho) {
  return ancho > 0 && amp > 0 ? 1 + amp / (ancho / 2) : 1;
}
