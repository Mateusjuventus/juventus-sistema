"use client";

import { useState } from "react";

/**
 * Campo de upload de foto/logo com preview local antes de salvar.
 *
 * `required`: quando true, marca o campo como obrigatório — mas o atributo HTML `required` só é
 * aplicado ao input de arquivo se ainda não existir uma foto salva (`currentUrl`), já que um input
 * type="file" não aceita valor padrão e não faz sentido forçar reenvio de quem já tem foto.
 *
 * `showDownload`: quando true e já existe uma foto (`currentUrl`), mostra um botão para baixar a
 * foto atual (faz o download de verdade via fetch + blob, em vez de só abrir numa aba nova).
 */
export function PhotoField({
  label,
  name,
  currentUrl,
  shape = "circle",
  required = false,
  showDownload = false,
  error,
}: {
  label: string;
  name: string;
  currentUrl?: string | null;
  shape?: "circle" | "square";
  required?: boolean;
  showDownload?: boolean;
  error?: string;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [baixando, setBaixando] = useState(false);
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-md";

  async function baixarFotoAtual() {
    if (!currentUrl || baixando) return;
    setBaixando(true);
    try {
      const resposta = await fetch(currentUrl);
      const blob = await resposta.blob();
      const extensao = blob.type.split("/").pop() || "jpg";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `foto.${extensao}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // Se o download via blob falhar (ex: CORS), abre a foto numa aba nova como alternativa.
      window.open(currentUrl, "_blank", "noopener,noreferrer");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Pré-visualização"
            className={`h-16 w-16 border border-neutral-200 object-cover ${shapeClass}`}
          />
        ) : (
          <div
            className={`flex h-16 w-16 items-center justify-center border border-dashed border-neutral-300 text-xs text-neutral-400 ${shapeClass}`}
          >
            sem foto
          </div>
        )}
        <div className="flex flex-col items-start gap-2">
          <input
            id={name}
            name={name}
            type="file"
            accept="image/*"
            required={required && !currentUrl}
            className="text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
            }}
          />
          {showDownload && currentUrl ? (
            <button
              type="button"
              onClick={baixarFotoAtual}
              disabled={baixando}
              className="text-xs font-medium text-grena underline disabled:opacity-50"
            >
              {baixando ? "Baixando..." : "Baixar foto atual"}
            </button>
          ) : null}
        </div>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
