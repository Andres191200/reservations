# Sistema de Reservas

Plataforma donde múltiples negocios reciben reservas de sus clientes, cada negocio con sus datos aislados del resto.

## Lenguaje

### Participantes

**Negocio**:
Cliente de la plataforma que recibe reservas; es la unidad de aislamiento de datos (el tenant).
_Avoid_: Tenant, empresa, cuenta, organización

**Administrador**:
Acceso al panel de un Negocio para gestionar sus Reservas. Cada Negocio tiene uno, que puede ser compartido por varias personas.
_Avoid_: Admin, dueño, usuario, operador

**Profesional**:
Persona del Negocio, identificada por su nombre, que atiende a los Clientes. Cada Reserva queda asignada a uno.
_Avoid_: Empleado, staff, prestador, barbero

**Cliente**:
Persona que reserva en un Negocio. No tiene cuenta en la plataforma; se identifica por los datos de contacto que deja al reservar.
_Avoid_: Usuario, customer, paciente

### Tiempo

**Horario de atención**:
Franja continua en la que el Negocio atiende cada día de la semana (o ninguna, si ese día cierra), común a todos sus Profesionales.
_Avoid_: Horario del profesional, disponibilidad

**Duración de Reserva**:
Tiempo que ocupa cada Reserva, único por Negocio. Divide el Horario de atención en bloques consecutivos desde la apertura.
_Avoid_: Duración del turno, slot

**Cierre**:
Día puntual en que el Negocio no atiende aunque su Horario de atención diga lo contrario (por ejemplo, un feriado).
_Avoid_: Feriado, bloqueo, día no laborable

**Ausencia**:
Período en que un Profesional no atiende (vacaciones, enfermedad), durante el cual no se le asignan Reservas.
_Avoid_: Licencia, bloqueo, franco

**Horario disponible**:
Bloque del Horario de atención en el que todavía hay al menos un Profesional sin Reserva ni Ausencia, y que por lo tanto se puede reservar.
_Avoid_: Turno, slot, hueco, lugar libre

### Reservas

**Reserva**:
Compromiso de un Cliente para ser atendido por un Profesional en un horario determinado. No especifica qué se le va a hacer; eso se decide en la atención.
_Avoid_: Turno, cita, booking, appointment

**Asignación automática**:
Elección, hecha por el sistema, del Profesional libre al que queda asignada una Reserva. Se aplica siempre que reserva el Cliente, y cuando el Administrador no elige un Profesional.
_Avoid_: Auto-asignación, distribución

**Reasignación**:
Cambio del Profesional asignado a una Reserva Confirmada, sin cambiar su horario. No es una Cancelación y no se notifica al Cliente.
_Avoid_: Cambio de profesional, transferencia, mover

**Agenda**:
Las Reservas de un Profesional, tal como las ve el Administrador. No es un horario propio del Profesional: todos comparten el Horario de atención.
_Avoid_: Calendario, disponibilidad del profesional

**Estado de la Reserva**:
Situación de una Reserva: _Confirmada_ (vigente) o _Cancelada_. Una Reserva nace Confirmada.
_Avoid_: Status

**Cancelación**:
Paso de una Reserva a Cancelada, hecho por el Cliente o por el Negocio. Una Reserva cancelada no se reactiva ni se modifica; cambiar el horario es cancelar y crear una Reserva nueva.
_Avoid_: Baja, anulación, reprogramación
