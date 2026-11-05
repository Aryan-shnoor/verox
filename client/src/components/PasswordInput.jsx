import { useState } from "react";
import { authInput, authInputError } from "../ui.js";

export default function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  minLength,
  placeholder,
  disabled,
  invalid,
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={onChange}
        className={`${invalid ? authInputError : authInput} pr-16`}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        disabled={disabled}
        className="absolute inset-y-0 right-0 px-3.5 text-sm font-semibold text-accent disabled:opacity-60"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
