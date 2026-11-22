/** Siluetas del paisaje generadas con una semilla fija: siempre el mismo dibujo, sin imágenes que descargar. */
export const ANCHO = 2400;
export const ALTO = 700;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => Number(n.toFixed(1));

const lim = (v, max) => Math.max(0, Math.min(max, v));

/** Alturas de una cordillera por desplazamiento del punto medio, como puntos [x, y] en coordenadas del cuadro. */
function crestas({ seed, ancho, alto, base, amplitud, rugosidad, niveles }) {
  const rnd = mulberry32(seed);
  const n = 2 ** niveles;
  const h = new Array(n + 1).fill(0);
  h[0] = rnd();
  h[n] = rnd();
  let paso = n;
  let desv = 1;
  while (paso > 1) {
    const mitad = paso / 2;
    for (let i = mitad; i < n; i += paso) h[i] = (h[i - mitad] + h[i + mitad]) / 2 + (rnd() - 0.5) * desv;
    paso = mitad;
    desv *= rugosidad;
  }
  const min = Math.min(...h);
  const max = Math.max(...h);
  const span = max - min || 1;
  return h.map((v, i) => {
    const norm = Math.pow((v - min) / span, 1.25);
    return [f((i / n) * ancho), f(lim(alto * (1 - (base + amplitud * norm)), alto))];
  });
}

const DEF_CORDILLERA = { ancho: ANCHO, alto: ALTO, base: 0.4, amplitud: 0.3, rugosidad: 0.55, niveles: 8 };

/** Cordillera por desplazamiento del punto medio. base y amplitud son fracciones del alto (base + amplitud <= 1). */
export function cordillera(opts) {
  const o = { ...DEF_CORDILLERA, ...opts };
  const pts = crestas(o);
  return `M0,${o.alto} L${pts.map(([x, y]) => `${x},${y}`).join(' L')} L${o.ancho},${o.alto} Z`;
}

/**
 * Nieve en las cumbres de la misma cordillera (misma semilla): todo lo que pasa de la línea de nieve, con el borde
 * de abajo irregular, como la nieve que se queda en las grietas. Si ninguna cumbre llega, devuelve ''.
 */
export function nieve(opts, { linea = 0.7 } = {}) {
  const o = { ...DEF_CORDILLERA, ...opts };
  const pts = crestas(o);
  const yLinea = o.alto * (1 - (o.base + o.amplitud * linea));
  const rnd = mulberry32((o.seed ?? 0) + 7919);
  let d = '';
  let i = 0;
  while (i < pts.length) {
    if (pts[i][1] >= yLinea) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < pts.length && pts[j + 1][1] < yLinea) j++;
    // el cruce con la línea de nieve a cada lado, por interpolación lineal
    const cruce = (a, b) => {
      const t = (yLinea - a[1]) / (b[1] - a[1] || 1);
      return [f(a[0] + (b[0] - a[0]) * lim(t, 1)), f(yLinea)];
    };
    const ini = i > 0 ? cruce(pts[i], pts[i - 1]) : [pts[i][0], f(yLinea)];
    const fin = j < pts.length - 1 ? cruce(pts[j], pts[j + 1]) : [pts[j][0], f(yLinea)];
    const picoMin = Math.min(...pts.slice(i, j + 1).map((p) => p[1]));
    if (yLinea - picoMin < 5) {
      i = j + 1;
      continue; // una cumbre que apenas pasa la línea no junta nieve
    }
    const arriba = [ini, ...pts.slice(i, j + 1), fin];
    // el borde de abajo sigue la forma de la cumbre: más espesor cerca de la punta, cero donde cruza la línea de nieve
    const abajo = [];
    const tramo = pts.slice(i, j + 1);
    for (let k = tramo.length - 1; k >= 0; k--) {
      const [x, y] = tramo[k];
      const espesor = (yLinea - y) * (k % 2 ? 0.18 + rnd() * 0.22 : 0.45 + rnd() * 0.4);
      abajo.push([x, f(lim(y + espesor, o.alto))]);
    }
    d += `${d ? ' ' : ''}M${[...arriba, ...abajo].map(([x, y]) => `${x},${y}`).join(' L')} Z`;
    i = j + 1;
  }
  return d;
}

