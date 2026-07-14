import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BucketPricingPanel } from '@/components/BucketPricingPanel';
import { CustomItemPanel } from '@/components/CustomItemPanel';
import { GroupReceiptSection } from '@/components/GroupReceiptSection';
import { calculateGroupOrderReceipt } from '@/lib/groupOrder';
import type {
  BucketItem,
  BucketPricingPolicy,
  GroupOrderReceiptSnapshot,
} from '@/types/domain';

const policy: BucketPricingPolicy = {
  vatBasisPoints: 1000,
  serviceBasisPoints: 500,
  deliveryMinor: 300,
  vatAllocation: 'proportional',
  serviceAllocation: 'proportional',
  deliveryAllocation: 'equal',
};

const calculatedReceipt = calculateGroupOrderReceipt({
  currency: 'EGP',
  participants: [
    {
      userId: 'alice',
      displayName: 'Alice',
      items: [
        {
          itemId: 'meal',
          itemName: 'Meal',
          quantity: 1,
          unitPriceMinor: 1000,
          createdByUserId: 'owner',
          createdByName: 'Owner',
        },
      ],
    },
    {
      userId: 'bob',
      displayName: 'Bob',
      items: [
        {
          itemId: 'meal',
          itemName: 'Meal',
          quantity: 2,
          unitPriceMinor: 1000,
          createdByUserId: 'owner',
          createdByName: 'Owner',
        },
      ],
    },
  ],
  policy,
});

const receipt: GroupOrderReceiptSnapshot = {
  ...calculatedReceipt,
  pricingPolicy: policy,
  bucketRevision: 3,
};

const pendingItem: BucketItem = {
  id: 'custom-item',
  name: 'Custom soup',
  description: 'No salt',
  category: 'Soup',
  unitPrice: 0,
  active: false,
  sortOrder: 10,
  createdByUserId: 'member',
  createdByName: 'Member',
  source: 'custom',
  approvalStatus: 'pending',
};

function PricingHarness({
  onChange,
}: {
  onChange: (nextPolicy: BucketPricingPolicy) => void;
}) {
  const [value, setValue] = useState(policy);
  return (
    <BucketPricingPanel
      locale="en"
      policy={value}
      onChange={(nextPolicy) => {
        setValue(nextPolicy);
        onChange(nextPolicy);
      }}
    />
  );
}

describe('BucketPricingPanel', () => {
  it('converts displayed percentages and delivery amount to exact policy units', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PricingHarness onChange={onChange} />);

    const vat = screen.getByLabelText('VAT percentage');
    const service = screen.getByLabelText('Service percentage');
    const delivery = screen.getByLabelText('Delivery amount');
    await user.clear(vat);
    await user.type(vat, '14.5');
    await user.clear(service);
    await user.type(service, '7.25');
    await user.clear(delivery);
    await user.type(delivery, '12.34');

    expect(onChange).toHaveBeenLastCalledWith({
      ...policy,
      vatBasisPoints: 1450,
      serviceBasisPoints: 725,
      deliveryMinor: 1234,
    });
  });

  it('clamps invalid negative charges to zero', () => {
    const onChange = vi.fn();
    render(<PricingHarness onChange={onChange} />);

    const vat = screen.getByLabelText('VAT percentage');
    fireEvent.change(vat, { target: { value: '-1' } });

    expect(onChange).toHaveBeenLastCalledWith({
      ...policy,
      vatBasisPoints: 0,
    });
    expect(vat).toHaveValue(0);
  });
});

describe('GroupReceiptSection', () => {
  it('switches between exact summary, person, and item classifications', async () => {
    const user = userEvent.setup();
    render(<GroupReceiptSection receipt={receipt} currency="EGP" locale="en" />);

    expect(screen.getByText('Final total')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'By person' }));
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'By item' }));
    expect(screen.getByText('Meal')).toBeInTheDocument();
    expect(screen.getByText('Alice ×1')).toBeInTheDocument();
    expect(screen.getByText('Bob ×2')).toBeInTheDocument();
  });

  it('renders Arabic labels without changing receipt values', () => {
    render(<GroupReceiptSection receipt={receipt} currency="EGP" locale="ar" />);
    expect(screen.getByText('الإجمالي النهائي')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'حسب الشخص' })).toBeInTheDocument();
  });
});

describe('CustomItemPanel', () => {
  it('submits a validated member-created item', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <CustomItemPanel
        locale="en"
        canCreate
        canSetPrice
        canApprove={false}
        disabled={false}
        pendingItems={[]}
        onAdd={onAdd}
        onApprove={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Custom item name'), 'Rice bowl');
    await user.type(screen.getByLabelText('Category'), 'Main');
    const price = screen.getByLabelText('Price');
    await user.clear(price);
    await user.type(price, '99.5');
    await user.type(screen.getByLabelText('Description or notes'), 'Extra sauce');
    await user.click(screen.getByRole('button', { name: 'Add custom item' }));

    expect(onAdd).toHaveBeenCalledWith({
      name: 'Rice bowl',
      category: 'Main',
      description: 'Extra sauce',
      unitPrice: 99.5,
    });
  });

  it('keeps price disabled without price permission', () => {
    render(
      <CustomItemPanel
        locale="en"
        canCreate
        canSetPrice={false}
        canApprove={false}
        disabled={false}
        pendingItems={[]}
        onAdd={vi.fn()}
        onApprove={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Price')).toBeDisabled();
  });

  it('lets an owner approve a pending item with a final price', async () => {
    const onApprove = vi.fn();
    const user = userEvent.setup();
    render(
      <CustomItemPanel
        locale="en"
        canCreate={false}
        canSetPrice={false}
        canApprove
        disabled={false}
        pendingItems={[pendingItem]}
        onAdd={vi.fn()}
        onApprove={onApprove}
      />,
    );

    const price = screen.getByLabelText('Price — Custom soup');
    await user.clear(price);
    await user.type(price, '50');
    await user.click(screen.getByRole('button', { name: 'Approve item' }));
    expect(onApprove).toHaveBeenCalledWith('custom-item', 50);
  });
});
