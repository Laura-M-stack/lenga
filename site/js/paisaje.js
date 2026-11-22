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

// Área con signo en coordenadas de pantalla (y hacia abajo): positiva = sentido horario.
const area = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};
/** Polígono cerrado siempre en sentido horario: así los trazos que se superponen se suman y no se cancelan entre sí. */
const poli = (pts) => {
  const p = area(pts) < 0 ? [...pts].reverse() : pts;
  return `M${p.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')} Z`;
};

/** Igual que `poli`, pero redondeado: curvas que pasan por los puntos medios, para matas de hojas y no facetas. */
const redondo = (pts) => {
  const p = area(pts) < 0 ? [...pts].reverse() : pts;
  const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const n = p.length;
  const ini = m(p[0], p[1]);
  let d = `M${f(ini[0])},${f(ini[1])}`;
  for (let i = 1; i <= n; i++) {
    const c = p[i % n];
    const e = m(c, p[(i + 1) % n]);
    d += ` Q${f(c[0])},${f(c[1])} ${f(e[0])},${f(e[1])}`;
  }
  return `${d} Z`;
};

const NOMINAL = 300; // alto con el que se dibuja cada variante de árbol; después se escala

/**
 * Una rama de conífera, en coordenadas locales (sale del tronco en 0,0 hacia +x): el borde de arriba es suave y
 * arqueado, la punta se levanta un poco y el borde de abajo termina en agujas largas que cuelgan. Además de las caras
 * de luz y sombra devuelve hebras (trazos finos claros arriba y oscuros abajo) que dan la textura de las agujas.
 */
function fronda(rnd, L, caida, grosor, dientes, diente, sube, bandaLuz, bandaSombra, hebras) {
  const centro = (t) => caida * t ** 1.5 - sube * t ** 4;
  const th = (t) => grosor * (0.8 * Math.sin(Math.PI * t ** 0.7) + 0.35 * (1 - t));
  const arriba = (t) => [L * t, centro(t) - th(t) * 0.42];
  const NT = 6;
  const sup = [];
  for (let k = 0; k <= NT; k++) {
    const [x, y] = arriba(k / NT);
    sup.push([x, y + (k > 0 && k < NT ? (rnd() - 0.5) * grosor * 0.22 : 0)]);
  }
  const inf = [];
  for (let j = dientes; j >= 1; j--) {
    const tp = (j - 0.2) / dientes;
    const tv = (j - 0.7) / dientes;
    // las agujas cuelgan hacia abajo y un poco hacia afuera
    inf.push([L * tp + diente * (0.25 + rnd() * 0.35), centro(tp) + th(tp) * 0.55 + diente * (0.8 + rnd() * 0.8)]);
    inf.push([L * tv, centro(tv) + th(tv) * 0.45]);
  }
  const cuerpo = [...sup, ...inf, [0, centro(0) + th(0) * 0.5]];
  const ts = [0.1, 0.3, 0.5, 0.7, 0.85, 0.97];
  const luz = [...ts.map((t) => arriba(t)), ...[...ts].reverse().map((t) => [L * t, arriba(t)[1] + th(t) * bandaLuz])];
  const dentro = inf.filter(([x]) => x > L * 0.3);
  const sombra = [...dentro, ...ts.map((t) => [L * t, centro(t) + th(t) * (0.55 - bandaSombra)]).filter(([x]) => x <= (dentro[0]?.[0] ?? L))];
  const claras = [];
  const oscuras = [];
  for (let k = 0; k < hebras; k++) {
    const arr = k % 2 === 0;
    const t0 = 0.1 + rnd() * 0.25;
    const t1 = 0.5 + rnd() * 0.4;
    const p0 = [L * t0, centro(t0) + th(t0) * (arr ? -0.35 + rnd() * 0.3 : 0.1 + rnd() * 0.35)];
    const p1 = [L * t1, centro(t1) + th(t1) * (arr ? -0.2 + rnd() * 0.3 : 0.25 + rnd() * 0.4) + diente * 0.3 * rnd()];
    (arr ? claras : oscuras).push([p0, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + L * 0.09], p1]);
  }
  return { cuerpo, luz, sombra, claras, oscuras };
}

const trazo = (pts) => `M${f(pts[0][0])},${f(pts[0][1])} Q${f(pts[1][0])},${f(pts[1][1])} ${f(pts[2][0])},${f(pts[2][1])}`;

/**
 * Una conífera dibujada con `NOMINAL` de alto, con la base en 0,0 y la copa hacia arriba (y negativo): tronco recto a
 * la vista con su borde claro, ramas largas que caen y se levantan en la punta, agujas colgando, y una flecha fina arriba.
 * Devuelve el tronco, el cuerpo, las caras de luz y sombra y las hebras claras y oscuras de cada rama.
 */
