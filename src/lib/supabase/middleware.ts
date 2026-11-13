import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const APP_PATHS = ["/hoy", "/rutina", "/ejercicios", "/cuenta", "/sesion", "/generar"];
const PUBLIC_AUTH_PATHS = ["/login"];
const ONBOARDING_PATH = "/onboarding";

function matches(pathname: string, bases: string[]) {
  return bases.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isApp = matches(pathname, APP_PATHS);
  const isOnboarding = pathname === ONBOARDING_PATH;
  const isAuth = matches(pathname, PUBLIC_AUTH_PATHS);

  // Sin sesión → rutas protegidas van a /login.
  if (!user && (isApp || isOnboarding)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Con sesión en /login → a /hoy (o a onboarding si el perfil está incompleto).
  if (user && isAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/hoy";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Con sesión y perfil incompleto → forzar onboarding.
  if (user && isApp) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nombre, nivel, objetivo")
      .eq("id", user.id)
      .maybeSingle();
    const complete = !!(profile?.nombre && profile.nivel && profile.objetivo);
    if (!complete) {
      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_PATH;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
