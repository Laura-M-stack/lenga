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
      const espesor = (yLinea - y) * (0.3 + 0.18 * Math.sin(k * 0.9) + rnd() * 0.12);
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
const NOMINAL = 300; // alto con el que se dibuja cada variante de árbol; después se escala

/**
 * Curva cerrada suave (Catmull-Rom convertida a Bézier cúbicas) que pasa por todos los puntos, en sentido horario.
 * Es lo que hace que ramas y copas se vean pintadas y no facetadas, a cualquier tamaño de pantalla.
 */
const curva = (pts, tension = 1) => {
  const p = area(pts) < 0 ? [...pts].reverse() : pts;
  const n = p.length;
  const k = tension / 6;
  let d = `M${f(p[0][0])},${f(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n];
    const p1 = p[i];
    const p2 = p[(i + 1) % n];
    const p3 = p[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) * k)},${f(p1[1] + (p2[1] - p0[1]) * k)} ${f(p2[0] - (p3[0] - p1[0]) * k)},${f(p2[1] - (p3[1] - p1[1]) * k)} ${f(p2[0])},${f(p2[1])}`;
  }
  return `${d} Z`;
};

/**
 * Una rama de conífera en coordenadas locales (sale del tronco en 0,0 hacia +x). Se pinta en tres capas que comparten
 * la misma forma, como en una ilustración: `base` es la silueta completa (va en sombra), `medio` la misma rama con
 * los mechones de abajo más cortos (deja ver la sombra debajo) y `luz` una franja sobre el lomo de la rama.
 */
function rama(rnd, { L, caida, grosor, mechones, colgar, sube, franja }) {
  const espina = (t) => caida * t ** 1.6 - sube * t ** 4;
  const th = (t) => grosor * (0.72 * Math.sin(Math.PI * Math.min(1, t ** 0.75)) + 0.3 * (1 - t) + 0.08);
  const ruido = Array.from({ length: 7 }, () => (rnd() - 0.5) * 0.16);
  const mech = Array.from({ length: mechones }, (_, j) => {
    const tc = Math.min(0.97, (j + 0.65 + (rnd() - 0.5) * 0.3) / mechones);
    return { tc, cuelga: colgar * (0.6 + rnd() * 0.8) * (0.45 + tc * 0.75), lean: colgar * (0.15 + rnd() * 0.4) };
  });
  const lomo = (t, k) => [L * t, espina(t) - th(t) * 0.45 + ruido[Math.round(t * 6)] * grosor + k];
  const forma = (bajo) => {
    const arriba = Array.from({ length: 7 }, (_, k) => lomo(k / 6, 0));
    const punta = [L * 1.04, espina(1) + th(1) * 0.15];
    const abajo = [];
    for (let j = mech.length - 1; j >= 0; j--) {
      const m = mech[j];
      const tn = Math.max(0.02, m.tc - 0.5 / mechones);
      abajo.push([L * m.tc + m.lean * bajo, espina(m.tc) + th(m.tc) * 0.4 + m.cuelga * bajo]);
      abajo.push([L * tn, espina(tn) + th(tn) * (0.15 + 0.2 * bajo)]);
    }
    abajo.push([0, espina(0) + th(0) * 0.3]);
    return [...arriba, punta, ...abajo];
  };
  const ts = [0.08, 0.25, 0.42, 0.6, 0.78, 0.94];
  const luz = [
    ...ts.map((t) => lomo(t, grosor * 0.02)),
    ...[...ts].reverse().map((t, i) => [L * t, espina(t) - th(t) * (0.45 - franja * (0.75 + 0.35 * Math.sin(i * 1.7)))]),
  ];
  return { base: forma(1), medio: forma(0.42), luz };
}

/**
 * Una conífera dibujada con `NOMINAL` de alto, con la base en 0,0 y la copa hacia arriba (y negativo): tronco a la
 * vista, núcleo oscuro, pisos de ramas que caen y se superponen (los de arriba tapan a los de abajo) y una guía arriba.
 * Devuelve el tronco y una lista de pisos, cada uno con su sombra, su tono medio y su luz.
 */
