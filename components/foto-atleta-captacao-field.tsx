"use client";

import { useRef, useState } from "react";

/**
 * Campo de foto específico da Captação (inscrição pública e cadastro interno) — pedido do Mateus:
 * a foto do candidato precisa sair já no formato 3:4 (retrato), porque é assim que ela aparece
 * depois no card de Atleta (`AtletaCard`/`AtletaAvatarBloco`, `aspect-[3/4]`, corte a partir do
 * topo) — inclusive é o mesmo formato que a Ficha de Avaliação física pedia ("02 Fotos 3x4"). Em
 * vez de confiar só no corte automático da tela (que pode cortar a cabeça se a foto não vier já
 * enquadrada), a pessoa ajusta o enquadramento na hora de enviar: arrasta pra reposicionar e usa um
 * controle de zoom, sempre dentro de uma moldura 3:4 — o que ela vê é exatamente o que vai ser
 * salvo.
 *
 * Fica de fora de `components/photo-field.tsx` (compartilhado por Atleta, Comissão Técnica, Staff,
 * item de Solicitação etc.) de propósito — pedido explícito do Mateus foi mexer só na Captação; os
 * outros cadastros continuam com o campo de foto simples de sempre.
 *
 * O arquivo de verdade que vai no FormData é o já recortado (gerado num <canvas>, convertido pra
 * File e atribuído ao <input type="file"> escondido via DataTransfer) — o campo visível serve só
 * pra escolher a foto original, nunca é o que é enviado.
 */

// Moldura de edição (px na tela) — 3:4 exato. Pequena o bastante pra caber em qualquer formulário
// (inclusive celular), grande o bastante pra dar pra enquadrar com precisão.
const FRAME_W = 220;
const FRAME_H = (FRAME_W * 4) / 3;
// Resolução de saída — 4x a moldura de edição, nitidez de sobra pro tamanho que a foto aparece no
// sistema (card de Atleta, avatar); `uploadFotoRedimensionada` ainda reduz no servidor se precisar.
const OUT_W = FRAME_W * 4;
const OUT_H = FRAME_H * 4;

interface Offset {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function FotoAtletaCaptacaoField({
  label,
  name,
  currentUrl,
  required = false,
  error,
}: {
  label: string;
  name: string;
  currentUrl?: string | null;
  required?: boolean;
  error?: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });

  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const arrastandoRef = useRef<{ pointerId: number; inicioPointer: Offset; inicioOffset: Offset } | null>(null);

  const baseScale = naturalSize ? Math.max(FRAME_W / naturalSize.w, FRAME_H / naturalSize.h) : 1;
  const effectiveScale = baseScale * zoom;
  const renderedW = naturalSize ? naturalSize.w * effectiveScale : 0;
  const renderedH = naturalSize ? naturalSize.h * effectiveScale : 0;

  function limites() {
    return {
      minX: Math.min(FRAME_W - renderedW, 0),
      maxX: 0,
      minY: Math.min(FRAME_H - renderedH, 0),
      maxY: 0,
    };
  }

  function selecionarArquivo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite escolher o mesmo arquivo de novo depois de cancelar
    if (!file) return;

