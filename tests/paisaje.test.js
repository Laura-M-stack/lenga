import test from 'node:test';
import assert from 'node:assert/strict';
import { cordillera, nieve, pinos, cabana, capasEscena, ANCHO, ALTO } from '../site/js/paisaje.js';

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

test('los árboles son deterministas y quedan dentro del cuadro', () => {
  const d = pinos({ seed: 3, cantidad: 30 });
  assert.equal(d, pinos({ seed: 3, cantidad: 30 }));
  assert.notEqual(d, pinos({ seed: 4, cantidad: 30 }));
  assert.doesNotMatch(d, /NaN|undefined|Infinity/);
  dentro(d);
  assert.equal((d.match(/Z/g) ?? []).length, 1 + 30); // el suelo más un trazo por conífera
  dentro(pinos({ seed: 9, cantidad: 0 }));
});

test('las coníferas no son triángulos: tienen muchos puntos y cada una es distinta', () => {
  const uno = pinos({ seed: 8, cantidad: 1 }).split(' Z ')[1] ?? pinos({ seed: 8, cantidad: 1 });
  assert.ok((uno.match(/L/g) ?? []).length > 40, 'una conífera tiene decenas de puntos');
  const alturas = new Set();
  for (let s = 1; s <= 12; s++) alturas.add(pinos({ seed: s, cantidad: 1 }).length);
  assert.ok(alturas.size > 8, 'no se repite la misma silueta');
});

test('con latifoliados aparecen copas redondas (copa y tronco) y todo queda dentro del cuadro', () => {
  const solo = pinos({ seed: 5, cantidad: 40, latifoliados: 1 });
  assert.equal((solo.match(/Z/g) ?? []).length, 1 + 40 * 2);
  dentro(solo);
  const mezcla = pinos({ seed: 5, cantidad: 80, latifoliados: 0.2 });
  const z = (mezcla.match(/Z/g) ?? []).length;
  assert.ok(z > 1 + 80 && z < 1 + 160, `z=${z}`);
  dentro(mezcla);
  assert.doesNotMatch(mezcla, /NaN|undefined/);
});

test('árboles en los bordes y de tamaño exagerado no se salen del cuadro', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) dentro(pinos({ seed, cantidad: 60, hMin: 300, hMax: 690, suelo: 0.01, latifoliados: 0.3 }));
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
});
