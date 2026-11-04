import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { exchangeCode } from "@/lib/integrations/mercadopago";
import { saveIntegration, syncMercadoPago } from "@/lib/integrations/sync";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.object({ code: z.string().min(1), state: z.string().min(1) });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (status: string) => {
    const res = NextResponse.redirect(new URL(`/?mp=${status}`, url.origin));
    res.cookies.delete({ name: "mp_oauth_state", path: "/api/integrations/mercadopago" });
    return res;
  };

  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  const expectedState = cookies().get("mp_oauth_state")?.value;
  if (!parsed.success || !expectedState || parsed.data.state !== expectedState) return back("invalid_state");

  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

  try {
    const token = await exchangeCode(parsed.data.code);
    await saveIntegration(user.id, "mercadopago", token, token.user_id);
    await syncMercadoPago(user.id);
    return back("ok");
  } catch (e) {
    console.error("[mercadopago] callback", e);
    return back("error");
  }
}
