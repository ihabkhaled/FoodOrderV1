import { RuleTester } from 'eslint';
import * as tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';

import plugin from '../../eslint/architecture-plugin/index.mjs';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const rule = (name: string) => {
  const found = plugin.rules[name];
  if (!found) throw new Error(`Unknown rule: ${name}`);
  return found;
};

tester.run(
  'enforce-declaration-placement',
  rule('enforce-declaration-placement'),
  {
    valid: [
      {
        filename: 'src/modules/orders/types/order-row.interfaces.ts',
        code: 'export interface OrderRowProps { title: string }',
      },
      {
        filename: 'src/modules/orders/types/order-status.types.ts',
        code: "export type OrderStatus = 'open' | 'closed';",
      },
      {
        filename: 'src/modules/orders/enums/order-status.enums.ts',
        code: "export const OrderStatus = { Open: 'open' } as const; export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];",
      },
      {
        filename: 'src/modules/orders/constants/order-limits.constants.ts',
        code: 'export const MAX_ORDERS = 50;',
      },
      {
        filename: 'src/modules/orders/hooks/use-orders.hook.ts',
        code: 'export const useOrders = () => ({ orders: [] });',
      },
    ],
    invalid: [
      {
        filename:
          'src/modules/orders/components/order-row/order-row.component.tsx',
        code: 'interface OrderRowProps { title: string } export function OrderRow(_props: OrderRowProps) { return null; }',
        errors: [{ messageId: 'interfaceFile' }],
      },
      {
        filename: 'src/modules/orders/hooks/use-orders.hook.ts',
        code: "export type OrdersState = 'loading' | 'ready'; export const useOrders = () => null;",
        errors: [{ messageId: 'typeFile' }],
      },
      {
        filename: 'src/modules/orders/helpers/order.helper.ts',
        code: 'export const MAX_ORDERS = 50;',
        errors: [{ messageId: 'constantFile' }],
      },
      {
        filename: 'src/modules/orders/types/order-row.types.ts',
        code: 'export interface OrderRowProps { title: string }',
        errors: [{ messageId: 'interfaceFile' }],
      },
      {
        filename: 'src/modules/orders/constants/order.constants.ts',
        code: "export type OrderKind = 'dine-in' | 'delivery';",
        errors: [{ messageId: 'typeFile' }],
      },
    ],
  },
);

tester.run('no-raw-package-imports', rule('no-raw-package-imports'), {
  valid: [
    {
      filename: 'src/packages/firebase/firestore.adapter.ts',
      code: "import { getFirestore } from 'firebase/firestore';",
    },
    {
      filename: 'src/modules/buckets/hooks/use-buckets.hook.ts',
      code: "import { AppLink } from '@/packages/router';",
    },
    {
      filename: 'src/shared/ui/button/button.component.tsx',
      code: "import { useState } from 'react';",
    },
    {
      filename: 'src/modules/orders/components/order-row/order-row.component.tsx',
      code: "import { formatMoney } from '@/shared/helpers';",
    },
  ],
  invalid: [
    {
      filename: 'src/modules/orders/gateways/orders.gateway.ts',
      code: "import { getFirestore } from 'firebase/firestore';",
      errors: [{ messageId: 'rawImport' }],
    },
    {
      filename: 'src/modules/buckets/components/bucket-cards/bucket-cards.component.tsx',
      code: "import { Plus } from 'lucide-react';",
      errors: [{ messageId: 'rawImport' }],
    },
    {
      filename: 'src/app/router/app.routes.tsx',
      code: "import { Routes } from 'react-router-dom';",
      errors: [{ messageId: 'rawImport' }],
    },
    {
      filename: 'src/modules/social/services/social.service.ts',
      code: "import axios from 'axios';",
      errors: [{ messageId: 'unregistered' }],
    },
    {
      filename: 'src/modules/social/services/social.service.ts',
      code: "export { Haptics } from '@capacitor/haptics';",
      errors: [{ messageId: 'rawImport' }],
    },
  ],
});

