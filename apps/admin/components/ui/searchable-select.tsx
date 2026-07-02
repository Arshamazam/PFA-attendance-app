"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  sub?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[] | string[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

function toOptions(options: SelectOption[] | string[]): SelectOption[] {
  return options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
}

export function SearchableSelect({
  value, onChange, options, placeholder = "Select…",
  searchPlaceholder = "Search…", className, disabled, error,
}: Props) {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState("");
  const [focusIdx, setFocusIdx] = useState(-1);
  const containerRef          = useRef<HTMLDivElement>(null);
  const searchRef             = useRef<HTMLInputElement>(null);
  const listRef               = useRef<HTMLDivElement>(null);

  const opts     = toOptions(options);
  const selected = opts.find((o) => o.value === value);
  const filtered = opts.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.sub?.toLowerCase().includes(search.toLowerCase())
  );

  // Auto-focus search on open
  useEffect(() => {
    if (open) {
      setFocusIdx(-1);
      setTimeout(() => searchRef.current?.focus(), 30);
    } else {
      setSearch("");
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Keyboard navigation
  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && focusIdx >= 0) {
      e.preventDefault();
      const opt = filtered[focusIdx];
      if (opt) { onChange(opt.value); setOpen(false); }
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focusIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[focusIdx] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [focusIdx]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)} onKeyDown={onKeyDown}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[#006B3F]/20 focus:border-[#006B3F]",
          open ? "border-[#006B3F] ring-2 ring-[#006B3F]/20" : "border-gray-200 hover:border-gray-300",
          error && "border-red-400 focus:border-red-400 focus:ring-red-400/20",
          disabled && "cursor-not-allowed opacity-50 bg-gray-50",
          !selected && "text-gray-400"
        )}
      >
        <span className="flex-1 text-left truncate text-gray-800">
          {selected ? selected.label : <span className="text-gray-400">{placeholder}</span>}
        </span>
        <ChevronDown
          className={cn("w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setFocusIdx(0); }}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-8 pr-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-[#006B3F] focus:bg-white transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div ref={listRef} role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">No results found</p>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                const isFocused  = i === focusIdx;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setFocusIdx(i)}
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
                      isSelected
                        ? "bg-[#006B3F]/8 text-[#006B3F] font-medium"
                        : isFocused
                          ? "bg-gray-50 text-gray-800"
                          : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{opt.label}</span>
                      {opt.sub && <span className="block text-xs text-gray-400 truncate">{opt.sub}</span>}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#006B3F] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer hint */}
          {filtered.length > 0 && (
            <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50">
              <p className="text-[10px] text-gray-400">↑↓ Navigate · Enter to select · Esc to close</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
