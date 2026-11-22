import { NEGOCIO, CABANAS, TEMPORADAS, ACTIVIDADES, FOTOS } from './datos.js';
import { hoyBA, sumarDias, formatoCorto, diferenciaDias, aDias } from './fecha.js';
import { cotizar, ocupadasDemo, siguienteLibre, tiraOcupacion, temporada, cabanaPorId, resumenConsulta, pesos } from './tarifas.js';
import { iniciarParallax } from './parallax.js';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const hoy = hoyBA();
const anioActual = Number(hoy.slice(0, 4));
const ocupadas = ocupadasDemo(hoy);

const urlFoto = (id, w, h) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=75&fm=jpg`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ---------- Datos del negocio ---------- */
for (const el of document.querySelectorAll('[data-dato]')) el.textContent = NEGOCIO[el.dataset.dato] ?? '';

/* ---------- Cabañas ---------- */
function renderCabanas() {
  const cont = $('[data-cabanas]');
  cont.innerHTML = CABANAS.map(
    (c) => `
    <article class="cabana-card">
      <div class="cabana-card__foto">
        <img src="${urlFoto(c.foto, 900, 650)}" srcset="${urlFoto(c.foto, 900, 650)} 1x, ${urlFoto(c.foto, 1800, 1300)} 2x" alt="${esc(c.nombre)}" width="900" height="650" loading="lazy" data-parallax="0.07" data-parallax-max="0.09" />
        <span class="cabana-card__respaldo" aria-hidden="true"></span>
      </div>
      <div class="cabana-card__cuerpo">
        <h3>${esc(c.nombre)}</h3>
        <p class="cabana-card__meta">${c.capacidad} ${c.capacidad === 1 ? 'persona' : 'personas'} · ${c.dormitorios} ${c.dormitorios === 1 ? 'dormitorio' : 'dormitorios'}</p>
        <p>${esc(c.desc)}</p>
        <ul class="rasgos">${c.rasgos.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        <p class="cabana-card__precio"><span>Desde</span> <strong>${pesos(c.precios.baja)}</strong> <span>por noche</span></p>
        <a class="boton boton--borde" href="#reservar" data-elegir="${c.id}">Consultar fechas</a>
      </div>
    </article>`
  ).join('');

  for (const img of cont.querySelectorAll('img')) {
    const caer = () => img.closest('.cabana-card__foto').classList.add('cabana-card__foto--sin-foto');
    img.addEventListener('error', caer, { once: true });
    if (img.complete && img.naturalWidth === 0) caer();
  }
}

/* ---------- Banda con foto de fondo ---------- */
function fotoDeFondo() {
  const el = $('[data-foto-fondo]');
  if (!el) return;
  const url = urlFoto(FOTOS[el.dataset.fotoFondo], 1800, 1000);
  const probe = new Image();
  probe.onload = () => {
    el.style.backgroundImage = `url("${url}")`;
    el.classList.add('con-foto');
  };
  probe.src = url;
}

/* ---------- Actividades en columnas que se mueven a distinta velocidad ---------- */
function renderActividades() {
  const velocidades = [-0.05, 0.06, -0.1, 0.03];
  $('[data-actividades]').innerHTML = ACTIVIDADES.map(
    (a, i) => `
    <article class="actividad" data-parallax="${velocidades[i % velocidades.length]}" data-parallax-max="0.1" data-desde="1000">
      <span class="actividad__n" aria-hidden="true">${a.n}</span>
      <h3>${esc(a.titulo)}</h3>
      <p>${esc(a.texto)}</p>
    </article>`
  ).join('');
}

/* ---------- Ocupación ---------- */
function renderOcupacion() {
  const dias = 60;
  $('[data-ocupacion]').innerHTML = CABANAS.map((c) => {
    const tira = tiraOcupacion(ocupadas[c.id], hoy, dias);
    const cuenta = tira.filter(Boolean).length;
    const celdas = tira
      .map((o, i) => `<i class="cel ${o ? 'cel--ocupada' : ''}" title="${formatoCorto(sumarDias(hoy, i), anioActual)}: ${o ? 'ocupada' : 'libre'}"></i>`)
      .join('');
    return `<div class="tira"><span class="tira__nombre">${esc(c.nombre)}</span><div class="tira__celdas" role="img" aria-label="${esc(c.nombre)}: ocupada ${cuenta} de los próximos ${dias} días">${celdas}</div></div>`;
  }).join('');
}

/* ---------- Formulario de consulta ---------- */
const form = $('#form-consulta');
const campo = (n) => form.elements[n];
const salidaResultado = $('[data-resultado]');
let ultimaCotizacion = null;

function minNochesLlegada(llegada) {
  const t = temporada(llegada);
  return t ? TEMPORADAS[t].minimoNoches : 2;
}

/** Primera estadía de 3 noches (o el mínimo de la temporada) libre a partir de dos semanas desde hoy. */
function fechasIniciales(cabanaId) {
  const rangos = ocupadas[cabanaId] ?? [];
  const desde = sumarDias(hoy, 14);
  for (let i = 0; i < 120; i++) {
    const llegada = sumarDias(desde, i);
    const noches = Math.max(3, minNochesLlegada(llegada));
    const libre = siguienteLibre(rangos, llegada, noches, 0);
    if (libre) return libre;
  }
  return { llegada: desde, salida: sumarDias(desde, 3) };
}

function leerFormulario() {
  return {
    cabanaId: campo('cabana').value,
    llegada: campo('llegada').value,
    salida: campo('salida').value,
    huespedes: campo('huespedes').value,
    nombre: campo('nombre').value,
    extras: { desayuno: campo('desayuno').checked, lena: campo('lena').checked, mascota: campo('mascota').checked },
  };
}

function marcarInvalidos(campos) {
  for (const n of ['cabana', 'llegada', 'salida', 'huespedes']) {
    if (campos.includes(n)) campo(n).setAttribute('aria-invalid', 'true');
    else campo(n).removeAttribute('aria-invalid');
  }
}

function ajustarLimites() {
  const c = cabanaPorId(campo('cabana').value);
  if (c) {
    campo('huespedes').max = String(c.capacidad);
  }
  campo('llegada').min = hoy;
  campo('llegada').max = sumarDias(hoy, 365);
  const ll = campo('llegada').value;
  campo('salida').min = ll ? sumarDias(ll, 1) : sumarDias(hoy, 1);
  campo('salida').max = sumarDias(hoy, 400);
}

function renderResultado() {
  ajustarLimites();
  const datos = leerFormulario();
  const c = cotizar({ ...datos, hoy, ocupadas });
  ultimaCotizacion = c;
  marcarInvalidos(c.campos ?? []);

  if (!c.ok) {
    let html = `<div class="resultado__error" role="alert"><h3>Revisá estos datos</h3><ul>${c.errores.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`;
    if (c.sugerencia) {
      const n = diferenciaDias(c.sugerencia.llegada, c.sugerencia.salida);
      html += `<p>La próxima fecha libre para ${n} ${n === 1 ? 'noche' : 'noches'} es del <strong>${formatoCorto(c.sugerencia.llegada, anioActual)}</strong> al <strong>${formatoCorto(c.sugerencia.salida, anioActual)}</strong>.</p><button type="button" class="boton" data-usar-sugerencia="${c.sugerencia.llegada}|${c.sugerencia.salida}">Usar esas fechas</button>`;
    }
    salidaResultado.innerHTML = html + '</div>';
    return;
  }

  const filas = c.desglose
    .map((d) => `<li><span>${d.noches} ${d.noches === 1 ? 'noche' : 'noches'} en ${TEMPORADAS[d.temporada].nombre.toLowerCase()} <small>${pesos(d.precio)} por noche</small></span><span>${pesos(d.subtotal)}</span></li>`)
    .join('');
  const desc = c.descuento ? `<li class="resultado__desc"><span>Descuento por ${c.noches} noches (${c.descuentoPct}%)</span><span>-${pesos(c.descuento)}</span></li>` : '';
  const extras = c.extras.map((e) => `<li><span>${esc(e.nombre)}</span><span>${pesos(e.importe)}</span></li>`).join('');
  salidaResultado.innerHTML = `
    <div class="resultado__ok">
      <p class="resultado__cab">${esc(c.cabana.nombre)} · ${c.noches} ${c.noches === 1 ? 'noche' : 'noches'} · ${c.huespedes} ${c.huespedes === 1 ? 'persona' : 'personas'}</p>
      <ul class="resultado__lista">${filas}${desc}${extras}</ul>
      <p class="resultado__total"><span>Total estimado</span><strong>${pesos(c.total)}</strong></p>
      <p class="resultado__sena">Seña para reservar: ${pesos(c.sena)}</p>
      <button type="button" class="boton" data-copiar>Copiar consulta</button>
      <p class="resultado__aviso" data-aviso aria-live="polite"></p>
    </div>`;
}

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const t = document.createElement('textarea');
    t.value = texto;
    t.setAttribute('readonly', '');
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    t.remove();
    return ok;
  }
}

function iniciarFormulario() {
  campo('cabana').innerHTML = CABANAS.map((c) => `<option value="${c.id}">${esc(c.nombre)} (hasta ${c.capacidad})</option>`).join('');
  const ini = fechasIniciales('pino');
  campo('llegada').value = ini.llegada;
  campo('salida').value = ini.salida;

  form.addEventListener('input', (e) => {
    if (e.target === campo('llegada')) {
      const ll = campo('llegada').value;
      const sa = campo('salida').value;
      if (ll && (!sa || aDias(sa) <= aDias(ll))) campo('salida').value = sumarDias(ll, minNochesLlegada(ll));
    }
    if (e.target === campo('cabana')) {
      const c = cabanaPorId(campo('cabana').value);
      if (c && Number(campo('huespedes').value) > c.capacidad) campo('huespedes').value = String(c.capacidad);
    }
    renderResultado();
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  document.addEventListener('click', (e) => {
    const elegir = e.target.closest('[data-elegir]');
    if (elegir) {
      campo('cabana').value = elegir.dataset.elegir;
      const f = fechasIniciales(elegir.dataset.elegir);
      campo('llegada').value = f.llegada;
      campo('salida').value = f.salida;
      const c = cabanaPorId(elegir.dataset.elegir);
      if (Number(campo('huespedes').value) > c.capacidad) campo('huespedes').value = String(c.capacidad);
      renderResultado();
    }
    const usar = e.target.closest('[data-usar-sugerencia]');
    if (usar) {
      const [ll, sa] = usar.dataset.usarSugerencia.split('|');
      campo('llegada').value = ll;
      campo('salida').value = sa;
      renderResultado();
    }
    if (e.target.closest('[data-copiar]') && ultimaCotizacion?.ok) {
      const d = leerFormulario();
      copiar(resumenConsulta(ultimaCotizacion, d, anioActual)).then((ok) => {
        const aviso = $('[data-aviso]');
        if (aviso) aviso.textContent = ok ? 'Consulta copiada. Pegala en un mensaje.' : 'No pude copiar: seleccioná el resumen y copialo a mano.';
      });
    }
  });
  renderResultado();
}

/* ---------- Menú en pantallas angostas ---------- */
function iniciarMenu() {
  const boton = $('[data-menu-boton]');
  const menu = $('[data-menu]');
  const cerrar = () => {
    menu.classList.remove('menu--abierto');
    boton.setAttribute('aria-expanded', 'false');
  };
  boton.addEventListener('click', () => {
    const abierto = menu.classList.toggle('menu--abierto');
    boton.setAttribute('aria-expanded', String(abierto));
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) cerrar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('menu--abierto')) {
      cerrar();
      boton.focus();
    }
  });
}

renderCabanas();
fotoDeFondo();
renderActividades();
renderOcupacion();
iniciarFormulario();
iniciarMenu();
iniciarParallax();
