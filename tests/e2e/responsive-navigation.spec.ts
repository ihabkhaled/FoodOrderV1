import { expect, type Locator, type Page, test } from '@playwright/test';

import {
  LAST_BUCKET_INDEX,
  LAST_ORDER_INDEX,
  LONG_GROUP_NAME,
  LONG_MEMBER_NAME,
  MEMBER_ID,
  PRIVATE_BUCKET_INDEX,
  responsiveBucketTitle,
  seedResponsiveScenario,
  SHARED_BUCKET_INDEX,
  switchResponsiveUser,
} from './helpers/responsiveScenario';

interface ViewportCase {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

const VIEWPORTS: readonly ViewportCase[] = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow-304', width: 304, height: 760 },
];

const expectNoHorizontalOverflow = async (
  page: Page,
  context: string,
): Promise<void> => {
  const metrics = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  }));
  expect(
    metrics.document,
    `${context}: document must not scroll horizontally`,
  ).toBeLessThanOrEqual(1);
  expect(
    metrics.body,
    `${context}: body must not scroll horizontally`,
  ).toBeLessThanOrEqual(1);
};

const expectWindowOwnedScrolling = async (
  page: Page,
  selector: '.virtual-grid-list' | '.virtual-list',
): Promise<void> => {
  await expect.poll(() => page.locator(selector).count()).toBeGreaterThan(0);
  const metrics = await page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        horizontalOverflow: element.scrollWidth - element.clientWidth,
        nestedVerticalScroller:
          element.scrollHeight > element.clientHeight + 1 &&
          (style.overflowY === 'auto' || style.overflowY === 'scroll'),
      };
    }),
  );

  for (const [index, metric] of metrics.entries()) {
    expect(
      metric.horizontalOverflow,
      `${selector} ${index} must not own horizontal scrolling`,
    ).toBeLessThanOrEqual(1);
    expect(
      metric.nestedVerticalScroller,
      `${selector} ${index} must use document scrolling`,
    ).toBe(false);
  }
};

const expectChildrenInsideCards = async (
  page: Page,
  cardSelector: string,
  childSelector: string,
): Promise<void> => {
  const violations = await page.locator(cardSelector).evaluateAll(
    (cards, descendantSelector) =>
      cards.flatMap((card, cardIndex) => {
        const cardBox = card.getBoundingClientRect();
        const cardOutsideViewport =
          cardBox.left < -1 || cardBox.right > window.innerWidth + 1;
        const childViolations = [
          ...card.querySelectorAll<HTMLElement>(descendantSelector),
        ]
          .filter((child) => {
            const childBox = child.getBoundingClientRect();
            return (
              childBox.left < cardBox.left - 1 ||
              childBox.right > cardBox.right + 1 ||
              childBox.top < cardBox.top - 1 ||
              childBox.bottom > cardBox.bottom + 1 ||
              childBox.left < -1 ||
              childBox.right > window.innerWidth + 1
            );
          })
          .map(
            (child) =>
              child.getAttribute('aria-label') ||
              child.textContent.trim() ||
              child.tagName,
          );
        return cardOutsideViewport || childViolations.length > 0
          ? [{ cardIndex, cardOutsideViewport, childViolations }]
          : [];
      }),
    childSelector,
  );

  expect(
    violations,
    `${cardSelector} descendants must stay inside their cards`,
  ).toEqual([]);
};

const expectTextContainersDoNotOverflow = async (
  locator: Locator,
): Promise<void> => {
  const overflow = await locator.evaluateAll((elements) =>
    elements.map((element) => element.scrollWidth - element.clientWidth),
  );
  for (const amount of overflow) expect(amount).toBeLessThanOrEqual(1);
};

const scrollDocumentToBottom = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'auto',
    });
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Math.ceil(window.scrollY + window.innerHeight) >=
          document.documentElement.scrollHeight - 1,
      ),
    )
    .toBe(true);
};

const expectAboveBottomNav = async (
  page: Page,
  target: Locator,
): Promise<void> => {
  await expect(target).toBeVisible();
  const nav = page.locator('.bottom-nav');
  const [targetBox, navBox, viewportHeight] = await Promise.all([
    target.boundingBox(),
    nav.boundingBox(),
    page.evaluate(() => window.innerHeight),
  ]);
  expect(targetBox).not.toBeNull();
  expect(targetBox!.y + targetBox!.height).toBeLessThanOrEqual(
    (navBox?.y ?? viewportHeight) + 1,
  );
};

const bucketCard = (page: Page, title: string): Locator =>
  page.locator('.bucket-card').filter({
    has: page.getByRole('heading', { name: title, exact: true }),
  });

