import { z } from 'zod';

const nonEmptyString = (field: string) =>
  z.string({ message: `${field} is required` }).min(1, `${field} is required`);

const positiveNumber = (field: string) =>
  z.number({ message: `${field} is required` }).nonnegative(`${field} must be ≥ 0`);

const dateString = (field: string) =>
  z.string({ message: `${field} is required` }).regex(/^\d{4}-\d{2}-\d{2}/, `${field} must be a valid date`);

// ── Invoice ────────────────────────────────────────────────────────
export const invoiceSchema = z.object({
  company_id: z.number().int().positive().nullable().optional(),
  project_id: z.number().int().positive().nullable().optional(),
  document_kind: z.enum(['invoice', 'credit_note']).optional(),
  credited_invoice_id: z.number().int().positive().nullable().optional(),
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
  status: z.enum(['draft', 'accepted', 'sent', 'paid', 'overdue', 'cancelled']),
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
  company_id: z.number().int().positive().nullable().optional(),
  project_id: z.number().int().positive().nullable().optional(),
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
  item_type: z.enum(['single', 'manufactured']).default('single'),
});

export type ItemInput = z.infer<typeof itemSchema>;

export const bomLineInputSchema = z.object({
  component_item_id: z.number().int().positive('Component is required'),
  quantity_per: z.number().positive('Quantity per unit must be > 0'),
});

export type BomLineInput = z.infer<typeof bomLineInputSchema>;

/** Full stock item form including BOM (manufactured requires ≥ 1 line). */
export const itemFormWithBomSchema = itemSchema
  .extend({
    bom_lines: z.array(bomLineInputSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.item_type === 'manufactured') {
      if (!data.bom_lines?.length) {
        ctx.addIssue({
          code: 'custom',
          message: 'Manufactured items require at least one bill of materials line',
          path: ['bom_lines'],
        });
      }
    } else if (data.bom_lines?.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Single items cannot have bill of materials lines',
        path: ['bom_lines'],
      });
    }
  });

export type ItemFormWithBomInput = z.infer<typeof itemFormWithBomSchema>;

