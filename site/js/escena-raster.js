/**
 * Dibuja cada capa del paisaje una sola vez como imagen, una por momento clave del día.
 * Durante el scroll solo se mueven y se funden esas imágenes (transform y opacity), que el navegador resuelve
 * en la placa de video sin volver a dibujar ni un árbol. Es lo que hace que el parallax vaya fluido.
 */
import { ANCHO, ALTO } from './paisaje.js';
import { paleta, opacidadLuz } from './cielo.js';

// Colores de cada capa. Son las mismas reglas de siempre, pero viven dentro de cada imagen.
const ESTILO = `
.capa--lejos { } .capa--lejos path { fill: var(--c-lejos); } .capa--lejos .cara { fill: var(--c-lejos-sombra); } .capa--lejos .nieve { fill: var(--c-nieve); }
.capa--medio { } .capa--medio path { fill: var(--c-medio); } .capa--medio .cara { fill: var(--c-medio-sombra); }
.capa--bosque {
  --t-c: var(--c-bosque); --t-luz: var(--c-bosque-luz); --t-sombra: var(--c-bosque-sombra); --t-brillo: var(--c-bosque-brillo);
  --t-tronco: #3b3a2e; --t-tronco: color-mix(in srgb, var(--c-bosque) 45%, #5a4330);
  --t-tronco-luz: color-mix(in srgb, var(--t-tronco) 55%, var(--c-bosque-luz));
  --ga1: color-mix(in srgb, var(--c-bosque-luz) 65%, var(--c-bosque)); --ga2: var(--c-bosque); --ga3: color-mix(in srgb, var(--c-bosque-sombra) 45%, var(--c-bosque));
  --gb1: var(--c-bosque); --gb2: color-mix(in srgb, var(--c-bosque-sombra) 35%, var(--c-bosque)); --gb3: var(--c-bosque-sombra);
  --go1: var(--c-otono-brillo); --go2: var(--c-otono); --go3: var(--c-otono-sombra);
  --fa: url(#bosque-ga); --fb: url(#bosque-gb); --fo: url(#bosque-go);
}
.capa--bosque path { fill: var(--c-bosque); }
.capa--frente {
  --t-c: var(--c-frente); --t-luz: var(--c-frente-luz); --t-sombra: var(--c-frente-sombra); --t-brillo: var(--c-frente-brillo);
  --t-tronco: #3a3a2c; --t-tronco: color-mix(in srgb, var(--c-frente) 40%, #6a4a32);
  --t-tronco-luz: color-mix(in srgb, var(--t-tronco) 50%, var(--c-frente-luz));
  --ga1: color-mix(in srgb, var(--c-frente-luz) 70%, var(--c-frente)); --ga2: var(--c-frente); --ga3: color-mix(in srgb, var(--c-frente-sombra) 50%, var(--c-frente));
  --gb1: var(--c-frente); --gb2: color-mix(in srgb, var(--c-frente-sombra) 40%, var(--c-frente)); --gb3: var(--c-frente-sombra);
  --go1: var(--c-otono-brillo); --go2: var(--c-otono); --go3: var(--c-otono-sombra);
  --fa: url(#frente-ga); --fb: url(#frente-gb); --fo: url(#frente-go);
}
.capa--frente .suelo { fill: var(--c-frente); }
.c { fill: var(--fa); }
.c.b { fill: var(--fb); }
.c.o { fill: var(--fo); }
.luz { fill: var(--t-brillo); }
.sombra { fill: var(--t-sombra); }
.tronco { fill: var(--t-tronco); }
.tl { fill: var(--t-tronco-luz); }
.luz.o { fill: var(--c-otono-luz); }
.sombra.o { fill: var(--c-otono-sombra); }
.tronco.o { fill: var(--t-tronco); }
.tl.o { fill: var(--t-tronco-luz); }
.capa--frente .cabana__cuerpo { fill: var(--c-cuerpo); }
.capa--frente .cabana__chimenea { fill: color-mix(in srgb, var(--c-cuerpo) 55%, #6b6f6a); }
.capa--frente .cabana__remate { fill: var(--c-techo); }
.capa--frente .cabana__techo { fill: var(--c-techo); }
.capa--frente .cabana__teja { fill: #000; opacity: 0.32; }
.capa--frente .cabana__borde { fill: none; stroke: var(--c-borde); stroke-width: 3.2; stroke-linejoin: round; stroke-linecap: round; opacity: 0.9; }
.capa--frente .cabana__puerta { fill: color-mix(in srgb, var(--c-cuerpo) 35%, #000); }
.capa--frente .cabana__veta { fill: #000; opacity: 0.3; }
.capa--frente .cabana__punta { fill: color-mix(in srgb, var(--c-cuerpo) 84%, #000); }
.capa--frente .cabana__base { fill: color-mix(in srgb, var(--c-cuerpo) 30%, #55595a); }
.capa--frente .cabana__deck { fill: color-mix(in srgb, var(--c-cuerpo) 80%, #000); }
.capa--frente .cabana__lenia { fill: color-mix(in srgb, var(--c-cuerpo) 72%, #b98a58); stroke: color-mix(in srgb, var(--c-cuerpo) 45%, #000); stroke-width: 1.2; }
.capa--frente .cabana__marco, .capa--frente .cabana__ventana-base { fill: #141c26; }
.capa--frente .cabana__ventana { fill: var(--luz); opacity: var(--luz-op); filter: drop-shadow(0 0 14px rgba(255, 184, 107, 0.9)); }
.capa--frente .cabana__farol { fill: var(--luz); opacity: var(--luz-op); filter: drop-shadow(0 0 8px rgba(255, 184, 107, 0.95)); }
.capa--frente .cabana__pozo { fill: var(--luz); opacity: calc(var(--luz-op) * 0.22); }
`;

const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

/** Las variables de color de un momento del día, como CSS para la raíz de la imagen. */
export function variablesMomento(p) {
  const pal = paleta(p);
  const decl = Object.entries(pal)
    .filter(([k]) => k !== 'cielo1')
    .map(([k, v]) => `--c-${kebab(k)}:${v}`);
  decl.push('--luz:#ffb86b', `--luz-op:${opacidadLuz(p).toFixed(3)}`);
  return `svg{${decl.join(';')}}`;
}

/** El SVG completo de una capa en un momento del día, listo para convertirse en imagen. */
export function svgCapa(capa, p, w, h) {
  const caras = capa.caras
    ? `<clipPath id="recorte-${capa.id}"><path d="${capa.paths[0]}"/></clipPath><path class="cara" clip-path="url(#recorte-${capa.id})" d="${capa.caras}"/>`
    : '';
  const nieve = capa.nieve ? `<path class="nieve" d="${capa.nieve}"/>` : '';
  const cuerpo = capa.paths.map((d) => `<path d="${d}"/>`).join('') + caras + nieve + capa.extra;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="capa--${capa.id}" width="${w}" height="${h}" viewBox="0 0 ${ANCHO} ${ALTO}" preserveAspectRatio="xMidYMax slice">` +
    `<style>${variablesMomento(p)}${ESTILO}</style>${cuerpo}</svg>`
  );
}

/** Convierte un SVG en una imagen (URL de un blob). Devuelve null si el navegador no pudo. */
export async function rasterizar(svg, w, h) {
  const fuente = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = fuente;
    await img.decode();
    const lienzo = document.createElement('canvas');
    lienzo.width = w;
    lienzo.height = h;
    lienzo.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await new Promise((ok) => lienzo.toBlob(ok, 'image/webp', 0.9));
    lienzo.width = lienzo.height = 0; // libera la memoria del lienzo enseguida
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(fuente);
  }
}
