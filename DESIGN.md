---
name: Reservas
description: Infraestructura silenciosa para que cada Negocio reciba sus Reservas.
colors:
  bg: "#f5f6fa"
  surface: "#ffffff"
  border: "#d9dde7"
  text: "#161a24"
  muted: "#5b6375"
  primary: "#3858d6"
  on-primary: "#ffffff"
  danger: "#c62f2f"
  success: "#12805a"
  bg-dark: "#0b0d12"
  surface-dark: "#151924"
  border-dark: "#262c3a"
  text-dark: "#e6e8ee"
  muted-dark: "#8b93a7"
  primary-dark: "#6d8cff"
  on-primary-dark: "#ffffff"
  danger-dark: "#ff6b6b"
  success-dark: "#4cd4a0"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 6vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.5
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  time:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    fontFeature: "tnum"
rounded:
  base: "10px"
spacing:
  x0-5: "4px"
  x1: "8px"
  x1-5: "12px"
  x2: "16px"
  x2-5: "20px"
  x3: "24px"
  x4: "32px"
  x8: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.base}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.base}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.bg}"
    rounded: "{rounded.base}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.base}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.base}"
    padding: "24px"
  slot:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    typography: "{typography.time}"
    rounded: "{rounded.base}"
    height: "44px"
  slot-hover:
    textColor: "{colors.primary}"
  badge-confirmed:
    textColor: "{colors.success}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "2px 8px"
  badge-cancelled:
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "2px 8px"
  theme-toggle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.base}"
    size: "40px"
---

# Design System: Reservas

> **Estado actual, no sistema definitivo.** Este documento registra la interfaz tal como está hoy en el código. El plan es armar un design system unificado para todo el producto (tokens completos, escala de sombras, componentes compartidos). Hasta entonces, lo que está acá describe la base que hay que respetar, no un techo. Las divergencias entre la página pública y el panel están marcadas para resolverlas en esa unificación.

## Overview

**Creative North Star: "Infraestructura silenciosa"**

Como la señalética de un buen edificio: neutra, legible y pensada para cualquier inquilino. La plataforma no tiene voz visual propia en la página pública. El que habla es el Negocio, con su nombre como único elemento grande. La interfaz se limita a hacer que elegir un día, un Horario disponible y dejar los datos no tenga ninguna duda.

El carácter es **preciso y confiable**: horarios con cifras tabulares, estados (Confirmada, Cancelada, en conflicto) con color y texto a la vez, y ningún elemento decorativo que compita con la tarea. La paleta son neutros fríos gris azulados con un solo acento, el Azul tinta, que marca dónde actuar. Los dos temas, claro y oscuro, son equivalentes: el oscuro es el predeterminado del código y el claro se activa con la preferencia del navegador o el selector.

La densidad es cómoda en la página pública (pensada para el celular, con objetivos táctiles de 44px) y algo más compacta en el panel, que se usa en la computadora del local.

**Key Characteristics:**
- Neutros fríos gris azulados y un único acento: el Azul tinta.
- Superficies planas, separadas por bordes de 1px y por el contraste entre fondo y tarjeta.
- Una sola fuente (Geist) y jerarquía por tamaño y peso, sin mayúsculas decorativas.
- Esquinas suavemente redondeadas (10px) en todo, desde botones hasta modales.
- Horarios siempre con cifras tabulares y en negrita: son el dato principal.
- Neutral respecto del rubro: nada sugiere barbería, spa o consultorio.

## Colors

Neutros fríos de tinte azulado, con un acento de tinta y dos colores de estado. Cada rol tiene su par para tema claro y oscuro (sufijo `-dark` en los tokens); en el código viven como variables CSS (`--color-*`) definidas en `src/styles/globals.scss`.

### Primary
- **Azul tinta** (`primary` / `primary-dark`): botones principales, links, anillo de foco, borde y texto de la opción elegida (Horario seleccionado, pestaña de Profesional activa) y el tinte de fondo de esa opción al 15%. Es el color con el que se "anota": aparece donde hay que actuar o donde quedó registrada una elección.

### Neutral
- **Niebla de fondo** (`bg` / `bg-dark`): el fondo de la página. También es el relleno de los campos y de los Horarios disponibles, que así se leen "hundidos" dentro de la tarjeta.
- **Superficie** (`surface` / `surface-dark`): tarjetas, secciones del panel, modales y el selector de tema.
- **Borde pizarra** (`border` / `border-dark`): bordes de 1px de tarjetas, campos, botones secundarios y divisores entre filas de listas.
- **Tinta de texto** (`text` / `text-dark`): todo el texto principal.
- **Gris apagado** (`muted` / `muted-dark`): textos de apoyo, aclaraciones ("Horarios en hora de Argentina"), etiquetas de detalle, contactos y Reservas Canceladas.
- **Texto sobre acento** (`on-primary`): texto de los botones principales.