/**
 * Conífera de silueta natural: pisos de ramas que caen, de largo irregular, un poco inclinada y con tronco a la vista.
 * Un solo trazo cerrado, sentido horario (así no se cancela al superponerse con otros árboles).
 */
function conifera(rnd, x, base, H, W, ancho, alto) {
  const pisos = 6 + Math.floor(rnd() * 4);
  const tronco = H * 0.1;
  const grosor = Math.max(1.5, H * 0.022);
  const cuerpo = H - tronco;
  const paso = cuerpo / pisos;
  const cima = base - H;
  const inclina = (rnd() - 0.5) * H * 0.07;
  const cx = (y) => x + inclina * ((base - y) / H);
  const P = (px, py) => `${f(lim(px, ancho))},${f(lim(py, alto))}`;
  const lado = (s) => {
    const out = [];
    for (let i = 0; i < pisos; i++) {
      const y = cima + i * paso;
      const w = (W / 2) * Math.pow((i + 1) / pisos, 0.85) * (0.78 + rnd() * 0.44);
      const ax = s * w * (0.28 + rnd() * 0.14);
      const ay = y + paso * 0.08;
      const bx = s * w;
      const by = y + paso * (1.12 + rnd() * 0.32);
      const mx = ax + (bx - ax) * (0.45 + rnd() * 0.15);
      const my = ay + (by - ay) * 0.45 - paso * (0.04 + rnd() * 0.08);
      out.push([ax, ay], [mx, my], [bx, by]);
    }
    return out.map(([dx, py]) => [cx(py) + dx, py]);
  };
  const der = lado(1);
  const izq = lado(-1);
  const yT = base - tronco;
  const pts = [
    P(cx(cima), cima),
    ...der.map(([px, py]) => P(px, py)),
    P(cx(yT) + grosor, yT),
    P(cx(base) + grosor, base),
    P(cx(base) - grosor, base),
    P(cx(yT) - grosor, yT),
    ...izq.reverse().map(([px, py]) => P(px, py)),
  ];
  return `M${pts.join(' L')} Z`;
}

/** Lenga u otro árbol de hoja ancha: copa redonda e irregular sobre un tronco que se bifurca. Sentido horario. */
function latifoliado(rnd, x, base, H, W, ancho, alto) {
  const P = (px, py) => `${f(lim(px, ancho))},${f(lim(py, alto))}`;
  const cy = base - H * 0.62;
  const rx = W * 0.62;
  const ry = H * 0.4;
  const f1 = rnd() * 6.28;
  const f2 = rnd() * 6.28;
  const n = 26;
  const copa = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const r = 1 + 0.12 * Math.sin(3 * a + f1) + 0.07 * Math.sin(7 * a + f2) + (rnd() - 0.5) * 0.1;
    copa.push(P(x + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r));
  }
  const tw = Math.max(1.6, H * 0.03);
  const tronco = [P(x - tw, base), P(x - tw * 0.55, cy + ry * 0.4), P(x + tw * 0.55, cy + ry * 0.4), P(x + tw, base)];
  return `M${copa.join(' L')} Z M${tronco.join(' L')} Z`;
}

/**
 * Hilera de árboles sobre una franja de suelo. Casi todos coníferas; `latifoliados` es la fracción de árboles de copa
 * redonda (lengas) mezclados entre ellas. Cada árbol tiene su altura, su ancho, su inclinación y su profundidad.
 */
export function pinos({ seed, ancho = ANCHO, alto = ALTO, cantidad = 40, hMin = 120, hMax = 260, suelo = 0.05, latifoliados = 0 }) {
  const rnd = mulberry32(seed);
  const g = alto * suelo;
  const yb = alto - g;
  const xs = Array.from({ length: cantidad }, () => rnd() * ancho).sort((a, b) => a - b);
  let d = `M0,${alto} L0,${f(yb)} L${ancho},${f(yb)} L${ancho},${alto} Z`;
  for (const x of xs) {
    const H = hMin + Math.pow(rnd(), 1.4) * (hMax - hMin);
    const ancla = yb + rnd() * g * 0.6; // los de atrás se ven más bajos: la base se esconde en el suelo
    if (rnd() < latifoliados) d += ' ' + latifoliado(rnd, x, ancla, H * 0.8, H * (0.42 + rnd() * 0.12), ancho, alto);
    else d += ' ' + conifera(rnd, x, ancla, H, H * (0.28 + rnd() * 0.1), ancho, alto);
  }
  return d;
}

