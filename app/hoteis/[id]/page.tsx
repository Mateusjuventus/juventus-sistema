import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { cidadeUf, enderecoCompleto, estruturaDoHotel, formatDiaria } from "@/lib/futebol/hotel";
import type { HotelRow } from "@/lib/supabase/types";
import { excluirHotel } from "../actions";

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-neutral-500">{rotulo}</dt>
      <dd className="text-right font-medium text-neutral-800">{valor}</dd>
    </div>
  );
}

export default async function HotelDetalhePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("hoteis").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const hotel = data as HotelRow;

  const endereco = enderecoCompleto(hotel);
  const estrutura = estruturaDoHotel(hotel);

  return (
    <AppShell>
      <Link href="/hoteis" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Hotéis
      </Link>
      <PageHeader title={hotel.nome} />
      <p className="mt-1 text-center text-sm text-neutral-500">
        {cidadeUf(hotel) || "Cidade não informada"}
        {hotel.ativo ? "" : " · inativo"}
      </p>

      <div className="mt-4 flex justify-center">
        <Link href={`/hoteis/${hotel.id}/editar`} className="btn-primary">
          Editar
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-base font-bold text-grena-escuro">Endereço e contato</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Linha rotulo="Endereço" valor={endereco || null} />
            <Linha rotulo="CNPJ" valor={hotel.cnpj} />
            <Linha rotulo="Telefone" valor={hotel.telefone} />
            <Linha rotulo="WhatsApp" valor={hotel.whatsapp} />
            <Linha rotulo="E-mail" valor={hotel.email} />
            <Linha rotulo="Site" valor={hotel.site} />
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="text-base font-bold text-grena-escuro">Hospedagem</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Linha
              rotulo="Diária de referência"
              valor={hotel.diaria_referencia === null ? null : formatDiaria(hotel.diaria_referencia)}
            />
            <Linha rotulo="Check-in padrão" valor={hotel.horario_checkin} />
            <Linha rotulo="Check-out padrão" valor={hotel.horario_checkout} />
          </dl>
          {estrutura.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {estrutura.map((item) => (
                <span key={item} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {hotel.contato_nome || hotel.contato_telefone || hotel.contato_email ? (
          <section className="card p-5">
            <h2 className="text-base font-bold text-grena-escuro">Contato no hotel</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Linha rotulo="Nome" valor={hotel.contato_nome} />
              <Linha rotulo="Função" valor={hotel.contato_funcao} />
              <Linha rotulo="Telefone" valor={hotel.contato_telefone} />
              <Linha rotulo="E-mail" valor={hotel.contato_email} />
            </dl>
          </section>
        ) : null}

        {hotel.observacoes ? (
          <section className="card p-5">
            <h2 className="text-base font-bold text-grena-escuro">Observações</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{hotel.observacoes}</p>
          </section>
        ) : null}
      </div>

      <div className="mt-8 flex justify-end border-t border-linha pt-4">
        <DeleteButton action={excluirHotel} id={hotel.id} entityLabel="hotel" />
      </div>
    </AppShell>
  );
}
