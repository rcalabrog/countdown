# The Countdown

Test project for a countdown page.

## Despliegue en GitHub Pages

URL prevista: **https://rcalabrog.github.io/countdown/**. La base de producción es `/countdown/`, correspondiente al repositorio `rcalabrog/countdown`. El servidor de desarrollo conserva `/`; `npm run build` y `npm run preview` usan la subruta (preview: `http://localhost:4173/countdown/`). Se recomienda Node.js 24 LTS y `npm ci` para instalar lo fijado en `package-lock.json`.

1. Revisar y subir manualmente estos cambios a `main`. Verificar antes `git remote -v`: el nombre anterior `japon-2027-countdown` redirige actualmente a `countdown`; se puede actualizar el remoto local manualmente a `https://github.com/rcalabrog/countdown.git`.
2. En GitHub, seleccionar **Settings → Pages → Build and deployment → Source → GitHub Actions**. El repositorio debe permitir Actions y disponer de Pages (público con GitHub Free, o un plan que admita Pages para repositorios privados). No es necesario cambiar su visibilidad: actualmente es público.
3. Cada push a `main` ejecuta `.github/workflows/deploy.yml`: `npm ci`, lint, tests unitarios y build. Solo si todo pasa se publica `dist/`, usando el environment `github-pages`, sin tokens personales ni rama `gh-pages`. Los despliegues se serializan; no se interrumpe uno activo.
4. Para ejecución manual: **Actions → Deploy to GitHub Pages → Run workflow → main**. Revisar los pasos y errores en esa misma pestaña; el job de despliegue muestra la URL final cuando termina correctamente. Respetar las aprobaciones de `github-pages` si se han configurado en el repositorio.

Para publicar nuevas fotografías, añadir o eliminar archivos de `src/assets/photos/`, revisarlos, y subir los cambios a `main`: Vite regenera sus URLs automáticamente. Todas esas imágenes se harán públicas; no incluir fotos privadas ni documentos de reservas. No se necesitan archivos `.env` ni secretos para este proyecto.

Playwright permanece disponible localmente con `npm run test:e2e` (Chromium y WebKit instalados); no se ejecuta en cada despliegue. Las pruebas usan el build de producción bajo `/countdown/`. El workflow solo estará publicado y operativo después de que subas los cambios y completes la configuración de GitHub.

Referencias: [Vite: GitHub Pages](https://vite.dev/guide/static-deploy#github-pages), [GitHub: workflows para Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