function coniferaVariante(rnd, ancho, detalle, hebras) {
  const H = NOMINAL;
  const W = H * ancho;
  const niveles = Math.max(7, Math.round((15 + rnd() * 8) * detalle));
  const sp = (H * 0.8) / (niveles - 1);
  const inclina = (rnd() - 0.5) * H * 0.05;
  const cx = (y) => (inclina * -y) / H;
  const cuerpo = [];
  const luz = [];
  const sombra = [];
  const claras = [];
  const oscuras = [];
  const colocar = (pts, ay, sgn) => pts.map(([x, y]) => [cx(ay) + sgn * x, ay + y]);
  for (let i = 0; i < niveles; i++) {
    const u = i / (niveles - 1);
    const y0 = -H * 0.95 + u * H * 0.8;
    const prof = Math.pow(0.1 + 0.9 * u, 1.0);
    for (const sgn of [1, -1]) {
      if (u > 0.1 && u < 0.9 && rnd() < 0.1) continue; // a veces falta una rama: el contorno no queda parejo
      const L = (W / 2) * prof * (0.55 + rnd() * 0.75);
      const caida = L * (0.2 + rnd() * 0.25 + 0.12 * u);
      const grosor = Math.max(sp * 2.0, L * 0.3);
      const dientes = Math.max(2, Math.round((L / (H * 0.026)) * (0.55 + 0.45 * detalle)));
      const ay = y0 + (rnd() - 0.5) * sp * 0.9;
      const fr = fronda(rnd, L, caida, grosor, dientes, H * (0.018 + rnd() * 0.02), L * (0.08 + rnd() * 0.12), sgn > 0 ? 0.3 : 0.42, sgn > 0 ? 0.45 : 0.3, hebras);
      cuerpo.push(poli(colocar(fr.cuerpo, ay, sgn)));
      luz.push(poli(colocar(fr.luz, ay, sgn)));
      sombra.push(poli(colocar(fr.sombra, ay, sgn)));
      for (const h of fr.claras) claras.push(trazo(colocar(h, ay, sgn)));
      for (const h of fr.oscuras) oscuras.push(trazo(colocar(h, ay, sgn)));
    }
  }
  // Tronco recto y afinado, con una franja clara del lado de la luz (los dos se ven entre rama y rama)
  const tw = H * 0.03;
  const ancho1 = (y) => tw * (0.45 + 0.55 * (1 - Math.min(1, -y / (H * 0.95))) ** 1.2);
  const ys = [0, -H * 0.06, -H * 0.2, -H * 0.45, -H * 0.7, -H * 0.93];
  const izqT = ys.map((y) => [cx(y) - ancho1(y) * (y === 0 ? 1.3 : 1), y]);
  const derT = ys.map((y) => [cx(y) + ancho1(y) * (y === 0 ? 1.3 : 1), y]).reverse();
  const flecha = [[cx(-H), -H], [cx(-H * 0.9) + H * 0.025, -H * 0.9], [cx(-H * 0.9) - H * 0.025, -H * 0.9]];
  const franja = ys.slice(0, 5).map((y) => [cx(y) - ancho1(y), y]).concat(ys.slice(0, 5).map((y) => [cx(y) - ancho1(y) * 0.1, y]).reverse());
  return {
    tr: [poli([...izqT, ...derT]), poli(flecha)].join(' '),
    tl: poli(franja),
    c: cuerpo.join(' '),
    l: luz.join(' '),
    s: sombra.join(' '),
    h: claras.join(' '),
    hs: oscuras.join(' '),
    tono: rnd() < 0.4 ? ' b' : '',
  };
}

/** Una mata de hojas redonda y ancha, como una nube: su cuerpo, la media luna de luz, la de sombra y un filo de brillo. */
function matas(rnd, cx, cy, r) {
  const n = 14;
  const ancho = 1.25 + rnd() * 0.35;
  const rad = Array.from({ length: n }, () => 0.86 + rnd() * 0.26);
  const pt = (k, esc, dx, dy) => {
    const a = (k / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r * ancho * rad[k % n] * esc + dx * ancho, cy + Math.sin(a) * r * 0.82 * rad[k % n] * esc + dy];
  };
  const cuerpo = Array.from({ length: n }, (_, k) => pt(k, 1, 0, 0));
  const luna = (ks, esc, dx, dy) => [...ks.map((k) => pt(k, 1, 0, 0)), ...[...ks].reverse().map((k) => pt(k, esc, dx, dy))];
  return { cuerpo, luz: luna([8, 9, 10, 11], 0.72, -r * 0.1, -r * 0.08), sombra: luna([1, 2, 3, 4, 5], 0.76, r * 0.07, r * 0.07), brillo: luna([9, 10, 11], 0.9, -r * 0.05, -r * 0.04) };
}

