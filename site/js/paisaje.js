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

/** Pliegues de sombra en la ladera derecha de cada pico (la luz viene de la izquierda): le dan volumen a la montaña. */
export function caras(opts) {
  const o = { ...DEF_CORDILLERA, ...opts };
  const pts = crestas(o);
  const rnd = mulberry32((o.seed ?? 0) + 104729);
  const ventana = 5;
  let d = '';
  for (let i = ventana; i < pts.length - ventana - 1; i++) {
    const y = pts[i][1];
    let pico = true;
    for (let k = i - ventana; k <= i + ventana; k++) {
      if (pts[k][1] < y) {
        pico = false;
        break;
      }
    }
    if (!pico) continue;
    let v = i;
    while (v + 1 < pts.length - 1 && pts[v + 1][1] >= pts[v][1] && v - i < 40) v++;
    const [xp, yp] = pts[i];
    const [xv, yv] = pts[v];
    const dx = xv - xp;
    const dy = yv - yp;
    if (v - i < 4 || dy < 12) {
      i = Math.max(i, v);
      continue;
    }
    const arista = [
      [xv - dx * 0.08, yv + dy * 0.3],
      [xp + dx * (0.35 + rnd() * 0.1), yp + dy * (0.62 + rnd() * 0.1)],
      [xp + dx * (0.14 + rnd() * 0.06), yp + dy * (0.3 + rnd() * 0.1)],
    ];
    const todo = [...pts.slice(i, v + 1), ...arista].map(([x, yy]) => `${f(lim(x, o.ancho))},${f(lim(yy, o.alto))}`);
    d += `${d ? ' ' : ''}M${todo.join(' L')} Z`;
    i = v;
  }
  return d;
}

const poli = (pts) => `M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')} Z`;

/**
 * Conífera de silueta natural: pisos de ramas que caen, de largo irregular, un poco inclinada y con tronco a la vista.
 * Devuelve el cuerpo (un solo trazo cerrado, sentido horario), las caras iluminadas de las ramas (izquierda, de donde
 * viene la luz) y las caras en sombra (derecha).
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
  const c = ([px, py]) => [lim(px, ancho), lim(py, alto)];
  const lado = (sgn) => {
    const tiers = [];
    for (let i = 0; i < pisos; i++) {
      const y = cima + i * paso;
      const w = (W / 2) * Math.pow((i + 1) / pisos, 0.85) * (0.78 + rnd() * 0.44);
      const ax = sgn * w * (0.28 + rnd() * 0.14);
      const ay = y + paso * 0.08;
      const bx = sgn * w;
      const by = y + paso * (1.12 + rnd() * 0.32);
      const mx = ax + (bx - ax) * (0.45 + rnd() * 0.15);
      const my = ay + (by - ay) * 0.45 - paso * (0.04 + rnd() * 0.08);
      tiers.push([[ax, ay], [mx, my], [bx, by]].map(([dx, py]) => c([cx(py) + dx, py])));
    }
    return tiers;
  };
  const der = lado(1);
  const izq = lado(-1);
  const yT = base - tronco;
  const contorno = [
    c([cx(cima), cima]),
    ...der.flat(),
    c([cx(yT) + grosor, yT]),
    c([cx(base) + grosor, base]),
    c([cx(base) - grosor, base]),
    c([cx(yT) - grosor, yT]),
    ...izq.flat().reverse(),
  ];
  // Cuña sobre la cara superior de cada rama: del borde exterior hacia adentro
  const cuna = ([A, M, B]) => {
    const hacia = (P, k, dy) => [cx(P[1]) + (P[0] - cx(P[1])) * k, P[1] + dy];
    return poli([A, M, B, hacia(B, 0.5, -paso * 0.42), hacia(A, 0.5, paso * 0.35)]);
  };
  return { c: poli(contorno), l: izq.map(cuna).join(' '), s: der.map(cuna).join(' ') };
}

/** Lenga u otro árbol de hoja ancha: copa redonda e irregular sobre un tronco que se bifurca. Misma convención que `conifera`. */
function latifoliado(rnd, x, base, H, W, ancho, alto) {
  const cl = ([px, py]) => [lim(px, ancho), lim(py, alto)];
  const cy = base - H * 0.62;
  const rx = W * 0.62;
  const ry = H * 0.4;
  const f1 = rnd() * 6.28;
  const f2 = rnd() * 6.28;
  const n = 26;
  const radios = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    radios.push(1 + 0.12 * Math.sin(3 * a + f1) + 0.07 * Math.sin(7 * a + f2) + (rnd() - 0.5) * 0.1);
  }
  const punto = (k, escala, dx, dy) => {
    const a = (k / n) * Math.PI * 2;
    return cl([x + Math.cos(a) * rx * radios[k % n] * escala + dx, cy + Math.sin(a) * ry * radios[k % n] * escala + dy]);
  };
  const copa = Array.from({ length: n }, (_, k) => punto(k, 1, 0, 0));
  const tw = Math.max(1.6, H * 0.03);
  const tronco = [cl([x - tw, base]), cl([x - tw * 0.55, cy + ry * 0.4]), cl([x + tw * 0.55, cy + ry * 0.4]), cl([x + tw, base])];
  // media luna iluminada arriba a la izquierda (ángulos ~190° a 290°) y en sombra abajo a la derecha (~10° a 110°)
  const luna = (desde, hasta, escala, dx, dy) => {
    const ks = [];
    for (let k = Math.round((desde / 360) * n); k <= Math.round((hasta / 360) * n); k++) ks.push(k);
    return poli([...ks.map((k) => punto(k, 1, 0, 0)), ...ks.reverse().map((k) => punto(k, escala, dx, dy))]);
  };
  return {
    c: `${poli(copa)} ${poli(tronco)}`,
    l: luna(190, 290, 0.55, -rx * 0.1, -ry * 0.1),
    s: luna(10, 120, 0.6, rx * 0.06, ry * 0.08),
  };
}

