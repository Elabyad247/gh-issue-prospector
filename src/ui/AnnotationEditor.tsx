import { useEffect, useRef, useState } from 'react';
import type { Annotation, AnnotationStatus } from '../state/types';

export type AnnotationEditorProps = {
  annotation: Annotation | undefined;
  onSetStatus: (s: AnnotationStatus) => void;
  onSetNotes: (n: string) => void;
};

export function AnnotationEditor(p: AnnotationEditorProps) {
  const [notes, setNotes] = useState(p.annotation?.notes ?? '');
  const dirty = useRef(false);

  useEffect(() => {
    setNotes(p.annotation?.notes ?? '');
    dirty.current = false;
  }, [p.annotation?.issueNumber]);

  const status: AnnotationStatus = p.annotation?.status ?? null;

  return (
    <section className="annotation-editor">
      <h4>Annotation</h4>
      <label>
        Status
        <select
          value={status ?? 'untriaged'}
          onChange={(e) => {
            const v = e.target.value;
            p.onSetStatus(v === 'untriaged' ? null : (v as AnnotationStatus));
          }}
        >
          <option value="untriaged">Untriaged</option>
          <option value="interested">Interested</option>
          <option value="working">Working on</option>
          <option value="skipped">Skipped</option>
        </select>
      </label>
      <label>
        Notes
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => {
            dirty.current = true;
            setNotes(e.target.value);
          }}
          onBlur={() => {
            if (dirty.current) {
              p.onSetNotes(notes);
              dirty.current = false;
            }
          }}
        />
      </label>
    </section>
  );
}
