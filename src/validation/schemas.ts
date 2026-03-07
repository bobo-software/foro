import { z } from 'zod';

const nonEmptyString = (field: string) =>
  z.string({ message: `${field} is required` }).min(1, `${field} is required`);

const positiveNumber = (field: string) =>
  z.number({ message: `${field} is required` }).nonnegative(`${field} must be ≥ 0`);

const dateString = (field: string) =>
  z.string({ message: `${field} is required` }).regex(/^\d{4}-\d{2}-\d{2}/, `${field} must be a valid date`);

// ── Invoice ────────────────────────────────────────────────────────
export const invoiceSchema = z.object({
  invoice_number: nonEmptyString('Invoice number'),
  customer_name: nonEmptyString('Company name'),
  customer_email: z.string().email('Invalid email').optional().or(z.literal('')),
  customer_address: z.string().optional(),
  customer_vat_number: z.string().optional(),
  delivery_address: z.string().optional(),
  delivery_conditions: z.string().optional(),
  order_number: z.string().optional(),
  terms: z.string().optional(),
  issue_date: dateString('Issue date'),
  due_date: dateString('Due date'),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  subtotal: positiveNumber('Subtotal'),
  tax_rate: z.number().min(0).max(100).optional(),
  tax_amount: z.number().nonnegative().optional(),
  total: positiveNumber('Total'),
  currency: z.string().optional(),
  notes: z.string().max(2000, 'Notes must be ≤ 2000 characters').optional(),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

// ── Quotation ──────────────────────────────────────────────────────
export const quotationSchema = z.object({
  quotation_number: nonEmptyString('Quotation number'),
  customer_name: nonEmptyString('Company name'),
  customer_email: z.string().email('Invalid email').optional().or(z.literal('')),
  customer_address: z.string().optional(),
  customer_vat_number: z.string().optional(),
  delivery_address: z.string().optional(),
  delivery_conditions: z.string().optional(),
  order_number: z.string().optional(),
  terms: z.string().optional(),
  issue_date: dateString('Issue date'),
  valid_until: dateString('Valid until').optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'declined', 'expired', 'converted']),
  subtotal: positiveNumber('Subtotal'),
  tax_rate: z.number().min(0).max(100).optional(),
  tax_amount: z.number().nonnegative().optional(),
  total: positiveNumber('Total'),
  currency: z.string().optional(),
  notes: z.string().max(2000, 'Notes must be ≤ 2000 characters').optional(),
});

export type QuotationInput = z.infer<typeof quotationSchema>;

// ── Company ────────────────────────────────────────────────────────
export const companySchema = z.object({
  name: nonEmptyString('Company name'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  contact_person: z.string().optional(),
  tax_id: z.string().optional(),
  business_type: z.string().optional(),
  registration_number: z.string().optional(),
  vat_number: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
});

export type CompanyInput = z.infer<typeof companySchema>;

// ── Item ───────────────────────────────────────────────────────────
export const itemSchema = z.object({
  name: nonEmptyString('Item name'),
  sku: z.string().optional(),
  description: z.string().optional(),
  unit_price: positiveNumber('Unit price'),
  cost_price: z.number().nonnegative('Cost price must be ≥ 0').optional(),
  quantity: z.number().int('Quantity must be whole number').nonnegative().optional(),
  tax_rate: z.number().min(0).max(100).optional(),
});

export type ItemInput = z.infer<typeof itemSchema>;

// ── Payment ────────────────────────────────────────────────────────
export const paymentSchema = z.object({
  customer_name: nonEmptyString('Company name'),
  amount: z.number({ message: 'Amount is required' }).positive('Amount must be > 0'),
  currency: nonEmptyString('Currency'),
  date: dateString('Payment date'),
  payment_method: z.enum(['cash', 'eft', 'card', 'cheque', 'bank_transfer', 'other']).optional(),
  reference: z.string().optional(),
  invoice_id: z.number().int().positive().nullable().optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

// ── Line Items ─────────────────────────────────────────────────────
export const lineItemSchema = z.object({
  item_id: z.number().int().positive().optional(),
  sku: z.string().optional(),
  description: nonEmptyString('Description'),
  quantity: z.number({ message: 'Quantity is required' }).positive('Quantity must be > 0'),
  unit_price: positiveNumber('Unit price'),
  discount_percent: z.number().min(0).max(100).optional(),
  total: positiveNumber('Line total'),
});

export type LineItemInput = z.infer<typeof lineItemSchema>;

// ── Auth ───────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    first_name: nonEmptyString('First name'),
    last_name: nonEmptyString('Last name'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
