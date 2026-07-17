import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { moduloDaRota, TODOS_MODULOS } from "@/lib/auth/modulos";
import { TODOS_DEPARTAMENTOS } from "@/lib/auth/departamentos";
import { TODAS_ESTOQUE_CATEGORIAS } from "@/lib/auth/estoque-categorias";

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

  // Bloqueio por departamento + módulo. "Master" nunca é bloqueado. Três rotas entram aqui:
  //  - o hub de um departamento (/profissional, /base) — precisa ter aquele departamento liberado;
  //  - a rota de um módulo (ver lib/auth/modulos.ts) — precisa ter o departamento "futebol_profissional"
  //    (todo módulo hoje é desse departamento) E o próprio módulo liberado.
  // Quem ainda não tem essas colunas preenchidas (não deveria acontecer, já que a migration
  // preenche todo mundo) cai no padrão "tudo liberado", pra nunca bloquear por engano.
  const pathname = request.nextUrl.pathname;
  const modulo = user ? moduloDaRota(pathname) : undefined;
  const isHubProfissional = pathname === "/profissional";
  const isHubBase = pathname === "/base";
  // Estoque tem duas ramificações (Esportivo/Médico) com permissão própria — ver
  // lib/auth/estoque-categorias.ts. Só entra aqui pra uma URL tipo /estoque/<categoria>/..., não
  // pro hub /estoque em si (esse é filtrado na própria página, não bloqueado aqui).
  const estoqueCategoriaMatch =
    modulo?.chave === "estoque" ? pathname.match(/^\/estoque\/([^/]+)/) : null;
  const estoqueCategoria = estoqueCategoriaMatch ? estoqueCategoriaMatch[1] : null;

  if (user && (modulo || isHubProfissional || isHubBase)) {
    const { data: perfil } = await supabase
      .from("perfis")
      .select("role, modulos_permitidos, departamentos_permitidos, estoque_categorias_permitidas")
      .eq("id", user.id)
      .maybeSingle();
    const role = (perfil as { role?: string } | null)?.role ?? "regular";
    const modulosPermitidos =
      (perfil as { modulos_permitidos?: string[] } | null)?.modulos_permitidos ?? TODOS_MODULOS;
    const departamentosPermitidos =
      (perfil as { departamentos_permitidos?: string[] } | null)?.departamentos_permitidos ??
      TODOS_DEPARTAMENTOS;
    const estoqueCategoriasPermitidas =
      (perfil as { estoque_categorias_permitidas?: string[] } | null)?.estoque_categorias_permitidas ??
      TODAS_ESTOQUE_CATEGORIAS;

    if (role !== "master") {
      let redirecionarPara: string | null = null;

      if (modulo) {
        const semDepartamento = !departamentosPermitidos.includes("futebol_profissional");
        const semModulo = !modulosPermitidos.includes(modulo.chave);
        const semCategoriaEstoque =
          !!estoqueCategoria && !estoqueCategoriasPermitidas.includes(estoqueCategoria);
        if (semDepartamento) redirecionarPara = "/";
        else if (semModulo) redirecionarPara = "/profissional";
        else if (semCategoriaEstoque) redirecionarPara = "/estoque";
      } else if (isHubProfissional && !departamentosPermitidos.includes("futebol_profissional")) {
        redirecionarPara = "/";
      } else if (isHubBase && !departamentosPermitidos.includes("futebol_base")) {
        redirecionarPara = "/";
      }

      if (redirecionarPara) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = redirecionarPara;
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return supabaseResponse;
}
