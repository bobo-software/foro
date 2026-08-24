import { useState, useEffect, useCallback } from 'react';
import { LuPlus, LuPencil, LuTrash2, LuStar, LuUser, LuUserPlus } from 'react-icons/lu';
import ContactService from '@/services/contactService';
import type { Contact, CreateContactDto } from '@/types/contact';
import type { Company } from '@/types/company';
import toast from 'react-hot-toast';

interface CompanyContactsTabProps {
  company: Company;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  is_primary: boolean;
  notes: string;
}

const initialFormData: ContactFormData = {
  name: '',
  email: '',
  phone: '',
  department: '',
  role: '',
  is_primary: false,
  notes: '',
};

export function CompanyContactsTab({ company }: CompanyContactsTabProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<ContactFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [addingFromCompany, setAddingFromCompany] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!company.id) return;
    setLoading(true);
    try {
      const data = await ContactService.findByCompanyId(company.id);
      setContacts(data);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleChange = useCallback((field: keyof ContactFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAdd = () => {
    setEditingContact(null);
    setForm(initialFormData);
    setShowForm(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setForm({
      name: contact.name,
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      department: contact.department ?? '',
      role: contact.role ?? '',
      is_primary: contact.is_primary ?? false,
      notes: contact.notes ?? '',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingContact(null);
    setForm(initialFormData);
  };

  /** Mirrors foro-api's `primaryContactFromCompany` (used to auto-seed a contact on company creation) for existing companies that don't have one yet. */
  const handleAddFromCompany = async () => {
    if (!company.id) return;
    setAddingFromCompany(true);
    try {
      const payload: CreateContactDto = {
        company_id: company.id,
        name: company.contact_person?.trim() || company.name,
        email: company.email?.trim() || undefined,
        phone: company.phone?.trim() || undefined,
        is_primary: true,
      };
      await ContactService.create(payload);
      toast.success('Contact added from company details');
      loadContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add contact');
    } finally {
      setAddingFromCompany(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload: CreateContactDto = {
        company_id: company.id,
        name: form.name.trim(),
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        department: form.department?.trim() || undefined,
        role: form.role?.trim() || undefined,
        is_primary: form.is_primary,
        notes: form.notes?.trim() || undefined,
      };

      if (editingContact) {
        await ContactService.update(editingContact.id!, payload);
        toast.success('Contact updated');
      } else {
        await ContactService.create(payload);
        toast.success('Contact added');
      }
      handleCancel();
      loadContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contact: Contact) => {
    if (!confirm(`Delete contact "${contact.name}"?`)) return;
    try {
      await ContactService.delete(contact.id!);
      toast.success('Contact deleted');
      loadContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contact');
    }
  };

  const handleSetPrimary = async (contact: Contact) => {
    if (contact.is_primary) return;
    try {
      await ContactService.setPrimary(contact.id!, company.id!);
      toast.success(`${contact.name} set as primary contact`);
      loadContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set primary contact');
    }
  };

  const inputClass =
    'w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400';
  const labelClass = 'block mb-1 text-xs font-medium text-slate-600 dark:text-slate-400';

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading contacts…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Contacts ({contacts.length})
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            People at {company.name}
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <LuPlus size={13} />
            Add contact
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
        >
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            {editingContact ? 'Edit contact' : 'New contact'}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="contact-name" className={labelClass}>Name *</label>
              <input
                id="contact-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="contact-email" className={labelClass}>Email</label>
              <input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="contact-phone" className={labelClass}>Phone</label>
              <input
                id="contact-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="contact-department" className={labelClass}>Department</label>
              <input
                id="contact-department"
                type="text"
                value={form.department}
                onChange={(e) => handleChange('department', e.target.value)}
                className={inputClass}
                placeholder="e.g. Finance"
              />
            </div>
            <div>
              <label htmlFor="contact-role" className={labelClass}>Role / Title</label>
              <input
                id="contact-role"
                type="text"
                value={form.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className={inputClass}
                placeholder="e.g. Manager"
              />
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  id="contact-primary"
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => handleChange('is_primary', e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">Primary contact</span>
              </label>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label htmlFor="contact-notes" className={labelClass}>Notes</label>
              <textarea
                id="contact-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : editingContact ? 'Update' : 'Add'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Contact list */}
      {contacts.length === 0 ? (
        <div className="px-4 py-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500">No contacts yet. Add one to get started.</p>
          {!showForm && (
            <button
              type="button"
              onClick={() => void handleAddFromCompany()}
              disabled={addingFromCompany}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              <LuUserPlus size={13} />
              {addingFromCompany ? 'Adding…' : 'Add contact from company details'}
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {contacts.map((contact) => (
            <li key={contact.id} className="flex items-center gap-3 px-4 py-3">
              <div className="shrink-0 p-1.5 rounded-full bg-slate-100 dark:bg-slate-700">
                <LuUser size={14} className="text-slate-500 dark:text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {contact.name}
                  </span>
                  {contact.is_primary && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      <LuStar size={10} />
                      Primary
                    </span>
                  )}
                </div>
                {(contact.role || contact.department) && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {[contact.role, contact.department].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {contact.email && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">{contact.email}</span>
                  )}
                  {contact.phone && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">{contact.phone}</span>
                  )}
                </div>
                {contact.notes && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">{contact.notes}</p>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-0.5">
                {!contact.is_primary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(contact)}
                    className="p-1.5 rounded text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Set as primary"
                  >
                    <LuStar size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleEdit(contact)}
                  className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Edit"
                >
                  <LuPencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(contact)}
                  className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Delete"
                >
                  <LuTrash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CompanyContactsTab;
