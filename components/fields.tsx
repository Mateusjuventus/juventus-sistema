import type { ReactNode } from "react";

export function TextField({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  error,
  placeholder,
  min,
  maxLength,
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  min?: number;
  maxLength?: number;
  step?: string | number;
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        min={min}
        maxLength={maxLength}
        step={step}
        className="field-input"
      />
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  defaultValue,
  required,
  error,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  error?: string;
  rows?: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        rows={rows}
        className="field-input"
      />
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  required,
  error,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <select id={name} name={name} defaultValue={defaultValue ?? ""} required={required} className="field-input">
        {children}
      </select>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

/** Campo de texto livre com sugestões (via <datalist>) — aceita as sugestões ou qualquer outro valor digitado. */
export function SuggestionField({
  label,
  name,
  defaultValue,
  required,
  error,
  suggestions,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  suggestions: readonly string[];
}) {
  const listId = `${name}-suggestions`;
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        list={listId}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="field-input"
        placeholder="Selecione ou digite outra opção"
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="card space-y-4 p-5">
      <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-grena">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