// ── Payment ────────────────────────────────────────────────────────
export const paymentSchema = z.object({
  company_id: z.number().int().positive().nullable().optional(),
  project_id: z.number().int().positive().nullable().optional(),
  customer_name: nonEmptyString('Company name'),
  amount: z.number({ message: 'Amount is required' }).positive('Amount must be > 0'),
  currency: nonEmptyString('Currency'),
  date: dateString('Payment date'),
  payment_method: z.enum(['cash', 'eft', 'card', 'cheque', 'bank_transfer', 'other']).optional(),
  reference: z.string().optional(),
  invoice_id: z.number().int().positive().nullable().optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

// ── Project ────────────────────────────────────────────────────────
export const projectSchema = z.object({
  business_id: z.number().int().positive().nullable().optional(),
  company_id: z.number({ message: 'Company is required' }).int().positive('Company is required'),
  name: nonEmptyString('Project name'),
  code: z.string().max(100, 'Code must be ≤ 100 characters').optional(),
  description: z.string().max(2000, 'Description must be ≤ 2000 characters').optional(),
  status: z.string().optional(),
  starts_on: dateString('Start date').optional(),
  ends_on: dateString('End date').optional(),
  budget_hours: z.number().nonnegative('Budget hours must be ≥ 0').nullable().optional(),
  budget_amount: z.number().nonnegative('Budget amount must be ≥ 0').nullable().optional(),
});

export type ProjectInput = z.infer<typeof projectSchema>;

// ── Project task (project_tasks table) ─────────────────────────────
export const projectTaskStatusSchema = z.enum(['todo', 'in_progress', 'review', 'blocked', 'done']);
export const projectTaskPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const projectTaskCreateSchema = z.object({
  business_id: z.number({ message: 'Business is required' }).int().positive('Business is required'),
  project_id: z.number({ message: 'Project is required' }).int().positive('Project is required'),
  title: z.string({ message: 'Title is required' }).min(1, 'Title is required').max(500, 'Title must be ≤ 500 characters'),
  description: z.string().max(2000, 'Description must be ≤ 2000 characters').nullable().optional(),
  status: projectTaskStatusSchema.optional(),
  priority: projectTaskPrioritySchema.nullable().optional(),
  due_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD')
    .nullable()
    .optional(),
  assigned_to_user_id: z.number().int().positive().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

export type ProjectTaskCreateInput = z.infer<typeof projectTaskCreateSchema>;

export const projectTaskUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be ≤ 500 characters').optional(),
  description: z.string().max(2000, 'Description must be ≤ 2000 characters').nullable().optional(),
  status: projectTaskStatusSchema.optional(),
  priority: projectTaskPrioritySchema.nullable().optional(),
  due_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD')
    .nullable()
    .optional(),
  assigned_to_user_id: z.number().int().positive().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  updated_at: z.string().optional(),
});

export type ProjectTaskUpdateInput = z.infer<typeof projectTaskUpdateSchema>;

// ── Task dependencies (project_task_dependencies) ───────────────────
export const projectTaskDependencyCreateSchema = z
  .object({
    business_id: z.number().int().positive(),
    project_id: z.number().int().positive(),
    predecessor_task_id: z.number().int().positive(),
    successor_task_id: z.number().int().positive(),
  })
  .refine((d) => d.predecessor_task_id !== d.successor_task_id, {
    message: 'Predecessor and successor must be different tasks',
    path: ['successor_task_id'],
  });

export type ProjectTaskDependencyCreateInput = z.infer<typeof projectTaskDependencyCreateSchema>;

// ── Task checklists (project_task_checklists / project_task_checklist_items) ──
export const projectTaskChecklistCreateSchema = z.object({
  business_id: z.number().int().positive(),
  project_id: z.number().int().positive(),
  task_id: z.number().int().positive(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be ≤ 200 characters'),
  position: z.number().int().nonnegative().optional(),
});

export type ProjectTaskChecklistCreateInput = z.infer<typeof projectTaskChecklistCreateSchema>;

export const projectTaskChecklistUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be ≤ 200 characters').optional(),
  position: z.number().int().nonnegative().optional(),
  updated_at: z.string().optional(),
});

export type ProjectTaskChecklistUpdateInput = z.infer<typeof projectTaskChecklistUpdateSchema>;

export const projectTaskChecklistItemCreateSchema = z.object({
  business_id: z.number().int().positive(),
  project_id: z.number().int().positive(),
  checklist_id: z.number().int().positive(),
  label: z.string().min(1, 'Label is required').max(500, 'Label must be ≤ 500 characters'),
  is_done: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
});

export type ProjectTaskChecklistItemCreateInput = z.infer<typeof projectTaskChecklistItemCreateSchema>;

export const projectTaskChecklistItemUpdateSchema = z.object({
  label: z.string().min(1, 'Label is required').max(500, 'Label must be ≤ 500 characters').optional(),
  is_done: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
  updated_at: z.string().optional(),
});

export type ProjectTaskChecklistItemUpdateInput = z.infer<typeof projectTaskChecklistItemUpdateSchema>;

// ── Automation rules (automation_rules) ───────────────────────────────
export const automationRuleCreateSchema = z.object({
  business_id: z.number().int().positive(),
  project_id: z.number().int().positive(),
  name: z.string().min(1, 'Name is required').max(200),
  trigger_key: z.string().min(1, 'Trigger is required').max(64),
  definition: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

export type AutomationRuleCreateInput = z.infer<typeof automationRuleCreateSchema>;

// ── Project time entry (project_time_entries) ───────────────────────
export const projectTimeEntryCreateSchema = z.object({
  business_id: z.number().int().positive(),
  project_id: z.number().int().positive(),
  task_id: z.number().int().positive().nullable().optional(),
  user_id: z.number().int().positive(),
  logged_at: z.string().optional(),
  duration_minutes: z
    .number({ message: 'Duration is required' })
    .int()
    .min(1, 'Enter at least 1 minute')
    .max(1440, 'Max 1440 minutes (24h) per entry'),
  billable: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type ProjectTimeEntryCreateInput = z.infer<typeof projectTimeEntryCreateSchema>;

// ── Banking Details ────────────────────────────────────────────────
export const bankingDetailsSchema = z.object({
  bank_name: nonEmptyString('Bank name'),
  account_number: nonEmptyString('Account number'),
  account_holder: z.string().optional(),
  account_type: z.string().optional(),
  branch_code: z.string().optional(),
  branch_name: z.string().optional(),
  swift_code: z.string().optional(),
  label: z.string().optional(),
});

export type BankingDetailsInput = z.infer<typeof bankingDetailsSchema>;

// ── Line Items ─────────────────────────────────────────────────────
export const lineItemSchema = z.object({
  item_id: z.number().int().positive().optional(),
  sku: z.string().optional(),
  description: nonEmptyString('Description'),
  quantity: z.number({ message: 'Quantity is required' }).positive('Quantity must be > 0'),
  unit_price: positiveNumber('Unit price'),
  discount_percent: z.number().min(0).max(100).optional(),
  total: positiveNumber('Line total'),
  unit_type: z.enum(['qty', 'hrs']).optional(),
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
