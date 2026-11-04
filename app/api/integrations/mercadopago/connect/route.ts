import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizationUrl } from "@/lib/integrations/mercadopago";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  // `state` anti-CSRF: se guarda en cookie httpOnly y se compara en el callback.
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(authorizationUrl(state));
  res.cookies.set("mp_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/integrations/mercadopago",
  });
  return res;
}