/**
 * Una lenga con `NOMINAL` de alto: tronco que se abre en ramas, copa hecha de muchas matas redondas que dejan ver el
 * cielo entre ellas, con brillos y hojas sueltas en el borde. En otoño las lengas se ponen rojas y naranjas.
 */
function lengaVariante(rnd, ancho, detalle, otono) {
  const H = NOMINAL;
  const rx = (H * ancho) / 2;
  const ry = H * (0.2 + rnd() * 0.06);
  const cy = -H * 0.68;
  const fork = [0, -H * 0.4];
  const puntas = [[-0.62, 0.1], [0.6, 0.12], [-0.3, -0.55], [0.32, -0.6], [0, -0.1]].map(([a, b]) => [rx * a, cy + ry * b]);
  const extra = Math.max(6, Math.round(20 * detalle));
  const centros = [...puntas];
  for (let i = 0; i < extra; i++) {
    const ang = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * 0.92;
    centros.push([rx * d * Math.cos(ang), cy + ry * d * Math.sin(ang)]);
  }
  const cuerpo = [];
  const luz = [];
  const sombra = [];
  const brillo = [];
  for (const [x, y] of centros) {
    const m = matas(rnd, x, y, H * (0.06 + rnd() * 0.04));
    cuerpo.push(redondo(m.cuerpo));
    luz.push(redondo(m.luz));
    sombra.push(redondo(m.sombra));
    brillo.push(redondo(m.brillo));
  }
  // hojas sueltas: matas chicas en el borde de la copa, para que el contorno no sea liso
  const sueltas = Math.max(4, Math.round(12 * detalle));
  for (let i = 0; i < sueltas; i++) {
    const ang = rnd() * Math.PI * 2;
    const d = 0.98 + rnd() * 0.22;
    const m = matas(rnd, rx * d * Math.cos(ang), cy + ry * d * Math.sin(ang), H * (0.018 + rnd() * 0.02));
    cuerpo.push(redondo(m.cuerpo));
  }
  const tw = H * 0.026;
  const tronco = [[-tw * 1.6, 0], [-tw * 1.1, -H * 0.08], [-tw * 0.8, -H * 0.3], [-tw * 0.7, fork[1]], [tw * 0.7, fork[1]], [tw * 0.8, -H * 0.3], [tw * 1.1, -H * 0.08], [tw * 1.6, 0]];
  const ramas = puntas.map(([x, y]) => {
    const wb = tw * 0.7;
    return poli([[fork[0] - wb, fork[1]], [fork[0] + wb, fork[1]], [x + wb * 0.3, y + 6], [x - wb * 0.3, y + 6]]);
  });
  const franja = poli([[-tw * 1.6, 0], [-tw * 1.1, -H * 0.08], [-tw * 0.8, -H * 0.3], [-tw * 0.7, fork[1]], [-tw * 0.1, fork[1]], [-tw * 0.1, -H * 0.3], [-tw * 0.2, -H * 0.08], [-tw * 0.3, 0]]);
  return { tronco: [poli(tronco), ...ramas].join(' '), tl: franja, c: cuerpo.join(' '), l: luz.join(' '), s: sombra.join(' '), b: brillo.join(' '), otono };
}

function degradados(id) {
  const g = (k) => `<linearGradient id="${id}-g${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--g${k}1)"/><stop offset="0.5" style="stop-color:var(--g${k}2)"/><stop offset="1" style="stop-color:var(--g${k}3)"/></linearGradient>`;
  return g('a') + g('b') + g('o');
}

/** Hierba en el borde del terreno: matas de briznas finas y de largo distinto. */
function hierba(rnd, ancho, relieve) {
  let d = '';
  for (let x = 4; x < ancho; x += 9 + rnd() * 10) {
    const y = relieve(x) + 2;
    const h = 5 + rnd() * 11;
    const lean = (rnd() - 0.5) * 7;
    d += `M${f(x)},${f(y)} L${f(x + lean)},${f(y - h)} L${f(x + 3)},${f(y)} `;
  }
  return d.trim();
}

