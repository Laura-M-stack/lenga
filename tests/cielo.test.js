import test from 'node:test';
import assert from 'node:assert/strict';
import { mezclarHex, paleta, astros, opacidadEstrellas, opacidadLuz, fase } from '../site/js/cielo.js';

const HEX = /^#[0-9a-f]{6}$/;

test('mezclarHex en los extremos y en el medio', () => {
  assert.equal(mezclarHex('#000000', '#ffffff', 0), '#000000');
  assert.equal(mezclarHex('#000000', '#ffffff', 1), '#ffffff');
  assert.equal(mezclarHex('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mezclarHex('#102030', '#102030', 0.3), '#102030');
  assert.equal(mezclarHex('#000000', '#ffffff', 5), '#ffffff'); // t fuera de rango se limita
});

test('la paleta siempre devuelve hex válidos, incluso con valores raros', () => {
  for (const p of [-1, 0, 0.1, 0.35, 0.5, 0.7, 0.99, 1, 2, NaN, undefined]) {
    const pal = paleta(p);
    assert.deepEqual(Object.keys(pal).sort(), ['bosque', 'cielo1', 'cielo2', 'frente', 'lejos', 'medio', 'nieve']);
    for (const v of Object.values(pal)) assert.match(v, HEX, `p=${p}`);
  }
});

test('el cielo va de claro a oscuro: la noche es más oscura que el día', () => {
  const lum = (h) => [1, 3, 5].reduce((s, i) => s + parseInt(h.slice(i, i + 2), 16), 0);
  assert.ok(lum(paleta(1).cielo1) < lum(paleta(0.35).cielo1));
  assert.ok(lum(paleta(1).frente) < lum(paleta(0).frente));
  assert.equal(paleta(0.35).cielo1, '#4f9bd8');
  assert.equal(paleta(1).cielo2, '#22314f');
});

test('el sol sale a la izquierda, sube, se pone a la derecha y de noche aparece la luna', () => {
  const a0 = astros(0).sol;
  const a1 = astros(0.36).sol;
  const a2 = astros(0.72).sol;
  assert.ok(a0.x < a1.x && a1.x < a2.x);
  assert.ok(a1.y < a0.y && a1.y < a2.y); // el punto más alto está a mitad de camino
  assert.equal(astros(0).sol.op, 1);
  assert.ok(astros(1).sol.op < 0.01);
  assert.equal(astros(0).luna.op, 0);
  assert.equal(astros(1).luna.op, 1);
  for (const p of [0, 0.3, 0.6, 0.9, 1]) {
    const { sol, luna } = astros(p);
    for (const d of [sol, luna]) assert.ok(d.x >= 0 && d.x <= 100 && d.y >= 0 && d.y <= 100 && d.op >= 0 && d.op <= 1, `p=${p}`);
  }
});

test('estrellas y luz de la ventana aparecen al final', () => {
  assert.equal(opacidadEstrellas(0.3), 0);
  assert.equal(opacidadEstrellas(1), 1);
  assert.ok(opacidadEstrellas(0.8) > 0 && opacidadEstrellas(0.8) < 1);
  assert.equal(opacidadLuz(0.2), 0);
  assert.equal(opacidadLuz(1), 1);
});

test('fase: cada texto vive en su tramo y no hay dos a la vez en el medio de cada tramo', () => {
  const tramos = [[0, 0.3], [0.38, 0.64], [0.74, 1]];
  assert.equal(fase(0, 0, 0.3).op, 1); // el primero ya está visible al empezar
  assert.equal(fase(1, 0.74, 1).op, 1); // el último sigue visible al terminar
  for (const [a, b] of tramos) assert.equal(fase((a + b) / 2, a, b).op, 1);
  for (let p = 0; p <= 1; p += 0.01) {
    const visibles = tramos.filter(([a, b]) => fase(p, a, b).op > 0.5).length;
    assert.ok(visibles <= 1, `p=${p.toFixed(2)}`);
  }
  assert.equal(fase(0.5, 0, 0.3).op, 0);
  assert.equal(Object.is(fase(0.15, 0, 0.3).y, -0), false);
  assert.ok(fase(0.2, 0.38, 0.64).y > 0 && fase(0.7, 0.38, 0.64).y < 0); // entra desde abajo, sale hacia arriba
});
