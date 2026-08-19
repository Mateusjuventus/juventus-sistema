import { CATEGORIA_POSICAO_OPTIONS } from "@/lib/futebol/categoria-posicao";
import { nomeCampograma, type GrupoCampograma } from "@/lib/futebol/campograma";

/** Ordem de exibição no campo, do ataque (topo) pro gol (base) — é como o olho lê uma escalação. */
const ORDEM_LINHAS = [
  { chave: "atacante", label: "Atacantes" },
  { chave: "meia", label: "Meias" },
  { chave: "lateral", label: "Laterais" },
  { chave: "zagueiro", label: "Zagueiros" },
  { chave: "goleiro", label: "Goleiros" },
] as const;

/**
 * Campograma: o elenco de uma categoria, desenhado num campo e separado por posição — não é a
 * escalação de um jogo (isso já existe na Súmula/Presskit), é "quantos zagueiros o Sub-17 tem e
 * quem são" (ver docs/superpowers/specs/2026-08-19-captacao-base-design.md).
 */
export function CampogramaPitch({ grupos }: { grupos: GrupoCampograma }) {
  const semPosicao = grupos.sem_posicao;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-4 border-white bg-emerald-700 p-4 shadow-inner sm:p-6">
        <div className="relative space-y-3 rounded-md border-2 border-white/40 p-3">
          {/* Círculo central só decorativo, pra parecer campo mesmo */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
          {ORDEM_LINHAS.map((linha) => {
            const jogadores = grupos[linha.chave];
            return (
              <div key={linha.chave} className="relative">
                <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-white/70">
                  {linha.label} ({jogadores.length})
                </p>
                {jogadores.length === 0 ? (
                  <div className="flex justify-center">
                    <span className="rounded-full border border-dashed border-white/30 px-3 py-1 text-xs text-white/50">
                      Ninguém cadastrado
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {jogadores.map((j) => (
                      <span
                        key={j.id}
                        className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-900 shadow"
                        title={j.nome}
                      >
                        {j.numeroCamisa != null ? (
                          <span className="text-[10px] font-bold text-emerald-600">{j.numeroCamisa}</span>
                        ) : null}
                        {nomeCampograma(j)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {semPosicao.length > 0 ? (
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Sem posição classificada ({semPosicao.length})
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Preencha o campo Categoria de posição no cadastro pra esses atletas aparecerem no campo
            acima.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {semPosicao.map((j) => (
              <span key={j.id} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                {nomeCampograma(j)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-center gap-3 text-xs text-neutral-400">
        {CATEGORIA_POSICAO_OPTIONS.map((o) => (
          <span key={o.value}>
            {o.label}: {grupos[o.value].length}
          </span>
        ))}
      </div>
    </div>
  );
}
