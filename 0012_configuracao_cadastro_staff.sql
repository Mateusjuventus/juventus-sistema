"use client";

import { useEffect, useState } from "react";
import { alternarCadastroPublico } from "@/app/staff-operacional/cadastro-publico-actions";

/**
 * Liga/desliga o link público de autocadastro de Staff Operacional e mostra o link pronto pra
 * copiar (quando ativo). Só aparece dentro da tela de Staff Operacional, que já exige login.
 */
export function CadastroPublicoToggle({ id, ativo }: { id: string; ativo: boolean }) {
  const [origin, setOrigin] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const link = `${origin}/cadastro-staff`;

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard indisponível nesse navegador — a pessoa ainda pode selecionar e copiar manualmente.
    }
  }

  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      <span
        className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
          ativo ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
        }`}
      >
        Cadastro público: {ativo ? "Ativo" : "Inativo"}
      </span>

      {ativo ? (
        <>
          <input
            readOnly
            value={origin ? link : "Carregando link..."}
            onFocus={(e) => e.target.select()}
            className="field-input min-w-[240px] flex-1"
          />
          <button type="button" onClick={copiarLink} className="btn-secondary" disabled={!origin}>
            {copiado ? "Copiado!" : "Copiar link"}
          </button>
        </>
      ) : (
        <p className="text-sm text-neutral-500">
          O link está desligado — quem tentar abrir vê uma mensagem de cadastro fechado.
        </p>
      )}

      <form action={alternarCadastroPublico} className="ml-auto">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="novoValor" value={(!ativo).toString()} />
        <button type="submit" className={ativo ? "btn-secondary" : "btn-primary"}>
          {ativo ? "Desativar cadastro público" : "Ativar cadastro público"}
        </button>
      </form>
    </div>
  );
}
