# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Tres audiencias, con el vocabulario de [GLOSSARY.md](GLOSSARY.md):

- **Cliente** (en la página pública, `app.com/<path>`): una persona que quiere reservar en un Negocio que ya conoce. Llega casi siempre desde el celular, por un link que el Negocio compartió (redes, WhatsApp). No tiene cuenta ni la quiere: elige un día y un Horario disponible, deja nombre, email y (opcionalmente) teléfono, y se va. Vuelve solo si tiene que cancelar, desde el Link de cancelación del email.
- **Administrador** (en el panel, `app.com/admin`): la persona (o las personas, porque la cuenta puede ser compartida) que gestiona las Reservas del Negocio. Usa el panel normalmente desde **una computadora en el local** (mostrador o recepción), mientras el Negocio está funcionando: mira las Reservas del día, carga las que le piden por teléfono o WhatsApp, cancela, reasigna y resuelve Reservas en conflicto.
- **Operador de la plataforma**: da de alta Negocios y resetea contraseñas desde la terminal. No tiene interfaz gráfica.

## Product Purpose

Una plataforma SaaS multitenant para Negocios que atienden con Reserva previa, de cualquier rubro (barberías, estética, consultorios y similares). Reemplaza la coordinación a mano por WhatsApp o teléfono: el Cliente reserva solo, a cualquier hora, y el Administrador deja de coordinar horarios, de perderse superposiciones y de no saber qué Reservas quedan afectadas cuando un Profesional falta o el Negocio cierra un día.

Éxito: el Cliente reserva en pocos pasos y sin dudas desde el celular, y el Administrador tiene la jornada ordenada y nunca una doble reserva.

## Positioning

La alternativa real no es otro software sino WhatsApp y el teléfono. Lo que lo distingue:

- **El Cliente no crea cuenta**: reserva con sus datos de contacto y cancela con un link personal.
- **El Cliente no elige Profesional**: el Horario de atención es del Negocio y el sistema asigna un Profesional libre (Asignación automática, [ADR 0001](docs/adr/0001-horario-compartido-con-asignacion-automatica.md)). Refleja cómo operan muchos Negocios ("atiende el que esté libre") y hace que ningún Profesional quede ocioso mientras haya Clientes para ese horario.
- **Hecho para Argentina**: castellano rioplatense, hora de Argentina, sin conversiones.
- **Simple a propósito**: poca configuración (Horario de atención, Duración de Reserva, Reglas de Reserva, Profesionales, Cierres, Ausencias).

## Operating Context

- Página pública: Cliente en el celular, a menudo fuera del horario en que alguien del Negocio podría responderle. Flujo: info del Negocio → elegir día → elegir Horario disponible → formulario → confirmación. Después, emails de confirmación y cancelación.
- Panel: computadora del local, durante la atención, con interrupciones. Lo central es la vista de Reservas del día, la Agenda de cada Profesional y la lista de Reservas en conflicto.
- Cada Negocio da de alta su cuenta a través del operador; no hay registro público.

## Capabilities and Constraints

- Funcionalidad del MVP (completa): página pública con Horarios disponibles y reserva; Email de confirmación y de cancelación; cancelación por el Cliente con Link de cancelación; panel con login, Reservas del día, Agenda, carga/cancelación/Reasignación de Reservas, Profesionales (alta y Baja), Cierres, Ausencias, Reservas en conflicto, Horario de atención y Reglas de Reserva; tema claro/oscuro según el navegador, con selector que recuerda la elección; pantallas de error.
- Terminología: los textos para usuarios usan los términos en castellano de [GLOSSARY.md](GLOSSARY.md); el código, los nombres en inglés ([ADR 0002](docs/adr/0002-codigo-en-ingles-con-glosario-bilingue.md)). **Nunca "turno"**: según el caso es Horario disponible, Reserva o Duración de Reserva.
- Stack existente: Next.js 16 (App Router), React 19, TypeScript, SCSS modules. Fuentes actuales: Geist y Geist Mono.
- Protección de la página pública: captcha invisible (Cloudflare Turnstile) y rate limit por IP; el botón de reservar se habilita cuando hay token.
- Una sola zona horaria (America/Argentina/Buenos_Aires), un solo Administrador por Negocio.
- Fuera del MVP (no diseñar como si existieran): Servicios, elección de Profesional por el Cliente, horarios por Profesional, pagos (MercadoPago, "pendiente de pago" previsto), WhatsApp/SMS, recordatorios, varios Administradores y roles, superadmin con interfaz, "olvidé mi contraseña".
- Abierto: el nombre de la plataforma. "Reservas" (`NEXT_PUBLIC_APP_NAME`) es provisorio.

## Brand Commitments

- **La identidad de la página pública es del Negocio.** El Cliente tiene que sentir que reserva en ese Negocio; la plataforma se mantiene neutra y discreta. Por ahora el Negocio se representa solo con su nombre: no hay logo ni colores por Negocio (puede venir más adelante, no está decidido).
- Como sirve a rubros distintos, la página pública no puede asumir un rubro (nada de estética de barbería por defecto).
- Voz: castellano rioplatense, claro y directo (voseo, como en el resto del producto).

## Evidence on Hand

- No hay Negocios reales en producción todavía (el primero está pendiente, issue #26), ni testimonios, clientes, métricas, logos ni precios. No inventarlos.
- La plataforma no tiene nombre ni logo definitivos.

## Product Principles

1. **El Cliente reserva sin pensar.** Cada paso de la página pública tiene una sola decisión; nada que pida cuenta, elección de Profesional ni conversión horaria.
2. **El Negocio es protagonista, la plataforma es infraestructura.** En lo público manda el nombre del Negocio; la plataforma no compite por atención.
3. **El panel es una herramienta de mostrador.** Prioriza ver rápido la jornada y resolver lo urgente (conflictos, cargas por teléfono) con el Negocio funcionando.
4. **Nunca una Reserva fantasma ni una doble reserva.** Los estados (Confirmada, Cancelada, en conflicto) tienen que ser inequívocos para Cliente y Administrador.
5. **Mismo lenguaje en todos lados.** Los términos del glosario son la interfaz.
