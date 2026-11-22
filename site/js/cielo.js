/** El cielo y las capas cambian de color según el progreso p (0 = alba, 1 = noche). Todo son funciones puras para poder probarlas. */
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const suave = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

const CLAVES = [
  { p: 0, cielo1: '#4d5d8f', cielo2: '#f2b27f', lejos: '#9094b6', nieve: '#e0d6e8', cuerpo: '#6e4f45', techo: '#58403e', borde: '#e3a986', otono: '#8a5a4a', medio: '#6f7699', bosque: '#3d5b57', frente: '#1c382e' },
  { p: 0.35, cielo1: '#4f9bd8', cielo2: '#d3ebf7', lejos: '#9ab8d0', nieve: '#f4f8fb', cuerpo: '#7b5232', techo: '#6b3d2a', borde: '#c58a5c', otono: '#c0562a', medio: '#6f9ba0', bosque: '#2f6b4c', frente: '#1d4a35' },
  { p: 0.7, cielo1: '#353a78', cielo2: '#ee8450', lejos: '#7c6c98', nieve: '#f0b69a', cuerpo: '#5d3d37', techo: '#4d3036', borde: '#f2a46c', otono: '#8c4a3a', medio: '#56547c', bosque: '#2d4a4b', frente: '#152e28' },
  { p: 1, cielo1: '#09111f', cielo2: '#22314f', lejos: '#2a3556', nieve: '#4a5a80', cuerpo: '#2a2024', techo: '#2a2230', borde: '#5d6f9c', otono: '#2b2030', medio: '#1d2946', bosque: '#14243a', frente: '#0a1820' },
];

/** Los momentos del día que se dibujan; entre uno y otro, la escena se funde. */
export const PUNTOS_CLAVE = CLAVES.map((c) => c.p);

const aRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const aHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

export function mezclarHex(a, b, t) {
  const x = aRgb(a);
  const y = aRgb(b);
  const k = clamp01(t);
  return aHex(x.map((v, i) => v + (y[i] - v) * k));
}

export function paleta(p) {
  const q = clamp01(Number.isFinite(p) ? p : 0);
  let i = CLAVES.findIndex((c, idx) => idx === CLAVES.length - 1 || q <= CLAVES[idx + 1].p);
  if (i === CLAVES.length - 1) i -= 1;
  const a = CLAVES[i];
  const b = CLAVES[i + 1];
  const t = (q - a.p) / (b.p - a.p);
  const out = {};
  for (const k of Object.keys(a)) if (k !== 'p') out[k] = mezclarHex(a[k], b[k], t);
  // Luces y sombras derivadas: la luz de las ramas toma el color del cielo (rosado al alba, anaranjado al atardecer, azul de noche)
  out.bosqueLuz = mezclarHex(out.bosque, out.cielo2, 0.3);
  out.bosqueSombra = mezclarHex(out.bosque, '#04070b', 0.4);
  out.frenteLuz = mezclarHex(out.frente, out.cielo2, 0.2);
  out.frenteSombra = mezclarHex(out.frente, '#04070b', 0.42);
  const dia = 1 - Math.min(1, Math.abs(q - 0.35) / 0.4); // 1 a pleno día, 0 al alba y de noche
  out.bosqueBrillo = mezclarHex(out.bosqueLuz, '#c9de8a', 0.22 * dia);
  out.frenteBrillo = mezclarHex(out.frenteLuz, '#c9de8a', 0.26 * dia);
  out.otonoLuz = mezclarHex(out.otono, out.cielo2, 0.28);
  out.otonoBrillo = mezclarHex(out.otonoLuz, '#ffd27a', 0.55 * dia);
  out.otonoSombra = mezclarHex(out.otono, '#0a0508', 0.42);
  out.lejosSombra = mezclarHex(out.lejos, '#0a1020', 0.34);
  out.medioSombra = mezclarHex(out.medio, '#0a1020', 0.2);
  return out;
}

/** Posición (en % del escenario) y opacidad del sol y de la luna. */
export function astros(p) {
  const q = clamp01(p);
  const t = clamp01(q / 0.72);
  const sol = { x: 12 + 76 * t, y: 70 - 52 * Math.sin(Math.PI * t), op: 1 - suave((t - 0.88) / 0.12) };
  const m = clamp01((q - 0.55) / 0.45);
  const luna = { x: 18 + 60 * m, y: 62 - 40 * Math.sin(Math.PI * m * 0.8), op: suave((q - 0.62) / 0.2) };
  return { sol, luna };
}

export function opacidadEstrellas(p) {
  return suave((p - 0.68) / 0.22);
}

/** La ventana de la cabaña se prende cuando empieza a oscurecer. */
export function opacidadLuz(p) {
  return suave((p - 0.5) / 0.25);
}

/**
 * Visibilidad de un texto que ocupa el tramo [a, b] del progreso.
 * Devuelve opacidad (0 a 1) y un corrimiento vertical en px: entra desde abajo y sale hacia arriba.
 */
export function fase(p, a, b, fade = 0.08) {
  const entra = a <= 0 ? 1 : suave((p - a) / fade);
  const sale = b >= 1 ? 1 : 1 - suave((p - (b - fade)) / fade);
  const op = Math.min(entra, sale);
  const y = 28 * (1 - entra) - 28 * (1 - sale);
  return { op, y: y + 0 };
}
