import { ReservationNotFound } from "./reservation-not-found";

/**
 * A Cancellation link of a Business that does not exist. When the Business exists, the
 * page itself shows the same screen, with the way to its public page.
 */
export default function ReservationLinkNotFound() {
  return <ReservationNotFound />;
}
