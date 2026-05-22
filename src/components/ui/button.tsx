import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "xl" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] cursor-pointer",
          {
            "bg-slate-900 text-white hover:bg-slate-800 shadow-sm":
              variant === "default",
            "bg-red-500 text-white hover:bg-red-600 shadow-sm":
              variant === "destructive",
            "border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-900":
              variant === "outline",
            "bg-slate-100 text-slate-900 hover:bg-slate-200":
              variant === "secondary",
            "hover:bg-slate-100 text-slate-900": variant === "ghost",
            "text-blue-600 underline-offset-4 hover:underline":
              variant === "link",
          },
          {
            "h-10 px-4 py-2 text-sm": size === "default",
            "h-8 px-3 text-xs": size === "sm",
            "h-12 px-6 text-base": size === "lg",
            "h-16 px-8 text-lg": size === "xl",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
