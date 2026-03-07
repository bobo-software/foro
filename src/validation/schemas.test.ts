import { describe, it, expect } from 'vitest';
import {
  invoiceSchema,
  quotationSchema,
  companySchema,
  itemSchema,
  paymentSchema,
  lineItemSchema,
  loginSchema,
  registerSchema,
} from './schemas';

describe('invoiceSchema', () => {
  const valid = {
    invoice_number: 'INV-001',
    customer_name: 'Acme Corp',
    issue_date: '2026-01-15',
    due_date: '2026-02-15',
    status: 'draft' as const,
    subtotal: 100,
    total: 115,
  };

  it('accepts a valid invoice', () => {
    expect(invoiceSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing invoice_number', () => {
    const result = invoiceSchema.safeParse({ ...valid, invoice_number: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing customer_name', () => {
    const result = invoiceSchema.safeParse({ ...valid, customer_name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = invoiceSchema.safeParse({ ...valid, status: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects negative subtotal', () => {
    const result = invoiceSchema.safeParse({ ...valid, subtotal: -10 });
    expect(result.success).toBe(false);
  });

  it('accepts optional email when valid', () => {
    const result = invoiceSchema.safeParse({ ...valid, customer_email: 'test@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const result = invoiceSchema.safeParse({ ...valid, customer_email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('accepts empty string for optional email', () => {
    const result = invoiceSchema.safeParse({ ...valid, customer_email: '' });
    expect(result.success).toBe(true);
  });

  it('rejects notes > 2000 characters', () => {
    const result = invoiceSchema.safeParse({ ...valid, notes: 'x'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('rejects tax_rate > 100', () => {
    const result = invoiceSchema.safeParse({ ...valid, tax_rate: 150 });
    expect(result.success).toBe(false);
  });
});

describe('quotationSchema', () => {
  const valid = {
    quotation_number: 'Q-001',
    customer_name: 'Acme Corp',
    issue_date: '2026-01-15',
    status: 'draft' as const,
    subtotal: 100,
    total: 115,
  };

  it('accepts a valid quotation', () => {
    expect(quotationSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts all quotation statuses', () => {
    for (const status of ['draft', 'sent', 'accepted', 'declined', 'expired', 'converted']) {
      expect(quotationSchema.safeParse({ ...valid, status }).success).toBe(true);
    }
  });
});

describe('companySchema', () => {
  it('accepts a valid company', () => {
    const result = companySchema.safeParse({ name: 'Acme Corp' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = companySchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid website URL', () => {
    const result = companySchema.safeParse({ name: 'Acme', website: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('accepts valid website URL', () => {
    const result = companySchema.safeParse({ name: 'Acme', website: 'https://acme.com' });
    expect(result.success).toBe(true);
  });
});

describe('itemSchema', () => {
  it('accepts a valid item', () => {
    const result = itemSchema.safeParse({ name: 'Widget', unit_price: 29.99 });
    expect(result.success).toBe(true);
  });

  it('rejects negative unit_price', () => {
    const result = itemSchema.safeParse({ name: 'Widget', unit_price: -5 });
    expect(result.success).toBe(false);
  });

  it('rejects fractional quantity', () => {
    const result = itemSchema.safeParse({ name: 'Widget', unit_price: 10, quantity: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe('paymentSchema', () => {
  const valid = {
    customer_name: 'Acme Corp',
    amount: 500,
    currency: 'ZAR',
    date: '2026-02-01',
  };

  it('accepts a valid payment', () => {
    expect(paymentSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects zero amount', () => {
    const result = paymentSchema.safeParse({ ...valid, amount: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = paymentSchema.safeParse({ ...valid, amount: -100 });
    expect(result.success).toBe(false);
  });

  it('accepts valid payment methods', () => {
    for (const method of ['cash', 'eft', 'card', 'cheque', 'bank_transfer', 'other']) {
      expect(paymentSchema.safeParse({ ...valid, payment_method: method }).success).toBe(true);
    }
  });
});

describe('lineItemSchema', () => {
  const valid = {
    description: 'Consulting hour',
    quantity: 2,
    unit_price: 150,
    total: 300,
  };

  it('accepts a valid line item', () => {
    expect(lineItemSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects zero quantity', () => {
    const result = lineItemSchema.safeParse({ ...valid, quantity: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects empty description', () => {
    const result = lineItemSchema.safeParse({ ...valid, description: '' });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'Password1' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'bad', password: 'Password1' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'short' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const valid = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    password: 'Password1',
    confirm_password: 'Password1',
  };

  it('accepts valid registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({ ...valid, confirm_password: 'Different1' });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'password1', confirm_password: 'password1' });
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'Password', confirm_password: 'Password' });
    expect(result.success).toBe(false);
  });
});
