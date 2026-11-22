import test from 'node:test';
import assert from 'node:assert/strict';
import { progresoPista, escalaCapa, subidaCapa, factorPantalla, desplazamiento, visible, derivaX, posicionAve, corrimientoPuntero, coberturaX } from '../site/js/parallax-calc.js';

test('progreso de la pista: 0 antes, 1 después, lineal en el medio', () => {
  const alturaEscena = 800;
  const pista = (top) => ({ top, height: 2400 }); // recorrido de 1600
  assert.equal(progresoPista(pista(100), alturaEscena, 64), 0);
  assert.equal(progresoPista(pista(64), alturaEscena, 64), 0);
  assert.equal(progresoPista(pista(64 - 800), alturaEscena, 64), 0.5);
  assert.equal(progresoPista(pista(64 - 1600), alturaEscena, 64), 1);
  assert.equal(progresoPista(pista(-5000), alturaEscena, 64), 1);
});

test('progreso con datos inválidos o pista más baja que la escena devuelve 0', () => {
  assert.equal(progresoPista({ top: NaN, height: 2000 }, 800), 0);
  assert.equal(progresoPista({ top: 0, height: 700 }, 800), 0);
  assert.equal(progresoPista({ top: 0, height: 800 }, 800), 0);
});

test('zoom y subida de las capas', () => {
  assert.equal(escalaCapa(0, 1.5), 1);
  assert.equal(escalaCapa(1, 1.5), 1.5);
  assert.equal(escalaCapa(0.5, 1.5), 1.25);
  assert.equal(escalaCapa(3, 1.5), 1.5);
  assert.equal(subidaCapa(0, 0.05, 800), 0);
  assert.equal(Object.is(subidaCapa(0, 0.05, 800), -0), false);
  assert.equal(subidaCapa(1, 0.05, 800), -40);
  assert.equal(subidaCapa(2, 0.05, 800), -40);
});

test('en pantallas angostas se atenúa el efecto', () => {
  assert.equal(factorPantalla(375), 0.6);
  assert.equal(factorPantalla(719), 0.6);
  assert.equal(factorPantalla(720), 1);
  assert.equal(factorPantalla(1440), 1);
});

test('desplazamiento: cero en el centro, limitado por max, sin -0', () => {
  assert.equal(desplazamiento({ top: 300, height: 400 }, 1000, 0.1), 0);
  assert.equal(desplazamiento({ top: 800, height: 400 }, 1000, 0.1), 50);
  assert.equal(desplazamiento({ top: 800, height: 400 }, 1000, 0.1, 20), 20);
  assert.equal(desplazamiento({ top: -400, height: 400 }, 1000, 0.1, 20), -20);
  assert.equal(desplazamiento({ top: NaN, height: 400 }, 1000, 0.1), 0);
  assert.equal(Object.is(desplazamiento({ top: 300, height: 400 }, 1000, -0.1), -0), false);
});

test('visible solo cerca de la pantalla', () => {
  assert.equal(visible({ top: 100, height: 100 }, 800), true);
  assert.equal(visible({ top: 1100, height: 100 }, 800), false);
  assert.equal(visible({ top: -500, height: 100 }, 800), false);
  assert.equal(visible({ top: -250, height: 100 }, 800), true);
});

test('deriva horizontal: siempre dentro de un ciclo, nunca positiva', () => {
  assert.equal(derivaX(0, 0.1, 1200), 0);
  assert.equal(derivaX(1000, 0.1, 1200), -100);
  assert.equal(derivaX(12000, 0.1, 1200), 0);
  for (const y of [0, 7, 999, 123456, -300]) {
    const x = derivaX(y, 0.37, 1200);
    assert.ok(x <= 0 && x > -1200, `y=${y} x=${x}`);
    assert.equal(Object.is(x, -0), false);
  }
  assert.equal(derivaX(100, 0.1, 0), 0);
  assert.equal(derivaX(NaN, 0.1, 1200), 0);
});

test('pájaros: cruzan el cielo, están dentro del rango y se van al caer la tarde', () => {
  for (let i = 0; i < 4; i++) {
    for (const p of [0, 0.1, 0.3, 0.5, 0.6, 0.8, 1, -1, 2, NaN]) {
      const a = posicionAve(p, i);
      assert.ok(a.x >= -10 && a.x <= 110, `x=${a.x}`);
      assert.ok(a.y > 5 && a.y < 45, `y=${a.y}`);
      assert.ok(a.op >= 0 && a.op <= 1);
      assert.ok(Object.values(a).every(Number.isFinite));
    }
    assert.equal(posicionAve(0.3, i).op, 1);
    assert.equal(posicionAve(0.9, i).op, 0);
  }
  assert.notEqual(posicionAve(0.2, 0).x, posicionAve(0.2, 1).x);
  assert.ok(posicionAve(0.3, 0).x !== posicionAve(0.1, 0).x, 'se mueven con el scroll');
});

test('puntero: corrimiento proporcional, limitado y sin -0', () => {
  assert.equal(corrimientoPuntero(0, 40), 0);
  assert.equal(Object.is(corrimientoPuntero(-0, 40), -0), false);
  assert.equal(corrimientoPuntero(0.5, 40), 20);
  assert.equal(corrimientoPuntero(-1, 40), -40);
  assert.equal(corrimientoPuntero(5, 40), 40);
  assert.equal(corrimientoPuntero(NaN, 40), 0);
  assert.equal(corrimientoPuntero(undefined, 40), 0);
});

test('cobertura: el zoom extra tapa justo el corrimiento máximo', () => {
  assert.equal(coberturaX(0, 1440), 1);
  assert.equal(coberturaX(40, 0), 1);
  const k = coberturaX(46, 1440);
  assert.ok(k > 1 && k < 1.1);
  assert.ok(Math.abs((k - 1) * 720 - 46) < 1e-9);
});
