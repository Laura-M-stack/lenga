/** Datos de ejemplo del negocio ficticio. Los precios son por noche, en pesos argentinos. */
export const NEGOCIO = {
  nombre: 'Lenga',
  lema: 'Cabañas de montaña',
  zona: 'Patagonia andina',
  direccion: 'Ruta 40, km 2085 (a 12 km del pueblo)',
  telefono: '+54 9 11 5555-0142',
  instagram: '@lenga.cabanas.demo',
  checkIn: '14:00 a 20:00',
  checkOut: 'hasta las 10:00',
  repo: 'https://github.com/Laura-M-stack/lenga',
};

export const CABANAS = [
  {
    id: 'pino',
    nombre: 'Cabaña Pino',
    capacidad: 2,
    dormitorios: 1,
    foto: '1637687222430-ca092fb9062a',
    desc: 'La más íntima: una cama grande, hogar a leña y un deck entre los árboles.',
    rasgos: ['Hogar a leña', 'Deck con reposeras', 'Cocina equipada'],
    precios: { baja: 68000, media: 92000, alta: 130000 },
  },
  {
    id: 'lago',
    nombre: 'Cabaña Lago',
    capacidad: 4,
    dormitorios: 2,
    foto: '1784552562846-9584b2afdcde',
    desc: 'Ventanales hacia la cordillera, dos dormitorios y una galería para el atardecer.',
    rasgos: ['Vista a la cordillera', 'Calefacción central', 'Galería cerrada'],
    precios: { baja: 98000, media: 132000, alta: 185000 },
  },
  {
    id: 'cumbre',
    nombre: 'Cabaña Cumbre',
    capacidad: 6,
    dormitorios: 3,
    foto: '1663770260249-8c596c3ae71c',
    desc: 'Para ir en grupo o en familia: tres dormitorios, quincho y parrilla propia.',
    rasgos: ['Quincho con parrilla', 'Tres dormitorios', 'Hogar y estufa'],
    precios: { baja: 140000, media: 188000, alta: 260000 },
  },
];

export const TEMPORADAS = {
  baja: { nombre: 'Temporada baja', detalle: 'abril, mayo, junio y septiembre', minimoNoches: 2 },
  media: { nombre: 'Temporada media', detalle: 'marzo, julio (salvo vacaciones), agosto, octubre, noviembre y hasta el 14 de diciembre', minimoNoches: 2 },
  alta: { nombre: 'Temporada alta', detalle: 'del 15 de diciembre al 28 de febrero y vacaciones de invierno (12 al 25 de julio)', minimoNoches: 4 },
};

export const EXTRAS = {
  desayuno: { nombre: 'Desayuno de campo', precio: 6500, porPersonaPorNoche: true },
  lena: { nombre: 'Leña extra (un metro)', precio: 12000, porPersonaPorNoche: false },
  mascota: { nombre: 'Mascota chica (una por estadía)', precio: 10000, porPersonaPorNoche: false },
};

export const MAX_NOCHES = 21;
export const PORCENTAJE_SENA = 0.3;
export const DESCUENTOS = [
  { desdeNoches: 14, pct: 15 },
  { desdeNoches: 7, pct: 10 },
];

export const ACTIVIDADES = [
  { n: '01', titulo: 'Caminatas al mirador', texto: 'Senderos entre lengas y ñires, con salida desde la puerta de cada cabaña. Dos horas de ida y vuelta.' },
  { n: '02', titulo: 'Kayak en el lago', texto: 'Salidas guiadas por la mañana, con equipo incluido, cuando el viento todavía no se levantó.' },
  { n: '03', titulo: 'Cabalgata al atardecer', texto: 'Por la estepa hasta el cerro de enfrente, con paradas para las fotos y mate caliente.' },
  { n: '04', titulo: 'Cielo de estrellas', texto: 'Sin luces cerca. Prestamos telescopio y mantas para mirar la Vía Láctea desde el deck.' },
];

export const FOTOS = {
  fogon: '1543393470-b2c833b98dce',
};
