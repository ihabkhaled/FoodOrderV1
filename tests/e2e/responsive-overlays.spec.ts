import { expect, type Locator, type Page, test } from '@playwright/test';

import {
  LONG_GROUP_NAME,
  OWNER_ID,
  seedResponsiveScenario,
} from './helpers/responsiveScenario';

const NOTIFICATIONS_KEY = 'foodorder:v1:notifications';
const LONG_NOTIFICATION_TITLE =
  'Group invitation accepted for an exceptionally long company lunch group';
const LONG_NOTIFICATION_MESSAGE =
  'Alexandria Member With An Exceptionally Long Display Name joined the group and this complete message must remain readable.';

interface ViewportCase {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

const VIEWPORTS: readonly ViewportCase[] = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'short desktop landscape', width: 1024, height: 390 },
];

const seedNotification = async (page: Page): Promise<void> => {
  await page.addInitScript(
    ({ notificationKey, ownerId, title, message }) => {
      localStorage.setItem(
        notificationKey,
        JSON.stringify({
          users: {
            [ownerId]: [
              {
                id: 'responsive-notification',
                kind: 'group_invitation_accepted',
                title,
                message,
                route: '/social',
                entityType: 'group',
                entityId: 'responsive-group',
                actorId: 'responsive-member',
                actorName:
                  'Alexandria Member With An Exceptionally Long Display Name',
                createdAt: '2026-07-16T10:30:00.000Z',
                readAt: null,
              },
            ],
          },
        }),
      );
    },
    {
      notificationKey: NOTIFICATIONS_KEY,
      ownerId: OWNER_ID,
      title: LONG_NOTIFICATION_TITLE,
      message: LONG_NOTIFICATION_MESSAGE,
    },
  );
};

const expectInsideViewport = async (locator: Locator): Promise<void> => {
  const bounds = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });

  expect(bounds.left).toBeGreaterThanOrEqual(-1);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth + 1);
  expect(bounds.top).toBeGreaterThanOrEqual(-1);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight + 1);
};

const expectTextFits = async (locator: Locator): Promise<void> => {
  const overflow = await locator.evaluateAll((elements) =>
    elements.map((element) => element.scrollWidth - element.clientWidth),
  );

  for (const amount of overflow) expect(amount).toBeLessThanOrEqual(1);
};

const expectGroupTitleOnOneRow = async (group: Locator): Promise<void> => {
  const [avatarBox, copyBox] = await Promise.all([
    group.locator('.group-card-title .social-avatar').boundingBox(),
    group.locator('.group-card-title > div').boundingBox(),
  ]);

  if (!avatarBox || !copyBox) {
    throw new Error('The group title layout must render both avatar and copy.');
  }

  const verticalOverlap =
    Math.min(avatarBox.y + avatarBox.height, copyBox.y + copyBox.height) -
    Math.max(avatarBox.y, copyBox.y);
  expect(verticalOverlap).toBeGreaterThan(0);
};

for (const viewport of VIEWPORTS) {
  test(`notification panel and group controls fit the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await seedResponsiveScenario(page);
    await seedNotification(page);
    await page.goto('/social');

    const notificationTrigger = page.locator('.notification-trigger:visible');
    await expect(notificationTrigger).toHaveCount(1);
    await expect(notificationTrigger.locator('.notification-badge')).toHaveText('1');
    await notificationTrigger.click();

    const panel = page.locator('.notification-panel:visible');
    await expect(panel).toHaveCount(1);
    await expect(
      panel.getByText(LONG_NOTIFICATION_TITLE, { exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByText(LONG_NOTIFICATION_MESSAGE, { exact: true }),
    ).toBeVisible();
    await expectInsideViewport(panel);
    await expectTextFits(panel.locator('.notification-copy'));

    if (viewport.width >= 960) {
      const [panelBox, sidebarBox] = await Promise.all([
        panel.boundingBox(),
        page.locator('.sidebar').boundingBox(),
      ]);
      if (!panelBox || !sidebarBox) {
        throw new Error('Desktop notification and sidebar bounds must be available.');
      }
      expect(panelBox.x).toBeGreaterThanOrEqual(
        sidebarBox.x + sidebarBox.width + 8,
      );
    }

    await notificationTrigger.click();

    const group = page.getByRole('article', {
      name: `Group ${LONG_GROUP_NAME}`,
      exact: true,
    });
    await group.scrollIntoViewIfNeeded();
    await expect(group).toBeVisible();
    await expect(
      group.getByRole('button', {
        name: `Edit group ${LONG_GROUP_NAME}`,
      }),
    ).toBeVisible();
    await expect(
      group.getByRole('button', {
        name: `Delete group ${LONG_GROUP_NAME}`,
      }),
    ).toBeVisible();
    await expectGroupTitleOnOneRow(group);
    await expectTextFits(group.locator('.group-card-title > div'));
  });
}
