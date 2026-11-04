"use client";

import { Trash2 } from "lucide-react";

/** Botón de borrar con confirmación (las acciones destructivas nunca son inmediatas). */
export function ConfirmDelete({ action, label, confirmText }: { action: () => Promise<void>; label: string; confirmText: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <button className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-faint transition-colors hover:bg-danger/10 hover:text-danger" aria-label={label}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}