for (const viewport of VIEWPORTS) {
  test(`long lists and group cards fit the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await seedResponsiveScenario(page);

    await page.goto('/buckets');
    await expect(
      page.getByRole('heading', { name: 'Buckets', exact: true }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.name} buckets`);
    await expectWindowOwnedScrolling(page, '.virtual-grid-list');
    await expectChildrenInsideCards(page, '.bucket-card', '.card-actions > *');

    await scrollDocumentToBottom(page);
    const lastBucket = bucketCard(
      page,
      responsiveBucketTitle(LAST_BUCKET_INDEX),
    ).first();
    await expect(lastBucket).toBeVisible();
    await expectChildrenInsideCards(page, '.bucket-card', '.card-actions > *');
    await scrollDocumentToBottom(page);
    await expectAboveBottomNav(
      page,
      page.locator('.virtual-list-footer').last(),
    );

    await page.goto('/orders');
    await expect(
      page.getByRole('heading', { name: 'Orders', exact: true }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.name} orders`);
    await expectWindowOwnedScrolling(page, '.virtual-list');
    await expectChildrenInsideCards(page, '.order-row', ':scope > *');

    await scrollDocumentToBottom(page);
    const lastOrder = page
      .locator('.order-row')
      .filter({ hasText: responsiveBucketTitle(LAST_ORDER_INDEX) })
      .first();
    await expect(lastOrder).toBeVisible();
    await scrollDocumentToBottom(page);
    await expectAboveBottomNav(
      page,
      page.locator('.virtual-list-footer').last(),
    );

    await page.goto('/social');
    const group = page.getByRole('article', {
      name: `Group ${LONG_GROUP_NAME}`,
      exact: true,
    });
    await group.scrollIntoViewIfNeeded();
    await expect(group).toBeVisible();
    await expect(
      group.getByText(LONG_MEMBER_NAME, { exact: true }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.name} groups`);
    await expectChildrenInsideCards(
      page,
      '.group-card',
      '.group-card-actions > *, .group-member-meta > *',
    );
    await expectTextContainersDoNotOverflow(
      group.locator('.social-person > div'),
    );

    await scrollDocumentToBottom(page);
    const invitations = page.locator('section').filter({
      has: page.getByRole('heading', {
        name: 'Group invitations',
        exact: true,
      }),
    });
    await expectAboveBottomNav(page, invitations);
  });
}

test('member group controls fit the narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 304, height: 760 });
  await seedResponsiveScenario(page);
  await page.goto('/social');
  await switchResponsiveUser(page, MEMBER_ID);
  await page.goto('/social');

  const memberGroup = page.getByRole('article', {
    name: `Group ${LONG_GROUP_NAME}`,
    exact: true,
  });
  await memberGroup.scrollIntoViewIfNeeded();
  await expect(
    memberGroup.getByRole('button', {
      name: `Leave group ${LONG_GROUP_NAME}`,
    }),
  ).toBeVisible();
  await expectChildrenInsideCards(
    page,
    '.group-card',
    '.group-card-actions > *, .group-member-meta > *',
  );
  await expectTextContainersDoNotOverflow(
    memberGroup.locator('.social-person > div'),
  );
  await expectNoHorizontalOverflow(page, 'narrow member group');
});

test('Back returns to each real bucket and order origin', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await seedResponsiveScenario(page);

  const sharedTitle = responsiveBucketTitle(SHARED_BUCKET_INDEX);
  const privateTitle = responsiveBucketTitle(PRIVATE_BUCKET_INDEX);
  const expectTop = async (): Promise<void> => {
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeLessThanOrEqual(1);
  };
  const goBack = async (path: string | RegExp): Promise<void> => {
    await page.getByRole('link', { name: 'Back', exact: true }).click();
    await expect(page).toHaveURL(path);
    await expectTop();
  };

  await page.goto('/buckets');
  let sharedCard = bucketCard(page, sharedTitle).first();
  await sharedCard.getByRole('link', { name: 'Edit', exact: true }).click();
  await expect(page).toHaveURL(
    `/buckets/responsive-bucket-${SHARED_BUCKET_INDEX}/edit`,
  );
  await goBack(/\/buckets$/u);

  sharedCard = bucketCard(page, sharedTitle).first();
  await sharedCard
    .getByRole('link', { name: `Sharing — ${sharedTitle}` })
    .click();
  await expect(page).toHaveURL(
    `/buckets/responsive-bucket-${SHARED_BUCKET_INDEX}/share`,
  );
  await goBack(/\/buckets$/u);

  sharedCard = bucketCard(page, sharedTitle).first();
  await sharedCard
    .getByRole('link', { name: `Members — ${sharedTitle}` })
    .click();
  await expect(page).toHaveURL(
    `/buckets/responsive-bucket-${SHARED_BUCKET_INDEX}/social-share`,
  );
  await goBack(/\/buckets$/u);

  sharedCard = bucketCard(page, sharedTitle).first();
  await sharedCard
    .getByRole('link', { name: 'Collaborate', exact: true })
    .click();
  await expect(page).toHaveURL(
    `/buckets/responsive-bucket-${SHARED_BUCKET_INDEX}/collaborate`,
  );
  await page.getByRole('link', { name: 'Sharing', exact: true }).click();
  await expect(page).toHaveURL(
    `/buckets/responsive-bucket-${SHARED_BUCKET_INDEX}/share`,
  );
  await goBack(
    `/buckets/responsive-bucket-${SHARED_BUCKET_INDEX}/collaborate`,
  );
  await goBack(/\/buckets$/u);

  const privateCard = bucketCard(page, privateTitle).first();
  await privateCard
    .getByRole('link', { name: 'Order now', exact: true })
    .click();
  await expect(page).toHaveURL(
    `/buckets/responsive-bucket-${PRIVATE_BUCKET_INDEX}/order`,
  );
  await goBack(/\/buckets$/u);

  await page.goto('/');
  await page
    .getByRole('link')
    .filter({ hasText: responsiveBucketTitle(LAST_ORDER_INDEX) })
    .first()
    .click();
  await expect(page).toHaveURL(
    `/orders/responsive-order-${LAST_ORDER_INDEX}`,
  );
  await goBack(/\/$/u);

  await page.goto('/orders');
  await page
    .locator('.order-row')
    .filter({ hasText: sharedTitle })
    .getByRole('link')
    .click();
  await expect(page).toHaveURL(
    `/orders/responsive-order-${SHARED_BUCKET_INDEX}`,
  );
  await goBack(/\/orders$/u);
});
