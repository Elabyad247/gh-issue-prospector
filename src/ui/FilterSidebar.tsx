import type { FilterState } from '../state/types';
import type { FilterCounts } from '../state/filters/pipeline';

export type FilterSidebarProps = {
  state: FilterState;
  availableLabels: string[];
  counts: FilterCounts;
  onSet: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void;
};

export function FilterSidebar(p: FilterSidebarProps) {
  const toggleLabel = (label: string) => {
    const next = p.state.labels.includes(label)
      ? p.state.labels.filter((l) => l !== label)
      : [...p.state.labels, label];
    p.onSet('labels', next);
  };

  return (
    <aside className="filter-sidebar">
      <h3>Search</h3>
      <input
        type="text"
        value={p.state.text}
        onChange={(e) => p.onSet('text', e.target.value)}
        placeholder="title or body…"
      />

      <h3>Labels</h3>
      <div className="label-mode">
        <label>
          <input
            type="radio"
            checked={p.state.labelMode === 'OR'}
            onChange={() => p.onSet('labelMode', 'OR')}
          />
          OR
        </label>
        <label>
          <input
            type="radio"
            checked={p.state.labelMode === 'AND'}
            onChange={() => p.onSet('labelMode', 'AND')}
          />
          AND
        </label>
      </div>
      <ul className="label-list">
        {p.availableLabels.map((label) => (
          <li key={label}>
            <label>
              <input
                type="checkbox"
                checked={p.state.labels.includes(label)}
                onChange={() => toggleLabel(label)}
              />
              {label}
            </label>
          </li>
        ))}
      </ul>

      <h3>Custom</h3>
      <ul className="custom-filters">
        <li>
          <label>
            <input
              type="checkbox"
              checked={p.state.noComments}
              onChange={(e) => p.onSet('noComments', e.target.checked)}
            />
            No comments <span className="badge">{p.counts.noComments}</span>
          </label>
        </li>
        <li>
          <label>
            <input
              type="checkbox"
              checked={p.state.noLinkedPR}
              onChange={(e) => p.onSet('noLinkedPR', e.target.checked)}
            />
            No linked PR <span className="badge">{p.counts.noLinkedPR}</span>
          </label>
        </li>
        <li>
          <label>
            <input
              type="checkbox"
              checked={p.state.noAssignee}
              onChange={(e) => p.onSet('noAssignee', e.target.checked)}
            />
            No assignee <span className="badge">{p.counts.noAssignee}</span>
          </label>
        </li>
      </ul>

      <h4>Closed PR mode</h4>
      <select
        value={p.state.closedPRMode}
        onChange={(e) => p.onSet('closedPRMode', e.target.value as FilterState['closedPRMode'])}
      >
        <option value="include">Include all</option>
        <option value="exclude">Hide issues with closed PRs</option>
        <option value="only">Only show issues with closed PRs</option>
      </select>

      <h4>Reporter active within (days)</h4>
      <input
        type="number"
        min={1}
        value={p.state.reporterActiveWithinDays ?? ''}
        onChange={(e) =>
          p.onSet(
            'reporterActiveWithinDays',
            e.target.value === '' ? null : Number(e.target.value),
          )
        }
      />

      <h4>Age band (days)</h4>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          type="number"
          placeholder="min"
          value={p.state.ageDays.min ?? ''}
          onChange={(e) =>
            p.onSet('ageDays', {
              ...p.state.ageDays,
              min: e.target.value === '' ? null : Number(e.target.value),
            })
          }
        />
        <input
          type="number"
          placeholder="max"
          value={p.state.ageDays.max ?? ''}
          onChange={(e) =>
            p.onSet('ageDays', {
              ...p.state.ageDays,
              max: e.target.value === '' ? null : Number(e.target.value),
            })
          }
        />
      </div>

      <h4>Repro steps</h4>
      <select
        value={p.state.requireReproSteps == null ? 'either' : p.state.requireReproSteps ? 'yes' : 'no'}
        onChange={(e) => {
          const v = e.target.value;
          p.onSet('requireReproSteps', v === 'either' ? null : v === 'yes');
        }}
      >
        <option value="either">Either</option>
        <option value="yes">Has repro</option>
        <option value="no">No repro</option>
      </select>

      <h4>Annotation</h4>
      <select
        value={p.state.annotation}
        onChange={(e) => p.onSet('annotation', e.target.value as FilterState['annotation'])}
      >
        <option value="any">Any</option>
        <option value="untriaged">Untriaged only</option>
        <option value="interested">Interested only</option>
        <option value="hide-skipped">Hide skipped</option>
      </select>

      <button className="reset-btn" onClick={p.onReset}>
        Reset all filters
      </button>
    </aside>
  );
}
