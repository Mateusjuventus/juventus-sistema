import { AppShell } from "@/components/app-shell";
import { StaffForm } from "../staff-form";
import { createStaff } from "../actions";

export default function NovoStaffPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-grena-escuro">Novo staff operacional</h1>
      <div className="mt-4">
        <StaffForm action={createStaff} submitLabel="Cadastrar" />
      </div>
    </AppShell>
  );
}