tester.run('no-hooks-outside-hook-files', rule('no-hooks-outside-hook-files'), {
  valid: [
    {
      filename: 'src/modules/buckets/hooks/use-buckets.hook.ts',
      code: "import { useState } from 'react'; export const useBuckets = () => useState(0);",
    },
    {
      filename: 'src/modules/buckets/containers/buckets.container.tsx',
      code: "import { useBucketsViewModel } from '../hooks/use-buckets-view-model.hook'; export const BucketsContainer = () => { const vm = useBucketsViewModel(); return <div>{vm.title}</div>; };",
    },
    {
      filename: 'src/app/router/route-guards.tsx',
      code: "import { useSession } from '@/modules/session'; export const Guard = () => { const s = useSession(); return s ? null : null; };",
    },
    {
      filename: 'src/modules/orders/components/order-row/order-row.component.tsx',
      code: 'export const OrderRow = ({ title }: { title: string }) => <div>{title}</div>;',
    },
  ],
  invalid: [
    {
      filename: 'src/modules/orders/components/order-row/order-row.component.tsx',
      code: "import { useState } from 'react'; export const OrderRow = () => { const [open] = useState(false); return <div>{String(open)}</div>; };",
      errors: [{ messageId: 'anyHook' }],
    },
    {
      filename: 'src/modules/orders/containers/orders.container.tsx',
      code: "import { useEffect } from 'react'; export const OrdersContainer = () => { useEffect(() => {}, []); return null; };",
      errors: [{ messageId: 'builtInHook' }],
    },
    {
      filename: 'src/modules/orders/services/order.service.ts',
      code: 'export const useOrderTotals = () => { return 1; };',
      errors: [{ messageId: 'hookDefinition' }],
    },
  ],
});

tester.run('no-cross-module-deep-imports', rule('no-cross-module-deep-imports'), {
  valid: [
    {
      filename: 'src/modules/orders/hooks/use-orders.hook.ts',
      code: "import { dataService } from '@/modules/data-access';",
    },
    {
      filename: 'src/modules/orders/hooks/use-orders.hook.ts',
      code: "import { orderTotals } from '../helpers/order.helper';",
    },
    {
      filename: 'src/app/router/app.routes.tsx',
      code: "import { ordersRoutes } from '@/modules/orders';",
    },
  ],
  invalid: [
    {
      filename: 'src/modules/orders/hooks/use-orders.hook.ts',
      code: "import { bucketTitle } from '@/modules/buckets/helpers/bucket.helper';",
      errors: [{ messageId: 'deepModule' }],
    },
    {
      filename: 'src/modules/orders/hooks/use-orders.hook.ts',
      code: "import { firestore } from '@/packages/firebase/firestore.adapter';",
      errors: [{ messageId: 'deepPackage' }],
    },
    {
      filename: 'src/modules/orders/hooks/use-orders.hook.ts',
      code: "import { bucketTitle } from '../../buckets/helpers/bucket.helper';",
      errors: [{ messageId: 'deepModule' }],
    },
  ],
});

tester.run('no-restricted-layer-imports', rule('no-restricted-layer-imports'), {
  valid: [
    {
      filename: 'src/app/shell/app-layout/app-layout.component.tsx',
      code: "import { NotificationCenter } from '@/modules/notifications';",
    },
    {
      filename: 'src/modules/orders/hooks/use-orders.hook.ts',
      code: "import { formatMoney } from '@/shared/helpers';",
    },
    {
      filename: 'src/platform/storage/preferences.ts',
      code: "import { CapacitorPreferences } from '@/packages/capacitor-preferences';",
    },
    {
      filename: 'src/shared/helpers/pagination.helper.ts',
      code: "import { env } from '@/platform/environment';",
    },
  ],
  invalid: [
    {
      filename: 'src/shared/ui/button/button.component.tsx',
      code: "import { OrderRow } from '@/modules/orders';",
      errors: [{ messageId: 'wrongDirection' }],
    },
    {
      filename: 'src/platform/network/network-status.ts',
      code: "import { useSession } from '@/modules/session';",
      errors: [{ messageId: 'wrongDirection' }],
    },
    {
      filename: 'src/packages/firebase/firestore.adapter.ts',
      code: "import { env } from '@/platform/environment';",
      errors: [{ messageId: 'wrongDirection' }],
    },
    {
      filename: 'src/modules/orders/hooks/use-orders.hook.ts',
      code: "import { AppShell } from '@/app/shell/app-shell';",
      errors: [{ messageId: 'wrongDirection' }],
    },
  ],
});

