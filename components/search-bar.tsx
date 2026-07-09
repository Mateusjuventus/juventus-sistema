import type { ReactNode } from "react";

export function SearchBar({
  action,
  defaultValue,
  placeholder = "Buscar por nome...",
  children,
}: {
  action: string;
  defaultValue?: string;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <form action={action} method="get" className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <label htmlFor="q" className="field-label">
          Buscar
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="field-input"
        />
      </div>
      {children}
      <button type="submit" className="btn-secondary">
        Filtrar
      </button>
    </form>
  );
}
