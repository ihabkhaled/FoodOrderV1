import { expect, type Locator, type Page, test } from '@playwright/test';

interface ViewportCase {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

const VIEWPORTS: readonly ViewportCase[] = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile portrait', width: 390, height: 844 },
  { name: 'mobile landscape', width: 844, height: 390 },
];

const GROUP_NAME = 'Product Team Breakfast Planning Circle';

const register = async (page: Page, suffix: string): Promise<void> => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('UX Polish Tester');
  await page
    .getByLabel('Email')
    .fill(`ux-polish-${suffix}-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/$/u);
};

const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
};

const expectSeparateRows = async (
  title: Locator,
  metadata: Locator,
): Promise<void> => {
  const [titleBox, metadataBox] = await Promise.all([
    title.boundingBox(),
    metadata.boundingBox(),
  ]);
  if (!titleBox || !metadataBox) {
    throw new Error('Group title and member metadata must both be measurable.');
  }

  expect(metadataBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height - 1);
};

const expectMinimumTouchTargets = async (locator: Locator): Promise<void> => {
  await expect.poll(() => locator.count()).toBeGreaterThan(0);
  const targets = await locator.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        label:
          element.getAttribute('aria-label') ||
          element.textContent.trim() ||
          element.tagName,
      };
    }),
  );

  for (const target of targets) {
    expect(target.width, `${target.label} width`).toBeGreaterThanOrEqual(40);
    expect(target.height, `${target.label} height`).toBeGreaterThanOrEqual(40);
  }
};

for (const viewport of VIEWPORTS) {
  test(`group metadata and actions stay polished in ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await register(page, viewport.name.replaceAll(/\s+/gu, '-'));
    await page.goto('/social');

    await page.getByLabel('Group name').fill(GROUP_NAME);
    await page
      .getByLabel('Description')
      .fill('A long group description used to verify wrapping, spacing, and controls.');
    await page.getByRole('button', { name: 'Create group' }).click();

    const group = page.getByRole('article', {
      name: `Group ${GROUP_NAME}`,
      exact: true,
    });
    await group.scrollIntoViewIfNeeded();
    await expect(group).toBeVisible();

    const title = group.locator('.group-card-title strong');
    const metadata = group.locator('.group-card-title .muted');
    await expect(title).toHaveText(GROUP_NAME);
    await expect(metadata).toHaveText('1 members');
    await expectSeparateRows(title, metadata);

    await expect(
      group.getByRole('button', { name: `Edit group ${GROUP_NAME}` }),
    ).toBeVisible();
    await expect(
      group.getByRole('button', { name: `Delete group ${GROUP_NAME}` }),
    ).toBeVisible();
    await expectMinimumTouchTargets(
      group.locator('.group-card-actions .icon-button:visible'),
    );
    await expectNoHorizontalOverflow(page);
  });
}

test('core navigation and actions keep accessible touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await register(page, 'touch-targets');

  for (const route of ['/', '/buckets', '/orders', '/social', '/settings']) {
    await page.goto(route);
    const navigationLinks = page.locator('.bottom-nav a:visible');
    await expect(navigationLinks).toHaveCount(5);
    await expectMinimumTouchTargets(navigationLinks);
    await expectMinimumTouchTargets(
      page.locator('.button:visible, .icon-button:visible'),
    );
    await expectNoHorizontalOverflow(page);
  }
});
