import type { InputHTMLAttributes } from "react";
import { maskDecimalInput } from "../../utils/numberMask";

interface NumericInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode"> {
  value: string;
  onChange: (masked: string) => void;
  decimals?: number;
}

export function NumericInput({ value, onChange, decimals = 1, ...rest }: NumericInputProps) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(maskDecimalInput(e.target.value, decimals))}
    />
  );
}
