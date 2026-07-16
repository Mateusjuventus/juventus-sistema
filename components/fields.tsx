import type { ReactNode } from "react";

export function TextField({
  label,
  name,
  id,
  defaultValue,
  type = "text",
  required,
  error,
  placeholder,
  min,
  maxLength,
  step,
  autoComplete,
}: {
  label: string;
  name: string;
  /** Opcional — usar quando o mesmo `name` se repete em várias linhas de um formulário dinâmico
   * (ex.: itens de uma lista), pra cada linha ter um `id`/`htmlFor` único (HTML não permite `id`
   * duplicado na mesma página). Se não vier, usa `name` como antes. */
  id?: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  min?: number;
  maxLength?: number;
  step?: string | number;
  autoComplete?: string;
}) {
  const fieldId = id ?? name;
  return (
    <div>
      <label htmlFor={fieldId} className="field-label">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <input
        id={fieldId}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        min={min}
        maxLength={maxLength}
        step={step}
        autoComplete={autoComplete}
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
  onChange,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  /** Opcional — só é preciso quando algum outro campo do formulário depende do valor escolhido
   * (ex.: mostrar/esconder campos conforme o tipo selecionado). Precisa vir de um componente
   * "use client", já que é um handler de evento. */
  onChange?: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="field-input"
      >
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
  id,
  defaultValue,
  required,
  error,
  suggestions,
  placeholder,
  onChange,
}: {
  label: string;
  name: string;
  /** Opcional — usar quando o mesmo `name` se repete em várias linhas de um formulário dinâmico,
   * pra cada linha ter um `id`/`htmlFor`/`list` único (HTML não permite `id` duplicado na mesma
   * página). Se não vier, usa `name` como antes. */
  id?: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  suggestions: readonly string[];
  placeholder?: string;
  /** Opcional — só é preciso quando algum outro campo do formulário depende do valor digitado (ex.:
   * mostrar uma dica de "item já cadastrado" enquanto a pessoa digita). Precisa vir de um
   * componente "use client", já que é um handler de evento. */
  onChange?: (value: string) => void;
}) {
  const fieldId = id ?? name;
  const listId = `${fieldId}-suggestions`;
  return (
    <div>
      <label htmlFor={fieldId} className="field-label">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <input
        id={fieldId}
        name={name}
        list={listId}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="field-input"
        placeholder={placeholder ?? "Selecione ou digite outra opção"}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
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