function generarArboles({ seed, ancho = ANCHO, alto = ALTO, cantidad = 40, hMin = 120, hMax = 260, suelo = 0.05, latifoliados = 0, detalle = 1, variantes = 8, hebras = 0, llano = null, id = 'a' }) {
  const rnd = mulberry32(seed);
  const g = alto * suelo;
  const yb = alto - g;
  const f1 = rnd() * 6.28;
  const f2 = rnd() * 6.28;
  // Terreno ondulado: sube hasta media franja sobre `yb`; si hay `llano` (la cabaña) se aplana ahí.
  const relieve = (x) => {
    let v = 0.5 + 0.28 * Math.sin(x / 230 + f1) + 0.22 * Math.sin(x / 97 + f2);
    if (llano) v *= Math.max(0, Math.min(1, (Math.abs(x - llano.x) - llano.r) / llano.r));
    return yb - g * 0.55 * v;
  };
  const paso = 40;
  const pts = [];
  for (let x = 0; x <= ancho; x += paso) pts.push(`${x},${f(relieve(x))}`);
  if (ancho % paso !== 0) pts.push(`${ancho},${f(relieve(ancho))}`);
  const terreno = `M0,${alto} L${pts.join(' L')} L${ancho},${alto} Z`;
  const pasto = hierba(rnd, ancho, relieve);

  const conif = Array.from({ length: Math.max(1, variantes) }, () => coniferaVariante(rnd, 0.26 + rnd() * 0.18, detalle, hebras));
  const lengas = latifoliados > 0 ? Array.from({ length: 4 }, (_, k) => lengaVariante(rnd, 0.62 + rnd() * 0.2, detalle, k % 3 === 0)) : [];
  const defs = [
    degradados(id),
    ...conif.map((t, k) => `<g id="${id}-c${k}"><path class="tronco" d="${t.tr}"/><path class="tl" d="${t.tl}"/><path class="c${t.tono}" d="${t.c}"/><path class="sombra" d="${t.s}"/><path class="luz" d="${t.l}"/>${t.hs ? `<path class="hs" d="${t.hs}"/>` : ''}${t.h ? `<path class="h" d="${t.h}"/>` : ''}</g>`),
    ...lengas.map((t, k) => {
      const o = t.otono ? ' o' : '';
      return `<g id="${id}-l${k}"><path class="tronco${o}" d="${t.tronco}"/><path class="tl${o}" d="${t.tl}"/><path class="c${o}" d="${t.c}"/><path class="sombra${o}" d="${t.s}"/><path class="luz${o}" d="${t.l}"/><path class="bri${o}" d="${t.b}"/></g>`;
    }),
  ].join('');

  const xs = Array.from({ length: cantidad }, () => rnd() * ancho).sort((a, b) => a - b);
  const lista = xs.map((x) => {
    const H = hMin + Math.pow(rnd(), 1.4) * (hMax - hMin);
    const base = relieve(x) + rnd() * g * 0.2; // la base se esconde un poco en el suelo
    const ancha = lengas.length > 0 && rnd() < latifoliados;
    const ref = ancha ? `${id}-l${Math.floor(rnd() * lengas.length)}` : `${id}-c${Math.floor(rnd() * conif.length)}`;
    const k = (ancha ? H * 0.85 : H) / NOMINAL;
    const wf = 0.88 + rnd() * 0.24;
    return { z: base, uso: `<use href="#${ref}" transform="translate(${f(x)} ${f(base)}) scale(${f(k * wf * 100) / 100} ${f(k * 100) / 100})"/>` };
  });
  lista.sort((a, b) => a.z - b.z); // los más lejanos primero, para que los de adelante los tapen
  return { terreno, pasto, defs, lista, conif, lengas };
}

/**
 * Terreno y árboles como markup SVG. Se dibujan unas pocas variantes de conífera y de lenga y se reparten con <use>,
 * cada una con su tamaño y ancho, de atrás hacia adelante. `latifoliados` es la fracción de lengas; `detalle` baja la
 * cantidad de ramas en los árboles lejanos y `hebras` es cuántos trazos de agujas lleva cada rama.
 */
export function arboles(opts) {
  const { terreno, pasto, defs, lista } = generarArboles(opts);
  return `<path class="suelo" d="${terreno}"/><path class="hierba" d="${pasto}"/><defs>${defs}</defs>${lista.map((t) => t.uso).join('')}`;
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
      extra: arboles({ seed: 41, cantidad: 130, hMin: 90, hMax: 210, latifoliados: 0.14, detalle: 0.55, variantes: 7, hebras: 0, id: 'bosque' }),
    },
    {
      id: 'frente',
      paths: [],
      caras: '',
      nieve: '',
      extra: arboles({ seed: 53, cantidad: 34, hMin: 280, hMax: 540, suelo: 0.07, latifoliados: 0.1, detalle: 1, variantes: 6, hebras: 5, llano: { x: 1450, r: 260 }, id: 'frente' }) + cabana(1450, ALTO * 0.93),
    },
  ];
}
