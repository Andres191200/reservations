# Producción: imagen, compose y Caddy

Cómo se empaqueta la app para producción y cómo se levanta, en el servidor o en tu máquina, exactamente igual.

## Las piezas

```text
Internet ──► Caddy (puertos 80 y 443) ──► app (puerto 3000) ──► postgres (puerto 5432)
             único servicio expuesto       red interna de Docker   red interna, volumen persistente
```

- **Imagen**: la app ya compilada, con todo lo que necesita para correr (Node.js, el servidor de Next.js, las migraciones y los comandos de operación). Se construye una vez con el [Dockerfile](../Dockerfile) y se puede correr en cualquier máquina que tenga Docker. No lleva el código fuente ni las dependencias de desarrollo, y tampoco secretos: las variables de entorno se le pasan cuando arranca.
- **Contenedor**: una imagen corriendo. Cada servicio del compose es un contenedor.
- **Compose de producción** ([compose.prod.yml](../compose.prod.yml)): describe qué contenedores corren juntos en el servidor (app, Postgres y Caddy), cómo se conectan y qué hacer si se caen (`restart: unless-stopped`: Docker los vuelve a levantar, también después de reiniciar el servidor). No confundir con [docker-compose.yml](../docker-compose.yml), que es solo para desarrollo (Postgres y Mailpit, con la app corriendo afuera con `npm run dev`).
- **Caddy**: el _reverse proxy_. Es el único que recibe tráfico de internet; se lo pasa a la app. Además consigue y renueva solo los certificados HTTPS (de Let's Encrypt), comprime las respuestas y le dice a la app la IP real de cada Cliente. Su configuración es [docker/caddy/Caddyfile](../docker/caddy/Caddyfile).
- **Volumen**: una carpeta que Docker guarda fuera de los contenedores. Los datos de Postgres viven en el volumen `postgres-data`, así que sobreviven a reinicios y a imágenes nuevas. Borrar el volumen es borrar la base.
- **Endpoint de salud** (`/api/health`): responde `200 {"status":"ok"}` si la app arrancó y puede consultar la base, y `503 {"status":"error"}` si no, sin dar detalles. Docker lo consulta cada 30 segundos (el contenedor aparece como `healthy` o `unhealthy`), y sirve para un monitor externo.

Postgres no publica ningún puerto: desde internet no se puede llegar a la base, solo desde la app. La app tampoco: solo Caddy le habla.

## La imagen por dentro

El [Dockerfile](../Dockerfile) tiene tres etapas; solo la última queda en la imagen final:

1. **deps**: instala las dependencias (`npm ci`), incluidas las de desarrollo, que hacen falta para compilar.
2. **builder**: compila la app (`next build`, con `output: "standalone"`, que deja en `.next/standalone` solo lo que el servidor necesita) y los comandos de operación (`npm run build:commands`, que los empaqueta con esbuild en `dist/commands/*.cjs`, porque en la imagen final no hay `tsx` ni `drizzle-kit`).
3. **runner**: Node.js con el servidor compilado, `.next/static`, `drizzle/` (las migraciones) y `commands/`. Corre con el usuario `node`, no como root.

El build necesita internet: además de las dependencias, descarga las fuentes (Geist) de Google Fonts. Si falla con "Connection timed out when requesting https://fonts.gstatic.com", es la red: volver a correrlo.

Las variables `NEXT_PUBLIC_*` (el nombre de la app y el DSN de Sentry) se escriben en el código del navegador al compilar: cambiarlas exige reconstruir la imagen. Todas las demás se leen al arrancar.

## Variables de entorno

Todos los servicios leen `.env.production`, que nunca se commitea. Se arma a partir del ejemplo:

```bash
cp .env.production.example .env.production
# completar: contraseñas (openssl rand ...), dominio, Resend, Turnstile
```

`DATABASE_URL` usa como host `postgres`, el nombre del servicio: dentro de la red de Docker, cada servicio se encuentra por su nombre. El usuario, la contraseña y la base tienen que coincidir con `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB`. Postgres crea ese usuario y esa base la primera vez que arranca con el volumen vacío.

## Levantarlo

Todos los comandos se corren desde la raíz del repo. `--env-file .env.production` le pasa las variables a compose para el build (las `NEXT_PUBLIC_*`).

```bash
# Construir la imagen y levantar todo en segundo plano
docker compose -f compose.prod.yml --env-file .env.production up -d --build

# Aplicar las migraciones (la primera vez y después de cada versión con migraciones nuevas)
docker compose -f compose.prod.yml --env-file .env.production run --rm app node commands/migrate.cjs

# Ver el estado (app debería decir "healthy") y los logs
docker compose -f compose.prod.yml --env-file .env.production ps
docker compose -f compose.prod.yml --env-file .env.production logs -f app
```

### Comandos de operación

Los mismos de desarrollo (`npm run business:register`, `npm run admin:reset-password`), pero dentro de un contenedor de la imagen:

```bash
docker compose -f compose.prod.yml --env-file .env.production run --rm app \
  node commands/register-business.cjs --name "Barbería Don Pepe" --path don-pepe --email admin@donpepe.com

docker compose -f compose.prod.yml --env-file .env.production run --rm app \
  node commands/reset-admin-password.cjs --email admin@donpepe.com
```

`run --rm` crea un contenedor de un solo uso, con las mismas variables y la misma red que la app, y lo borra al terminar.

### Actualizar a una versión nueva

```bash
git pull
docker compose -f compose.prod.yml --env-file .env.production up -d --build
docker compose -f compose.prod.yml --env-file .env.production run --rm app node commands/migrate.cjs
```

## Probarlo en tu máquina

Con `DOMAIN="localhost"` en `.env.production`, Caddy sirve `https://localhost` con un certificado propio (no de Let's Encrypt), que el navegador marca como no confiable: es esperable en local. Usá `BETTER_AUTH_URL="https://localhost"` y, para no mandar emails reales, `EMAIL_TRANSPORT="mailpit"`.

```bash
docker compose -f compose.prod.yml --env-file .env.production up -d --build
docker compose -f compose.prod.yml --env-file .env.production run --rm app node commands/migrate.cjs
curl -k https://localhost/api/health      # {"status":"ok"}
```

Para bajar todo: `docker compose -f compose.prod.yml --env-file .env.production down` (los volúmenes quedan; con `down -v` también se borran, base incluida).

## La IP real del Cliente

El rate limit de la página pública cuenta las Reservas por IP. La app no ve al Cliente directamente: ve a Caddy. Caddy reemplaza el encabezado `X-Forwarded-For` que mande el cliente por la IP real de la conexión, y la app toma el último valor de ese encabezado ([src/lib/client-ip.ts](../src/lib/client-ip.ts)). Por eso es importante que a la app solo se llegue a través de Caddy, como en este compose.

Probándolo en tu máquina, la IP que llega es la del gateway de Docker (por ejemplo `172.19.0.1`), porque la conexión sale de la misma máquina; en el servidor es la del Cliente.
