"use client";

/**
 * Uma linha do checklist de preparação de jogo: caixinha de concluído + campo de prazo opcional.
 * Cada mudança salva na hora (sem precisar de botão "Salvar"), igual ao padrão já usado em
 * TarefaStatusSelect e StaffAtivoButton.
 */
export function ChecklistItemRow({
  item,
  jogoId,
  alternarAction,
  prazoAction,
}: {
  item: { id: string; item: string; concluido: boolean; prazo: string | null };
  jogoId: string;
  alternarAction: (formData: FormData) => Promise<void>;
  prazoAction: (formData: FormData) => Promise<void>;
}) {
  const hojeStr = new Date().toISOString().slice(0, 10);
  const atrasado = !item.concluido && item.prazo !== null && item.prazo < hojeStr;

  return (
    <div
      className={`card flex flex-wrap items-center gap-3 p-4 ${item.concluido ? "opacity-60" : ""}`}
    >
      <form action={alternarAction} className="flex flex-1 items-center gap-3">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="jogoId" value={jogoId} />
        <input type="hidden" name="novoValor" value={(!item.concluido).toString()} />
        <button
          type="submit"
          aria-label={item.concluido ? "Marcar como pendente" : "Marcar como concluído"}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
            item.concluido
              ? "border-green-600 bg-green-600 text-white"
              : "border-neutral-300 bg-white hover:border-grena"
          }`}
        >
          {item.concluido ? (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </button>
        <span
          className={`flex-1 text-sm font-medium ${
            item.concluido ? "text-neutral-500 line-through" : "text-neutral-800"
          }`}
        >
          {item.item}
        </span>
      </form>

      <form action={prazoAction} className="flex items-center gap-2">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="jogoId" value={jogoId} />
        <label className="text-xs text-neutral-500">Prazo</label>
        <input
          type="date"
          name="prazo"
          defaultValue={item.prazo ?? ""}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className={`field-input w-[150px] py-1 text-sm ${atrasado ? "border-red-400 text-red-700" : ""}`}
        />
      </form>
    </div>
  );
}