function generarArboles({ seed, ancho = ANCHO, alto = ALTO, cantidad = 40, hMin = 120, hMax = 260, suelo = 0.05, latifoliados = 0 }) {
  const rnd = mulberry32(seed);
  const g = alto * suelo;
  const yb = alto - g;
  const xs = Array.from({ length: cantidad }, () => rnd() * ancho).sort((a, b) => a - b);
  const lista = xs.map((x) => {
    const H = hMin + Math.pow(rnd(), 1.4) * (hMax - hMin);
    const ancla = yb + rnd() * g * 0.6; // los de atrás se ven más bajos: la base se esconde en el suelo
    const t = rnd() < latifoliados ? latifoliado(rnd, x, ancla, H * 0.8, H * (0.42 + rnd() * 0.12), ancho, alto) : conifera(rnd, x, ancla, H, H * (0.28 + rnd() * 0.1), ancho, alto);
    return { ...t, z: ancla };
  });
  lista.sort((a, b) => a.z - b.z); // los más lejanos primero, para que los de adelante los tapen
  return { suelo: `M0,${alto} L0,${f(yb)} L${ancho},${f(yb)} L${ancho},${alto} Z`, lista };
}

/**
 * Hilera de árboles sobre una franja de suelo, solo la silueta. Casi todos coníferas; `latifoliados` es la fracción de
 * árboles de copa redonda (lengas). Cada árbol tiene su altura, su ancho, su inclinación y su profundidad.
 */
export function pinos(opts) {
  const { suelo, lista } = generarArboles(opts);
  return [suelo, ...lista.map((t) => t.c)].join(' ');
}

/** Lo mismo que `pinos`, como markup SVG con luces y sombras por árbol (en orden de profundidad). */
export function arbolesSvg(opts) {
  const { suelo, lista } = generarArboles(opts);
  return `<path d="${suelo}"/>` + lista.map((t) => `<path d="${t.c}"/><path class="luz" d="${t.l}"/><path class="sombra" d="${t.s}"/>`).join('');
}

