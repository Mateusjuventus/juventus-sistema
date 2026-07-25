/**
 * Par label/valor pra telas de visualização (somente leitura) — mesmo estilo visual do
 * `field-label` usado nos formulários, só que mostrando o valor como texto em vez de um input.
 * Usado nas telas "Ver" (ex.: `app/atletas/[id]/ver/page.tsx`), que existem pra consultar um
 * cadastro rapidamente sem precisar abrir o formulário de edição.
 */
export function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <p className="text-sm text-neutral-800">{value && value.trim() ? value : "—"}</p>
    </div>
  );
}
