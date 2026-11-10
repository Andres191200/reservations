/**
 * The only time zone of the platform (there is no zone selector in the MVP).
 * Every hour the Admin enters or a Customer sees is in this zone; instants are stored
 * in UTC and converted with this zone, never with a fixed -3 offset.
 * This is the single place where the zone is defined: import it instead of repeating it.
 */
export const TIME_ZONE = "America/Argentina/Buenos_Aires";

/** How the zone is named in the texts users read. */
export const TIME_ZONE_LABEL = "hora de Argentina";
