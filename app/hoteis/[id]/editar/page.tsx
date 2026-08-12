import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { HotelRow } from "@/lib/supabase/types";
import { atualizarHotel } from "../../actions";
import { HotelForm } from "../../hotel-form";

export default async function EditarHotelPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("hoteis").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const hotel = data as HotelRow;

  const action = atualizarHotel.bind(null, hotel.id);

  return (
    <AppShell>
      <Link href={`/hoteis/${hotel.id}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar para o hotel
      </Link>
      <PageHeader title="Editar Hotel" />
      <HotelForm hotel={hotel} action={action} submitLabel="Salvar alterações" />
    </AppShell>
  );
}
