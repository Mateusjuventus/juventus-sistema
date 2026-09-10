import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Cabeçalho compartilhado pelas três abas do perfil do atleta (Dados Pessoais / Documentação /
 * Dados de Jogo) — nome, foto, subtítulo (posição/número) e o botão "Editar". Recebe tudo já
 * formatado em props pra funcionar igual nos dois departamentos (o rótulo de categoria do Base já
 * vem embutido no `subtitulo`, ver as páginas que usam este componente).
 */
export function AtletaPerfilHeader({
  nome,
  apelido,
  subtitulo,
  fotoUrl,
  editarHref,
  ativo = true,
  acoesExtra,
}: {
  nome: string;
  apelido: string | null;
  subtitulo: string;
  fotoUrl: string | null;
  editarHref: string;
  /** `false` mostra o selo "Inativo" ao lado do nome (ver 0098_atleta_ativo.sql) — `true` por
   * padrão pra não quebrar quem ainda não passa essa prop. */
  ativo?: boolean;
  /** Botão(ões) extra(s) entre o nome e "Editar" — hoje só o Ativar/Desativar
   * (`AtletaAtivoButton`), mas fica genérico pra não precisar mudar a assinatura de novo. */
  acoesExtra?: ReactNode;
}) {
  return (
    <>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-grena-escuro">{nome}</h1>
          {!ativo ? (
            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-600">
              Inativo
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {acoesExtra}
          <Link href={editarHref} className="btn-primary">
            Editar
          </Link>
        </div>
      </div>

      <div className="card mt-4 flex items-center gap-4 p-5">
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoUrl}
            alt={nome}
            className="h-24 w-24 flex-shrink-0 rounded-full object-cover ring-2 ring-neutral-100"
          />
        ) : (
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-2xl font-bold text-neutral-400">
            {nome.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-lg font-semibold text-neutral-800">{nome}</p>
          {apelido ? <p className="text-sm text-neutral-500">&ldquo;{apelido}&rdquo;</p> : null}
          <p className="mt-1 text-sm text-neutral-500">{subtitulo}</p>
        </div>
      </div>
    </>
  );
}
