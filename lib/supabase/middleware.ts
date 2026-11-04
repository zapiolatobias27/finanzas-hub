import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  let {
    data: { user },
  } = await supabase.auth.getUser();

  // Auto-login SOLO en `next dev`: entra con el usuario de prueba de .env.local para saltear el login.
  const devEmail = process.env.DEV_LOGIN_EMAIL;
  const devPassword = process.env.DEV_LOGIN_PASSWORD;
  if (!user && process.env.NODE_ENV === "development" && devEmail && devPassword) {
    const { data } = await supabase.auth.signInWithPassword({ email: devEmail, password: devPassword });
    user = data.user;
  }

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  if (!user && !isPublic) return redirectKeepingCookies(request, response, "/login");
  if (user && path.startsWith("/login")) return redirectKeepingCookies(request, response, "/");
  return response;
}

/** Redirige sin perder las cookies de sesión que Supabase haya seteado en `response`. */
function redirectKeepingCookies(request: NextRequest, response: NextResponse, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
