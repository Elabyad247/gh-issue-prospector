import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAnnotations } from './useAnnotations';
import { resetDB, DB_NAME } from '../../data/cache/db';

beforeEach(async () => {
  await resetDB();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
});

describe('useAnnotations', () => {
  it('starts empty for a repo with no annotations', async () => {
    const { result } = renderHook(() => useAnnotations('o/r'));
    await waitFor(() => expect(result.current.annotations.size).toBe(0));
  });

  it('setStatus persists and updates state', async () => {
    const { result } = renderHook(() => useAnnotations('o/r'));
    await waitFor(() => expect(result.current.annotations).toBeDefined());
    await act(async () => {
      await result.current.setStatus(42, 'interested');
    });
    expect(result.current.annotations.get(42)?.status).toBe('interested');
  });

  it('setNotes persists and updates state', async () => {
    const { result } = renderHook(() => useAnnotations('o/r'));
    await waitFor(() => expect(result.current.annotations).toBeDefined());
    await act(async () => {
      await result.current.setNotes(42, 'looks easy');
    });
    expect(result.current.annotations.get(42)?.notes).toBe('looks easy');
  });
});