### Estados
- **Verde confirmado** (`success` / `success-dark`): badge de Reserva Confirmada (texto en verde sobre su tinte al 15%) y mensajes de éxito (borde al 40%, fondo al 8%).
- **Rojo cancelado** (`danger` / `danger-dark`): badge de Cancelada, errores de formularios, botones destructivos y el link a Reservas en conflicto en la navegación del panel.

### Named Rules
**La Regla de la Única Tinta.** El Azul tinta es el único acento. Rojo y verde solo comunican estado, nunca decoran. No se suman acentos ni fondos saturados.

**La Regla del Tinte.** Los fondos de estado y de selección no son colores nuevos: se derivan del color del rol con `tint()` (mezcla con transparente al 8%, 15% o 40%). Así funcionan en los dos temas sin tokens extra.

## Typography

**Display Font:** Geist (con system-ui, sans-serif)
**Body Font:** Geist (con system-ui, sans-serif)

**Character:** Una sola sans geométrica y neutra para todo. La jerarquía se arma con tamaño y peso, no con contraste de familias. Geist Mono se carga en el layout pero hoy no se usa.

### Hierarchy
- **Display** (700, clamp(1.5rem, 6vw, 2.25rem), 1.2): el nombre del Negocio en la página pública. Corta palabras largas (`overflow-wrap: anywhere`) para que entre cualquier nombre.
- **Headline** (700, 1.25rem): títulos de sección y de modal del panel; las pantallas de error usan clamp(1.25rem, 5vw, 1.75rem).
- **Title** (600, 1.125rem): nombre del Negocio en la barra del panel y el día elegido sobre los Horarios disponibles.
- **Body** (400, 1rem, 1.5): todo el texto corriente. Los campos de la página pública usan como mínimo 16px para que iOS no haga zoom.
- **Label** (400, 0.875rem): aclaraciones, badges de estado y datos de contacto.
- **Horario** (600, 1rem, cifras tabulares): horas de Reservas y Horarios disponibles.

### Named Rules
**La Regla de la Hora Tabular.** Toda hora lleva `font-variant-numeric: tabular-nums` y peso 600. Las columnas de horarios se alinean y la hora se lee antes que cualquier otro dato.

## Layout

Grilla base de 8px (`$space`). Todos los espacios son múltiplos o medios de esa unidad: 4, 8, 12, 16, 20, 24, 32 y 64px.

- **Página pública:** mobile first, una sola columna centrada de 560px como máximo, con 16px de margen lateral y 24px arriba (64px desde 768px). Los bloques se apilan con 24px de separación. Los Horarios disponibles van en una grilla `auto-fill` de celdas de 84px como mínimo, con 8px de separación.
- **Panel:** barra superior a todo el ancho, separada por un borde inferior, con el nombre del Negocio y la navegación de texto. El contenido tiene 24/16px de padding (32px desde 768px) y las secciones se apilan con 24px de separación en una columna de 720px como máximo. Las listas de Reservas pasan de dos filas en el celular a una línea por Reserva desde 640px (hora de 110px, Cliente flexible, estado y acciones al final).
- **Pantallas centradas** (login, errores): una tarjeta centrada vertical y horizontalmente (380px en el login, 560px en errores).
- **Breakpoints:** 640px (`sm`), 768px (`md`), 1024px (`lg`, definido pero sin uso hoy). Solo se usan con `min-width`.
- **Objetivos táctiles:** 44px de alto mínimo en la página pública. En el panel, los botones son más compactos (alrededor de 38px).

## Elevation & Depth

**Estado actual: plano.** No hay ninguna sombra en el código. La profundidad se arma con capas de color (Niebla de fondo → Superficie) y bordes de 1px. Los elementos interactivos dentro de una tarjeta (campos, Horarios disponibles) vuelven a usar el color de fondo y se leen como "hundidos". La única capa elevada es el modal: un `<dialog>` con fondo oscurecido al 60% y una entrada de 160ms (aparece y sube 8px, desde escala 0.98), que se desactiva con `prefers-reduced-motion`.

Esto describe el estado actual, no una prohibición. El design system unificado puede agregar una escala de sombras. Hasta que exista, no se inventan sombras sueltas en componentes.

## Shapes

Un único radio, **10px** (`$radius`), en todo: tarjetas, campos, botones, Horarios disponibles, badges, pestañas, modales y el selector de tema. Los bordes son siempre de 1px y sólidos, con una sola excepción: los avisos vacíos ("no hay Horarios disponibles", "no hay Reservas") usan un borde **punteado**, que distingue un lugar vacío de un contenedor real.

## Components

**Contenidos y claros:** formas simples, bien visibles y sin adornos. Cada componente dice qué hace con su texto.

