"use client";

import { useState } from "react";
import { SelectField } from "@/components/fields";
import { STAFF_CHAVE_PIX_TIPOS } from "@/lib/validation/schemas";
import { formatarChavePix, placeholderChavePix } from "@/lib/validation/chave-pix";

/**
 * Par "Tipo de chave PIX" + "Chave PIX" — nessa ordem (o tipo vem primeiro porque decide o formato
 * do campo de chave logo abaixo: escolhendo CPF/CNPJ/Telefone, o campo formata sozinho enquanto
 * digita, igual um app de banco). Usado em todo formulário que tem os dois campos juntos (Staff
 * Operacional, Cadastro público de Staff, Solicitações de Pagamento/Reembolso — ver
 * `lib/validation/chave-pix.ts` pra máscara/validação compartilhadas com o server).
 *
 * `nomeTipo`/`nomeChave` por padrão são os nomes de sempre (`chavePixTipo`/`chavePix`) — só mudam
 * quando o mesmo par aparece várias vezes na mesma página com nomes dinâmicos (ver os Recibos de
 * Jogos, que usam `chavePixTipo_${pessoa}` etc.).
 */
export function ChavePixFields({
  tipoDefaultValue,
  chaveDefaultValue,
  tipoError,
  chaveError,
  chaveRequired,
  nomeTipo = "chavePixTipo",
  nomeChave = "chavePix",
}: {
  tipoDefaultValue?: string;
  chaveDefaultValue?: string;
  tipoError?: string;
  chaveError?: string;
  chaveRequired?: boolean;
  nomeTipo?: string;
  nomeChave?: string;
}) {
  const [tipo, setTipo] = useState(tipoDefaultValue ?? "");
  const [chave, setChave] = useState(() => formatarChavePix(chaveDefaultValue ?? "", tipoDefaultValue));

  return (
    <>
      <SelectField
        label="Tipo de chave PIX"
        name={nomeTipo}
        defaultValue={tipo}
        error={tipoError}
        onChange={(novoTipo) => {
          setTipo(novoTipo);
          setChave((atual) => formatarChavePix(atual, novoTipo));
        }}
      >
        <option value="">Selecione</option>
        {STAFF_CHAVE_PIX_TIPOS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </SelectField>
      <div>
        <label htmlFor={nomeChave} className="field-label">
          Chave PIX{chaveRequired ? <span className="text-red-700"> *</span> : null}
        </label>
        <input
          id={nomeChave}
          name={nomeChave}
          required={chaveRequired}
          autoComplete="off"
          placeholder={placeholderChavePix(tipo)}
          className="field-input"
          value={chave}
          onChange={(e) => setChave(formatarChavePix(e.target.value, tipo))}
        />
        {chaveError ? <p className="field-error">{chaveError}</p> : null}
      </div>
    </>
  );
}
