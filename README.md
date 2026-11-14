# Reservas

Plataforma multitenant donde cada Negocio recibe Reservas de sus Clientes. El vocabulario del dominio está en [GLOSSARY.md](GLOSSARY.md) y las decisiones de arquitectura en [docs/adr/](docs/adr/). El código y la base de datos están en inglés, usando el nombre en inglés de cada término del glosario; los textos que ven los usuarios, en castellano ([ADR 0002](docs/adr/0002-codigo-en-ingles-con-glosario-bilingue.md)).

Stack: Next.js 16 · React 19 · TypeScript · SCSS modules · zod · PostgreSQL · Drizzle · Better Auth · Vitest.

## Requisitos

- Node.js 24 o superior
- Docker con el plugin `docker compose`

## Entorno local

La base de datos (Postgres) y el servidor de email de prueba (Mailpit) corren en Docker; la app corre en tu máquina.

```bash
npm install
cp .env.example .env.local     # variables de entorno de desarrollo
docker compose up -d           # levanta Postgres y Mailpit
npm run db:migrate             # crea las tablas en la base de desarrollo
npm run dev                    # http://localhost:3000
```

- Para entrar al panel (http://localhost:3000/admin) primero creá un Negocio (ver [Comandos del operador](#comandos-del-operador)).
- Mailpit: los emails que mande la app (por ejemplo, el de confirmación de una Reserva) se ven en http://localhost:8025.
- Para apagar los servicios: `docker compose down` (los datos quedan guardados). Para borrar también los datos: `docker compose down -v`.

Las variables de entorno se validan al arrancar en [src/lib/env.ts](src/lib/env.ts). Si falta alguna o es inválida, la app no levanta y muestra cuál es. Las variables disponibles están documentadas en [.env.example](.env.example).

## Emails

La app manda el email de confirmación de cada Reserva, con el Link de cancelación (`app.com/<path>/reserva/<token>`), y el email de cancelación cuando el Cliente la cancela desde ese link. Quién lo envía lo decide `EMAIL_TRANSPORT`:

- `mailpit` (por defecto, desarrollo): los emails no salen de tu máquina; se ven en Mailpit.
- `resend` (producción): se envían por [Resend](https://resend.com). Exige `RESEND_API_KEY` y `EMAIL_FROM`, una dirección de un dominio verificado en Resend.

El link de los emails se arma con `BETTER_AUTH_URL`, la URL base de la app. Si un envío falla, la Reserva (o la Cancelación) queda hecha igual y el error se registra en los logs (sin reintentos).

El núcleo no sabe de Resend ni de Mailpit: recibe el envío de emails desde afuera (`EmailSender`, en [src/core/email.ts](src/core/email.ts)), igual que el reloj. La app le pasa el real ([src/lib/email-sender.ts](src/lib/email-sender.ts)) y los tests un falso ([src/test/fake-email-sender.ts](src/test/fake-email-sender.ts)) que registra lo que se habría mandado y puede simular un fallo.

## Protección de la página pública

El formulario público de Reserva tiene dos protecciones, que aplica su server action ([src/app/[path]/reservar/actions.ts](src/app/[path]/reservar/actions.ts)) antes de llamar al núcleo. Las Reservas que carga el Administrador desde el panel no pasan por ninguna de las dos.

- **Captcha invisible (Cloudflare Turnstile)**: el widget verifica el navegador en segundo plano y el botón de reservar se habilita cuando hay un token; el servidor lo valida con Cloudflare ([src/lib/turnstile.ts](src/lib/turnstile.ts)). Si Cloudflare no responde, la Reserva se rechaza. Las claves son `TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`: en producción son obligatorias (se crean en el panel de Cloudflare, en modo "Invisible"); en desarrollo y tests, si no están, se usan las [claves de prueba](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) de Cloudflare, que siempre pasan:

  | Variable | Clave de prueba | Efecto |
  | --- | --- | --- |
  | `TURNSTILE_SITE_KEY` | `1x00000000000000000000BB` | Widget invisible que siempre pasa |
  | `TURNSTILE_SITE_KEY` | `2x00000000000000000000BB` | Widget invisible que siempre falla (para probar el error) |
  | `TURNSTILE_SECRET_KEY` | `1x0000000000000000000000000000000AA` | Acepta cualquier token |
  | `TURNSTILE_SECRET_KEY` | `2x0000000000000000000000000000000AA` | Rechaza todos los tokens |

- **Rate limit**: cada IP puede crear hasta 10 Reservas por hora (ventana deslizante); a partir de la número 11 se rechaza con un mensaje que dice en cuántos minutos puede volver a reservar. Solo cuentan las Reservas creadas: una rechazada (datos inválidos, horario ocupado) no consume el cupo. El conteo está en la memoria del servidor ([src/lib/rate-limiter.ts](src/lib/rate-limiter.ts)): alcanza con una sola instancia de la app y se reinicia al reiniciarla.

La IP sale del último valor del encabezado `X-Forwarded-For` ([src/lib/client-ip.ts](src/lib/client-ip.ts)), que es el que agrega el reverse proxy; los valores a su izquierda los puede inventar el cliente. Por eso en producción la app tiene que estar detrás de **un** reverse proxy que agregue (o reemplace) ese encabezado, y no se tiene que poder llegar a ella sin pasar por él. Si hubiera otro proxy adelante (por ejemplo, el proxy de Cloudflare), el último valor sería la IP de ese proxy y todos los Clientes compartirían el límite: en ese caso hay que configurar el reverse proxy para que confíe en él y reenvíe la IP real.

## Base de datos y migraciones

El esquema se define en [src/db/schema.ts](src/db/schema.ts). Las migraciones son archivos SQL versionados en [drizzle/](drizzle/).

```bash
npm run db:generate   # después de cambiar el esquema: genera una migración nueva en drizzle/
npm run db:migrate    # aplica las migraciones pendientes a la base de DATABASE_URL
```

Las migraciones generadas se commitean junto con el cambio de esquema.

## Tests

Los tests corren contra el Postgres real de docker compose, en una base separada (`reservas_test`, configurada en [.env.test](.env.test)). Antes de correr, Vitest aplica las migraciones a esa base, y antes de cada test la vacía.

```bash
docker compose up -d   # si no estaba levantado
npm test               # corre todos los tests una vez
npm run test:watch     # vuelve a correr al guardar
```

[src/db/businesses.test.ts](src/db/businesses.test.ts) es el test modelo: llama a la misma función que usa la app y verifica el resultado observable. También tiene los tests de aislamiento entre Negocios.

> La base `reservas_test` se crea la primera vez que se levanta el volumen de Postgres. Si ya tenías el volumen de antes, recrealo con `docker compose down -v && docker compose up -d`.

## Comandos del operador

Los Negocios no se registran solos: los da de alta el operador de la plataforma desde la terminal. Usan la base de `DATABASE_URL`.

```bash
# Crea el Negocio y su Administrador, y muestra la contraseña inicial (una sola vez).
npm run business:register -- --name "Barbería Don Pepe" --path don-pepe --email admin@donpepe.com

# Genera una contraseña nueva para el Administrador y cierra sus sesiones abiertas.
npm run admin:reset-password -- --email admin@donpepe.com
```

El path es la URL de la página pública (`app.com/don-pepe`): solo minúsculas, números y guiones, y no puede ser una palabra reservada (`admin`, `api`, `reserva`, `reservas`; la lista está en [src/core/path.ts](src/core/path.ts)) ni un path ya usado.

## Panel y multitenancy

- El login del Administrador es con Better Auth ([src/lib/auth.ts](src/lib/auth.ts)): email y contraseña, sesiones guardadas en la tabla `sessions` y una cookie httpOnly. El registro público está desactivado.
- En el panel, el Negocio sale **solo** de la sesión, con `getSessionBusiness()` ([src/app/admin/session.ts](src/app/admin/session.ts)). Toda página y server action del panel la llama; sin sesión válida, redirige al login. Nunca se toma el Negocio de la URL ni de un formulario.
- [src/proxy.ts](src/proxy.ts) manda al login cualquier ruta de `/admin` sin cookie de sesión (es un chequeo rápido; la validación real es la de arriba).
- Las funciones de la capa de datos ([src/db/](src/db/)) que leen o escriben datos de un Negocio reciben `businessId: BusinessId` como parámetro obligatorio.

## Otros comandos

```bash
npm run lint        # ESLint
npm run typecheck   # genera los tipos de rutas de Next.js y corre tsc
npm run build       # build de producción
```

## CI

Cada PR corre lint, typecheck y tests en GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)), con un Postgres de servicio.
