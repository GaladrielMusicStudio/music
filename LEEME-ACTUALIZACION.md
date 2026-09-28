# Galadriel Music Studio — revisión del 28 de septiembre de 2026

## Publicación
Descomprime el ZIP. Copia el CONTENIDO de `galadriel-integrado` en la raíz del repositorio `music`, donde está el `index.html` actual. No crees una segunda carpeta `galadriel-integrado` dentro de la web. Sube también `css`, `js`, `data`, `fonts`, `img`, `audio` y `media`. Conserva los recursos adicionales que ya tengas en el repositorio. Después de publicarse, recarga con Ctrl+F5.

El sitio carga JSON y está pensado para un servidor web/GitHub Pages. Abrir index.html directamente con file:// no reproduce el funcionamiento real.

## Cambios
- Una sola hoja general de estilos; retiradas las versiones antiguas del tocadiscos que se contradecían.
- Composición fluida, sin altura fija que recorte el contenido; scroll natural cuando sea necesario.
- Canal, avatar, tocadiscos y botón agrupados; controles sobre la caja en escritorio y ampliados debajo en móvil para poder tocarlos.
- Mármol crema, carbón cálido y dorado apagado en todas las vistas, incluida Privacidad y 404.
- Tipografías y siete avatares incluidos localmente; 28 miniaturas de respaldo.
- Reproductor conserva su nodo al actualizar estadísticas; pausa al cambiar de sección.
- Giro con aceleración/frenado, brazo con pivote fijo y respeto de movimiento reducido.
- Escuchar ordena canales por suscriptores y videos por vistas; recorre las páginas del catálogo y muestra duración. No añade números de ranking.
- Navegación con fragmentos de URL y botón Atrás; estados de foco y etiquetas de controles.
- Estudio con composición editorial y contacto real por correo.
- Tienda con selección de formato, consulta por correo y ampliación de vistas previas disponibles. Se conserva la información y precios anteriores; no se ha inventado un sistema de pago.

## Verificación
Pruebas Chromium en 1920×1080, 1440×900, 1366×768, 1024×768, 820×900, 390×844 y 320×640, sobre las cuatro secciones principales. Sin desbordamiento horizontal en esos tamaños ni solapamiento del título del canal con la escena.
Probados reproducción/pausa, avance, volumen, conservación del audio, panel del canal, cambio de sección, Atrás y cambio de formato de tienda. Pruebas realizadas con MP3 reales recuperados de la web publicada.
Orden y paginación de YouTube probados con respuestas controladas. Consulta real de metadatos de los siete canales: HTTP 200. Esto no equivale a verificar el despliegue final en tu GitHub Pages ni todos los navegadores.
Inspección visual de escritorio y móvil y revisión de Privacidad/404. Sin errores de ejecución de JavaScript en esas pruebas.

## Recursos pendientes
- No estaban en el paquete ni en las rutas publicadas consultadas las vistas previas de Dark Fantasy, Legends of Rome y Finance Calm.
- Las imágenes publicadas bajo guardian-angels muestran Evanescence; se conservaron los archivos, pero se desactivó su presentación mediante previewEnabled:false en la configuración. Para activarlas, coloca las imágenes correctas y cambia ese campo a true.
- Debes confirmar que las vistas previas, cantidades, precios, licencias y plazos corresponden a los productos reales antes de aceptar pagos. No se han creado productos ni condiciones ficticias.
- Kawaii Cat Pro no tiene audio configurado. El audio general del estudio tampoco estaba disponible. El sitio omite o desactiva esos reproductores.
- El formulario anterior tenía TU_ID_FORMSPREE. Se reemplazó por solicitud mediante la aplicación de correo. Para una suscripción automática se necesita configurar un servicio real.
- Las estadísticas públicas y videos dependen de YouTube. Si falla, se muestra selección del canal sin métricas inventadas.

La clave de YouTube se conserva en la configuración del sitio estático. Debe seguir restringida al dominio autorizado y a YouTube Data API v3; en una web estática no es una credencial oculta.
