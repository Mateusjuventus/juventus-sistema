"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import type SignaturePad from "signature_pad";
import { FormSection } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { PermissaoActionState } from "@/components/permissao-checkboxes-form";

const initialState: PermissaoActionState = {};

type Modo = "desenhar" | "anexar";

/** Converte o PNG exportado do canvas (`toDataURL`) num `File`, formato que a Server Action e
 * `uploadAssinatura` já esperam (mesmo tipo de um `<input type="file">`). */
function dataUrlParaArquivo(dataUrl: string, nome: string): File {
  const [cabecalho, base64] = dataUrl.split(",");
  const mime = cabecalho.match(/:(.*?);/)?.[1] ?? "image/png";
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new File([bytes], nome, { type: mime });
}

/**
 * "Minha assinatura", em `/minha-conta` (ver docs/superpowers/specs/2026-09-13-assinatura-
 * desenhada-design.md) — desenhar na tela (via `signature_pad`, único canvas de traço do sistema)
 * ou anexar uma imagem pronta; os dois caem no mesmo campo `arquivo` no envio. Não trata a imagem
 * de nenhuma forma (sem recorte, sem remover fundo) — sobe como veio, decisão da spec.
 */
export function MinhaAssinaturaForm({
  action,
  assinaturaUrl,
}: {
  action: (prevState: PermissaoActionState, formData: FormData) => Promise<PermissaoActionState>;
  assinaturaUrl: string | null;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const [modo, setModo] = useState<Modo>("desenhar");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (modo !== "desenhar" || !canvasRef.current) return;
    let cancelado = false;
    const canvas = canvasRef.current;

    import("signature_pad").then(({ default: SignaturePad }) => {
      if (cancelado || !canvas) return;
      // Redimensiona o canvas pra resolução real de tela (evita traço borrado em telas retina/celular).
      const proporcao = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * proporcao;
      canvas.height = canvas.offsetHeight * proporcao;
      canvas.getContext("2d")?.scale(proporcao, proporcao);
      padRef.current = new SignaturePad(canvas, { backgroundColor: "rgb(255,255,255)" });
    });

    return () => {
      cancelado = true;
      padRef.current?.off();
      padRef.current = null;
    };
  }, [modo]);

  return (
    <form
      action={(formData) => {
        if (modo === "desenhar" && padRef.current && !padRef.current.isEmpty()) {
          formData.set("arquivo", dataUrlParaArquivo(padRef.current.toDataURL("image/png"), "assinatura.png"));
        }
        formAction(formData);
      }}
      className="space-y-4"
    >
      <FormSection title="Minha assinatura">
        <p className="text-xs text-neutral-400">
          Desenhe ou anexe uma imagem da sua assinatura — ela é usada em todo documento que você assinar no sistema,
          seja clicando em &quot;Assinar&quot; ou automaticamente ao criar/enviar um documento seu.
        </p>

        {assinaturaUrl ? (
          <div className="rounded-md border border-linha bg-white p-3">
            <p className="field-label mb-1">Assinatura atual</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assinaturaUrl} alt="Sua assinatura salva" className="h-16 object-contain" />
          </div>
        ) : (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Você ainda não tem uma assinatura cadastrada — enquanto isso, não consegue assinar nem criar documentos
            que exigem assinatura automática (ex.: Solicitações, Relatório de Dispensa, Parecer de Captação).
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModo("desenhar")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              modo === "desenhar" ? "bg-grena text-white" : "bg-white text-neutral-600 ring-1 ring-linha hover:bg-neutral-50"
            }`}
          >
            Desenhar
          </button>
          <button
            type="button"
            onClick={() => setModo("anexar")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              modo === "anexar" ? "bg-grena text-white" : "bg-white text-neutral-600 ring-1 ring-linha hover:bg-neutral-50"
            }`}
          >
            Anexar imagem
          </button>
        </div>

        {modo === "desenhar" ? (
          <div className="space-y-2">
            <canvas ref={canvasRef} className="h-40 w-full rounded-md border border-linha bg-white" style={{ touchAction: "none" }} />
            <button type="button" onClick={() => padRef.current?.clear()} className="btn-secondary text-xs">
              Limpar
            </button>
          </div>
        ) : (
          <input type="file" name="arquivo" accept="image/*" className="field-input" />
        )}
      </FormSection>

      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.success ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</p> : null}

      <SubmitButton label="Salvar assinatura" pendingLabel="Salvando..." />
    </form>
  );
}
