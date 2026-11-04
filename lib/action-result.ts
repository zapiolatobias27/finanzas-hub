export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; errors?: Record<string, string[] | undefined>; message?: string };
