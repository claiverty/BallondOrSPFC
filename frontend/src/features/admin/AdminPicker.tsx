import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function AdminPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <label className="edition-picker-label">
      {label}
      <div className="edition-picker">
        <button
          type="button"
          className="edition-picker-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${label}: ${selected?.label ?? 'Selecionar'}`}
          onClick={() => setOpen((current) => !current)}
        >
          <span>{selected?.label ?? 'Selecionar'}</span>
          <ChevronDown className={open ? 'open' : ''} size={18} aria-hidden="true" />
        </button>
        {open && (
          <div className="edition-picker-menu" role="listbox" aria-label={`${label} disponíveis`}>
            {options.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={option.value === value ? 'active' : ''}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}
