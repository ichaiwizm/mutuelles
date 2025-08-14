import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;   // current
  max: number;     // total
  label?: string;  // optional label
}

export function Progress({ value, max, label, className, ...props }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));
  
  return (
    <div className={cn("w-full space-y-1", className)} {...props}>
      {label ? <div className="text-xs text-slate-600">{label}</div> : null}
      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[11px] text-slate-500">{value} / {max}</div>
    </div>
  );
}