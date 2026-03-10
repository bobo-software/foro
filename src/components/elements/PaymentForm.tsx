import { useState, useEffect, useCallback } from 'react';
import type { CreatePaymentDto } from '../../types/payment';
import { PAYMENT_METHODS } from '../../types/payment';
import type { Company } from '../../types/company';
import type { Project } from '../../types/project';
import PaymentService from '../../services/paymentService';
import CompanyService from '../../services/companyService';
import ProjectService from '../../services/projectService';
import { useBusinessStore } from '../../stores/data/BusinessStore';
import AppLabledAutocomplete from '../forms/AppLabledAutocomplete';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';

interface PaymentFormProps {
  initialCompanyId?: number;
  initialProjectId?: number;
  initialCompanyName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentForm({ initialCompanyId, initialProjectId, initialCompanyName, onSuccess, onCancel }: PaymentFormProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatePaymentDto>({
    company_id: initialCompanyId,
    project_id: initialProjectId,
    customer_name: initialCompanyName ?? '',
    amount: 0,
    currency: 'ZAR',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'eft',
    reference: '',
  });

  useEffect(() => {
    CompanyService.findAll().then(setCompanies);
  }, []);

  const loadProjectsForCompany = useCallback(async (companyId: number) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    const where: Record<string, unknown> = { company_id: companyId };
    if (businessId != null) where.business_id = businessId;
    const data = await ProjectService.findAll({
      where,
      orderBy: 'name',
      orderDirection: 'ASC',
      limit: 500,
    });
    setProjects(data);
    return data;
  }, []);

  useEffect(() => {
    if (companies.length === 0 || selectedCompany) return;
    if (initialCompanyId) {
      const match = companies.find((c) => c.id === initialCompanyId);
      if (match) {
        setSelectedCompany(match);
        setFormData((prev) => ({
          ...prev,
          company_id: match.id,
          customer_name: match.name,
        }));
        loadProjectsForCompany(match.id!).then((projectList) => {
          if (!initialProjectId) return;
          const project = projectList.find((p) => p.id === initialProjectId) ?? null;
          setSelectedProject(project);
          setFormData((prev) => ({ ...prev, project_id: project?.id }));
        }).catch(() => {});
        return;
      }
    }
    if (initialCompanyName) {
      const match = companies.find(
        (c) => c.name.toLowerCase() === initialCompanyName.toLowerCase()
      );
      if (match) {
        setSelectedCompany(match);
        setFormData((prev) => ({ ...prev, customer_name: match.name, company_id: match.id }));
        loadProjectsForCompany(match.id!).then((projectList) => {
          if (!initialProjectId) return;
          const project = projectList.find((p) => p.id === initialProjectId) ?? null;
          setSelectedProject(project);
          setFormData((prev) => ({ ...prev, project_id: project?.id }));
        }).catch(() => {});
      } else {
        setFormData((prev) => ({ ...prev, customer_name: initialCompanyName }));
      }
    }
  }, [initialCompanyId, initialCompanyName, initialProjectId, companies, selectedCompany, loadProjectsForCompany]);

  const handleChange = useCallback((field: keyof CreatePaymentDto, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCompanySelect = useCallback((company: Company) => {
    setSelectedCompany(company);
    setSelectedProject(null);
    setFormData((prev) => ({
      ...prev,
      company_id: company.id,
      project_id: undefined,
      customer_name: company.name,
    }));
    if (company.id != null) {
      loadProjectsForCompany(company.id).catch(() => setProjects([]));
    }
  }, [loadProjectsForCompany]);

  const handleCompanyClear = useCallback(() => {
    setSelectedCompany(null);
    setSelectedProject(null);
    setProjects([]);
    setFormData((prev) => ({ ...prev, company_id: undefined, project_id: undefined, customer_name: '' }));
  }, []);

  const handleProjectSelect = useCallback((project: Project) => {
    setSelectedProject(project);
    setFormData((prev) => ({ ...prev, project_id: project.id }));
  }, []);

  const handleProjectClear = useCallback(() => {
    setSelectedProject(null);
    setFormData((prev) => ({ ...prev, project_id: undefined }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name?.trim()) {
      setError('Company is required');
      return;
    }
    if (Number(formData.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (!formData.project_id) {
      setError('Project is required for new payments');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const businessId = useBusinessStore.getState().currentBusiness?.id;
      await PaymentService.create({
        ...formData,
        amount: Number(formData.amount),
        ...(businessId != null && { business_id: businessId }),
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors font-[inherit]';
  const labelClass = 'mb-1 text-sm font-medium text-gray-700 dark:text-gray-300';
  const groupClass = 'flex flex-col';

  return (
    <div className=" mx-auto">
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">Record payment</h2>
      {error && (
        <div className="mb-2 px-3 py-2 text-sm rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="p-4 rounded-lg shadow bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      >
        <div className="pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
          <AppLabledAutocomplete
            label="Company *"
            options={companies}
            value={selectedCompany?.id != null ? String(selectedCompany.id) : ''}
            displayValue={selectedCompany?.name ?? formData.customer_name}
            accessor="name"
            valueAccessor="id"
            onSelect={handleCompanySelect}
            onClear={handleCompanyClear}
            required
            placeholder="Search company..."
          />
        </div>
        <div className="pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
          <AppLabledAutocomplete
            label="Project *"
            options={projects}
            value={selectedProject?.id != null ? String(selectedProject.id) : ''}
            displayValue={selectedProject?.name ?? ''}
            accessor="name"
            valueAccessor="id"
            onSelect={handleProjectSelect}
            onClear={handleProjectClear}
            required
            disabled={!selectedCompany}
            placeholder={selectedCompany ? 'Search project...' : 'Select company first'}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
          <div className={groupClass}>
            <label htmlFor="amount" className={labelClass}>
              Amount *
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min={0}
              value={formData.amount || ''}
              onChange={(e) => handleChange('amount', e.target.value ? parseFloat(e.target.value) : 0)}
              className={inputClass}
              required
            />
          </div>
          <div className={groupClass}>
            <label htmlFor="currency" className={labelClass}>
              Currency
            </label>
            <select
              id="currency"
              value={formData.currency || 'ZAR'}
              onChange={(e) => handleChange('currency', e.target.value)}
              className={inputClass}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className={groupClass}>
            <label htmlFor="date" className={labelClass}>
              Date *
            </label>
            <input
              id="date"
              type="date"
              value={formData.date || ''}
              onChange={(e) => handleChange('date', e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className={groupClass}>
            <label htmlFor="payment_method" className={labelClass}>
              Payment method
            </label>
            <select
              id="payment_method"
              value={formData.payment_method || 'eft'}
              onChange={(e) => handleChange('payment_method', e.target.value)}
              className={inputClass}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className={groupClass}>
            <label htmlFor="reference" className={labelClass}>
              Reference
            </label>
            <input
              id="reference"
              type="text"
              value={formData.reference || ''}
              onChange={(e) => handleChange('reference', e.target.value)}
              className={inputClass}
              placeholder="e.g. bank transfer, cheque #"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving…' : 'Save payment'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