/** Cabaña de troncos para el primer plano (markup SVG; los colores salen de variables CSS). */
export function cabana(x, yBase) {
  const w = 230;
  const h = 120;
  const l = x - w / 2;
  const t = yBase - h;
  const cuerpoH = h - 12;
  const vetas = Array.from({ length: 6 }, (_, i) => `<rect class="cabana__veta" x="${l}" y="${f(t + 16 + i * 17)}" width="${w}" height="2.5"/>`).join('');
  const puntas = Array.from({ length: 6 }, (_, i) => `<rect class="cabana__punta" x="${l - 5}" y="${f(t + 8 + i * 17)}" width="10" height="9" rx="4"/><rect class="cabana__punta" x="${l + w - 5}" y="${f(t + 8 + i * 17)}" width="10" height="9" rx="4"/>`).join('');
  // tejas: hileras de listones que siguen el ancho del techo en cada altura
  const apice = t - 80;
  const semi = w / 2 + 14;
  const tejas = Array.from({ length: 7 }, (_, i) => {
    const y = apice + 14 + i * 10;
    const mitad = (semi * (y - apice)) / 83;
    return `<rect class="cabana__teja" x="${f(x - mitad + 3)}" y="${f(y)}" width="${f(Math.max(0, mitad * 2 - 6))}" height="1.8"/>`;
  }).join('');
  const lenia = [0, 1, 2].map((fila) => Array.from({ length: 4 - fila }, (_, k) => `<circle class="cabana__lenia" cx="${f(l - 34 + fila * 6 + k * 11)}" cy="${f(yBase - 5 - fila * 9)}" r="5.2"/>`).join('')).join('');
  const hx = l + w * 0.68 + 13;
  return [
    `<g class="cabana" aria-hidden="true">`,
    `<ellipse class="cabana__pozo" cx="${f(l + 66)}" cy="${f(yBase + 1)}" rx="86" ry="9"/>`,
    `<rect class="cabana__chimenea" x="${l + w * 0.68}" y="${t - 64}" width="26" height="70"/>`,
    `<rect class="cabana__remate" x="${l + w * 0.68 - 4}" y="${t - 70}" width="34" height="8"/>`,
    `<g class="humo"><ellipse class="humo__bola" cx="${f(hx)}" cy="${t - 76}" rx="9" ry="7"/><ellipse class="humo__bola humo__bola--2" cx="${f(hx)}" cy="${t - 76}" rx="9" ry="7"/><ellipse class="humo__bola humo__bola--3" cx="${f(hx)}" cy="${t - 76}" rx="9" ry="7"/></g>`,
    `<rect class="cabana__base" x="${l - 6}" y="${yBase - 12}" width="${w + 12}" height="14"/>`,
    `<rect class="cabana__cuerpo" x="${l}" y="${t}" width="${w}" height="${cuerpoH}"/>`,
    vetas,
    puntas,
    `<path class="cabana__techo" d="M${l - 26},${t + 10} L${l - 14},${t + 3} L${x},${apice} L${l + w + 14},${t + 3} L${l + w + 26},${t + 10} Z"/>`,
    tejas,
    `<path class="cabana__borde" d="M${l - 26},${t + 10} L${l - 14},${t + 3} L${x},${apice}"/>`,
    `<rect class="cabana__ventana-base" x="${l + 34}" y="${t + 34}" width="62" height="50"/>`,
    `<rect class="cabana__ventana" x="${l + 34}" y="${t + 34}" width="62" height="50"/>`,
    `<rect class="cabana__marco" x="${l + 63}" y="${t + 34}" width="4" height="50"/>`,
    `<rect class="cabana__marco" x="${l + 34}" y="${t + 57}" width="62" height="4"/>`,
    `<rect class="cabana__marco" x="${l + 30}" y="${t + 84}" width="70" height="5"/>`,
    `<rect class="cabana__puerta" x="${l + 138}" y="${t + 38}" width="46" height="${h - 50}"/>`,
    `<circle class="cabana__farol" cx="${l + 196}" cy="${t + 50}" r="4"/>`,
    `<rect class="cabana__deck" x="${l + 120}" y="${yBase - 16}" width="82" height="6"/>`,
    `<rect class="cabana__deck" x="${l + 124}" y="${yBase - 12}" width="5" height="12"/>`,
    `<rect class="cabana__deck" x="${l + 192}" y="${yBase - 12}" width="5" height="12"/>`,
    lenia,
    `</g>`,
  ].join('');
}

/**
 * Las cuatro capas de la escena, de la más lejana a la más cercana.
 * `caras` son los pliegues en sombra de la montaña, `nieve` va en un color propio, `extra` es markup ya armado (árboles y cabaña).
 */
export function capasEscena() {
  const lejos = { seed: 11, base: 0.42, amplitud: 0.4, rugosidad: 0.62 };
  const medio = { seed: 23, base: 0.26, amplitud: 0.34, rugosidad: 0.58 };
  return [
    { id: 'lejos', paths: [cordillera(lejos)], caras: caras(lejos), nieve: nieve(lejos), extra: '' },
    { id: 'medio', paths: [cordillera(medio)], caras: caras(medio), nieve: '', extra: '' },
    {
      id: 'bosque',
      paths: [cordillera({ seed: 37, base: 0.1, amplitud: 0.16, rugosidad: 0.5 })],
      caras: '',
      nieve: '',
      extra: arbolesSvg({ seed: 41, cantidad: 130, hMin: 90, hMax: 210, latifoliados: 0.14 }),
    },
    {
      id: 'frente',
      paths: [],
      caras: '',
      nieve: '',
      extra: arbolesSvg({ seed: 53, cantidad: 34, hMin: 280, hMax: 540, suelo: 0.07, latifoliados: 0.05 }) + cabana(1450, ALTO * 0.93),
    },
  ];
}
