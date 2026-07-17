import { describe, expect, it } from 'vitest';

import { effectiveCustomItemPermissions } from '@/modules/data-access';

describe('effectiveCustomItemPermissions', () => {
  it('keeps legacy editors able to create and price custom items', () => {
    expect(
      effectiveCustomItemPermissions({
        role: 'editor',
      }),
    ).toEqual({
      canCreateCustomItems: true,
      canSetCustomItemPrice: true,
    });
  });

  it('honours explicit restrictions for an editor', () => {
    expect(
      effectiveCustomItemPermissions({
        role: 'editor',
        canCreateCustomItems: false,
        canSetCustomItemPrice: true,
      }),
    ).toEqual({
      canCreateCustomItems: false,
      canSetCustomItemPrice: false,
    });
  });

  it('does not grant contributor permissions implicitly', () => {
    expect(
      effectiveCustomItemPermissions({
        role: 'contributor',
      }),
    ).toEqual({
      canCreateCustomItems: false,
      canSetCustomItemPrice: false,
    });
  });
});
