import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { moduloDaRota, TODOS_MODULOS } from "@/lib/auth/modulos";
import { moduloBaseDaRota, TODOS_MODULOS_BASE } from "@/lib/auth/modulos-base";
import { TODOS_DEPARTAMENTOS } from "@/lib/auth/departamentos";
import { TODAS_ESTOQUE_CATEGORIAS } from "@/lib/auth/estoque-categorias";

// "/cadastro-staff" e "/cadastro-staff-base" são os links públicos de autocadastro de Staff
// Operacional (Profissional e Futebol de Base, respectivamente — a pessoa preenche sem fazer
// login). Não exigem sessão, mas também não dão acesso a mais nada do sistema: a gravação em si
// roda com a service_role key (lib/supabase/admin.ts), não com a sessão anônima do Supabase.
const PUBLIC_PATHS = ["/login", "/cadastro-staff", "/cadastro-staff-base"];

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

  // Bloqueio por departamento + módulo. "Master" nunca é bloqueado. Rotas que entram aqui:
  //  - o hub de um departamento (/profissional, /base) — precisa ter aquele departamento liberado;
  //  - a rota de um módulo do Profissional (ver lib/auth/modulos.ts) — precisa ter o departamento
  //    "futebol_profissional" E o próprio módulo liberado;
  //  - a rota de um módulo do Futebol de Base (ver lib/auth/modulos-base.ts) — mesma ideia, com o
  //    departamento "futebol_base" e `modulos_base_permitidos`.
  // Quem ainda não tem essas colunas preenchidas (não deveria acontecer, já que a migration
  // preenche todo mundo) cai no padrão "tudo liberado", pra nunca bloquear por engano.
  const pathname = request.nextUrl.pathname;
  const modulo = user ? moduloDaRota(pathname) : undefined;
  const moduloBase = user && !modulo ? moduloBaseDaRota(pathname) : undefined;
  const isHubProfissional = pathname === "/profissional";
  const isHubBase = pathname === "/base";
  // Estoque tem duas ramificações (Esportivo/Médico) com permissão própria — ver
  // lib/auth/estoque-categorias.ts. Só entra aqui pra uma URL tipo /estoque/<categoria>/..., não
  // pro hub /estoque em si (esse é filtrado na própria página, não bloqueado aqui). O Estoque do
  // Futebol de Base não tem essa dimensão (só existe Esportivo — ver a spec), então não precisa
  // do equivalente pra `/base/estoque`.
  const estoqueCategoriaMatch =
    modulo?.chave === "estoque" ? pathname.match(/^\/estoque\/([^/]+)/) : null;
  const estoqueCategoria = estoqueCategoriaMatch ? estoqueCategoriaMatch[1] : null;

  if (user && (modulo || moduloBase || isHubProfissional || isHubBase)) {
    const { data: perfil } = await supabase
      .from("perfis")
      .select(
        "role, modulos_permitidos, modulos_base_permitidos, departamentos_permitidos, estoque_categorias_permitidas",
      )
      .eq("id", user.id)
      .maybeSingle();
    const role = (perfil as { role?: string } | null)?.role ?? "regular";
    const modulosPermitidos =
      (perfil as { modulos_permitidos?: string[] } | null)?.modulos_permitidos ?? TODOS_MODULOS;
    const modulosBasePermitidos =
      (perfil as { modulos_base_permitidos?: string[] } | null)?.modulos_base_permitidos ??
      TODOS_MODULOS_BASE;
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
      } else if (moduloBase) {
        const semDepartamento = !departamentosPermitidos.includes("futebol_base");
        const semModulo = !modulosBasePermitidos.includes(moduloBase.chave);
        if (semDepartamento) redirecionarPara = "/";
        else if (semModulo) redirecionarPara = "/base";
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
