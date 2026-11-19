"use client";

import { ErrorScreen } from "../../error-screen";

/** A page of the panel failed: the message shows inside the panel's frame. */
export default function PanelError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <ErrorScreen
      error={error}
      retry={retry}
      title="No pudimos cargar esta página"
      message="Algo falló de nuestro lado. Probá de nuevo en un rato; si sigue pasando, avisanos."
      home={{ href: "/admin", label: "Ir a Inicio" }}
    />
  );
}
