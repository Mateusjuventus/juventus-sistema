import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { moduloDaRota, TODOS_MODULOS } from "@/lib/auth/modulos";

// "/cadastro-staff" é o link público de autocadastro de Staff Operacional (a pessoa preenche sem
// fazer login) — ver app/cadastro-staff. Não exige sessão, mas também não dá acesso a mais nada do
// sistema: a gravação em si roda com a service_role key (lib/supabase/admin.ts), não com a sessão
// anônima do Supabase.
const PUBLIC_PATHS = ["/login", "/cadastro-staff"];

/**
 * Mantém a sessão do Supabase atualizada a cada request e bloqueia acesso
 * a qualquer rota do sistema para quem não estiver autenticado.
 * Chamado pelo middleware.ts na raiz do projeto.
 */
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
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Bloqueio por módulo: só entra aqui se a rota pertencer a um dos módulos com permissão
  // configurável (ver lib/auth/modulos.ts). "Master" nunca é bloqueado. "Regular" só passa se o
  // módulo estiver em `modulos_permitidos` — quem ainda não tem essa coluna preenchida (não
  // deveria acontecer, já que a migration preenche todo mundo) cai no padrão "todos os módulos",
  // pra nunca bloquear por engano.
  const modulo = user ? moduloDaRota(request.nextUrl.pathname) : undefined;
  if (user && modulo) {
    const { data: perfil } = await supabase
      .from("perfis")
      .select("role, modulos_permitidos")
      .eq("id", user.id)
      .maybeSingle();
    const role = (perfil as { role?: string } | null)?.role ?? "regular";
    const modulosPermitidos =
      (perfil as { modulos_permitidos?: string[] } | null)?.modulos_permitidos ?? TODOS_MODULOS;

    if (role !== "master" && !modulosPermitidos.includes(modulo.chave)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/profissional";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