### Buttons
- **Shape:** esquinas suavemente redondeadas (10px), sin borde en los botones con relleno.
- **Primary:** relleno Azul tinta, texto blanco, peso 600. Deshabilitado: opacidad 0.6 (en la página pública, solo mientras se envía). "Confirmar Reserva" no se deshabilita mientras el captcha no da un token: si se toca antes, una línea chica debajo dice "Verificando tu navegador…" y el formulario se envía al llegar el token.
- **Secondary:** fondo transparente, borde de 1px y texto principal, peso normal.
- **Danger:** relleno rojo, texto en el color de fondo, peso 600. Solo para acciones destructivas (cancelar una Reserva, dar de Baja).
- **Link con forma de botón:** en el panel, "Nueva Reserva" es un link con el mismo aspecto que el botón principal.
- **Hover / Focus:** sin transiciones. El foco es un anillo Azul tinta de 2px con 2px de separación (`focus-ring`). Los botones con relleno no cambian en hover.
- **Divergencia a unificar:** la página pública usa 44px de alto mínimo con padding 8px 16px; el panel usa padding 10px 16px (principal) y 6px 12px (secundario y danger), sin alto mínimo. Cada superficie redefine sus propios botones en su módulo SCSS.

### Inputs / Fields
- **Style:** relleno de color de fondo, borde de 1px, 10px de radio y la tipografía heredada. Etiqueta arriba con 4px de separación.
- **Focus:** el anillo de foco global.
- **Error:** el de un campo va debajo de ese campo, en rojo y 0.875rem, con el borde del campo en rojo (`aria-invalid`, `aria-describedby`); el foco va al primer campo con error. Los que no son de un campo, en rojo sobre el botón, con saltos de línea respetados.
- **Ayuda:** debajo del campo, en gris y 0.875rem, leída con el campo (`aria-describedby`).
- **Divergencia a unificar:** la página pública fija 44px de alto y 16px de tamaño mínimo; el panel usa padding 10px 12px.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** Superficie, sobre la Niebla de fondo.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** 1px Borde pizarra (mixin `card`).
- **Internal Padding:** 16px en el celular y 24px desde 640/768px.

### Horarios disponibles (componente distintivo)
Grilla de celdas iguales con la hora en tabulares y peso 600, rellenas con el color de fondo y con borde de 1px. En hover y foco, el borde y el texto pasan a Azul tinta. Al tocarla (`:active`) y mientras carga el formulario (`useLinkStatus`), toma el aspecto de elegida: borde y texto Azul tinta sobre su tinte al 15%, que late lento (no con `prefers-reduced-motion`). En el formulario, el Horario elegido se repite arriba de la tarjeta, sobre el tinte Azul tinta al 8% con borde al 40%, con un link "Cambiar" que vuelve a ese día. En el panel (cargar una Reserva) son radios accesibles: el input queda invisible encima de la celda, y la opción elegida lleva borde y texto Azul tinta sobre su tinte al 15%.

### Badges de estado
Píldoras de 10px de radio con el texto en el color del estado sobre su tinte al 15%, en 0.875rem. Confirmada en verde, Cancelada en rojo. Una Reserva Cancelada además se atenúa y se tacha (hora y Cliente) en la lista.

### Navigation
- **Panel:** links de texto en el color principal, que pasan a Azul tinta en hover. El link a Reservas en conflicto va en rojo y peso 600 para que no pase inadvertido.
- **Pestañas de Profesional (Agenda):** cápsulas con borde. La activa (`aria-current="page"`) lleva borde y texto Azul tinta sobre su tinte al 15%.
- **Navegación de días:** links "← Día anterior / Día siguiente →" a los extremos, en Azul tinta y sin subrayado.
- **Página pública:** sin navegación. El selector de tema flota en la esquina superior derecha (40px, fondo Superficie, borde de 1px) y muestra el ícono del tema al que cambia.

### Modal
`<dialog>` nativo con fondo Superficie, borde de 1px, 10px de radio y 440px de ancho máximo. Lleva título Headline, contenido con 24px de padding y acciones alineadas a la derecha.

## Do's and Don'ts

### Do:
- **Do** usar las variables de tema (`$color-*` → `--color-*`) para todo color, así funciona igual en tema claro y oscuro.
- **Do** derivar fondos de estado y selección con `tint()` (8%, 15% o 40%) en lugar de agregar colores nuevos.
- **Do** mostrar toda hora con cifras tabulares y peso 600.
- **Do** comunicar cada estado con texto además de color ("Confirmada", "Cancelada").
- **Do** respetar los 44px de objetivo táctil y los 16px de tamaño mínimo en los campos de la página pública.
- **Do** usar el radio único de 10px y bordes de 1px en todo contenedor e interactivo nuevo.
- **Do** mantener la entrada del modal (160ms) desactivable con `prefers-reduced-motion`.

### Don't:
- **Don't** darle a la página pública el aspecto de un rubro (barbería, spa, consultorio): tiene que servir para cualquier Negocio.
- **Don't** sumar acentos, gradientes ni fondos saturados. El Azul tinta es el único color de acción.
- **Don't** usar rojo o verde como decoración. Solo marcan estado o una acción destructiva.
- **Don't** inventar sombras sueltas en un componente mientras no exista la escala de sombras del design system unificado.
- **Don't** usar "turno" en ningún texto de la interfaz (ver GLOSSARY.md).
