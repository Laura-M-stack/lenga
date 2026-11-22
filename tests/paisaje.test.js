import test from 'node:test';
import assert from 'node:assert/strict';
import { cordillera, nieve, caras, arboles, cabana, capasEscena, ANCHO, ALTO } from '../site/js/paisaje.js';

function numeros(d) {
  return [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}
function dentro(d) {
  const n = numeros(d);
  assert.ok(n.length > 6);
  for (let i = 0; i < n.length; i += 2) {
    assert.ok(Number.isFinite(n[i]) && n[i] >= 0 && n[i] <= ANCHO, `x=${n[i]}`);
    assert.ok(Number.isFinite(n[i + 1]) && n[i + 1] >= 0 && n[i + 1] <= ALTO, `y=${n[i + 1]}`);
  }
}

test('la cordillera es determinista: misma semilla, mismo dibujo', () => {
  assert.equal(cordillera({ seed: 5 }), cordillera({ seed: 5 }));
  assert.notEqual(cordillera({ seed: 5 }), cordillera({ seed: 6 }));
});

test('la cordillera es un camino cerrado y no se sale del cuadro', () => {
  for (const seed of [1, 11, 23, 37, 99, 12345]) {
    const d = cordillera({ seed, base: 0.4, amplitud: 0.4 });
    assert.match(d, /^M0,700 L/);
    assert.match(d, /Z$/);
    assert.doesNotMatch(d, /NaN|undefined|Infinity/);
    dentro(d);
  }
});

test('la nieve queda sobre las cumbres, es determinista y se sale solo si no hay cumbres altas', () => {
  const o = { seed: 11, base: 0.42, amplitud: 0.4, rugosidad: 0.62 };
  const n = nieve(o);
  assert.ok(n.startsWith('M') && n.endsWith('Z'));
  assert.equal(n, nieve(o));
  assert.doesNotMatch(n, /NaN|undefined|L Z|L L/);
  dentro(n);
  for (const seed of [1, 5, 23, 99, 4321]) {
    const d = nieve({ seed, base: 0.4, amplitud: 0.4 });
    assert.doesNotMatch(d, /NaN|undefined|L Z|L L/);
    if (d) dentro(d);
  }
  assert.equal(nieve({ seed: 11, base: 0.1, amplitud: 0.3 }, { linea: 1.01 }), ''); // línea de nieve por encima de todas las cumbres
});

test('la cabaña es un markup SVG con ventana y chimenea', () => {
  const s = cabana(1450, 650);
  assert.match(s, /^<g class="cabana"/);
  assert.match(s, /cabana__ventana"/);
  assert.match(s, /cabana__chimenea/);
  assert.match(s, /cabana__veta/);
  assert.match(s, /cabana__deck/);
  assert.doesNotMatch(s, /NaN/);
});

test('las cuatro capas de la escena, de lejos a cerca', () => {
  const capas = capasEscena();
  assert.deepEqual(capas.map((c) => c.id), ['lejos', 'medio', 'bosque', 'frente']);
  for (const c of capas) for (const d of c.paths) dentro(d);
  assert.match(capas[3].extra, /cabana/);
  assert.ok(capas[0].nieve.length > 0, 'la cordillera lejana lleva nieve');
  for (const c of capas) if (c.nieve) dentro(c.nieve);
  for (const c of capas) if (c.caras) dentro(c.caras);
  assert.ok(capas[0].caras.length > 0 && capas[1].caras.length > 0, 'las montañas tienen pliegues en sombra');
  for (const id of [2, 3]) assert.match(capas[id].extra, /class="sombra"[\s\S]*class="luz"[\s\S]*<use /, 'los árboles llevan luz y sombra y se reparten con use');
});

test('los pliegues de las montañas son deterministas, cerrados y dentro del cuadro', () => {
  const o = { seed: 23, base: 0.26, amplitud: 0.34, rugosidad: 0.58 };
  const d = caras(o);
  assert.ok(d.length > 0);
  assert.equal(d, caras(o));
  assert.doesNotMatch(d, /NaN|undefined|L Z|L L/);
  dentro(d);
  assert.equal((d.match(/M/g) ?? []).length, (d.match(/Z/g) ?? []).length);
  for (const seed of [1, 2, 3, 99, 4321]) {
    const c = caras({ seed, base: 0.3, amplitud: 0.4 });
    assert.doesNotMatch(c, /NaN|undefined/);
    if (c) dentro(c);
  }
});

const subtrazos = (d) => [...d.matchAll(/M[^M]*?Z/g)].map((m) => m[0]);
const puntos = (d) => {
  const n = numeros(d);
  return Array.from({ length: n.length / 2 }, (_, i) => [n[2 * i], n[2 * i + 1]]);
};
const area = (pts) => pts.reduce((a, [x1, y1], i) => {
  const [x2, y2] = pts[(i + 1) % pts.length];
  return a + (x1 * y2 - x2 * y1) / 2;
}, 0);

test('árboles: deterministas, sin valores raros y con un <use> por árbol', () => {
  const o = { seed: 7, cantidad: 25, latifoliados: 0.3, variantes: 5, id: 't' };
  const svg = arboles(o);
  assert.equal(svg, arboles(o));
  assert.notEqual(svg, arboles({ ...o, seed: 8 }));
  assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
  assert.equal((svg.match(/<use /g) ?? []).length, 25);
  assert.equal((svg.match(/<g id="t-c\d+"/g) ?? []).length, 5);
  assert.equal((svg.match(/<g id="t-l\d+"/g) ?? []).length, 4);
  assert.equal((arboles({ ...o, cantidad: 0 }).match(/<use /g) ?? []).length, 0);
});

test('árboles: cada <use> apunta a una variante que existe y queda dentro del cuadro', () => {
  const svg = arboles({ seed: 3, cantidad: 60, latifoliados: 0.25, variantes: 6, id: 'q', hMin: 90, hMax: 400 });
  const ids = new Set([...svg.matchAll(/<g id="([^"]+)"/g)].map((m) => m[1]));
  for (const m of svg.matchAll(/<use href="#([^"]+)" transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+) ([-\d.]+)\)"/g)) {
    assert.ok(ids.has(m[1]), `falta ${m[1]}`);
    assert.ok(+m[2] >= 0 && +m[2] <= ANCHO, `x=${m[2]}`);
    assert.ok(+m[3] > 0 && +m[3] <= ALTO + 40, `y=${m[3]}`);
    assert.ok(+m[4] > 0 && +m[5] > 0);
  }
  assert.equal((svg.match(/<use /g) ?? []).length, 60);
});

test('árboles: se dibujan del fondo al frente (las bases bajan de arriba hacia abajo)', () => {
  const svg = arboles({ seed: 5, cantidad: 40, id: 'z' });
  const ys = [...svg.matchAll(/translate\([-\d.]+ ([-\d.]+)\)/g)].map((m) => +m[1]);
  assert.equal(ys.length, 40);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] >= ys[i - 1] - 0.05, `orden ${i}`);
});

