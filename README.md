# Lenga

Demo de sitio para unas cabañas de montaña ficticias en la Patagonia andina. Es una pieza de portfolio para mostrar qué se puede hacer con una escena animada por scroll y con herramientas de reserva a medida, todo en HTML, CSS y JavaScript sin dependencias.

**Demo:** https://laura-m-stack.github.io/lenga/

## Qué muestra

- **Parallax de escena completa.** Cuatro capas de paisaje (cordillera lejana, cordillera media, bosque y primer plano con una cabaña) que crecen a distinta velocidad mientras se baja, como si el visitante avanzara hacia el bosque. Dos bandas de niebla se deslizan de costado con el scroll.
- **Cielo que pasa del alba a la noche.** El mismo recorrido de scroll cambia la paleta del cielo y de las capas, mueve el sol y la luna, hace aparecer las estrellas y prende la ventana de la cabaña. Tres textos entran y salen en distintos tramos.
- **Columnas a distinta velocidad** en la sección de actividades, **foto con desplazamiento interno** en cada cabaña y en la banda del fogón, y **pie tipo telón** que queda fijo mientras el contenido se levanta.
- **Cotizador de estadías.** Cada noche se cobra con la tarifa de su temporada (baja, media o alta), así que una estadía que cruza de temporada se desglosa. Aplica estadía mínima según la temporada de llegada, descuento por 7 y 14 noches, extras, seña del 30%, capacidad de cada cabaña y un máximo de 21 noches.
- **Disponibilidad.** Si las fechas chocan con una reserva, ofrece la próxima fecha libre con la misma cantidad de noches. Una tira muestra la ocupación de los próximos 60 días.
- Las fechas se calculan en días enteros UTC y "hoy" se toma de Buenos Aires, así que no hay corrimientos por zona horaria ni por horario de verano.

El paisaje no usa imágenes: las siluetas se generan con una semilla fija en `site/js/paisaje.js`, así que siempre se ve igual y no hay nada que descargar.

## Accesibilidad

- Con la preferencia del sistema "reducir movimiento" la página se queda en un cuadro fijo de pleno día, sin zoom ni desplazamientos.
- En pantallas angostas el efecto se atenúa y las columnas de actividades se quedan quietas para que no se pisen.
- Contraste AA en los pares usados, foco visible, objetivos táctiles de al menos 44 px y sin scroll horizontal a 375 px.

## Estructura

```
site/
  index.html
  css/styles.css
  js/
    datos.js          negocio, cabañas, temporadas, extras, actividades
    fecha.js          fechas en días enteros, hoy en Buenos Aires
    tarifas.js        temporada, cotización, disponibilidad, resumen
    cielo.js          paleta, sol, luna, estrellas y fases de texto según el progreso
    paisaje.js        siluetas generadas con semilla
    parallax-calc.js  progreso, zoom, subida, deriva
    parallax.js       conecta el scroll con la escena
    main.js           render, formulario, menú
tests/                45 tests con el runner nativo de Node
```

## Desarrollo

```
npm start    # sirve site/ en http://localhost:4173
npm test     # 45 tests, sin instalar nada
```

La lógica (fechas, tarifas, cielo, paisaje y cálculo del parallax) está separada del DOM y se prueba con `node --test`.

## Fotos

Las fotos de las cabañas y del fogón se cargan desde Unsplash. Si no cargan, se muestra un fondo de respaldo. Créditos en el pie de la página.
