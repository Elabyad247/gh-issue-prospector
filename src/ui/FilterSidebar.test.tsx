import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterSidebar } from './FilterSidebar';
import { defaultFilterState } from '../state/types';
import type { FilterCounts } from '../state/filters/pipeline';

const counts: FilterCounts = {
  total: 100,
  noComments: 40,
  noLinkedPR: 60,
  noAssignee: 70,
  hasRepro: 25,
};

describe('FilterSidebar', () => {
  it('toggles noComments filter', async () => {
    const set = vi.fn();
    render(
      <FilterSidebar
        state={defaultFilterState}
        availableLabels={['bug']}
        counts={counts}
        onSet={set}
        onReset={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText(/no comments/i));
    expect(set).toHaveBeenCalledWith('noComments', true);
  });

  it('shows count badge next to no-comments', () => {
    render(
      <FilterSidebar
        state={defaultFilterState}
        availableLabels={['bug']}
        counts={counts}
        onSet={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('selects a label', async () => {
    const set = vi.fn();
    render(
      <FilterSidebar
        state={defaultFilterState}
        availableLabels={['bug', 'help-wanted']}
        counts={counts}
        onSet={set}
        onReset={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText(/^bug$/i));
    expect(set).toHaveBeenCalledWith('labels', ['bug']);
  });
});
