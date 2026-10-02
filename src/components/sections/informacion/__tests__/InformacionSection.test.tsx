import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InformacionSection } from '../InformacionSection';

// Two groups with DIFFERENT dates: the diesel one is days older than the dollar one,
// which is exactly the situation a single shared date used to misrepresent.
vi.mock('../../../../content/datasets/information', () => ({
  informationSnapshot: {
    dollar: { buy: 26.8925, sell: 27.027, date: '2026-10-02' },
    diesel: { sps: 149.2, tegus: 153.53, date: '2026-09-28' },
    override: null,
  },
  dollarMetrics: [{ label: 'Compra', value: 'L 26.8925', helper: 'x' }],
  dieselMetrics: [{ label: 'San Pedro Sula', value: 'L 149.20', helper: 'x' }],
}));

describe('InformacionSection freshness', () => {
  // Vitest globals are off, so RTL does not auto-cleanup between tests.
  afterEach(cleanup);

  it('renders no global date and no "Actualizacion" label', () => {
    const { container } = render(<InformacionSection />);
    expect(container.querySelector('.info-highlight__date')).toBeNull();
    expect(container.textContent).not.toMatch(/Actualizaci/i);
    expect(container.querySelector('.info-highlight__eyebrow')?.textContent).toBe('Precios de referencia');
  });

  it.each([
    ['Precio del dólar', '2026-10-02', '02/10/2026'],
    ['Precio del diésel', '2026-09-28', '28/09/2026'],
  ])('group "%s" carries its own date as <time>: ISO in datetime, dd/mm/yyyy displayed', (name, iso, shown) => {
    render(<InformacionSection />);
    const group = screen.getByRole('region', { name: new RegExp(name) });
    const time = within(group).getByText(shown);
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('datetime', iso);
  });

  it('the date is part of the group accessible name context (announced with its group)', () => {
    render(<InformacionSection />);
    const group = screen.getByRole('region', { name: /Precio del diésel/ });
    expect(group).toHaveTextContent('28/09/2026');
  });
});