function coniferaVariante(rnd, ancho, detalle) {
  const H = NOMINAL;
  const W = H * ancho;
  const niveles = Math.max(6, Math.round((11 + rnd() * 5) * detalle));
  const sp = (H * 0.82) / (niveles - 1);
  const inclina = (rnd() - 0.5) * H * 0.05;
  const cx = (y) => (inclina * -y) / H;
  const colocar = (pts, ay, sgn) => pts.map(([x, y]) => [cx(ay) + sgn * x, ay + y]);
  const pisos = [];
  for (let i = 0; i < niveles; i++) {
    const u = i / (niveles - 1);
    const y0 = -H * 0.9 + u * H * 0.78;
    const prof = 0.14 + 0.86 * u ** 0.95;
    const piso = { base: [], medio: [], luz: [] };
    for (const sgn of [-1, 1]) {
      if (u > 0.15 && u < 0.9 && rnd() < 0.08) continue; // a veces falta una rama: el contorno no queda parejo
      const L = (W / 2) * prof * (0.7 + rnd() * 0.5);
      const r = rama(rnd, {
        L,
        caida: L * (0.22 + rnd() * 0.2 + 0.14 * u),
        grosor: Math.max(sp * 1.7, L * 0.3),
        mechones: Math.max(2, Math.round((L / (H * 0.055)) * (0.7 + 0.3 * detalle))),
        colgar: H * (0.02 + rnd() * 0.02) * (0.6 + 0.6 * u),
        sube: L * (0.06 + rnd() * 0.1),
        franja: sgn < 0 ? 0.5 : 0.28, // la luz viene de la izquierda
      });
      const ay = y0 + (rnd() - 0.5) * sp * 0.6;
      piso.base.push(curva(colocar(r.base, ay, sgn)));
      piso.medio.push(curva(colocar(r.medio, ay, sgn)));
      piso.luz.push(curva(colocar(r.luz, ay, sgn)));
    }
    if (piso.base.length) pisos.push({ base: piso.base.join(' '), medio: piso.medio.join(' '), luz: piso.luz.join(' ') });
  }
  // guía: el brote recto de la punta
  const gw = H * 0.03;
  const guia = [[cx(-H), -H], [cx(-H * 0.95) + gw * 0.6, -H * 0.95], [cx(-H * 0.88) + gw, -H * 0.87], [cx(-H * 0.88) - gw, -H * 0.87], [cx(-H * 0.95) - gw * 0.6, -H * 0.95]];
  pisos.push({ base: curva(guia), medio: curva(guia.map(([x, y]) => [x * 0.75 + cx(-H) * 0.25, y + 2])), luz: '' });
  pisos.reverse(); // se dibujan de abajo hacia arriba: cada piso cae sobre el de abajo

  const tw = H * 0.028;
  const grueso = (y) => tw * (0.4 + 0.6 * (1 - Math.min(1, -y / (H * 0.95))) ** 1.3);
  const ys = [0, -H * 0.04, -H * 0.15, -H * 0.4, -H * 0.65, -H * 0.92];
  const izq = ys.map((y, i) => [cx(y) - grueso(y) * (i === 0 ? 1.7 : 1), y]);
  const der = ys.map((y, i) => [cx(y) + grueso(y) * (i === 0 ? 1.7 : 1), y]).reverse();
  const franja = [...ys.slice(0, 5).map((y, i) => [cx(y) - grueso(y) * (i === 0 ? 1.5 : 0.9), y]), ...ys.slice(0, 5).map((y) => [cx(y) - grueso(y) * 0.15, y]).reverse()];
  // núcleo: la sombra profunda del interior de la copa, visible entre las ramas
  const nucleo = [[cx(-H * 0.9), -H * 0.92], [cx(-H * 0.5) + W * 0.12, -H * 0.5], [cx(-H * 0.15) + W * 0.17, -H * 0.14], [cx(-H * 0.15) - W * 0.17, -H * 0.14], [cx(-H * 0.5) - W * 0.12, -H * 0.5]];
  return { nucleo: curva(nucleo), tronco: curva([...izq, ...der], 0.6), tl: curva(franja, 0.6), pisos, tono: rnd() < 0.4 ? ' b' : '' };
}

