'use client';

import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectDropdownProps {
  options: { value: string; label?: string }[];
  selected: string[];
  onChange: (newSelected: string[]) => void;
  placeholder?: string;
  compact?: boolean;
}

export default function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = 'בחר ערכים...',
  compact = false,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleValue = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((item) => item !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const selectAll = () => onChange(options.map((o) => o.value));
  const clearAll = () => onChange([]);

  const isAllSelected =
    options.length > 0 && selected.length === options.length;

  return (
    <div ref={containerRef} className="relative w-full text-right">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full bg-white border border-slate-300 hover:border-blue-400 rounded-lg px-2.5 ${
          compact ? 'py-1 text-xs' : 'py-1.5 text-xs'
        } flex items-center justify-between gap-2 text-right shadow-sm transition`}
      >
        <div className="flex flex-wrap gap-1 items-center overflow-hidden">
          {selected.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : isAllSelected ? (
            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-bold text-[11px]">
              ✓ הכל נבחר ({selected.length})
            </span>
          ) : (
            selected.map((val) => (
              <span
                key={val}
                className="bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-semibold text-[11px] truncate max-w-[150px]"
              >
                {val}
              </span>
            ))
          )}
        </div>
        <span className="text-slate-400 text-[10px] shrink-0">▼</span>
      </button>

      {open && (
        <div
          className="absolute right-0 left-0 mt-1 rounded-xl border-2 border-slate-300 shadow-2xl p-2 max-h-60 overflow-y-auto z-50"
          style={{ backgroundColor: '#ffffff' }}
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200 px-1 text-[11px]">
            <button
              type="button"
              onClick={selectAll}
              className="text-blue-600 hover:underline font-bold"
            >
              בחר הכל
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-slate-500 hover:text-red-600"
            >
              נקה הכל
            </button>
          </div>
          <div className="space-y-0.5">
            {options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition ${
                    checked
                      ? 'bg-blue-50 text-blue-900 font-bold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(opt.value)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{opt.label || opt.value}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

