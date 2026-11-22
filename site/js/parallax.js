import { progresoPista, escalaCapa, subidaCapa, factorPantalla, desplazamiento, visible, derivaX, posicionAve, corrimientoPuntero, coberturaX, tramo, tamanoRaster, puntoEnCaja } from './parallax-calc.js';
import { paleta, astros, opacidadEstrellas, fase, PUNTOS_CLAVE } from './cielo.js';
import { capasEscena, ALTO, ANCHO } from './paisaje.js';
import { svgCapa, rasterizar } from './escena-raster.js';

// Cuánto sube y cuánto crece cada capa hasta el final del recorrido. Las cercanas crecen más: es el efecto de avanzar hacia el bosque.
const CAPAS = {
  lejos: { sube: 0.03, zoom: 1.05 },
  medio: { sube: 0.05, zoom: 1.14 },
  bosque: { sube: 0.05, zoom: 1.34 },
  frente: { sube: 0, zoom: 1.75 },
};
// Cuántos px se corre cada capa con el mouse (las cercanas más): la escena tiene profundidad también sin scrollear.
const PUNTERO = { lejos: 5, medio: 11, bosque: 24, frente: 46 };
const AVES = 4;
const P_ESTATICO = 0.35; // pleno día: el cuadro que se ve si no hay movimiento

function construirCapas(contenedor) {
  const capas = capasEscena();
  const niebla = { lejos: '<div class="niebla niebla--a" data-deriva="0.10"></div>', medio: '<div class="niebla niebla--b" data-deriva="0.2"></div>' };
  const imgs = PUNTOS_CLAVE.map((_, k) => `<img class="capa__img" data-k="${k}" alt="" hidden>`).join('');
  contenedor.innerHTML = capas
    .map((c) => {
      const humo = c.humo ? '<div class="humo" data-humo><i></i><i></i><i></i></div>' : '';
      return `<div class="capa capa--${c.id}" data-capa="${c.id}">${imgs}${humo}</div>` + (niebla[c.id] ?? '');
    })
    .join('');
  const aves = document.createElement('div');
  aves.className = 'aves';
  aves.setAttribute('aria-hidden', 'true');
  aves.innerHTML = Array.from({ length: AVES }, (_, i) => `<svg class="ave" style="--ret:${(i * 0.17).toFixed(2)}s;--esc:${(0.8 + (i % 3) * 0.22).toFixed(2)}" viewBox="0 0 24 10" focusable="false"><path d="M0,6 Q6,-1 12,6 Q18,-1 24,6 Q18,3 12,8 Q6,3 0,6Z"/></svg>`).join('');
  contenedor.before(aves);
  return capas;
}

/** Un degradado de cielo por momento clave; durante el scroll solo cambia su opacidad. */
function construirCielo(cielo) {
  if (!cielo) return [];
  cielo.innerHTML = PUNTOS_CLAVE.map((p) => {
    const pal = paleta(p);
    return `<div class="cielo__k" style="background:linear-gradient(to bottom, ${pal.cielo1}, ${pal.cielo2} 82%)" hidden></div>`;
  }).join('');
  return [...cielo.children];
}

/** Muestra el momento i entero y el siguiente encima con opacidad t. Solo toca el DOM si algo cambió. */
function fundir(els, i, t, listo = () => true) {
  // si una imagen todavía no está lista, se usa la más cercana que sí lo esté
  const disponible = (k) => {
    for (let d = 0; d < els.length; d++) {
      for (const c of [k - d, k + d]) if (c >= 0 && c < els.length && listo(els[c])) return c;
    }
    return -1;
  };
  const a = disponible(i);
  const b = t > 0.001 && listo(els[i + 1]) && i + 1 !== a ? i + 1 : -1;
  els.forEach((el, k) => {
    const ver = k === a || k === b;
    if (el.hidden === ver) el.hidden = !ver;
    if (!ver) return;
    const op = k === b ? t.toFixed(3) : '1';
    if (el.style.opacity !== op) el.style.opacity = op;
  });
}

