import test from 'node:test';
import assert from 'node:assert/strict';
import { progresoPista, escalaCapa, subidaCapa, factorPantalla, desplazamiento, visible, derivaX } from '../site/js/parallax-calc.js';

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
