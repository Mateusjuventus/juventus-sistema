import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { cidadeUf, estruturaDoHotel, formatDiaria } from "@/lib/futebol/hotel";
import { createClient } from "@/lib/supabase/server";
import type { HotelRow } from "@/lib/supabase/types";
import { HotelAtivoButton } from "./hotel-ativo-button";
import { alternarHotelAtivo } from "./actions";

/**
 * Lista do cadastro de Hotéis. O filtro por cidade é o que mais se usa na prática — a pergunta
 * quase sempre é "onde a gente já ficou em Ribeirão?" — então ele vem como select montado a partir
 * das cidades que já existem no cadastro, sem lista fixa de municípios.
 */
export default async function HoteisPage({ searchParams }: { searchParams: { q?: string; cidade?: string } }) {
  const q = searchParams.q?.trim() ?? "";
  const cidade = searchParams.cidade?.trim() ?? "";
  const supabase = createClient();

  let query = supabase.from("hoteis").select("*").order("nome", { ascending: true });
  if (q) query = query.or(`nome.ilike.%${q}%,cidade.ilike.%${q}%`);
  if (cidade) query = query.eq("cidade", cidade);

  const { data, error } = await query;
  const hoteis = (data ?? []) as HotelRow[];

  const { data: todosData } = await supabase.from("hoteis").select("cidade");
  const cidades = Array.from(
    new Set(((todosData ?? []) as { cidade: string | null }[]).map((h) => h.cidade).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const ativos = hoteis.filter((h) => h.ativo);
  const inativos = hoteis.filter((h) => !h.ativo);

  return (
    <AppShell>
      <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Hotéis" />
      <p className="mt-1 text-center text-sm text-neutral-500">
        Banco de dados dos hotéis do clube — na Rooming List de um jogo dá pra escolher um daqui e o
        nome e o endereço já vêm preenchidos.
      </p>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Link href="/hoteis/novo" className="btn-primary">
          + Novo hotel
        </Link>
      </div>

      <div className="card mt-4 p-4">
        <SearchBar action="/hoteis" defaultValue={q} placeholder="Buscar por nome ou cidade...">
          <div className="min-w-[180px]">
            <label htmlFor="cidade" className="field-label">
              Cidade
            </label>
            <select id="cidade" name="cidade" defaultValue={cidade} className="field-input">
              <option value="">Todas</option>
              {cidades.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </SearchBar>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar os hotéis. Verifique se a migração 0070 já foi aplicada no Supabase.
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {ativos.map((hotel) => (
          <CartaoHotel key={hotel.id} hotel={hotel} />
        ))}
      </div>

      {ativos.length === 0 && !error ? (
        <p className="card mt-4 px-4 py-8 text-center text-neutral-400">
          Nenhum hotel cadastrado ainda.
        </p>
      ) : null}

      {inativos.length > 0 ? (
        <details className="mt-6 rounded-lg border border-neutral-200">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-neutral-600">
            Inativos ({inativos.length})
          </summary>
          <div className="grid gap-3 border-t border-neutral-200 p-3 md:grid-cols-2">
            {inativos.map((hotel) => (
              <CartaoHotel key={hotel.id} hotel={hotel} opaco />
            ))}
          </div>
        </details>
      ) : null}
    </AppShell>
  );
}

function CartaoHotel({ hotel, opaco }: { hotel: HotelRow; opaco?: boolean }) {
  const local = cidadeUf(hotel);
  const estrutura = estruturaDoHotel(hotel);

  return (
    <div className={`card flex flex-col gap-2 p-4 ${opaco ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/hoteis/${hotel.id}`} className="text-base font-bold text-grena-escuro hover:underline">
            {hotel.nome}
          </Link>
          {local ? <p className="text-sm text-neutral-500">{local}</p> : null}
        </div>
        <HotelAtivoButton action={alternarHotelAtivo} id={hotel.id} ativo={hotel.ativo} />
      </div>

      <dl className="space-y-1 text-sm text-neutral-600">
        {hotel.telefone || hotel.whatsapp ? (
          <div>
            <span className="text-neutral-400">Telefone: </span>
            {[hotel.telefone, hotel.whatsapp].filter(Boolean).join(" · ")}
          </div>
        ) : null}
        {hotel.email ? (
          <div>
            <span className="text-neutral-400">E-mail: </span>
            {hotel.email}
          </div>
        ) : null}
        {hotel.contato_nome ? (
          <div>
            <span className="text-neutral-400">Contato: </span>
            {hotel.contato_nome}
            {hotel.contato_funcao ? ` (${hotel.contato_funcao})` : ""}
          </div>
        ) : null}
        {hotel.diaria_referencia !== null ? (
          <div>
            <span className="text-neutral-400">Diária de referência: </span>
            {formatDiaria(hotel.diaria_referencia)}
          </div>
        ) : null}
      </dl>

      {estrutura.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {estrutura.map((item) => (
            <span key={item} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
