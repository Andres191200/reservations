---
status: accepted
---

# Horario de atención compartido con Asignación automática

En el MVP, el Horario de atención es del Negocio y lo comparten todos sus Profesionales; no hay un horario propio por Profesional. El Cliente reserva un Horario disponible del Negocio sin ver ni elegir Profesional, y el sistema le asigna uno libre (Asignación automática). Así, cada bloque del Horario de atención acepta tantas Reservas como Profesionales libres haya, y ningún Profesional queda ocioso mientras haya Clientes que quieran ese horario. Lo elegimos porque refleja cómo opera un Negocio de atención por orden de llegada (por ejemplo, una barbería: "atiende el que esté libre") y simplifica tanto la página pública como la configuración.

## Considered Options

- **Agenda propia por Profesional, con elección del Cliente.** Cada Profesional define su horario y el Cliente elige con quién reservar. Descartada para el MVP: obliga al Cliente a una decisión que hoy no toma, fragmenta la disponibilidad (un Cliente puede no encontrar lugar con "su" Profesional aunque otro esté libre) y multiplica la configuración que debe mantener el Administrador.
- **Capacidad anónima ("tengo 2 sillas").** El Negocio declara cuántas Reservas acepta por bloque, sin Profesionales con nombre. Descartada: no permite saber quién atiende cada Reserva, ni registrar Ausencias de una persona concreta, ni asociar Servicios a cada Profesional en el futuro.

## Consequences

- La **Agenda** de un Profesional es solo una vista de sus Reservas en el panel, no una fuente de disponibilidad.
- Una **Ausencia** reduce en uno la cantidad de Reservas que acepta cada bloque de ese día, en lugar de bloquear una agenda individual.
- Existe la **Reasignación** (cambiar el Profesional de una Reserva sin cambiar su horario) y no requiere avisar al Cliente, porque él nunca eligió Profesional. Ante conflictos por Ausencias o Cierres, el Administrador primero reasigna y solo cancela lo que no tiene lugar.
- El Administrador puede elegir el Profesional al cargar una Reserva; si no lo hace, también se aplica la Asignación automática.
- Si más adelante se agregan horarios distintos por Profesional, Servicios que solo algunos prestan o la elección de Profesional por parte del Cliente, el cálculo de Horarios disponibles deja de ser "bloques del Negocio × Profesionales libres" y tiene que pasar a considerar cada Profesional por separado. Esa es la parte cara de revertir esta decisión.