/** Una mata de hojas chata y ancha, de borde apenas ondulado: silueta (sombra), tono medio corrido hacia la luz y una franja de luz arriba. */
function mata(rnd, cx, cy, r) {
  const n = 24;
  const ancho = 1.45 + rnd() * 0.35;
  const alto = 0.72 + rnd() * 0.12;
  const lobulos = 6 + Math.floor(rnd() * 4);
  const fase = rnd() * 6.28;
  const rad = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * 6.2832;
    const abajo = Math.sin(a) > 0 ? 0.82 : 1; // la parte de abajo más recta, como un piso de follaje
    return abajo * (1 + 0.05 * Math.sin(a * lobulos + fase) + (rnd() - 0.5) * 0.06);
  });
  const forma = (esc, dx, dy, desde = 0, hasta = n) =>
    rad.slice(desde, hasta).map((q, i) => {
      const a = ((i + desde) / n) * 6.2832;
      return [cx + dx + Math.cos(a) * r * ancho * q * esc, cy + dy + Math.sin(a) * r * alto * q * esc];
    });
  const desde = Math.round(n * 0.52);
  const hasta = Math.round(n * 0.94);
  return {
    base: forma(1, 0, 0),
    medio: forma(0.9, -r * 0.08, -r * 0.08),
    luz: [...forma(0.9, -r * 0.08, -r * 0.08, desde, hasta), ...forma(0.62, r * 0.05, r * 0.02, desde, hasta).reverse()],
  };
}

/**
 * Una lenga con `NOMINAL` de alto: tronco fino que se abre en ramas y un follaje en pisos horizontales, hecho de
 * matas chatas que dejan ver el cielo entre un piso y otro, como crecen las lengas en el bosque andino.
 */
function lengaVariante(rnd, ancho, detalle) {
  const H = NOMINAL;
  const rx = (H * ancho) / 2;
  const tw = H * 0.02;
  const fy = -H * 0.34;
  const pisosN = 5 + Math.floor(rnd() * 2);
  const matas = [];
  const ramas = [];
  for (let i = 0; i < pisosN; i++) {
    const u = i / (pisosN - 1); // 0 = piso de abajo
    const y = -H * (0.44 + u * 0.44) + (rnd() - 0.5) * H * 0.02;
    const semi = rx * (1 - u * 0.6) * (0.7 + rnd() * 0.45);
    const desvio = (rnd() - 0.5) * rx * 0.45;
    const cant = Math.max(3, Math.round((4 + (1 - u) * 4) * (0.6 + 0.4 * detalle)));
    for (let k = 0; k < cant; k++) {
      const t = cant === 1 ? 0.5 : k / (cant - 1);
      const x = desvio + (t * 2 - 1) * semi + (rnd() - 0.5) * semi * 0.2;
      const m = mata(rnd, x, y + Math.abs(t * 2 - 1) * H * 0.025 + (rnd() - 0.5) * H * 0.015, H * (0.065 + rnd() * 0.025) * (1 - u * 0.3));
      matas.push({ y, base: curva(m.base), medio: curva(m.medio), luz: curva(m.luz) });
    }
    // ramas finas que suben desde el tronco hasta los extremos de cada piso
    for (const lado of [-1, 1]) {
      const xe = desvio + lado * semi * 0.75;
      const w = tw * (0.55 - u * 0.2);
      const y0 = Math.max(fy, y + H * 0.12);
      ramas.push(curva([[-w, y0 + 3], [xe * 0.5 - w * 0.5, (y0 + y) / 2 + H * 0.02], [xe, y + 4], [xe * 0.5 + w * 0.5, (y0 + y) / 2 + H * 0.03], [w, y0 + 3]], 0.7));
    }
  }
  matas.sort((a, b) => b.y - a.y); // de abajo hacia arriba: los pisos de arriba tapan a los de abajo
  const cima = -H * 0.88;
  const tronco = curva([[-tw * 1.9, 0], [-tw, -H * 0.1], [-tw * 0.75, -H * 0.35], [-tw * 0.4, cima], [tw * 0.4, cima], [tw * 0.75, -H * 0.35], [tw, -H * 0.1], [tw * 1.9, 0]], 0.6);
  const tl = curva([[-tw * 1.7, 0], [-tw * 0.95, -H * 0.1], [-tw * 0.7, -H * 0.35], [-tw * 0.35, -H * 0.7], [-tw * 0.05, -H * 0.7], [-tw * 0.1, -H * 0.35], [-tw * 0.25, -H * 0.1], [-tw * 0.4, 0]], 0.6);
  return { tronco: [tronco, ...ramas].join(' '), tl, matas };
}

