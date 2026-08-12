import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { criarHotel } from "../actions";
import { HotelForm } from "../hotel-form";

export default function NovoHotelPage() {
  return (
    <AppShell>
      <Link href="/hoteis" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Hotéis
      </Link>
      <PageHeader title="Novo Hotel" />
      <p className="mt-1 text-center text-sm text-neutral-500">
        Só o nome é obrigatório — o resto pode ser completado depois.
      </p>
      <HotelForm action={criarHotel} submitLabel="Salvar hotel" />
    </AppShell>
  );
}
