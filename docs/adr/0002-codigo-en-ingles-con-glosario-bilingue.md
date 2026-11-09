---
status: accepted
---

# Código y base de datos en inglés, con glosario bilingüe

El código (identificadores, comentarios, tests, nombres de archivo) y la base de datos (tablas y columnas) se escriben en inglés, mientras que los textos que ven los usuarios (página pública, panel, emails, salida de los comandos) siguen en castellano. Para no perder el lenguaje del dominio, cada término de `GLOSSARY.md` tiene un único nombre en inglés, y el código usa exactamente ese nombre: `Business` es siempre un Negocio, `Reservation` siempre una Reserva. Lo elegimos para que el código se lea como el de cualquier proyecto (librerías, Better Auth y Drizzle ya están en inglés, y mezclar idiomas en un mismo identificador resultaba incómodo), sin dejar que cada desarrollador traduzca los términos a su manera.

## Considered Options

- **Todo en castellano, como pedía originalmente el spec.** El código habla el mismo idioma que el dominio, pero choca con los nombres en inglés de las librerías (por ejemplo, las tablas de Better Auth) y con las convenciones del ecosistema.
- **Base en inglés y código en castellano**, mapeando cada columna. Cambio mínimo, pero deja dos nombres para cada cosa según dónde se mire.

## Consequences

- Antes de nombrar algo del dominio en el código, buscar su nombre en inglés en `GLOSSARY.md`. Si el concepto no está, falta un término en el glosario: agregarlo antes de inventar una traducción.
- La regla del spec "no usar turno" sigue valiendo para los textos en castellano; en el código, lo equivalente es no usar `Booking`, `Appointment` ni `Slot` suelto (sí `AvailableSlot`).
