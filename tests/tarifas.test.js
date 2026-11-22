import test from 'node:test';
import assert from 'node:assert/strict';
import {
  temporada, listaNoches, ocupadasDemo, nocheOcupada, hayChoque, siguienteLibre, tiraOcupacion,
  descuentoPorNoches, cotizar, resumenConsulta, cabanaPorId, pesos,
} from '../site/js/tarifas.js';
import { sumarDias } from '../site/js/fecha.js';

const HOY = '2026-03-10';

test('temporada: bordes de alta, media y baja', () => {
  assert.equal(temporada('2026-12-14'), 'media');
  assert.equal(temporada('2026-12-15'), 'alta');
  assert.equal(temporada('2027-01-01'), 'alta');
  assert.equal(temporada('2027-02-28'), 'alta');
  assert.equal(temporada('2027-03-01'), 'media');
  assert.equal(temporada('2026-04-01'), 'baja');
  assert.equal(temporada('2026-06-30'), 'baja');
  assert.equal(temporada('2026-07-01'), 'media');
  assert.equal(temporada('2026-07-11'), 'media');
  assert.equal(temporada('2026-07-12'), 'alta');
  assert.equal(temporada('2026-07-25'), 'alta');
  assert.equal(temporada('2026-07-26'), 'media');
  assert.equal(temporada('2026-09-30'), 'baja');
  assert.equal(temporada('2026-10-01'), 'media');
  assert.equal(temporada('2028-02-29'), 'alta');
  assert.equal(temporada('no'), null);
});

test('las noches van de la llegada a la víspera de la salida', () => {
  assert.deepEqual(listaNoches('2026-04-01', '2026-04-04'), ['2026-04-01', '2026-04-02', '2026-04-03']);
  assert.deepEqual(listaNoches('2026-04-04', '2026-04-04'), []);
  assert.deepEqual(listaNoches('2026-04-05', '2026-04-04'), []);
  assert.deepEqual(listaNoches('2026-02-27', '2026-03-01'), ['2026-02-27', '2026-02-28']);
  assert.deepEqual(listaNoches('x', '2026-04-04'), []);
});

test('ocupación: el día de salida no cuenta como noche ocupada', () => {
  const r = [{ desde: '2026-05-10', hasta: '2026-05-12' }];
  assert.equal(hayChoque(r, '2026-05-08', '2026-05-10'), false); // sale el 10 y la noche del 10 es de otro
  assert.equal(hayChoque(r, '2026-05-08', '2026-05-11'), true);
  assert.equal(hayChoque(r, '2026-05-12', '2026-05-14'), true);
  assert.equal(hayChoque(r, '2026-05-13', '2026-05-15'), false);
  assert.equal(nocheOcupada(r, '2026-05-11'), true);
});

test('siguienteLibre salta los rangos ocupados', () => {
  const r = [{ desde: '2026-05-10', hasta: '2026-05-12' }];
  assert.deepEqual(siguienteLibre(r, '2026-05-09', 3), { llegada: '2026-05-13', salida: '2026-05-16' });
  assert.deepEqual(siguienteLibre([], '2026-05-09', 2), { llegada: '2026-05-09', salida: '2026-05-11' });
  const todo = [{ desde: '2026-01-01', hasta: '2030-01-01' }];
  assert.equal(siguienteLibre(todo, '2026-05-09', 2, 30), null);
});

test('tira de ocupación', () => {
  const r = [{ desde: sumarDias(HOY, 1), hasta: sumarDias(HOY, 2) }];
  assert.deepEqual(tiraOcupacion(r, HOY, 4), [false, true, true, false]);
});

test('ocupadasDemo siempre deja rangos coherentes y cercanos a hoy', () => {
  const o = ocupadasDemo(HOY);
  assert.deepEqual(Object.keys(o).sort(), ['cumbre', 'lago', 'pino']);
  for (const rs of Object.values(o)) for (const r of rs) assert.ok(r.desde <= r.hasta && r.desde > HOY);
  const o2 = ocupadasDemo('2026-12-30');
  assert.equal(o2.pino[0].desde, '2027-01-05'); // cruza de año sin romperse
});

test('descuento por cantidad de noches', () => {
  assert.equal(descuentoPorNoches(6), 0);
  assert.equal(descuentoPorNoches(7), 10);
  assert.equal(descuentoPorNoches(13), 10);
  assert.equal(descuentoPorNoches(14), 15);
  assert.equal(descuentoPorNoches(21), 15);
});

const base = { cabanaId: 'lago', huespedes: 2, hoy: HOY, ocupadas: {} };

test('cotiza una estadía en una sola temporada', () => {
  const c = cotizar({ ...base, llegada: '2026-04-10', salida: '2026-04-13' }); // 3 noches de baja
  assert.equal(c.ok, true);
  assert.equal(c.noches, 3);
  assert.deepEqual(c.desglose, [{ temporada: 'baja', noches: 3, precio: 98000, subtotal: 294000 }]);
  assert.equal(c.total, 294000);
  assert.equal(c.sena, Math.round(294000 * 0.3));
  assert.equal(c.descuento, 0);
});

test('una estadía que cruza de temporada se desglosa noche por noche', () => {
  // 13 al 17 de diciembre: 13 y 14 son medias, 15 y 16 son altas
  const c = cotizar({ ...base, cabanaId: 'pino', huespedes: 2, llegada: '2026-12-13', salida: '2026-12-17' });
  assert.equal(c.ok, true, c.errores.join(' '));
  assert.deepEqual(c.desglose.map((d) => [d.temporada, d.noches]), [['media', 2], ['alta', 2]]);
  assert.equal(c.total, 2 * 92000 + 2 * 130000);
});

