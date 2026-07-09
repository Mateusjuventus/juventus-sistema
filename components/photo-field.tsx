"use client";

import { useState } from "react";

/** Campo de upload de foto/logo com preview local antes de salvar. */
export function PhotoField({
  label,
  name,
  currentUrl,
  shape = "circle",
}: {
  label: string;
  name: string;
  currentUrl?: string | null;
  shape?: "circle" | "square";
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-md";

  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
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
        <input
          id={name}
          name={name}
          type="file"
          accept="image/*"
          className="text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
          }}
        />
      </div>
    </div>
  );
}
