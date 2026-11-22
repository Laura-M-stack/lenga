import test from 'node:test';
import assert from 'node:assert/strict';
import { aDias, deDias, sumarDias, diferenciaDias, esFechaValida, hoyBA, formatoCorto } from '../site/js/fecha.js';

test('ida y vuelta entre fecha y días', () => {
  for (const f of ['2026-01-01', '2026-12-31', '2028-02-29', '1999-03-05']) assert.equal(deDias(aDias(f)), f);
});

test('rechaza fechas que no existen', () => {
  for (const f of ['2026-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-00-10', 'hola', '', null, undefined, '2026-1-1']) {
    assert.equal(esFechaValida(f), false, String(f));
  }
  assert.equal(esFechaValida('2028-02-29'), true);
});

test('suma días cruzando mes, año y año bisiesto', () => {
  assert.equal(sumarDias('2026-01-31', 1), '2026-02-01');
  assert.equal(sumarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(sumarDias('2028-02-28', 1), '2028-02-29');
  assert.equal(sumarDias('2027-02-28', 1), '2027-03-01');
  assert.equal(sumarDias('2026-03-01', -1), '2026-02-28');
  assert.equal(sumarDias('basura', 3), '');
});

test('diferencia de días', () => {
  assert.equal(diferenciaDias('2026-02-27', '2026-03-02'), 3);
  assert.equal(diferenciaDias('2026-03-02', '2026-02-27'), -3);
});

test('hoyBA usa la fecha de Buenos Aires (UTC-3), no la del servidor', () => {
  assert.equal(hoyBA(new Date('2026-12-31T02:30:00Z')), '2026-12-30');
  assert.equal(hoyBA(new Date('2026-12-31T03:00:00Z')), '2026-12-31');
  assert.equal(hoyBA(new Date('2026-07-01T14:00:00Z')), '2026-07-01');
});

test('formato corto con y sin año', () => {
  assert.equal(formatoCorto('2026-12-05'), 'sáb 5 dic');
  assert.equal(formatoCorto('2027-01-02', 2026), 'sáb 2 ene 2027');
  assert.equal(formatoCorto('2026-12-05', 2026), 'sáb 5 dic');
  assert.equal(formatoCorto('xx'), '');
});
