# Tocadiscos premium — actualización

Cambios aplicados al hero de Canales:

- El tocadiscos ahora ocupa mayor protagonismo dentro de la composición.
- Se eliminó `mix-blend-mode:multiply`, que apagaba el oro y el mármol.
- El vinilo SVG artificial fue reemplazado por el vinilo fotográfico completo `img/turntable/label.png`.
- El vinilo sigue rotando a 33 1/3 RPM mediante `js/turntable.js`.
- El avatar del canal ya no se superpone sobre el centro del vinilo; la etiqueta premium queda limpia.
- El brazo conserva el render fotográfico y su movimiento se redujo para que se sienta mecánico y natural.
- Se añadió sombra de contacto debajo del disco para integrarlo físicamente con el plato.
- Se ajustó el recorte del render y el feathering para evitar la sensación de “imagen rectangular pegada”.
- El reproductor HTML sigue siendo funcional y ahora queda alineado con el panel negro frontal del tocadiscos.
- Se amplió el área central del layout de escritorio para acercarse a la composición visual aprobada.
- Se mantienen los breakpoints responsive para tablet y móvil.

Archivos principales modificados:

- `index.html`
- `css/turntable.css`

La lógica de canales, YouTube y audio permanece intacta.
