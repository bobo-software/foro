import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuTrash2, LuUpload, LuImage } from 'react-icons/lu';
import CompanyService from '@/services/companyService';
import ContactService from '@/services/contactService';
import AddressService from '@/services/addressService';
import BankingDetailsService from '@/services/bankingDetailsService';
import StorageService from '@/services/storageService';
import type { Company, CreateCompanyDto } from '@/types/company';
import type { Address, CreateAddressDto } from '@/types/address';
import type { BankingDetails, CreateBankingDetailsDto } from '@/types/bankingDetails';
import { SA_BANKS, ACCOUNT_TYPES } from '@/types/bankingDetails';
import { AppButton, DeleteConfirmationModal } from '@/components/ComponentsIndex';
import type { ConfirmationMode } from '@/components/modals/DeleteConfirmationModal';
import toast from 'react-hot-toast';

const SA_PROVINCES = [
  { value: '', label: 'Select province…' },
  { value: 'Eastern Cape', label: 'Eastern Cape' },
  { value: 'Free State', label: 'Free State' },
  { value: 'Gauteng', label: 'Gauteng' },
  { value: 'KwaZulu-Natal', label: 'KwaZulu-Natal' },
  { value: 'Limpopo', label: 'Limpopo' },
  { value: 'Mpumalanga', label: 'Mpumalanga' },
  { value: 'Northern Cape', label: 'Northern Cape' },
  { value: 'North West', label: 'North West' },
  { value: 'Western Cape', label: 'Western Cape' },
];

interface CompanyEditTabProps {
  company: Company;
  onCompanyUpdate?: (company: Company) => void;
  onCompanyDelete?: () => void;
}

const BUSINESS_TYPES = [
  { value: '', label: 'Select type…' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'other', label: 'Other' },
];

