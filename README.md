# Japan 2027 — The Countdown

Cuenta atrás para nuestro viaje a Japón: **Osaka · Kyoto · Tokyo**. React, TypeScript y Vite, diseño responsive y fotografías rotatorias con un paisaje CSS como fallback, sin servicios externos.

## Desarrollo local

```sh
npm install
npm run dev
```

Comprobaciones: `npm run lint` y `npm run build`. Para revisar la compilación localmente: `npm run preview`.

Pruebas unitarias del countdown, slideshow e itinerario (Node 24+): `npm test`.

Pruebas E2E: `npm run test:e2e` compila y sirve temporalmente el build de producción en el puerto 4173. Requiere los navegadores Chromium y WebKit de Playwright instalados. Comprueba móviles de 320, 360, 375, 390 y 430 px, tablet de 768 px, escritorio de 1440 px y móvil horizontal de 844 × 390, con tiempo simulado para countdown y rotaciones.

Capturas, trazas de fallos y métricas móviles se guardan en `test-results/`; el informe navegable está en `playwright-report/` (`npx playwright show-report`). Ambos directorios están ignorados por Git. La medición de carga usa Chromium con CPU ×4, latencia de 100 ms y descarga de 1,6 Mbps; es una medición sintética local, no Lighthouse ni una prueba en un teléfono físico. Las áreas seguras y las barras móviles deben comprobarse también en dispositivos reales.

## Configuración del viaje

Editar `src/config/trip.ts` para cambiar la fecha, el título, el año, la ruta o el mensaje final. La salida es el **11 de abril de 2027 a las 17:30 de Madrid**, definida por el instante `2027-04-11T17:30:00+02:00`. Mantener un desfase horario explícito y una zona IANA coherente al modificar la fecha.

El cálculo puro está en `src/utils/countdown.ts`; `src/hooks/useCountdown.ts` actualiza la diferencia real con `Date.now()` cada segundo y se detiene al llegar a cero. Al recuperar una pestaña oculta, resincroniza inmediatamente. Solo el mensaje de salida se anuncia mediante una región accesible, sin anuncios cada segundo.

## Fotografías de fondo

- Colocar las imágenes directamente en `src/assets/photos/`. Formatos: JPG, JPEG, PNG, WebP y AVIF; extensiones en minúsculas o mayúsculas.
- Para añadir o eliminar fotografías, copiar o borrar archivos de esa carpeta. Vite las detecta automáticamente y las ordena por nombre (orden natural: `2` antes que `10`). No es necesario modificar código.
- Configurar `SLIDE_DURATION_MS` (15 segundos) y `TRANSITION_DURATION_MS` (1,5 segundos) en `src/config/slideshow.ts`.
- Se precarga la siguiente imagen; las que no cargan se omiten. Sin fotos válidas se conserva el paisaje CSS; con una sola foto válida no hay rotación. La rotación se pausa en pestañas ocultas y el movimiento reducido desactiva el fundido.
- **Para publicar fotografías nuevas o eliminadas hay que volver a generar y desplegar la web.** Las URLs se generan mediante Vite y respetan su opción `base`. Para GitHub Pages en una subruta, compilar con `npm run build -- --base=/nombre-del-repositorio/` o configurar ese valor en `vite.config.ts` en la fase de despliegue.

## Próximas fases

- La fase de controles y personalización se ha cancelado; no se añadirán controles a la interfaz.
- Configuración y despliegue en GitHub Pages (pendientes; esta fase es exclusivamente local).

## Atmósfera

En `src/config/effects.ts` se ajustan los pétalos (8 en escritorio y 4 en móvil), sus duraciones de caída (14–28 s) y opacidad, la intensidad y el ciclo de la luz ambiental y la duración de entrada del contenido (900 ms). Los efectos usan CSS, se pausan en pestañas ocultas y se desactivan con movimiento reducido. No modifican las fotografías ni la lógica del countdown o del slideshow.

## Nuestro viaje

El botón «Explorar nuestro viaje» abre el itinerario en un diálogo accesible, con cierre mediante Escape y desplazamiento interno. Las estancias, excursiones y vuelos se editan en `src/config/itinerary.ts`; la salida reutiliza la fecha del countdown. Las horas se muestran en su zona local y el resumen se calcula a partir de las estancias.