/** Cabaña de troncos para el primer plano (markup SVG; los colores salen de variables CSS). */
export function cabana(x, yBase) {
  const w = 230;
  const h = 120;
  const l = x - w / 2;
  const t = yBase - h;
  const vetas = Array.from({ length: 6 }, (_, i) => `<rect class="cabana__veta" x="${l}" y="${f(t + 16 + i * 17)}" width="${w}" height="2.5"/>`).join('');
  const puntas = Array.from({ length: 6 }, (_, i) => `<rect class="cabana__veta" x="${l - 5}" y="${f(t + 8 + i * 17)}" width="10" height="7" rx="3"/><rect class="cabana__veta" x="${l + w - 5}" y="${f(t + 8 + i * 17)}" width="10" height="7" rx="3"/>`).join('');
  return [
    `<g class="cabana" aria-hidden="true">`,
    `<rect class="cabana__chimenea" x="${l + w * 0.68}" y="${t - 64}" width="26" height="70"/>`,
    `<rect class="cabana__techo" x="${l + w * 0.68 - 4}" y="${t - 70}" width="34" height="8"/>`,
    `<rect class="cabana__base" x="${l - 6}" y="${yBase - 12}" width="${w + 12}" height="14"/>`,
    `<rect class="cabana__cuerpo" x="${l}" y="${t}" width="${w}" height="${h - 12}"/>`,
    vetas,
    puntas,
    `<path class="cabana__techo" d="M${l - 26},${t + 10} L${l - 14},${t + 3} L${x},${t - 80} L${l + w + 14},${t + 3} L${l + w + 26},${t + 10} Z"/>`,
    `<rect class="cabana__ventana-base" x="${l + 34}" y="${t + 34}" width="62" height="50"/>`,
    `<rect class="cabana__ventana" x="${l + 34}" y="${t + 34}" width="62" height="50"/>`,
    `<rect class="cabana__marco" x="${l + 63}" y="${t + 34}" width="4" height="50"/>`,
    `<rect class="cabana__marco" x="${l + 34}" y="${t + 57}" width="62" height="4"/>`,
    `<rect class="cabana__puerta" x="${l + 138}" y="${t + 38}" width="46" height="${h - 50}"/>`,
    `<rect class="cabana__deck" x="${l + 120}" y="${yBase - 16}" width="82" height="6"/>`,
    `<rect class="cabana__deck" x="${l + 124}" y="${yBase - 12}" width="5" height="12"/>`,
    `<rect class="cabana__deck" x="${l + 192}" y="${yBase - 12}" width="5" height="12"/>`,
    `</g>`,
  ].join('');
}

/** Las cuatro capas de la escena, de la más lejana a la más cercana. `nieve` va en un color propio, encima de la capa. */
export function capasEscena() {
  const lejos = { seed: 11, base: 0.42, amplitud: 0.4, rugosidad: 0.62 };
  return [
    { id: 'lejos', paths: [cordillera(lejos)], nieve: nieve(lejos), extra: '' },
    { id: 'medio', paths: [cordillera({ seed: 23, base: 0.26, amplitud: 0.34, rugosidad: 0.58 })], nieve: '', extra: '' },
    {
      id: 'bosque',
      paths: [cordillera({ seed: 37, base: 0.1, amplitud: 0.16, rugosidad: 0.5 }), pinos({ seed: 41, cantidad: 130, hMin: 90, hMax: 210, latifoliados: 0.14 })],
      nieve: '',
      extra: '',
    },
    { id: 'frente', paths: [pinos({ seed: 53, cantidad: 34, hMin: 280, hMax: 540, suelo: 0.07, latifoliados: 0.05 })], nieve: '', extra: cabana(1450, ALTO * 0.93) },
  ];
}