function degradados(id) {
  const g = (k) => `<linearGradient id="${id}-g${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--g${k}1)"/><stop offset="0.5" style="stop-color:var(--g${k}2)"/><stop offset="1" style="stop-color:var(--g${k}3)"/></linearGradient>`;
  return g('a') + g('b') + g('o');
}

const capasDe = (partes, c, o = '') => partes.map((p) => `<path class="sombra${o}" d="${p.base}"/><path class="${c}" d="${p.medio}"/>${p.luz ? `<path class="luz${o}" d="${p.luz}"/>` : ''}`).join('');

function generarArboles({ seed, ancho = ANCHO, alto = ALTO, cantidad = 40, hMin = 120, hMax = 260, suelo = 0.05, latifoliados = 0, detalle = 1, variantes = 8, llano = null, id = 'a' }) {
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

  const conif = Array.from({ length: Math.max(1, variantes) }, () => coniferaVariante(rnd, 0.3 + rnd() * 0.22, detalle));
  const lengas = latifoliados > 0 ? Array.from({ length: 4 }, (_, k) => lengaVariante(rnd, 0.6 + rnd() * 0.18, detalle)) : [];
  const defs = [
    degradados(id),
    ...conif.map((t, k) => `<g id="${id}-c${k}"><path class="sombra" d="${t.nucleo}"/><path class="tronco" d="${t.tronco}"/><path class="tl" d="${t.tl}"/>${capasDe(t.pisos, `c${t.tono}`)}</g>`),
    ...lengas.map((t, k) => `<g id="${id}-l${k}"><path class="tronco" d="${t.tronco}"/><path class="tl" d="${t.tl}"/>${capasDe(t.matas, 'c')}</g>`),
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
  return { terreno, defs, lista };
}

/**
 * Terreno y árboles como markup SVG. Se dibujan unas pocas variantes de conífera y de lenga y se reparten con <use>,
 * cada una con su tamaño y ancho, de atrás hacia adelante. `latifoliados` es la fracción de lengas; `detalle` baja la
 * cantidad de ramas y matas en los árboles lejanos, que no necesitan tanto.
 */
export function arboles(opts) {
  const { terreno, defs, lista } = generarArboles(opts);
  return `<path class="suelo" d="${terreno}"/><defs>${defs}</defs>${lista.map((t) => t.uso).join('')}`;
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
      extra: arboles({ seed: 41, cantidad: 130, hMin: 90, hMax: 210, detalle: 0.55, variantes: 7, id: 'bosque' }),
    },
    {
      id: 'frente',
      paths: [],
      caras: '',
      nieve: '',
      extra: arboles({ seed: 53, cantidad: 34, hMin: 280, hMax: 540, suelo: 0.07, detalle: 1, variantes: 7, llano: { x: 1450, r: 260 }, id: 'frente' }) + cabana(1450, ALTO * 0.93),
    },
  ];
}
