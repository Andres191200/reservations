"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { JUST_CREATED_PARAM } from "../../format";
import styles from "../../public-page.module.scss";

/**
 * The greeting of a Reservation just created from the public page: where the confirmation
 * email went and until when it can be cancelled from there. It shows once: as soon as it
 * appears, the mark leaves the URL, so reloading or opening the Cancellation link later
 * shows the Reservation alone. The focus goes to its title, so a screen reader announces it.
 */
export function JustCreatedNotice(props: {
  path: string;
  customerEmail: string;
  /** Last day and time to cancel it from the email; none if that is already past. */
  cancellableUntil?: { day: string; time: string; timeZoneLabel: string };
}) {
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    title.current?.focus();
    const url = new URL(window.location.href);
    url.searchParams.delete(JUST_CREATED_PARAM);
    window.history.replaceState(null, "", url);
  }, []);

  const { cancellableUntil } = props;

  return (
    <section className={styles.successNotice} aria-labelledby="reserva-confirmada">
      <h2 id="reserva-confirmada" ref={title} tabIndex={-1}>
        ¡Reserva confirmada!
      </h2>
      <p>
        Te mandamos la confirmación a{" "}
        <strong className={styles.email}>{props.customerEmail}</strong>.
        {cancellableUntil && (
          <>
            {" "}
            Desde ese email podés cancelarla hasta el {cancellableUntil.day} a las{" "}
            <span className={styles.hours}>{cancellableUntil.time}</span> (
            {cancellableUntil.timeZoneLabel}).
          </>
        )}
      </p>
      <p>
        Si el email está mal, no te va a llegar: guardá esta página, que es la misma que abre el
        link del email.
      </p>
      <Link className={styles.textLink} href={`/${props.path}`}>
        Reservar otro horario
      </Link>
    </section>
  );
}