export function CompanyEditTab({ company, onCompanyUpdate, onCompanyDelete }: CompanyEditTabProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateCompanyDto>({
    name: company.name,
    email: company.email ?? '',
    phone: company.phone ?? '',
    address: company.address ?? '',
    contact_person: company.contact_person ?? '',
    business_type: company.business_type ?? '',
    tax_id: company.tax_id ?? '',
    registration_number: company.registration_number ?? '',
    vat_number: company.vat_number ?? '',
    industry: company.industry ?? '',
    website: company.website ?? '',
    notes: company.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  // Address state
  const [existingAddress, setExistingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState<CreateAddressDto>({
    company_id: company.id,
    label: 'Primary',
    street_address: '',
    street_address_2: '',
    suburb: '',
    town: '',
    city: '',
    province: '',
    country: 'South Africa',
    postal_code: '',
    is_primary: true,
    address_type: 'physical',
  });

  // Banking details state
  const [existingBankingDetails, setExistingBankingDetails] = useState<BankingDetails | null>(null);
  const [bankingForm, setBankingForm] = useState<CreateBankingDetailsDto>({
    company_id: company.id,
    label: 'Primary Account',
    bank_name: '',
    account_holder: '',
    account_number: '',
    account_type: 'cheque',
    branch_code: '',
    branch_name: '',
    swift_code: '',
    is_primary: true,
    is_active: true,
  });

  // Logo state
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [hasExistingLogo, setHasExistingLogo] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationMode, setDeleteConfirmationMode] = useState<ConfirmationMode>('button');
  const [deleting, setDeleting] = useState(false);
  const [relatedDataCount, setRelatedDataCount] = useState<{ contacts: number }>({ contacts: 0 });

  // Load existing logo
  useEffect(() => {
    if (company.logo_url) {
      StorageService.getFileDownloadUrl(company.logo_url).then((url) => {
        if (url) {
          setLogoPreview(url);
          setHasExistingLogo(true);
        }
      }).catch(() => {
        setLogoPreview(null);
        setHasExistingLogo(false);
      });
    }
  }, [company.logo_url]);

  // Fetch existing address, banking details, and related data counts
  useEffect(() => {
    const fetchData = async () => {
      if (!company.id) return;
      try {
        // Fetch contacts count
        const contacts = await ContactService.findByCompanyId(company.id);
        setRelatedDataCount({ contacts: contacts.length });

        // Fetch existing address
        const addresses = await AddressService.findByCompanyId(company.id);
        if (addresses.length > 0) {
          const primaryAddress = addresses.find(a => a.is_primary) || addresses[0];
          setExistingAddress(primaryAddress);
          setAddressForm({
            company_id: company.id,
            label: primaryAddress.label ?? 'Primary',
            street_address: primaryAddress.street_address ?? '',
            street_address_2: primaryAddress.street_address_2 ?? '',
            suburb: primaryAddress.suburb ?? '',
            town: primaryAddress.town ?? '',
            city: primaryAddress.city ?? '',
            province: primaryAddress.province ?? '',
            country: primaryAddress.country ?? 'South Africa',
            postal_code: primaryAddress.postal_code ?? '',
            is_primary: primaryAddress.is_primary ?? true,
            address_type: primaryAddress.address_type ?? 'physical',
          });
        }

        // Fetch existing banking details
        const bankingDetails = await BankingDetailsService.findByCompanyId(company.id);
        if (bankingDetails.length > 0) {
          const primaryBanking = bankingDetails.find(b => b.is_primary) || bankingDetails[0];
          setExistingBankingDetails(primaryBanking);
          setBankingForm({
            company_id: company.id,
            label: primaryBanking.label ?? 'Primary Account',
            bank_name: primaryBanking.bank_name ?? '',
            account_holder: primaryBanking.account_holder ?? '',
            account_number: primaryBanking.account_number ?? '',
            account_type: primaryBanking.account_type ?? 'cheque',
            branch_code: primaryBanking.branch_code ?? '',
            branch_name: primaryBanking.branch_name ?? '',
            swift_code: primaryBanking.swift_code ?? '',
            is_primary: primaryBanking.is_primary ?? true,
            is_active: primaryBanking.is_active ?? true,
          });
        }
      } catch {
        // Silently fail - we'll still allow operations
      }
    };
    fetchData();
  }, [company.id]);

  const handleChange = useCallback((field: keyof CreateCompanyDto, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddressChange = useCallback((field: keyof CreateAddressDto, value: string | boolean) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBankingChange = useCallback((field: keyof CreateBankingDetailsDto, value: string | boolean) => {
    setBankingForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Auto-fill branch code when bank is selected
  const handleBankSelect = useCallback((bankName: string) => {
    const selectedBank = SA_BANKS.find(b => b.name === bankName);
    setBankingForm((prev) => ({
      ...prev,
      bank_name: bankName,
      branch_code: selectedBank?.branchCode ?? prev.branch_code,
    }));
  }, []);

  const handleLogoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a PNG, JPG, SVG, or WebP image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be smaller than 5MB');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleLogoUpload = useCallback(async () => {
    if (!logoFile || !company.id) return;

    setUploadingLogo(true);
    try {
      const { filePath } = await StorageService.uploadClientCompanyLogo(company.id, logoFile);
      await CompanyService.update(company.id, { logo_url: filePath });

      const objectUrl = URL.createObjectURL(logoFile);
      setLogoPreview(objectUrl);
      setLogoFile(null);
      setHasExistingLogo(true);
      toast.success('Logo uploaded successfully');

      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }

      // Refresh company data
      const updated = await CompanyService.findById(company.id);
      if (updated) {
        onCompanyUpdate?.(updated);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  }, [logoFile, company.id, onCompanyUpdate]);

  const handleLogoRemove = useCallback(async () => {
    if (!company.id) return;

    try {
      if (company.logo_url) {
        await StorageService.deleteCompanyLogo(company.logo_url).catch(() => {
          // Silently fail if file doesn't exist in storage
        });
      }
      await CompanyService.update(company.id, { logo_url: '' });
      setLogoPreview(null);
      setLogoFile(null);
      setHasExistingLogo(false);

      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }

      toast.success('Logo removed');

      const updated = await CompanyService.findById(company.id);
      if (updated) {
        onCompanyUpdate?.(updated);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove logo');
    }
  }, [company.id, company.logo_url, onCompanyUpdate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    setSaving(true);
    try {
      // Update company details
      await CompanyService.update(company.id!, {
        name: form.name.trim(),
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        address: form.address?.trim() || undefined,
        contact_person: form.contact_person?.trim() || undefined,
        business_type: form.business_type || undefined,
        tax_id: form.tax_id?.trim() || undefined,
        registration_number: form.registration_number?.trim() || undefined,
        vat_number: form.vat_number?.trim() || undefined,
        industry: form.industry?.trim() || undefined,
        website: form.website?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      });

      // Save address (create or update)
      const addressData: CreateAddressDto = {
        company_id: company.id,
        label: addressForm.label?.trim() || 'Primary',
        street_address: addressForm.street_address?.trim() || undefined,
        street_address_2: addressForm.street_address_2?.trim() || undefined,
        suburb: addressForm.suburb?.trim() || undefined,
        town: addressForm.town?.trim() || undefined,
        city: addressForm.city?.trim() || undefined,
        province: addressForm.province || undefined,
        country: addressForm.country?.trim() || 'South Africa',
        postal_code: addressForm.postal_code?.trim() || undefined,
        is_primary: true,
        address_type: addressForm.address_type || 'physical',
      };

      // Check if any address field has a value
      const hasAddressData = addressData.street_address || addressData.suburb || 
        addressData.town || addressData.city || addressData.province || addressData.postal_code;

      if (hasAddressData) {
        if (existingAddress?.id) {
          // Update existing address
          await AddressService.update(existingAddress.id, addressData);
        } else {
          // Create new address
          const newAddress = await AddressService.create(addressData);
          setExistingAddress(newAddress);
        }
      }

      // Save banking details (create or update)
      const bankingData: CreateBankingDetailsDto = {
        company_id: company.id,
        label: bankingForm.label?.trim() || 'Primary Account',
        bank_name: bankingForm.bank_name?.trim() || '',
        account_holder: bankingForm.account_holder?.trim() || undefined,
        account_number: bankingForm.account_number?.trim() || '',
        account_type: bankingForm.account_type || 'cheque',
        branch_code: bankingForm.branch_code?.trim() || undefined,
        branch_name: bankingForm.branch_name?.trim() || undefined,
        swift_code: bankingForm.swift_code?.trim() || undefined,
        is_primary: true,
        is_active: true,
      };

      // Check if banking details have required fields
      const hasBankingData = bankingData.bank_name && bankingData.account_number;

      if (hasBankingData) {
        if (existingBankingDetails?.id) {
          // Update existing banking details
          await BankingDetailsService.update(existingBankingDetails.id, bankingData);
        } else {
          // Create new banking details
          const newBanking = await BankingDetailsService.create(bankingData);
          setExistingBankingDetails(newBanking);
        }
      }

      toast.success('Company updated');
      // Refresh company data
      const updated = await CompanyService.findById(company.id!);
      if (updated) {
        onCompanyUpdate?.(updated);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(async () => {
    if (!company.id) return;
    
    setDeleting(true);
    try {
      // Delete related data first (cascade delete)
      if (relatedDataCount.contacts > 0) {
        await ContactService.deleteByCompanyId(company.id);
      }
      
      // Now delete the company
      await CompanyService.delete(company.id);
      toast.success('Company and all related data deleted successfully');
      setShowDeleteModal(false);
      onCompanyDelete?.();
      navigate('/app/companies', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete company');
    } finally {
      setDeleting(false);
    }
  }, [company.id, navigate, onCompanyDelete, relatedDataCount.contacts]);

  const openDeleteModal = (mode: ConfirmationMode) => {
    setDeleteConfirmationMode(mode);
    setShowDeleteModal(true);
  };

  const inputClass =
    'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors';
  const labelClass = 'block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
        Edit company details
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Logo */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Company Logo
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Upload a logo for this company. Recommended size: 300x100px. Max 5MB.
          </p>
          <div className="flex items-start gap-6">
            {/* Logo Preview */}
            <div className="shrink-0 w-48 h-28 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Company logo"
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <div className="text-center text-slate-400 dark:text-slate-500">
                  <LuImage className="w-8 h-8 mx-auto mb-1" />
                  <span className="text-xs">No logo</span>
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex flex-col gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleLogoSelect}
                className="hidden"
                id="company-logo-upload"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <LuUpload className="w-4 h-4" />
                {hasExistingLogo ? 'Change Logo' : 'Select Logo'}
              </button>

              {logoFile && (
                <button
                  type="button"
                  onClick={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingLogo ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading…
                    </>
                  ) : (
                    <>
                      <LuUpload className="w-4 h-4" />
                      Upload Logo
                    </>
                  )}
                </button>
              )}

              {hasExistingLogo && !logoFile && (
                <button
                  type="button"
                  onClick={handleLogoRemove}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LuTrash2 className="w-4 h-4" />
                  Remove Logo
                </button>
              )}

              {logoFile && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(1)}KB)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className={labelClass}>Company name *</label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="contact_person" className={labelClass}>Contact person</label>
              <input
                id="contact_person"
                type="text"
                value={form.contact_person ?? ''}
                onChange={(e) => handleChange('contact_person', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input
                id="email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>Phone</label>
              <input
                id="phone"
                type="tel"
                value={form.phone ?? ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="website" className={labelClass}>Website</label>
              <input
                id="website"
                type="text"
                value={form.website ?? ''}
                onChange={(e) => handleChange('website', e.target.value)}
                className={inputClass}
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>

        {/* Physical Address */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Physical Address
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="street_address" className={labelClass}>Street Address</label>
              <input
                id="street_address"
                type="text"
                value={addressForm.street_address ?? ''}
                onChange={(e) => handleAddressChange('street_address', e.target.value)}
                className={inputClass}
                placeholder="123 Main Street"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="street_address_2" className={labelClass}>Street Address 2</label>
              <input
                id="street_address_2"
                type="text"
                value={addressForm.street_address_2 ?? ''}
                onChange={(e) => handleAddressChange('street_address_2', e.target.value)}
                className={inputClass}
                placeholder="Suite, Unit, Building, Floor, etc."
              />
            </div>
            <div>
              <label htmlFor="suburb" className={labelClass}>Suburb</label>
              <input
                id="suburb"
                type="text"
                value={addressForm.suburb ?? ''}
                onChange={(e) => handleAddressChange('suburb', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="town" className={labelClass}>Town</label>
              <input
                id="town"
                type="text"
                value={addressForm.town ?? ''}
                onChange={(e) => handleAddressChange('town', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="city" className={labelClass}>City</label>
              <input
                id="city"
                type="text"
                value={addressForm.city ?? ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="province" className={labelClass}>Province</label>
              <select
                id="province"
                value={addressForm.province ?? ''}
                onChange={(e) => handleAddressChange('province', e.target.value)}
                className={inputClass}
              >
                {SA_PROVINCES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="postal_code" className={labelClass}>Postal Code</label>
              <input
                id="postal_code"
                type="text"
                value={addressForm.postal_code ?? ''}
                onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                className={inputClass}
                placeholder="0001"
              />
            </div>
            <div>
              <label htmlFor="country" className={labelClass}>Country</label>
              <input
                id="country"
                type="text"
                value={addressForm.country ?? 'South Africa'}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Business credentials
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="business_type" className={labelClass}>Business type</label>
              <select
                id="business_type"
                value={form.business_type ?? ''}
                onChange={(e) => handleChange('business_type', e.target.value)}
                className={inputClass}
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="industry" className={labelClass}>Industry</label>
              <input
                id="industry"
                type="text"
                value={form.industry ?? ''}
                onChange={(e) => handleChange('industry', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="tax_id" className={labelClass}>Tax ID</label>
              <input
                id="tax_id"
                type="text"
                value={form.tax_id ?? ''}
                onChange={(e) => handleChange('tax_id', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="registration_number" className={labelClass}>Registration number</label>
              <input
                id="registration_number"
                type="text"
                value={form.registration_number ?? ''}
                onChange={(e) => handleChange('registration_number', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="vat_number" className={labelClass}>VAT number</label>
              <input
                id="vat_number"
                type="text"
                value={form.vat_number ?? ''}
                onChange={(e) => handleChange('vat_number', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Banking Details */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Banking Details
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            These details will appear on invoices and documents for payment purposes.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="bank_name" className={labelClass}>Bank Name</label>
              <select
                id="bank_name"
                value={bankingForm.bank_name ?? ''}
                onChange={(e) => handleBankSelect(e.target.value)}
                className={inputClass}
              >
                <option value="">Select bank…</option>
                {SA_BANKS.map((bank) => (
                  <option key={bank.name} value={bank.name}>{bank.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="account_holder" className={labelClass}>Account Holder</label>
              <input
                id="account_holder"
                type="text"
                value={bankingForm.account_holder ?? ''}
                onChange={(e) => handleBankingChange('account_holder', e.target.value)}
                className={inputClass}
                placeholder="Name on the account"
              />
            </div>
            <div>
              <label htmlFor="account_number" className={labelClass}>Account Number</label>
              <input
                id="account_number"
                type="text"
                value={bankingForm.account_number ?? ''}
                onChange={(e) => handleBankingChange('account_number', e.target.value)}
                className={inputClass}
                placeholder="1234567890"
              />
            </div>
            <div>
              <label htmlFor="account_type" className={labelClass}>Account Type</label>
              <select
                id="account_type"
                value={bankingForm.account_type ?? 'cheque'}
                onChange={(e) => handleBankingChange('account_type', e.target.value)}
                className={inputClass}
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="branch_code" className={labelClass}>Branch Code</label>
              <input
                id="branch_code"
                type="text"
                value={bankingForm.branch_code ?? ''}
                onChange={(e) => handleBankingChange('branch_code', e.target.value)}
                className={inputClass}
                placeholder="Universal branch code"
              />
            </div>
            <div>
              <label htmlFor="branch_name" className={labelClass}>Branch Name</label>
              <input
                id="branch_name"
                type="text"
                value={bankingForm.branch_name ?? ''}
                onChange={(e) => handleBankingChange('branch_name', e.target.value)}
                className={inputClass}
                placeholder="Optional"
              />
            </div>
            <div>
              <label htmlFor="swift_code" className={labelClass}>SWIFT Code</label>
              <input
                id="swift_code"
                type="text"
                value={bankingForm.swift_code ?? ''}
                onChange={(e) => handleBankingChange('swift_code', e.target.value)}
                className={inputClass}
                placeholder="For international transfers"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <label htmlFor="notes" className={labelClass}>Notes</label>
          <textarea
            id="notes"
            rows={4}
            value={form.notes ?? ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            className={inputClass}
            placeholder="Additional notes about this company…"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {/* Danger Zone - Delete Company */}
      <div className="mt-6 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 p-6">
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
          Danger Zone
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400/80 mb-2">
          Deleting this company is permanent and cannot be undone.
        </p>
        {relatedDataCount.contacts > 0 && (
          <p className="text-sm text-red-600 dark:text-red-400/80 mb-4">
            <strong>Warning:</strong> This will also delete {relatedDataCount.contacts} contact{relatedDataCount.contacts !== 1 ? 's' : ''} associated with this company.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <AppButton
          icon={<LuTrash2 className="w-4 h-4" />}
            label="Delete with Confirmation"
            variant="red"
            onClick={() => openDeleteModal('type')}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Company"
        message={
          relatedDataCount.contacts > 0
            ? `Are you sure you want to delete "${company.name}"? This will permanently delete the company and ${relatedDataCount.contacts} associated contact${relatedDataCount.contacts !== 1 ? 's' : ''}. This action cannot be undone.`
            : `Are you sure you want to delete "${company.name}"? This action cannot be undone.`
        }
        itemName={company.name}
        confirmationMode={deleteConfirmationMode}
        isLoading={deleting}
        confirmButtonText="Delete Company"
      />
    </div>
  );
}

export default CompanyEditTab;
