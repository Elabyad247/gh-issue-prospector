import { useEffect, useRef, useState } from 'react';
import type { FilterPreset } from '../state/types';
import { BUILT_IN_PRESETS } from '../state/presets';

export type PresetDropdownProps = {
  userPresets: FilterPreset[];
  onApply: (preset: FilterPreset) => void;
  onSaveCurrent: (name: string) => void;
  onDelete: (name: string) => void;
};

export function PresetDropdown(p: PresetDropdownProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function closeOnEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function apply(preset: FilterPreset) {
    p.onApply(preset);
    setOpen(false);
  }

  return (
    <div className="preset-dropdown" ref={root}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Presets ▾
      </button>
      {open && (
        <div className="preset-menu" role="menu">
          <div className="preset-section">Built-in</div>
          {BUILT_IN_PRESETS.map((preset) => (
            <button key={preset.name} className="preset-item" onClick={() => apply(preset)}>
              {preset.name}
            </button>
          ))}
          {p.userPresets.length > 0 && <div className="preset-section">Yours</div>}
          {p.userPresets.map((preset) => (
            <div key={preset.name} className="preset-row">
              <button className="preset-item" onClick={() => apply(preset)}>
                {preset.name}
              </button>
              <button
                className="preset-delete"
                onClick={() => p.onDelete(preset.name)}
                aria-label={`Delete preset ${preset.name}`}
              >
                ✕
              </button>
            </div>
          ))}
          <div className="preset-section">—</div>
          <button
            className="preset-item"
            onClick={() => {
              const name = prompt('Preset name?')?.trim();
              if (name) {
                p.onSaveCurrent(name);
                setOpen(false);
              }
            }}
          >
            Save current filters as preset…
          </button>
        </div>
      )}
    </div>
  );
}
