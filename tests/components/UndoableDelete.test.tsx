import { act,renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUndoableDelete } from '@/shared/ui';

describe('useUndoableDelete', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks an id pending as soon as it is scheduled, before the window elapses', () => {
    const { result } = renderHook(() => useUndoableDelete());
    const commit = vi.fn();

    act(() => {
      result.current.schedule('bucket-1', commit);
    });

    expect(result.current.pendingIds.has('bucket-1')).toBe(true);
    expect(commit).not.toHaveBeenCalled();
  });

  it('commits and clears the pending id once the window elapses', () => {
    const { result } = renderHook(() => useUndoableDelete());
    const commit = vi.fn();

    act(() => {
      result.current.schedule('bucket-1', commit, { windowMs: 6000 });
    });
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.current.pendingIds.has('bucket-1')).toBe(false);
  });

  it('cancel() stops the commit and clears the pending id', () => {
    const { result } = renderHook(() => useUndoableDelete());
    const commit = vi.fn();

    act(() => {
      result.current.schedule('bucket-1', commit, { windowMs: 6000 });
    });
    let cancelled = false;
    act(() => {
      cancelled = result.current.cancel('bucket-1');
    });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(cancelled).toBe(true);
    expect(commit).not.toHaveBeenCalled();
    expect(result.current.pendingIds.has('bucket-1')).toBe(false);
  });

  it('cancel() on an id that was never scheduled (or already committed) returns false', () => {
    const { result } = renderHook(() => useUndoableDelete());

    let cancelled = true;
    act(() => {
      cancelled = result.current.cancel('never-scheduled');
    });

    expect(cancelled).toBe(false);
  });

  it('tracks multiple pending deletes independently', () => {
    const { result } = renderHook(() => useUndoableDelete());
    const commitA = vi.fn();
    const commitB = vi.fn();

    act(() => {
      result.current.schedule('a', commitA, { windowMs: 3000 });
      result.current.schedule('b', commitB, { windowMs: 6000 });
    });
    expect(result.current.pendingIds.has('a')).toBe(true);
    expect(result.current.pendingIds.has('b')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(commitA).toHaveBeenCalledTimes(1);
    expect(commitB).not.toHaveBeenCalled();
    expect(result.current.pendingIds.has('a')).toBe(false);
    expect(result.current.pendingIds.has('b')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(commitB).toHaveBeenCalledTimes(1);
    expect(result.current.pendingIds.has('b')).toBe(false);
  });
});
