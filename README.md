# Japan 2027 — The Countdown

Cuenta atrás para nuestro viaje a Japón: **Osaka · Kyoto · Tokyo**. Primera fase con React, TypeScript y Vite, diseño responsive y paisaje provisional creado con CSS, sin servicios externos.

## Desarrollo local

```sh
npm install
npm run dev
```

Comprobaciones: `npm run lint` y `npm run build`. Para revisar la compilación localmente: `npm run preview`.

## Configuración del viaje

Editar `src/config/trip.ts` para cambiar la fecha, el título, el año, la ruta o el mensaje final. La salida es el **11 de abril de 2027 a las 17:30 de Madrid**, definida por el instante `2027-04-11T17:30:00+02:00`. Mantener un desfase horario explícito y una zona IANA coherente al modificar la fecha.

El cálculo puro está en `src/utils/countdown.ts`; `src/hooks/useCountdown.ts` actualiza la diferencia real con `Date.now()` cada segundo y se detiene al llegar a cero. Al recuperar una pestaña oculta, resincroniza inmediatamente. Solo el mensaje de salida se anuncia mediante una región accesible, sin anuncios cada segundo.

## Próximas fases

- Fotografías rotatorias a pantalla completa: imágenes en `src/assets/photos/`; el fondo actual está aislado en `.landscape`.
- Animaciones de sakura, timeline del itinerario y panel de configuración.
- Configuración y despliegue en GitHub Pages (pendientes; esta fase es exclusivamente local).
