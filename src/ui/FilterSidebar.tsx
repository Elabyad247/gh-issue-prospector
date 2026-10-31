import type { FilterState } from '../state/types';
import type { FilterCounts } from '../state/filters/pipeline';
import { IDLE_PR_DAYS } from '../state/filters/predicates';

export type FilterSidebarProps = {
  state: FilterState;
  availableLabels: string[];
  counts: FilterCounts;
  onSet: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void;
  open: boolean;
  onClose: () => void;
};

export function FilterSidebar(p: FilterSidebarProps) {
  const toggleIn = (list: string[], label: string) =>
    list.includes(label) ? list.filter((l) => l !== label) : [...list, label];

  const toggleLabel = (label: string) => {
    p.onSet('labels', toggleIn(p.state.labels, label));
    p.onSet(
      'excludedLabels',
      p.state.excludedLabels.filter((l) => l !== label),
    );
  };

  const toggleExcluded = (label: string) => {
    p.onSet('excludedLabels', toggleIn(p.state.excludedLabels, label));
    p.onSet(
      'labels',
      p.state.labels.filter((l) => l !== label),
    );
  };

  return (
    <aside className={`filter-sidebar ${p.open ? 'filter-sidebar-open' : ''}`}>
      <button className="filters-close" onClick={p.onClose}>
        Close filters
      </button>
      <h3>Search</h3>
      <input
        id="issue-search"
        type="text"
        spellCheck={false}
        value={p.state.text}
        onChange={(e) => p.onSet('text', e.target.value)}
        placeholder="title, body or #number  ( / )"
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
          <li key={label} className="label-row">
            <label>
              <input
                type="checkbox"
                checked={p.state.labels.includes(label)}
                onChange={() => toggleLabel(label)}
              />
              <span className={p.state.excludedLabels.includes(label) ? 'label-hidden' : ''}>
                {label}
              </span>
              <span className="badge">{p.counts.labels[label] ?? 0}</span>
            </label>
            <button
              className="label-exclude"
              aria-pressed={p.state.excludedLabels.includes(label)}
              aria-label={`Hide issues labelled ${label}`}
              title={`Hide issues labelled ${label}`}
              onClick={() => toggleExcluded(label)}
            >
              ⊘
            </button>
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
              checked={p.state.noOpenPR}
              onChange={(e) => p.onSet('noOpenPR', e.target.checked)}
            />
            No open PR <span className="badge">{p.counts.noOpenPR}</span>
          </label>
        </li>
        <li>
          <label title={`Treat open PRs with no activity for ${IDLE_PR_DAYS} days as abandoned`}>
            <input
              type="checkbox"
              checked={p.state.ignoreIdlePRs}
              onChange={(e) => p.onSet('ignoreIdlePRs', e.target.checked)}
            />
            Ignore idle PRs ({IDLE_PR_DAYS}+ days)
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
        min={0}
        value={p.state.reporterActiveWithinDays ?? ''}
        onChange={(e) =>
          p.onSet('reporterActiveWithinDays', e.target.value === '' ? null : Number(e.target.value))
        }
      />

      <h4>Age band (days)</h4>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          type="number"
          min={0}
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
          min={0}
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
        value={
          p.state.requireReproSteps == null ? 'either' : p.state.requireReproSteps ? 'yes' : 'no'
        }
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
        <option value="working">Working on only</option>
        <option value="skipped">Skipped only</option>
        <option value="hide-skipped">Hide skipped</option>
      </select>

      <button className="reset-btn" onClick={p.onReset}>
        Reset all filters
      </button>
    </aside>
  );
}