    const leitor = new FileReader();
    leitor.onload = () => {
      setImgSrc(leitor.result as string);
      setNaturalSize(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    leitor.readAsDataURL(file);
  }

  function aoCarregarImagem(event: React.SyntheticEvent<HTMLImageElement>) {
    const w = event.currentTarget.naturalWidth;
    const h = event.currentTarget.naturalHeight;
    const escalaBase = Math.max(FRAME_W / w, FRAME_H / h);
    setNaturalSize({ w, h });
    // Centraliza o enquadramento inicial.
    setOffset({ x: (FRAME_W - w * escalaBase) / 2, y: (FRAME_H - h * escalaBase) / 2 });
  }

  function aoMudarZoom(novoZoom: number) {
    setZoom(novoZoom);
    if (!naturalSize) return;
    const escala = baseScale * novoZoom;
    const w = naturalSize.w * escala;
    const h = naturalSize.h * escala;
    setOffset((atual) => ({
      x: clamp(atual.x, Math.min(FRAME_W - w, 0), 0),
      y: clamp(atual.y, Math.min(FRAME_H - h, 0), 0),
    }));
  }

  function aoIniciarArraste(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    arrastandoRef.current = {
      pointerId: event.pointerId,
      inicioPointer: { x: event.clientX, y: event.clientY },
      inicioOffset: offset,
    };
  }

  function aoArrastar(event: React.PointerEvent<HTMLDivElement>) {
    const estado = arrastandoRef.current;
    if (!estado || estado.pointerId !== event.pointerId) return;
    const { minX, maxX, minY, maxY } = limites();
    const deltaX = event.clientX - estado.inicioPointer.x;
    const deltaY = event.clientY - estado.inicioPointer.y;
    setOffset({
      x: clamp(estado.inicioOffset.x + deltaX, minX, maxX),
      y: clamp(estado.inicioOffset.y + deltaY, minY, maxY),
    });
  }

  function aoSoltarArraste(event: React.PointerEvent<HTMLDivElement>) {
    if (arrastandoRef.current?.pointerId === event.pointerId) arrastandoRef.current = null;
  }

  function cancelarRecorte() {
    setImgSrc(null);
    setNaturalSize(null);
  }

  function confirmarRecorte() {
    const img = imgRef.current;
    if (!img || !naturalSize) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // sx/sy/sWidth/sHeight em pixels NATURAIS da imagem (dividindo pela escala efetiva) — a área
    // visível na moldura (FRAME_W x FRAME_H, na origem do frame) corresponde à posição -offset na
    // imagem renderizada; convertendo pra pixel natural, ambos entram na mesma escala do canvas de
    // saída (OUT_W x OUT_H tem a mesma proporção 3:4 da moldura).
    const sx = -offset.x / effectiveScale;
    const sy = -offset.y / effectiveScale;
    const sWidth = FRAME_W / effectiveScale;
    const sHeight = FRAME_H / effectiveScale;
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, OUT_W, OUT_H);

    canvas.toBlob(
      (blob) => {
        if (!blob || !hiddenInputRef.current) return;
        const file = new File([blob], "foto.jpg", { type: "image/jpeg" });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        hiddenInputRef.current.files = dataTransfer.files;

        setPreviewUrl(URL.createObjectURL(blob));
        setImgSrc(null);
        setNaturalSize(null);
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div>
      <label className="field-label">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>

      {imgSrc ? (
        <div className="space-y-3">
          <div
            className="relative overflow-hidden rounded-md border border-neutral-300 bg-neutral-900"
            style={{ width: FRAME_W, height: FRAME_H, touchAction: "none" }}
            onPointerDown={aoIniciarArraste}
            onPointerMove={aoArrastar}
            onPointerUp={aoSoltarArraste}
            onPointerCancel={aoSoltarArraste}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imgSrc}
              alt="Ajuste o enquadramento da foto"
              onLoad={aoCarregarImagem}
              draggable={false}
              className="absolute left-0 top-0 max-w-none select-none"
              style={{
                width: naturalSize ? renderedW : undefined,
                height: naturalSize ? renderedH : undefined,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                cursor: "grab",
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              onChange={(e) => aoMudarZoom(Number(e.target.value))}
              className="w-40"
            />
          </div>
          <p className="text-xs text-neutral-400">Arraste a foto pra ajustar o enquadramento.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmarRecorte}
              className="rounded-md bg-grena px-3 py-1.5 text-sm font-semibold text-white hover:bg-grena/90"
            >
              Usar esta foto
            </button>
            <button
              type="button"
              onClick={cancelarRecorte}
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Pré-visualização"
              className="h-32 w-24 rounded-md border border-neutral-200 object-cover"
            />
          ) : (
            <div className="flex h-32 w-24 items-center justify-center rounded-md border border-dashed border-neutral-300 text-xs text-neutral-400">
              sem foto
            </div>
          )}
          <div className="flex flex-col items-start gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={selecionarArquivo}
              className="text-sm"
            />
            <p className="max-w-[220px] text-xs text-neutral-400">
              Fundo neutro. Depois de escolher, dá pra ajustar o enquadramento antes de enviar.
            </p>
          </div>
        </div>
      )}

      {/* Arquivo de verdade que vai no envio — sempre o já recortado (ver `confirmarRecorte`),
          nunca o arquivo bruto escolhido no input visível acima. Sem `required` nativo de propósito:
          um <input type="file"> escondido (`display: none`) com `required` pode travar o envio sem
          feedback visível em alguns navegadores — a validação de "faltou a foto" já é feita no
          servidor (`fieldErrors.foto`, mesmo padrão dos outros uploads da Captação). */}
      <input ref={hiddenInputRef} type="file" name={name} className="hidden" />
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
