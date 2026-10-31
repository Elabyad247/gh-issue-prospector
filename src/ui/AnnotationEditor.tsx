import { useEffect, useRef, useState } from 'react';
import type { Annotation, AnnotationStatus } from '../state/types';

export type AnnotationEditorProps = {
  annotation: Annotation | undefined;
  onSetStatus: (s: AnnotationStatus) => void;
  onSetNotes: (n: string) => void;
};

export function AnnotationEditor(p: AnnotationEditorProps) {
  const [notes, setNotes] = useState(p.annotation?.notes ?? '');
  const unsaved = useRef<string | null>(null);
  const saveNotes = useRef(p.onSetNotes);
  saveNotes.current = p.onSetNotes;

  function flush() {
    if (unsaved.current === null) return;
    saveNotes.current(unsaved.current);
    unsaved.current = null;
  }

  useEffect(() => flush, []);

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
            unsaved.current = e.target.value;
            setNotes(e.target.value);
          }}
          onBlur={flush}
        />
      </label>
    </section>
  );
}
