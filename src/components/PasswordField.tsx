import { useId } from "react";

export function PasswordField({ id, name, required = true, placeholder = "" }: { id?: string; name: string; required?: boolean; placeholder?: string }) {
  const fallbackId = useId();
  const inputId = id || fallbackId;
  return (
    <input
      type="password"
      id={inputId}
      name={name}
      required={required}
      placeholder={placeholder}
      autoComplete="current-password"
      className="input"
    />
  );
}