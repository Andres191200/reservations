# Sistema de Reservas

Plataforma donde múltiples negocios reciben reservas de sus clientes, cada negocio con sus datos aislados del resto.

Cada término tiene su nombre en castellano, que es el que ven los usuarios, y su nombre en inglés, que es el que se usa en el código y en la base de datos (ver ADR 0002).

## Lenguaje

### Participantes

**Negocio** · _en_: **Business**:
Cliente de la plataforma que recibe reservas; es la unidad de aislamiento de datos (el tenant).
_Avoid_: Tenant, empresa, cuenta, organización / Company, Account, Organization

**Administrador** · _en_: **Admin**:
Acceso al panel de un Negocio para gestionar sus Reservas. Cada Negocio tiene uno, que puede ser compartido por varias personas.
_Avoid_: Admin (en castellano), dueño, usuario, operador / Owner, User, Operator

**Profesional** · _en_: **Professional**:
Persona del Negocio, identificada por su nombre, que atiende a los Clientes. Cada Reserva queda asignada a uno.
_Avoid_: Empleado, staff, prestador, barbero / Employee, Staff, Provider

**Cliente** · _en_: **Customer**:
Persona que reserva en un Negocio. No tiene cuenta en la plataforma; se identifica por los datos de contacto que deja al reservar.
_Avoid_: Usuario, customer (en castellano), paciente / Client, User, Patient

### Tiempo

**Horario de atención** · _en_: **Opening hours**:
Franja continua en la que el Negocio atiende cada día de la semana (o ninguna, si ese día cierra), común a todos sus Profesionales.
_Avoid_: Horario del profesional, disponibilidad / Schedule, Availability

**Duración de Reserva** · _en_: **Reservation duration**:
Tiempo que ocupa cada Reserva, único por Negocio. Divide el Horario de atención en bloques consecutivos desde la apertura.
_Avoid_: Duración del turno, slot / Slot length, Appointment length

**Cierre** · _en_: **Closure**:
Día puntual en que el Negocio no atiende aunque su Horario de atención diga lo contrario (por ejemplo, un feriado).
_Avoid_: Feriado, bloqueo, día no laborable / Holiday, Block, Day off

**Ausencia** · _en_: **Absence**:
Período en que un Profesional no atiende (vacaciones, enfermedad), durante el cual no se le asignan Reservas.
_Avoid_: Licencia, bloqueo, franco / Leave, Time off, Block

**Horario disponible** · _en_: **Available slot**:
Bloque del Horario de atención en el que todavía hay al menos un Profesional sin Reserva ni Ausencia, y que por lo tanto se puede reservar.
_Avoid_: Turno, slot (en castellano), hueco, lugar libre / Opening, Free spot

### Reservas

**Reserva** · _en_: **Reservation**:
Compromiso de un Cliente para ser atendido por un Profesional en un horario determinado. No especifica qué se le va a hacer; eso se decide en la atención.
_Avoid_: Turno, cita, booking, appointment / Booking, Appointment

**Asignación automática** · _en_: **Auto-assignment**:
Elección, hecha por el sistema, del Profesional libre al que queda asignada una Reserva. Se aplica siempre que reserva el Cliente, y cuando el Administrador no elige un Profesional.
_Avoid_: Auto-asignación, distribución / Allocation, Distribution

**Reasignación** · _en_: **Reassignment**:
Cambio del Profesional asignado a una Reserva Confirmada, sin cambiar su horario. No es una Cancelación y no se notifica al Cliente.
_Avoid_: Cambio de profesional, transferencia, mover / Transfer, Move

**Agenda** · _en_: **Agenda**:
Las Reservas de un Profesional, tal como las ve el Administrador. No es un horario propio del Profesional: todos comparten el Horario de atención.
_Avoid_: Calendario, disponibilidad del profesional / Calendar, Schedule

**Estado de la Reserva** · _en_: **Reservation status**:
Situación de una Reserva: _Confirmada_ (_Confirmed_, vigente) o _Cancelada_ (_Cancelled_). Una Reserva nace Confirmada.
_Avoid_: Status (en castellano) / State

**Cancelación** · _en_: **Cancellation**:
Paso de una Reserva a Cancelada, hecho por el Cliente o por el Negocio. Una Reserva cancelada no se reactiva ni se modifica; cambiar el horario es cancelar y crear una Reserva nueva.
_Avoid_: Baja, anulación, reprogramación / Void, Reschedule
