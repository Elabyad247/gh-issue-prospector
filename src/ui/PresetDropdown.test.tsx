import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PresetDropdown } from './PresetDropdown';
import { BUILT_IN_PRESETS } from '../state/presets';

describe('PresetDropdown', () => {
  it('shows built-in presets', async () => {
    render(<PresetDropdown userPresets={[]} onApply={vi.fn()} onSaveCurrent={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /presets/i }));
    expect(screen.getByText(BUILT_IN_PRESETS[0]!.name)).toBeInTheDocument();
  });

  it('calls onApply when a preset is clicked', async () => {
    const onApply = vi.fn();
    render(<PresetDropdown userPresets={[]} onApply={onApply} onSaveCurrent={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /presets/i }));
    await userEvent.click(screen.getByText(BUILT_IN_PRESETS[0]!.name));
    expect(onApply).toHaveBeenCalledWith(BUILT_IN_PRESETS[0]);
  });
});
