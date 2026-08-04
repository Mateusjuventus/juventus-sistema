import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { buscarConfigFpf } from "@/lib/fpf/sincronizar";
import { listarArtilharia, listarClassificacao, FpfApiError } from "@/lib/fpf/client";

/** Formata um valor "achando" o campo certo entre algumas variações plausíveis de nome — usado
 * porque os campos exatos de classificação/artilharia ainda não foram confirmados por captura de
 * rede real (ver aviso em lib/fpf/client.ts). */
function campo(item: Record<string, unknown>, ...chaves: string[]): string {
  for (const chave of chaves) {
    if (item[chave] != null) return String(item[chave]);
  }
  return "—";
}

export default async function CompeticaoFpfPage() {
  const supabase = createClient();
  const config = await buscarConfigFpf(supabase);

  if (!config) {
    return (
      <AppShell>
        <Link href="/jogos" className="text-sm font-medium text-grena hover:underline">
          ← Voltar para Jogos
        </Link>
        <PageHeader title="Dados da competição (FPF)" />
        <div className="card mt-4 p-4 text-sm text-neutral-600">
          A integração com a FPF ainda não foi configurada.{" "}
          <Link href="/jogos/fpf/configurar" className="font-medium text-grena hover:underline">
            Configurar agora
          </Link>
          .
        </div>
      </AppShell>
    );
  }

  const parametros = { idCampeonato: config.id_campeonato, ano: config.ano, idCategoria: config.id_categoria };

  const [classificacaoResultado, artilhariaResultado] = await Promise.allSettled([
    listarClassificacao(parametros),
    listarArtilharia(parametros),
  ]);

  return (
    <AppShell>
      <Link href="/jogos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Jogos
      </Link>
      <PageHeader title={config.nome_exibicao} />
      <p className="mt-1 text-center text-xs text-neutral-400">
        Dados ao vivo da FPF, sem cache — buscados a cada visita a essa página.
      </p>

      <div className="card mt-4 p-4">
        <h2 className="text-lg font-bold text-grena-escuro">Classificação</h2>
        {classificacaoResultado.status === "rejected" ? (
          <ErroFpf erro={classificacaoResultado.reason} />
        ) : classificacaoResultado.value.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">Nenhum dado de classificação disponível.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                  <th className="py-1 pr-2">Pos</th>
                  <th className="py-1 pr-2">Clube</th>
                  <th className="py-1 pr-2">Pts</th>
                  <th className="py-1 pr-2">J</th>
                  <th className="py-1 pr-2">V</th>
                  <th className="py-1 pr-2">E</th>
                  <th className="py-1 pr-2">D</th>
                  <th className="py-1 pr-2">SG</th>
                </tr>
              </thead>
              <tbody>
                {classificacaoResultado.value.map((item, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="py-1 pr-2">{campo(item, "Pos", "Posicao")}</td>
                    <td className="py-1 pr-2 font-medium">{campo(item, "Classificacao", "NomePopular", "Clube")}</td>
                    <td className="py-1 pr-2">{campo(item, "P", "Pontos")}</td>
                    <td className="py-1 pr-2">{campo(item, "J", "Jogos")}</td>
                    <td className="py-1 pr-2">{campo(item, "V", "Vitorias")}</td>
                    <td className="py-1 pr-2">{campo(item, "E", "Empates")}</td>
                    <td className="py-1 pr-2">{campo(item, "D", "Derrotas")}</td>
                    <td className="py-1 pr-2">{campo(item, "SG", "SaldoGols")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card mt-4 p-4">
        <h2 className="text-lg font-bold text-grena-escuro">Artilharia</h2>
        {artilhariaResultado.status === "rejected" ? (
          <ErroFpf erro={artilhariaResultado.reason} />
        ) : artilhariaResultado.value.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">Nenhum dado de artilharia disponível.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-1 text-sm">
            {artilhariaResultado.value.map((item, i) => (
              <div key={i} className="flex justify-between border-b border-neutral-100 py-1">
                <span>
                  {campo(item, "Jogador", "Nome", "NomeAtleta")} — {campo(item, "Clube", "NomePopularClube")}
                </span>
                <span className="font-medium">{campo(item, "Gols", "QtdGols")} gols</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ErroFpf({ erro }: { erro: unknown }) {
  const mensagem = erro instanceof FpfApiError ? erro.message : "Não foi possível carregar esses dados da FPF agora.";
  return <p className="mt-2 text-sm text-red-600">{mensagem}</p>;
}