test('estadía mínima según la temporada de llegada', () => {
  const alta = cotizar({ ...base, llegada: '2027-01-10', salida: '2027-01-13' }); // 3 noches en alta
  assert.equal(alta.ok, false);
  assert.match(alta.errores[0], /mínima es de 4 noches/);
  assert.ok(alta.campos.includes('salida'));
  const baja = cotizar({ ...base, llegada: '2026-05-10', salida: '2026-05-11' });
  assert.equal(baja.ok, false);
  assert.match(baja.errores[0], /mínima es de 2 noches/);
});

test('descuento por 7 y 14 noches, solo sobre el alojamiento', () => {
  const c7 = cotizar({ ...base, llegada: '2026-05-04', salida: '2026-05-11', extras: { lena: true } });
  assert.equal(c7.ok, true);
  assert.equal(c7.alojamiento, 7 * 98000);
  assert.equal(c7.descuentoPct, 10);
  assert.equal(c7.descuento, Math.round(7 * 98000 * 0.1));
  assert.equal(c7.total, c7.alojamiento - c7.descuento + 12000);
  const c14 = cotizar({ ...base, llegada: '2026-05-04', salida: '2026-05-18' });
  assert.equal(c14.descuentoPct, 15);
});

test('extras: el desayuno se multiplica por personas y noches, los demás son fijos', () => {
  const c = cotizar({ ...base, huespedes: 3, llegada: '2026-04-10', salida: '2026-04-12', extras: { desayuno: true, lena: true, mascota: true, otro: true } });
  assert.equal(c.ok, true);
  assert.deepEqual(c.extras.map((e) => [e.clave, e.importe]), [['desayuno', 6500 * 3 * 2], ['lena', 12000], ['mascota', 10000]]);
});

test('valida fechas, capacidad y límites', () => {
  assert.equal(cotizar({ ...base, llegada: '', salida: '2026-04-12' }).ok, false);
  assert.equal(cotizar({ ...base, llegada: '2026-04-30', salida: '2026-04-31' }).ok, false);
  const pasado = cotizar({ ...base, llegada: '2026-03-01', salida: '2026-03-04' });
  assert.match(pasado.errores[0], /anterior a hoy/);
  const inverso = cotizar({ ...base, llegada: '2026-04-12', salida: '2026-04-10' });
  assert.match(inverso.errores[0], /después de la llegada/);
  const mucha = cotizar({ ...base, cabanaId: 'pino', huespedes: 3, llegada: '2026-04-10', salida: '2026-04-13' });
  assert.match(mucha.errores[0], /hasta 2 personas/);
  assert.ok(mucha.campos.includes('huespedes'));
  for (const h of [0, -1, 1.5, 'abc', '', null]) assert.equal(cotizar({ ...base, huespedes: h, llegada: '2026-04-10', salida: '2026-04-13' }).ok, false, String(h));
  const larga = cotizar({ ...base, llegada: '2026-04-01', salida: '2026-04-30' });
  assert.match(larga.errores[0], /máxima es de 21 noches/);
  assert.equal(cotizar({ ...base, cabanaId: 'no-existe', llegada: '2026-04-10', salida: '2026-04-13' }).ok, false);
});

test('hoy como llegada es válido', () => {
  const c = cotizar({ ...base, llegada: HOY, salida: sumarDias(HOY, 3) });
  assert.equal(c.ok, true, c.errores.join(' '));
});

test('si no está disponible, sugiere la próxima fecha libre con las mismas noches', () => {
  const ocupadas = { lago: [{ desde: '2026-04-12', hasta: '2026-04-14' }] };
  const c = cotizar({ ...base, ocupadas, llegada: '2026-04-11', salida: '2026-04-14' });
  assert.equal(c.ok, false);
  assert.match(c.errores[0], /no está disponible/);
  assert.deepEqual(c.sugerencia, { llegada: '2026-04-15', salida: '2026-04-18' });
  assert.ok(c.campos.includes('llegada') && c.campos.includes('salida'));
  // otra cabaña con los mismos datos sí está libre
  assert.equal(cotizar({ ...base, cabanaId: 'pino', ocupadas, llegada: '2026-04-11', salida: '2026-04-14' }).ok, true);
});

test('resumen de consulta', () => {
  const c = cotizar({ ...base, llegada: '2026-04-10', salida: '2026-04-13', extras: { lena: true } });
  const t = resumenConsulta(c, { llegada: '2026-04-10', salida: '2026-04-13', nombre: ' Ana ' }, 2026);
  assert.match(t, /^Hola, soy Ana\./);
  assert.match(t, /Cabaña Lago/);
  assert.match(t, /3 noches/);
  assert.match(t, /Extra: Leña extra/);
  assert.match(t, /Total estimado: \$306\.000/);
  assert.equal(resumenConsulta({ ok: false }, {}), '');
  assert.match(resumenConsulta(c, { llegada: '2026-04-10', salida: '2026-04-13' }), /^Hola\./);
});

test('utilidades', () => {
  assert.equal(cabanaPorId('pino').capacidad, 2);
  assert.equal(cabanaPorId('x'), null);
  assert.equal(pesos(1234567), '$1.234.567');
});
