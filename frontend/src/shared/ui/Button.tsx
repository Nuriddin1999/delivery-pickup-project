import type { ButtonHTMLAttributes } from "react";
import { cn } from "./styles";

type Variant = "primary" | "secondary" | "link";

const variants: Record<Variant, string> = {
  primary: "rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700",
  secondary: "rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50",
  link: "text-blue-600 hover:underline",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "secondary", className, type = "button", ...rest }: Props) {
  return <button type={type} className={cn("cursor-pointer disabled:cursor-default disabled:opacity-50", variants[variant], className)} {...rest} />;
}
