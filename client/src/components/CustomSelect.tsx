import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-left focus:outline-none focus:border-blue-500 flex items-center justify-between gap-2 transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-slate-700"
        } ${selected ? "text-slate-300" : "text-slate-500"}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 animate-in fade-in">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">No options</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  opt.value === value
                    ? "bg-blue-600/20 text-blue-400 font-semibold"
                    : "text-slate-300 hover:bg-slate-850"
                }`}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
