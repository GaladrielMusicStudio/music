# Tocadiscos integrado

Esta versión incorpora el tocadiscos en la portada de la web existente.

## Para actualizar tu repositorio

Copia el contenido del ZIP en la raíz del proyecto, conservando las carpetas y los MP3 que ya tengas en el repositorio. Las rutas de audio siguen siendo las de `data/channels.json`. Para probarlo desde tu computadora, abre una terminal en la raíz del proyecto y ejecuta `py -m http.server 8000`; luego visita `http://localhost:8000`. Abrir `index.html` con doble clic bloquea la lectura del JSON y deja la portada sin sus controles.

Archivos originales modificados:
- `index.html`: sustituye el vinilo de portada y carga el componente nuevo.
- `js/app.js`: conecta los controles frontales y conserva el audio durante las actualizaciones del canal.

Archivos nuevos:
- `css/turntable.css`
- `js/turntable.js`
- `img/turntable/` (tres imágenes)

`css/styles.css`, los datos JSON, las páginas auxiliares, el vídeo de introducción y el resto de archivos originales se conservan sin cambios.

## Comportamiento

Play/Pausa, posición y volumen controlan el mismo audio del canal. El giro y el brazo responden a su reproducción, pausa, finalización y errores. El botón Ver canal y el disco conservan la apertura del panel. El canal seleccionado puede mostrar su avatar en la etiqueta central.

## Comprobaciones realizadas

- Sintaxis de ambos archivos JavaScript.
- Pruebas de lógica con eventos de audio simulados: reproducción, pausa, avance, volumen, duración, finalización, error y canal sin audio.
- Conservación del reproductor al actualizar datos o abrir el panel; reemplazo al cambiar de canal.
- Revisión renderizada del componente a tamaño de escritorio y móvil.
- Comparación de los archivos originales para verificar que solo cambiaron `index.html` y `js/app.js`.

El ZIP recibido no incluía archivos MP3. No se ha probado reproducción sonora real ni la página completa en un navegador. Para probarla, usa tu alojamiento web con los MP3 disponibles; abrir `index.html` con `file://` puede impedir la carga del JSON.