tester.run('no-typescript-enum', rule('no-typescript-enum'), {
  valid: [
    {
      filename: 'src/modules/orders/enums/order-status.enums.ts',
      code: "export const OrderStatus = { OPEN: 'open' } as const; export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];",
    },
  ],
  invalid: [
    {
      filename: 'src/modules/orders/enums/order-status.enums.ts',
      code: "enum OrderStatus { Open = 'open' }",
      errors: [{ messageId: 'noEnum' }],
    },
    {
      filename: 'src/modules/orders/enums/order-status.enums.ts',
      code: "const enum OrderStatus { Open = 'open' }",
      errors: [{ messageId: 'noEnum' }],
    },
  ],
});

tester.run('no-browser-globals-outside-platform', rule('no-browser-globals-outside-platform'), {
  valid: [
    {
      filename: 'src/platform/browser/document-settings.ts',
      code: "export const applyLang = (lang: string) => { document.documentElement.lang = lang; };",
    },
    {
      filename: 'src/modules/orders/helpers/order.helper.ts',
      code: 'const window = { start: 0 }; export const start = window.start;',
    },
  ],
  invalid: [
    {
      filename: 'src/modules/orders/hooks/use-orders.hook.ts',
      code: "export const read = () => localStorage.getItem('key');",
      errors: [{ messageId: 'browserGlobal' }],
    },
    {
      filename: 'src/modules/session/hooks/use-session.hook.ts',
      code: 'export const listen = () => { window.addEventListener("online", () => {}); };',
      errors: [{ messageId: 'browserGlobal' }],
    },
    {
      filename: 'src/shared/ui/dialog/dialog.helper.ts',
      code: 'export const el = () => document.createElement("div");',
      errors: [{ messageId: 'browserGlobal' }],
    },
  ],
});

tester.run('no-env-outside-environment', rule('no-env-outside-environment'), {
  valid: [
    {
      filename: 'src/platform/environment/environment.ts',
      code: 'export const mode = import.meta.env.MODE;',
    },
    {
      filename: 'src/modules/orders/hooks/use-orders.hook.ts',
      code: "import { env } from '@/platform/environment'; export const name = env.appName;",
    },
  ],
  invalid: [
    {
      filename: 'src/modules/orders/gateways/orders.gateway.ts',
      code: 'export const prod = import.meta.env.PROD;',
      errors: [{ messageId: 'envAccess' }],
    },
    {
      filename: 'src/shared/helpers/debug.helper.ts',
      code: 'export const value = process.env.DEBUG;',
      errors: [{ messageId: 'envAccess' }],
    },
  ],
});

tester.run('no-inline-route-strings', rule('no-inline-route-strings'), {
  valid: [
    {
      filename: 'src/modules/orders/routes/orders-route-paths.constants.ts',
      code: "export const ORDERS_PATH = '/orders';",
    },
    {
      filename: 'src/modules/orders/containers/orders.container.tsx',
      code: "import { ORDERS_PATH } from '../routes/orders-route-paths.constants'; export const Go = ({ Link }: { Link: (p: { to: string }) => null }) => <Link to={ORDERS_PATH} />;",
    },
    {
      filename: 'src/modules/orders/routes/orders.routes.tsx',
      code: "export const path = '/orders';",
    },
  ],
  invalid: [
    {
      filename: 'src/modules/orders/components/order-row/order-row.component.tsx',
      code: "export const Go = ({ Link }: { Link: (p: { to: string }) => null }) => <Link to=\"/orders\" />;",
      errors: [{ messageId: 'inlineRoute' }],
    },
    {
      filename: 'src/modules/orders/hooks/use-orders.hook.ts',
      code: "export const go = (navigate: (p: string) => void) => { navigate('/orders'); };",
      errors: [{ messageId: 'inlineRoute' }],
    },
  ],
});

tester.run('enforce-file-suffixes', rule('enforce-file-suffixes'), {
  valid: [
    { filename: 'src/modules/orders/index.ts', code: 'export {};' },
    { filename: 'src/modules/orders/helpers/order.helper.ts', code: 'export {};' },
    {
      filename: 'src/modules/orders/components/order-row/order-row.component.tsx',
      code: 'export {};',
    },
    { filename: 'src/modules/session/providers/session.provider.tsx', code: 'export {};' },
    { filename: 'src/vite-env.d.ts', code: 'export {};' },
  ],
  invalid: [
    {
      filename: 'src/modules/orders/helpers/order.ts',
      code: 'export {};',
      errors: [{ messageId: 'badSuffix' }],
    },
    {
      filename: 'src/modules/orders/components/OrderRow.tsx',
      code: 'export {};',
      errors: [{ messageId: 'badSuffix' }],
    },
  ],
});
