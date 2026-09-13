import { Pool } from "pg";

/**
 * Conexão direta com o Postgres do Supabase — passa por cima da API (PostgREST/service_role) que a
 * tela pública de Vagas de Staff normalmente usa. Existe só por causa de uma investigação longa
 * (ver docs/superpowers/specs/2026-09-13-vagas-leitura-direta-banco-design.md): cadastros novos e
 * remoções às vezes demoravam pra aparecer/desaparecer na tela pública mesmo com tudo certo no
 * banco — e o SQL Editor do Supabase, que também conecta direto (sem passar pela API), nunca
 * mostrou esse atraso em nenhum teste feito durante a investigação.
 *
 * Precisa da variável de ambiente `SUPABASE_DIRECT_DB_URL` — a "Direct connection" do painel do
 * Supabase (Project Settings → Database → Connection string → aba "Direct connection", com a senha
 * do banco no lugar de [YOUR-PASSWORD]). Sem essa variável configurada, `queryDireto` lança erro —
 * quem chama deve tratar isso como "a leitura direta não está disponível agora" e cair de volta na
 * consulta normal (ver o uso em `app/vagas/[token]/page.tsx` e `app/vagas-base/[token]/page.tsx`),
 * nunca deixar a página inteira quebrar por causa disso.
 */

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.SUPABASE_DIRECT_DB_URL;
  if (!connectionString) {
    throw new Error(
      "SUPABASE_DIRECT_DB_URL não configurada. Copie a 'Direct connection' em Project Settings → " +
        "Database no painel do Supabase e adicione essa variável de ambiente antes de usar a leitura direta.",
    );
  }

  // `max: 2` de propósito: essa conexão serve só a lista de nomes de duas telas de baixo tráfego —
  // não precisa (e não deve) competir por conexões com o resto do sistema, que já usa o pooler do
  // Supabase via PostgREST. O Supabase free tier tem um limite baixo de conexões diretas simultâneas.
  pool = new Pool({ connectionString, max: 2, ssl: { rejectUnauthorized: false } });
  pool.on("error", (err) => console.error("[direct-db] erro na conexão ociosa do pool:", err));
  return pool;
}

/** Roda uma consulta direto no Postgres, sem passar pela API do Supabase. Lança erro se a variável
 * de ambiente não estiver configurada ou se a conexão falhar — quem chama decide o que fazer
 * (normalmente: cair de volta na consulta via `createAdminClient()`). */
export async function queryDireto<T = Record<string, unknown>>(
  texto: string,
  valores: unknown[] = [],
): Promise<T[]> {
  const resultado = await getPool().query(texto, valores);
  return resultado.rows as T[];
}