test('las coníferas se pintan en capas: por piso sombra, tono medio y luz, todo con curvas y sin líneas sueltas', () => {
  const svg = arboles({ seed: 9, cantidad: 3, variantes: 3, id: 'k' });
  const g = svg.match(/<g id="k-c0">(.*?)<\/g>/)[1];
  const sombras = (g.match(/class="sombra"/g) ?? []).length;
  const medios = (g.match(/class="c(?: b)?"/g) ?? []).length;
  assert.ok(medios >= 7, `pisos=${medios}`);
  assert.equal(sombras, medios + 1); // una sombra por piso más el núcleo de la copa
  assert.ok((g.match(/class="luz"/g) ?? []).length >= medios - 1);
  const ds = [...g.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
  for (const d of ds) {
    assert.match(d, /^M[-\d.]+,[-\d.]+ C/, 'todo son curvas');
    assert.doesNotMatch(d, / L|NaN|undefined|Infinity/);
    const n = numeros(d);
    for (let i = 1; i < n.length; i += 2) assert.ok(n[i] <= 6 && n[i] >= -320, `y=${n[i]}`); // la base queda enterrada unos px en el suelo
  }
  assert.doesNotMatch(svg, /class="h"|class="hs"|class="hierba"/);
});

test('cada rama tiene forma propia (no se repite la misma silueta)', () => {
  const svg = arboles({ seed: 2, cantidad: 2, variantes: 2, id: 'r' });
  const pisos = [...svg.match(/<g id="r-c0">(.*?)<\/g>/)[1].matchAll(/class="c(?: b)?" d="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(pisos).size, pisos.length);
});

test('las lengas llevan tronco, follaje en pisos de matas curvas, todas verdes; sin latifoliados no hay lengas', () => {
  const con = arboles({ seed: 4, cantidad: 10, latifoliados: 0.5, id: 'm' });
  for (let k = 0; k < 4; k++) assert.match(con, new RegExp(`<g id="m-l${k}"><path class="tronco"`));
  const g = con.match(/<g id="m-l0">(.*?)<\/g>/)[1];
  assert.ok((g.match(/class="c"/g) ?? []).length >= 15, 'muchas matas');
  assert.doesNotMatch(con, / o"/, 'sin follaje de otoño');
  assert.doesNotMatch(g, / L|NaN|undefined/);
  assert.doesNotMatch(arboles({ seed: 4, cantidad: 10, id: 'm2' }), /<g id="m2-l\d/);
});

test('los árboles llevan degradados y tronco con franja de luz', () => {
  const svg = arboles({ seed: 6, cantidad: 8, latifoliados: 0.4, id: 'd' });
  for (const k of ['a', 'b', 'o']) assert.match(svg, new RegExp(`<linearGradient id="d-g${k}"`));
  assert.match(svg, /var\(--ga1\)/);
  assert.match(svg, /class="tl" d=/);
  assert.equal((svg.match(/<stop /g) ?? []).length, 9);
});

test('el terreno es ondulado y se aplana donde va la cabaña', () => {
  const alto = 700;
  const suelo = 0.07;
  const yb = alto * (1 - suelo);
  const d = arboles({ seed: 2, cantidad: 0, suelo, llano: { x: 1440, r: 260 }, id: 'n' }).match(/class="suelo" d="([^"]+)"/)[1];
  const pts = puntos(d).filter(([x, y]) => x >= 0 && y < alto);
  assert.ok(new Set(pts.map(([, y]) => y)).size > 10, 'hay relieve');
  const centro = pts.filter(([x]) => Math.abs(x - 1440) <= 120);
  assert.ok(centro.length >= 3 && centro.every(([, y]) => Math.abs(y - yb) < 0.2), 'plano al pie de la cabaña');
  assert.ok(pts.every(([, y]) => y <= yb + 0.1 && y >= yb - alto * suelo));
});
