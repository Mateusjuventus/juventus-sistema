"use client";

import { useState } from "react";
import { CurrencyInput } from "@/components/currency-field";
import { STAFF_CHAVE_PIX_TIPOS } from "@/lib/validation/schemas";
import { formatarChavePix, placeholderChavePix } from "@/lib/validation/chave-pix";

/**
 * Uma linha da tabela de Recibos de Jogos (Profissional e Base — ver recibo-form.tsx/
 * recibo-form-base.tsx) — extraída num componente próprio porque a máscara da Chave PIX depende do
 * Tipo escolhido NESSA linha (precisa de estado local por linha, não dá pra fazer isso inline num
 * `.map()`). Cada campo usa um nome de FormData dinâmico (`chavePix_${pessoaTipo}_${pessoaId}`
 * etc.) — sem isso, `saveRecibo`/`saveReciboBase` (em operacao-actions.ts) não conseguiriam separar
 * os valores de cada pessoa depois de submeter.
 */
export function ReciboLinha({
  pessoaTipo,
  pessoaId,
  nome,
  extra,
  funcaoJogoDefault,
  valorDefault,
  chavePixDefault,
  chavePixTipoDefault,
  pagoDefault,
  incluido,
  onToggleIncluido,
}: {
  pessoaTipo: string;
  pessoaId: string;
  nome: string;
  extra: string;
  funcaoJogoDefault: string;
  valorDefault: number | string;
  chavePixDefault: string;
  chavePixTipoDefault: string;
  pagoDefault: boolean;
  /** Se a pessoa participa desse jogo — controla se a linha é salva e entra nos PDFs. */
  incluido: boolean;
  onToggleIncluido: () => void;
}) {
  const [tipo, setTipo] = useState(chavePixTipoDefault);
  const [chave, setChave] = useState(() => formatarChavePix(chavePixDefault, chavePixTipoDefault));

  return (
    <tr className={incluido ? undefined : "opacity-50"}>
      <td className="py-2 pr-3">
        <input
          type="checkbox"
          name={`incluir_${pessoaTipo}_${pessoaId}`}
          checked={incluido}
          onChange={onToggleIncluido}
          className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
        />
      </td>
      <td className="py-2 pr-3 font-medium text-neutral-800">
        <input type="hidden" name={`nome_${pessoaTipo}_${pessoaId}`} value={nome} />
        {nome} <span className="text-neutral-400">— {extra}</span>
      </td>
      <td className="py-2 pr-3">
        <input
          type="text"
          name={`funcao_${pessoaTipo}_${pessoaId}`}
          defaultValue={funcaoJogoDefault}
          placeholder="Ex: Segurança portão 3"
          className="field-input"
        />
      </td>
      <td className="py-2 pr-3">
        <CurrencyInput name={`valor_${pessoaTipo}_${pessoaId}`} defaultValue={valorDefault} />
      </td>
      <td className="py-2 pr-3">
        <select
          name={`chavePixTipo_${pessoaTipo}_${pessoaId}`}
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value);
            setChave((atual) => formatarChavePix(atual, e.target.value));
          }}
          className="field-input"
        >
          <option value="">Selecione</option>
          {STAFF_CHAVE_PIX_TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-3">
        <input
          type="text"
          name={`chavePix_${pessoaTipo}_${pessoaId}`}
          value={chave}
          onChange={(e) => setChave(formatarChavePix(e.target.value, tipo))}
          placeholder={placeholderChavePix(tipo) ?? "Ex: (11) 92000-0357"}
          className="field-input"
        />
      </td>
      <td className="py-2">
        <input
          type="checkbox"
          name={`pago_${pessoaTipo}_${pessoaId}`}
          defaultChecked={pagoDefault}
          className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
        />
      </td>
    </tr>
  );
}
