import { useState } from 'react';
import type { FilterPreset } from '../state/types';
import { BUILT_IN_PRESETS } from '../state/presets';

export type PresetDropdownProps = {
  userPresets: FilterPreset[];
  onApply: (preset: FilterPreset) => void;
  onSaveCurrent: (name: string) => void;
};

export function PresetDropdown(p: PresetDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="preset-dropdown">
      <button onClick={() => setOpen((o) => !o)}>Presets ▾</button>
      {open && (
        <div className="preset-menu" role="menu">
          <div className="preset-section">Built-in</div>
          {BUILT_IN_PRESETS.map((preset) => (
            <button
              key={preset.name}
              className="preset-item"
              onClick={() => {
                p.onApply(preset);
                setOpen(false);
              }}
            >
              {preset.name}
            </button>
          ))}
          {p.userPresets.length > 0 && <div className="preset-section">Yours</div>}
          {p.userPresets.map((preset) => (
            <button
              key={preset.name}
              className="preset-item"
              onClick={() => {
                p.onApply(preset);
                setOpen(false);
              }}
            >
              {preset.name}
            </button>
          ))}
          <div className="preset-section">—</div>
          <button
            className="preset-item"
            onClick={() => {
              const name = prompt('Preset name?');
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
