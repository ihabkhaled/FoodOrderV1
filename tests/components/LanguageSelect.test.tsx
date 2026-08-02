import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LanguageSelect } from '@/shared/ui';

describe('LanguageSelect', () => {
  it('renders every supported locale using native option metadata', () => {
    render(
      <LanguageSelect locale="en" label="Language" onChange={() => {}} />,
    );

    const select = screen.getByRole('combobox', { name: 'Language' });
    expect(screen.getAllByRole('option')).toHaveLength(13);
    expect(select).toHaveValue('en');
    expect(screen.getByRole('option', { name: 'فارسی' })).toHaveAttribute(
      'dir',
      'rtl',
    );
    expect(screen.getByRole('option', { name: 'Deutsch' })).toHaveAttribute(
      'dir',
      'ltr',
    );
  });

  it('emits a validated locale from the native select', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <LanguageSelect locale="en" label="Language" onChange={onChange} />,
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Language' }),
      'pt-BR',
    );
    expect(onChange).toHaveBeenCalledWith('pt-BR');
  });

  it('uses a one-character selected label in compact navigation', () => {
    render(
      <LanguageSelect
        locale="ar"
        label="Language"
        compact
        onChange={() => {}}
      />,
    );

    const select = screen.getByRole('combobox', { name: 'Language' });
    const compactOption = screen.getByText('ع', { selector: 'option' });
    expect(select).toHaveClass('language-select--compact');
    expect(compactOption).toHaveTextContent('ع');
    expect(compactOption).toHaveAttribute('hidden');
    expect(screen.getByRole('option', { name: 'العربية' })).toBeInTheDocument();
  });

  it('ignores values outside the supported locale set', () => {
    const onChange = vi.fn();
    render(
      <LanguageSelect locale="en" label="Language" onChange={onChange} />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), {
      target: { value: 'unsupported' },
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