export function iniciarParallax() {
  const raiz = document.documentElement;
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)');

  const pista = document.querySelector('[data-pista]');
  const escena = document.querySelector('[data-escena]');
  const pie = document.querySelector('[data-pie]');
  let capasEl = {};
  let textos = [];
  let nieblas = [];
  let aves = [];
  const punt = { x: 0, tx: 0, anim: false };
  const finoPuntero = window.matchMedia('(hover: hover) and (pointer: fine)');

  let capasDatos = [];
  let cielos = [];
  const imgsDe = {};
  const listo = (img) => img?.dataset.listo === '1';
  let medidas = { ancho: 0, alto: 0, header: 64 };
  let generacion = 0; // cambia al redimensionar: descarta imágenes que se estaban dibujando con el tamaño viejo

  if (escena) {
    capasDatos = construirCapas(escena.querySelector('[data-capas]'));
    cielos = construirCielo(escena.querySelector('.cielo'));
    capasEl = Object.fromEntries([...escena.querySelectorAll('[data-capa]')].map((el) => [el.dataset.capa, el]));
    for (const [id, el] of Object.entries(capasEl)) imgsDe[id] = [...el.querySelectorAll('.capa__img')];
    aves = [...escena.querySelectorAll('.ave')];
    nieblas = [...escena.querySelectorAll('[data-deriva]')].map((el) => ({ el, v: Number(el.dataset.deriva) }));
    textos = [...escena.querySelectorAll('[data-fase]')].map((el) => {
      const [a, b] = el.dataset.fase.split(',').map(Number);
      return { el, a, b };
    });
  }
  const sol = document.querySelector('[data-sol]');
  const luna = document.querySelector('[data-luna]');
  // con JS, los astros se ubican con translate (no mueve el layout); left/top quedan solo para cuando no hay JS
  for (const el of [sol, luna]) if (el) Object.assign(el.style, { left: '0', top: '0' });
  const estrellas = document.querySelector('[data-estrellas]');

  const fotos = [...document.querySelectorAll('[data-parallax]')].map((el) => ({
    el,
    speed: Number(el.dataset.parallax),
    max: el.dataset.parallaxMax ? Number(el.dataset.parallaxMax) : null,
    desde: Number(el.dataset.desde || 0), // ancho mínimo de pantalla para que la capa se mueva
    padre: el.parentElement,
  }));

  function medir() {
    medidas = {
      ancho: escena ? escena.clientWidth : window.innerWidth,
      alto: escena ? escena.clientHeight : window.innerHeight,
      header: parseFloat(getComputedStyle(raiz).getPropertyValue('--alto-header')) || 64,
    };
  }

  /** Dibuja las imágenes de las capas: primero las del momento que se está viendo, después el resto, de a una. */
  async function dibujarCapas(pInicial) {
    const gen = ++generacion;
    const { i } = tramo(pInicial, PUNTOS_CLAVE);
    const orden = [...new Set([i, i + 1, ...PUNTOS_CLAVE.keys()])].filter((k) => k < PUNTOS_CLAVE.length);
    const k = factorPantalla(window.innerWidth);
    for (const kf of orden) {
      for (const capa of capasDatos) {
        if (gen !== generacion) return;
        const el = capasEl[capa.id];
        const img = imgsDe[capa.id]?.[kf];
        if (!el || !img) continue;
        const zoom = 1 + ((CAPAS[capa.id]?.zoom ?? 1) - 1) * k;
        const { w, h } = tamanoRaster(el.offsetWidth, el.offsetHeight, window.devicePixelRatio, zoom);
        if (!w || !h) continue;
        const url = await rasterizar(svgCapa(capa, PUNTOS_CLAVE[kf], w, h), w, h);
        if (gen !== generacion) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        if (!url) continue;
        const vieja = img.dataset.url;
        img.src = url;
        img.dataset.url = url;
        await img.decode().catch(() => {});
        img.dataset.listo = '1';
        if (vieja) URL.revokeObjectURL(vieja);
        pedir();
        await new Promise((r) => setTimeout(r, 0)); // deja respirar al scroll entre imagen e imagen
      }
    }
  }

  /** El humo sale de la chimenea: su lugar depende del tamaño de la capa del frente. */
  function ubicarHumo() {
    const capa = capasDatos.find((c) => c.humo);
    const el = capa && capasEl[capa.id];
    const humo = el?.querySelector('[data-humo]');
    if (!humo) return;
    const pt = puntoEnCaja(el.offsetWidth, el.offsetHeight, ANCHO, ALTO, capa.humo.x, capa.humo.y);
    humo.style.left = `${pt.x.toFixed(1)}px`;
    humo.style.top = `${pt.y.toFixed(1)}px`;
  }

  function pintarEscena(p, scrollY, conMovimiento) {
    if (!escena) return;
    const { i: ti, t: tt } = tramo(p, PUNTOS_CLAVE);
    fundir(cielos, ti, tt);
    for (const id of Object.keys(capasEl)) fundir(imgsDe[id], ti, tt, listo);
    if (estrellas) estrellas.style.opacity = opacidadEstrellas(p).toFixed(3);

    const a = astros(p);
    for (const [el, d] of [[sol, a.sol], [luna, a.luna]]) {
      if (!el) continue;
      el.style.translate = `calc(${((d.x / 100) * medidas.ancho).toFixed(1)}px - 50%) calc(${((d.y / 100) * medidas.alto).toFixed(1)}px - 50%)`;
      el.style.opacity = d.op.toFixed(3);
    }

    const alto = medidas.alto;
    const k = factorPantalla(window.innerWidth);
    const conPuntero = conMovimiento && finoPuntero.matches;
    for (const [id, cfg] of Object.entries(CAPAS)) {
      const el = capasEl[id];
      if (!el) continue;
      if (!conMovimiento) {
        el.style.transform = '';
        continue;
      }
      const y = subidaCapa(p, cfg.sube * k, alto);
      const amp = conPuntero ? PUNTERO[id] : 0;
      const sc = escalaCapa(p, 1 + (cfg.zoom - 1) * k) * coberturaX(amp, window.innerWidth);
      const x = corrimientoPuntero(punt.x, amp);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
    }

    aves.forEach((el, i) => {
      if (!conMovimiento) return;
      const d = posicionAve(p, i);
      if (d.op < 0.01) {
        if (el.style.opacity !== '0') el.style.opacity = '0';
        return;
      }
      el.style.translate = `${((d.x / 100) * medidas.ancho).toFixed(1)}px ${((d.y / 100) * medidas.alto).toFixed(1)}px`;
      el.style.opacity = d.op.toFixed(3);
    });

    const opNiebla = (1 - 0.65 * opacidadEstrellas(p)).toFixed(3);
    for (const n of nieblas) {
      n.el.style.transform = conMovimiento ? `translate3d(${derivaX(scrollY, n.v * k, 1200).toFixed(1)}px, 0, 0)` : '';
      n.el.style.opacity = opNiebla;
    }

    textos.forEach((t, i) => {
      if (!conMovimiento) {
        t.el.style.opacity = '';
        t.el.style.transform = '';
        t.el.style.visibility = i === 0 ? '' : 'hidden';
        return;
      }
      const f = fase(p, t.a, t.b);
      t.el.style.opacity = f.op.toFixed(3);
      t.el.style.transform = `translate3d(0, ${f.y.toFixed(1)}px, 0)`;
      t.el.style.visibility = f.op < 0.02 ? 'hidden' : 'visible';
    });
  }

  let pendiente = false;

  function pintar() {
    pendiente = false;
    const vh = window.innerHeight;
    const k = factorPantalla(window.innerWidth);

    if (escena && pista) {
      const p = progresoPista(pista.getBoundingClientRect(), medidas.alto, medidas.header);
      pintarEscena(p, window.scrollY, true);
    }
    for (const c of fotos) {
      if (window.innerWidth < c.desde) {
        c.el.style.transform = '';
        continue;
      }
      const rect = c.padre.getBoundingClientRect();
      if (!visible(rect, vh)) continue;
      const max = c.max == null ? Infinity : c.max * rect.height;
      c.el.style.transform = `translate3d(0, ${desplazamiento(rect, vh, c.speed * k, max).toFixed(1)}px, 0)`;
    }
  }

  function pedir() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(pintar);
  }

  function medirTelon() {
    if (!pie) return;
    const cabe = pie.offsetHeight < window.innerHeight * 0.7;
    // El pie queda fijo detrás y el contenido se desliza encima, como un telón que se levanta.
    raiz.classList.toggle('telon', cabe && !reducir.matches);
    raiz.style.setProperty('--alto-pie', `${pie.offsetHeight}px`);
  }

  function activar() {
    if (reducir.matches) {
      raiz.classList.remove('parallax-on', 'telon');
      window.removeEventListener('scroll', pedir);
      window.removeEventListener('resize', pedir);
      for (const c of fotos) c.el.style.transform = '';
      medir();
      ubicarHumo();
      pintarEscena(P_ESTATICO, 0, false);
      if (escena) dibujarCapas(P_ESTATICO);
      return;
    }
    raiz.classList.add('parallax-on');
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    medirTelon();
    medir();
    ubicarHumo();
    pintar();
    if (escena && pista) dibujarCapas(progresoPista(pista.getBoundingClientRect(), medidas.alto, medidas.header));
  }

  // Al cambiar el tamaño (girar el celular, achicar la ventana) se vuelven a dibujar las capas, una sola vez al final.
  let espera = 0;
  let tamanoDibujado = { w: window.innerWidth, h: window.innerHeight };
  window.addEventListener('resize', () => {
    medir();
    ubicarHumo();
    pedir();
    clearTimeout(espera);
    espera = setTimeout(() => {
      const cambio = Math.abs(window.innerWidth - tamanoDibujado.w) / tamanoDibujado.w > 0.15 || Math.abs(window.innerHeight - tamanoDibujado.h) / tamanoDibujado.h > 0.25;
      if (!cambio || !escena) return;
      tamanoDibujado = { w: window.innerWidth, h: window.innerHeight };
      const p = reducir.matches ? P_ESTATICO : progresoPista(pista.getBoundingClientRect(), medidas.alto, medidas.header);
      dibujarCapas(p);
    }, 350);
  });

  function heroVisible() {
    if (!pista) return false;
    const r = pista.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  function seguirPuntero() {
    punt.x += (punt.tx - punt.x) * 0.09;
    if (Math.abs(punt.tx - punt.x) < 0.002) {
      punt.x = punt.tx;
      punt.anim = false;
    } else {
      requestAnimationFrame(seguirPuntero);
    }
    if (heroVisible()) pintar();
  }

  function moverPuntero(e) {
    if (e.pointerType !== 'mouse' || !finoPuntero.matches || !raiz.classList.contains('parallax-on') || !heroVisible()) return;
    punt.tx = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth - 0.5) * 2));
    if (!punt.anim) {
      punt.anim = true;
      requestAnimationFrame(seguirPuntero);
    }
  }

  function soltarPuntero() {
    punt.tx = 0;
    if (!punt.anim && punt.x !== 0) {
      punt.anim = true;
      requestAnimationFrame(seguirPuntero);
    }
  }

  window.addEventListener('pointermove', moverPuntero, { passive: true });
  document.documentElement.addEventListener('pointerleave', soltarPuntero);
  window.addEventListener('resize', medirTelon);
  reducir.addEventListener('change', activar);
  activar();
}
