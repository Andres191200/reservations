# Reservas

Plataforma multitenant donde cada Negocio recibe Reservas de sus Clientes. El vocabulario del dominio está en [GLOSSARY.md](GLOSSARY.md) y las decisiones de arquitectura en [docs/adr/](docs/adr/).

Stack: Next.js 16 · React 19 · TypeScript · SCSS modules · zod · PostgreSQL · Drizzle · Vitest.

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

- Mailpit: los emails que mande la app se ven en http://localhost:8025.
- Para apagar los servicios: `docker compose down` (los datos quedan guardados). Para borrar también los datos: `docker compose down -v`.

Las variables de entorno se validan al arrancar en [src/lib/env.ts](src/lib/env.ts). Si falta alguna o es inválida, la app no levanta y muestra cuál es. Las variables disponibles están documentadas en [.env.example](.env.example).

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

[src/db/negocios.test.ts](src/db/negocios.test.ts) es el test modelo: llama a la misma función que usa la app y verifica el resultado observable.

> La base `reservas_test` se crea la primera vez que se levanta el volumen de Postgres. Si ya tenías el volumen de antes, recrealo con `docker compose down -v && docker compose up -d`.

## Otros comandos

```bash
npm run lint        # ESLint
npm run typecheck   # genera los tipos de rutas de Next.js y corre tsc
npm run build       # build de producción
```

## CI

Cada PR corre lint, typecheck y tests en GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)), con un Postgres de servicio.
