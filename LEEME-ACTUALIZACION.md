# Galadriel — corrección de integración visual y canales

Esta actualización conserva el uso exclusivo de YouTube Data API para avatares, miniaturas, suscriptores y videos. No necesita img/channels ni img/videos. Los videos se abren en YouTube.

## Instalar
Reemplaza las rutas incluidas en el ZIP en la raíz del repositorio music:
- index.html
- css/styles.css
- css/turntable.css
- js/app.js
- js/turntable.js
- data/channels.json

Conserva tus carpetas img/shop, img/turntable, fonts, audio y media. No subas el ZIP como un archivo a la web: descomprímelo y sube su contenido a las rutas correspondientes. Recarga la página con Ctrl+F5 una vez publicado.

## Correcciones
- Suscriptores y vistas abreviados: 850, 1K, 2,8K, 15,4K y 1,2M.
- Orden por suscriptores tanto en Canales como en Escuchar; los canales sin métricas disponibles quedan al final. La selección y el audio actual se mantienen cuando se actualiza el orden.
- Flechas de teclado recorren el mismo orden visible.
- Fondo continuo construido con la superficie de la propia escena de mármol, sin descargar ni añadir otra imagen de fondo.
- Disco y frontal del reproductor coordinados en bronce oscuro; reflejos discretos y surcos espaciados para reducir interferencia visual.
- La API aporta la foto de mayor resolución disponible. El giro se actualiza en el SVG para evitar reescalar una capa rasterizada por CSS. El detalle final depende de la imagen publicada por cada canal.
- Controles anclados a la caja del tocadiscos también en móvil; no hay barra flotante debajo.
- Play, avance y volumen conservan su comportamiento. En pantallas estrechas los controles se compactan para caber en el frontal.

## Comprobaciones
Sintaxis JavaScript y ausencia de referencias a respaldos locales verificadas. Pruebas Chromium en siete tamaños, de 320 a 1920 px de ancho: navegación, orden, formato abreviado, posición del reproductor y ausencia de desbordamiento horizontal. Pruebas de audio con los MP3 existentes. Las pruebas de orden usan respuestas controladas de la API; no se guardan estadísticas de prueba en los archivos entregados.

## Pendientes de contenido anteriores
Faltan las vistas previas de Dark Fantasy, Legends of Rome y Finance Calm. Guardian Angels tenía una imagen de Evanescence: permanece desactivada hasta sustituirla por su imagen correcta. Kawaii Cat Pro no tiene audio configurado. El audio general del estudio no está disponible. Las solicitudes de novedades y productos se hacen por correo.
