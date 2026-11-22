import { progresoPista, escalaCapa, subidaCapa, factorPantalla, desplazamiento, visible, derivaX, posicionAve, corrimientoPuntero, coberturaX } from './parallax-calc.js';
import { paleta, astros, opacidadEstrellas, opacidadLuz, fase } from './cielo.js';
import { capasEscena, ALTO, ANCHO } from './paisaje.js';

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
  contenedor.innerHTML = capas
    .map((c) => {
      const svg = `<svg class="capa capa--${c.id}" data-capa="${c.id}" viewBox="0 0 ${ANCHO} ${ALTO}" preserveAspectRatio="xMidYMax slice" focusable="false">${c.paths.map((d) => `<path d="${d}"/>`).join('')}${c.caras ? `<path class="cara" d="${c.caras}"/>` : ''}${c.nieve ? `<path class="nieve" d="${c.nieve}"/>` : ''}${c.extra}</svg>`;
      return svg + (niebla[c.id] ?? '');
    })
    .join('');
  const aves = document.createElement('div');
  aves.className = 'aves';
  aves.setAttribute('aria-hidden', 'true');
  aves.innerHTML = Array.from({ length: AVES }, (_, i) => `<svg class="ave" style="--ret:${(i * 0.17).toFixed(2)}s;--esc:${(0.8 + (i % 3) * 0.22).toFixed(2)}" viewBox="0 0 24 10" focusable="false"><path d="M0,6 Q6,-1 12,6 Q18,-1 24,6 Q18,3 12,8 Q6,3 0,6Z"/></svg>`).join('');
  contenedor.before(aves);
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

  if (escena) {
    construirCapas(escena.querySelector('[data-capas]'));
    capasEl = Object.fromEntries([...escena.querySelectorAll('[data-capa]')].map((el) => [el.dataset.capa, el]));
    aves = [...escena.querySelectorAll('.ave')];
    nieblas = [...escena.querySelectorAll('[data-deriva]')].map((el) => ({ el, v: Number(el.dataset.deriva) }));
    textos = [...escena.querySelectorAll('[data-fase]')].map((el) => {
      const [a, b] = el.dataset.fase.split(',').map(Number);
      return { el, a, b };
    });
  }
  const sol = document.querySelector('[data-sol]');
  const luna = document.querySelector('[data-luna]');
  const estrellas = document.querySelector('[data-estrellas]');

  const fotos = [...document.querySelectorAll('[data-parallax]')].map((el) => ({
    el,
    speed: Number(el.dataset.parallax),
    max: el.dataset.parallaxMax ? Number(el.dataset.parallaxMax) : null,
    desde: Number(el.dataset.desde || 0), // ancho mínimo de pantalla para que la capa se mueva
    padre: el.parentElement,
  }));

  const altoEncabezado = () => parseFloat(getComputedStyle(raiz).getPropertyValue('--alto-header')) || 64;

  function pintarEscena(p, scrollY, conMovimiento) {
    if (!escena) return;
    const pal = paleta(p);
    const s = escena.style;
    s.setProperty('--cielo1', pal.cielo1);
    s.setProperty('--cielo2', pal.cielo2);
    s.setProperty('--c-lejos', pal.lejos);
    s.setProperty('--c-medio', pal.medio);
    s.setProperty('--c-bosque', pal.bosque);
    s.setProperty('--c-frente', pal.frente);
    s.setProperty('--c-nieve', pal.nieve);
    for (const [k, v] of Object.entries({ bosqueLuz: pal.bosqueLuz, bosqueSombra: pal.bosqueSombra, frenteLuz: pal.frenteLuz, frenteSombra: pal.frenteSombra, lejosSombra: pal.lejosSombra, medioSombra: pal.medioSombra, cuerpo: pal.cuerpo, techo: pal.techo, borde: pal.borde })) {
      s.setProperty(`--c-${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`, v);
    }
    s.setProperty('--luz-op', opacidadLuz(p).toFixed(3));
    if (estrellas) estrellas.style.opacity = opacidadEstrellas(p).toFixed(3);

    const a = astros(p);
    for (const [el, d] of [[sol, a.sol], [luna, a.luna]]) {
      if (!el) continue;
      el.style.left = `${d.x.toFixed(2)}%`;
      el.style.top = `${d.y.toFixed(2)}%`;
      el.style.opacity = d.op.toFixed(3);
    }

    const alto = escena.clientHeight;
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
      el.style.left = `${d.x.toFixed(2)}%`;
      el.style.top = `${d.y.toFixed(2)}%`;
      el.style.opacity = d.op.toFixed(3);
    });

    for (const n of nieblas) {
      n.el.style.backgroundPositionX = conMovimiento ? `${derivaX(scrollY, n.v * k, 1200).toFixed(1)}px` : '0px';
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
      const p = progresoPista(pista.getBoundingClientRect(), escena.clientHeight, altoEncabezado());
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
      pintarEscena(P_ESTATICO, 0, false);
      return;
    }
    raiz.classList.add('parallax-on');
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    medirTelon();
    pintar();
  }

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
