import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CompanyService from '@/services/companyService';
import BankingDetailsService from '@/services/bankingDetailsService';
import AddressService from '@/services/addressService';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useCompanyStore } from '@/stores/data/CompanyStore';
import { useSubscriptionLimits } from '@/hooks';
import type { CreateCompanyDto } from '@/types/company';
import type { CreateBankingDetailsDto, BankingDetails } from '@/types/bankingDetails';
import type { Address, CreateAddressDto } from '@/types/address';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import { CompanyAddressFields } from './CompanyAddressFields';
import { CompanyCredentialsFields } from './CompanyCredentialsFields';
import { CompanyBankingFields } from './CompanyBankingFields';
import { companySchema, bankingDetailsSchema } from '@/validation/schemas';

declare global {
  interface Window {
    google?: any;
    __foroGoogleMapsPromise?: Promise<void>;
  }
}

function loadGoogleMapsPlaces(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__foroGoogleMapsPromise) return window.__foroGoogleMapsPromise;

  window.__foroGoogleMapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps Places'));
    document.head.appendChild(script);
  });

    return window.__foroGoogleMapsPromise;
}

function parseGooglePlace(place: any): Partial<CreateAddressDto> {
  const components = place?.address_components ?? [];
  const byType = (type: string) =>
    components.find((c: any) => Array.isArray(c.types) && c.types.includes(type));

  const streetNumber = byType('street_number')?.long_name ?? '';
  const route = byType('route')?.long_name ?? '';
  const streetAddress = [streetNumber, route].filter(Boolean).join(' ').trim();
  const suburb = byType('sublocality_level_1')?.long_name ?? byType('neighborhood')?.long_name ?? '';
  const city =
    byType('locality')?.long_name ??
    byType('postal_town')?.long_name ??
    byType('administrative_area_level_2')?.long_name ??
    '';
  const province = byType('administrative_area_level_1')?.long_name ?? '';
  const postalCode = byType('postal_code')?.long_name ?? '';
  const country = byType('country')?.long_name ?? 'South Africa';

  return {
    street_address: streetAddress || place?.formatted_address || '',
    suburb,
    city,
    province,
    postal_code: postalCode,
    country,
  };
}

function composeAddress(address: CreateAddressDto): string {
  return [
    address.street_address,
    address.street_address_2,
    address.suburb,
    address.city || address.town,
    address.province,
    address.postal_code,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}

const initial: CreateCompanyDto = {
  name: '',
  email: '',
  phone: '',
  address: '',
  company_name: '',
  contact_person: '',
  tax_id: '',
  business_type: '',
  registration_number: '',
  vat_number: '',
  industry: '',
  website: '',
  notes: '',
};

export function CompanyFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const companies = useCompanyStore((s) => s.companies);
  const fetchCompanies = useCompanyStore((s) => s.fetchCompanies);
  const { limits } = useSubscriptionLimits();
  const [form, setForm] = useState<CreateCompanyDto>(initial);
  const [addressLookup, setAddressLookup] = useState('');
  const addressLookupRef = useRef<HTMLInputElement | null>(null);
  const googleMapsApiKey = useMemo(
    () => String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim(),
    []
  );
  const [mapsStatus, setMapsStatus] = useState<'idle' | 'ready' | 'failed'>('idle');
  const [existingAddress, setExistingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState<CreateAddressDto>({
    label: 'Company Address',
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

  const [includeBankingDetails, setIncludeBankingDetails] = useState(false);
  const [existingBankingDetails, setExistingBankingDetails] = useState<BankingDetails | null>(null);
  const [bankingForm, setBankingForm] = useState<CreateBankingDetailsDto>({
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Keep the company count fresh for the create-mode plan-limit check below,
  // regardless of whether the user arrived via CompaniesPage or a direct URL.
  useEffect(() => {
    if (!isEditMode) void fetchCompanies();
  }, [isEditMode, fetchCompanies]);

  // Load existing company data in edit mode
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    CompanyService.findById(Number(id))
      .then((data) => {
        if (!cancelled && data) {
          setForm({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            company_name: data.company_name || '',
            contact_person: data.contact_person || '',
            tax_id: data.tax_id || '',
            business_type: data.business_type || '',
            registration_number: data.registration_number || '',
            vat_number: data.vat_number || '',
            industry: data.industry || '',
            website: data.website || '',
            notes: data.notes || '',
          });
          setAddressLookup(data.address || '');
          AddressService.findByCompanyId(data.id!)
            .then((addresses) => {
              if (cancelled) return;
              const primary = addresses.find((a) => a.is_primary) || addresses[0];
              if (!primary) {
                setAddressForm((prev) => ({
                  ...prev,
                  company_id: data.id!,
                  street_address: data.address || '',
                }));
                return;
              }
              setExistingAddress(primary);
              setAddressForm({
                company_id: data.id!,
                label: primary.label ?? 'Company Address',
                street_address: primary.street_address ?? '',
                street_address_2: primary.street_address_2 ?? '',
                suburb: primary.suburb ?? '',
                town: primary.town ?? '',
                city: primary.city ?? '',
                province: primary.province ?? '',
                country: primary.country ?? 'South Africa',
                postal_code: primary.postal_code ?? '',
                is_primary: primary.is_primary ?? true,
                address_type: primary.address_type ?? 'physical',
              });
            })
            .catch(() => {
              if (cancelled) return;
              setAddressForm((prev) => ({
                ...prev,
                company_id: data.id!,
                street_address: data.address || '',
              }));
            });
          BankingDetailsService.findByCompanyId(data.id!)
            .then((details) => {
              if (cancelled || details.length === 0) return;
              const primary = details.find((d) => d.is_primary) || details[0];
              setExistingBankingDetails(primary);
              setIncludeBankingDetails(true);
              setBankingForm({
                company_id: data.id!,
                label: primary.label ?? 'Primary Account',
                bank_name: primary.bank_name ?? '',
                account_holder: primary.account_holder ?? '',
                account_number: primary.account_number ?? '',
                account_type: primary.account_type ?? 'cheque',
                branch_code: primary.branch_code ?? '',
                branch_name: primary.branch_name ?? '',
                swift_code: primary.swift_code ?? '',
                is_primary: primary.is_primary ?? true,
                is_active: primary.is_active ?? true,
              });
            })
            .catch(() => {
              // Non-blocking for company edit.
            });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Failed to load company');
          navigate('/app/companies');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  useEffect(() => {
    if (!googleMapsApiKey || !addressLookupRef.current) {
      if (!googleMapsApiKey) setMapsStatus('failed');
      return;
    }

    let autocomplete: any;
    let mounted = true;

    loadGoogleMapsPlaces(googleMapsApiKey)
      .then(() => {
        if (!mounted || !window.google?.maps?.places || !addressLookupRef.current) return;
        autocomplete = new window.google.maps.places.Autocomplete(addressLookupRef.current, {
          fields: ['formatted_address', 'address_components'],
          types: ['address'],
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const formatted = place?.formatted_address ?? '';
          const parsed = parseGooglePlace(place);
          setAddressLookup(formatted);
          setAddressForm((prev) => ({ ...prev, ...parsed }));
          update('address', formatted);
        });
        setMapsStatus('ready');
      })
      .catch(() => {
        if (mounted) setMapsStatus('failed');
      });

    return () => {
      mounted = false;
      if (autocomplete && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [googleMapsApiKey]);

  const update = (key: keyof CreateCompanyDto, value: string | undefined) => {
    setForm((prev) => ({ ...prev, [key]: value ?? '' }));
  };
  const updateAddressField = (key: keyof CreateAddressDto, value: string) => {
    setAddressForm((prev) => {
      const next = { ...prev, [key]: value };
      update('address', composeAddress(next));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = companySchema.safeParse(form);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Please check your input');
      return;
    }
    if (!isEditMode) {
      const clientCompanyCount = companies.filter((c) => !c.is_owner_company).length;
      if (clientCompanyCount >= limits.companies) {
        toast.error(`Your plan is limited to ${limits.companies} companies — upgrade in Settings → Billing to add more.`);
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        ...(businessId != null && { business_id: businessId }),
        name: form.name.trim(),
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        address: composeAddress(addressForm).trim() || form.address?.trim() || undefined,
        company_name: form.company_name?.trim() || undefined,
        contact_person: form.contact_person?.trim() || undefined,
        tax_id: form.tax_id?.trim() || undefined,
        business_type: form.business_type?.trim() || undefined,
        registration_number: form.registration_number?.trim() || undefined,
        vat_number: form.vat_number?.trim() || undefined,
        industry: form.industry?.trim() || undefined,
        website: form.website?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };

      if (isEditMode) {
        await CompanyService.update(Number(id), payload);
        const hasAddressData =
          addressForm.street_address ||
          addressForm.suburb ||
          addressForm.town ||
          addressForm.city ||
          addressForm.province ||
          addressForm.postal_code;
        if (hasAddressData && id) {
          const addressPayload: CreateAddressDto = {
            ...addressForm,
            company_id: Number(id),
            label: addressForm.label?.trim() || 'Company Address',
            street_address: addressForm.street_address?.trim() || undefined,
            street_address_2: addressForm.street_address_2?.trim() || undefined,
            suburb: addressForm.suburb?.trim() || undefined,
            town: addressForm.town?.trim() || undefined,
            city: addressForm.city?.trim() || undefined,
            province: addressForm.province || undefined,
            country: addressForm.country?.trim() || 'South Africa',
            postal_code: addressForm.postal_code?.trim() || undefined,
            is_primary: true,
            address_type: 'physical',
          };
          if (existingAddress?.id) {
            await AddressService.update(existingAddress.id, addressPayload);
          } else {
            const createdAddress = await AddressService.create(addressPayload);
            setExistingAddress(createdAddress);
          }
        }
        if (includeBankingDetails && id) {
          const bankValidation = bankingDetailsSchema.safeParse(bankingForm);
          if (!bankValidation.success) {
            throw new Error(bankValidation.error.issues[0]?.message ?? 'Banking details are invalid');
          }
          const bankingPayload: CreateBankingDetailsDto = {
            ...bankingForm,
            company_id: Number(id),
            label: bankingForm.label?.trim() || 'Primary Account',
            bank_name: bankingForm.bank_name.trim(),
            account_holder: bankingForm.account_holder?.trim() || undefined,
            account_number: bankingForm.account_number.trim(),
            branch_code: bankingForm.branch_code?.trim() || undefined,
            branch_name: bankingForm.branch_name?.trim() || undefined,
            swift_code: bankingForm.swift_code?.trim() || undefined,
            is_primary: true,
            is_active: true,
          };
          if (existingBankingDetails?.id) {
            await BankingDetailsService.update(existingBankingDetails.id, bankingPayload);
          } else {
            const created = await BankingDetailsService.create(bankingPayload);
            setExistingBankingDetails(created);
          }
        }
        toast.success('Company updated');
        navigate(`/app/companies/${id}`);
      } else {
        const createdCompany = await CompanyService.create(payload);
        const hasAddressData =
          addressForm.street_address ||
          addressForm.suburb ||
          addressForm.town ||
          addressForm.city ||
          addressForm.province ||
          addressForm.postal_code;
        if (hasAddressData && createdCompany.id) {
          await AddressService.create({
            ...addressForm,
            company_id: Number(createdCompany.id),
            label: addressForm.label?.trim() || 'Company Address',
            street_address: addressForm.street_address?.trim() || undefined,
            street_address_2: addressForm.street_address_2?.trim() || undefined,
            suburb: addressForm.suburb?.trim() || undefined,
            town: addressForm.town?.trim() || undefined,
            city: addressForm.city?.trim() || undefined,
            province: addressForm.province || undefined,
            country: addressForm.country?.trim() || 'South Africa',
            postal_code: addressForm.postal_code?.trim() || undefined,
            is_primary: true,
            address_type: 'physical',
          });
        }
        if (includeBankingDetails && createdCompany.id) {
          const bankValidation = bankingDetailsSchema.safeParse(bankingForm);
          if (!bankValidation.success) {
            throw new Error(bankValidation.error.issues[0]?.message ?? 'Banking details are invalid');
          }
          await BankingDetailsService.create({
            ...bankingForm,
            company_id: Number(createdCompany.id),
            label: bankingForm.label?.trim() || 'Primary Account',
            bank_name: bankingForm.bank_name.trim(),
            account_holder: bankingForm.account_holder?.trim() || undefined,
            account_number: bankingForm.account_number.trim(),
            branch_code: bankingForm.branch_code?.trim() || undefined,
            branch_name: bankingForm.branch_name?.trim() || undefined,
            swift_code: bankingForm.swift_code?.trim() || undefined,
            is_primary: true,
            is_active: true,
          });
        }
        toast.success('Company created');
        navigate('/app/companies');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} company`);
    } finally {
      setSaving(false);
    }
  };

  const hasNoBusiness = businessId == null;

  if (loading) {
    return (
      <div className="flex min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Edit company</h1>
        </div>
        <div className="mt-6 text-slate-500 dark:text-slate-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3">
        <Link
          to={isEditMode ? `/app/companies/${id}` : '/app/companies'}
          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 no-underline"
        >
          ← {isEditMode ? 'Back to company' : 'Back to companies'}
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {isEditMode ? 'Edit company' : 'Create New company'}
        </h1>
      </div>
      {hasNoBusiness && !isEditMode && (
        <div className="mt-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200">
          Add your business first before creating companies.{' '}
          <Link to="/onboard" className="font-medium text-amber-900 dark:text-amber-100 underline hover:no-underline">
            Add business
          </Link>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="mt-6 flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm lg:p-8"
      >
        <div className="grid flex-1 gap-8 lg:grid-cols-2">
          {/* Company & Contact */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Company & Contact
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <AppInputLabeled
                  label="Company name *"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  disabled={saving}
                  placeholder="e.g. Acme Corporation"
                />
              </div>
              <div className="sm:col-span-2">
                <AppInputLabeled
                  label="Contact person"
                  type="text"
                  value={form.contact_person ?? ''}
                  onChange={(e) => update('contact_person', e.target.value)}
                  disabled={saving}
                  placeholder="e.g. John Smith"
                />
              </div>
              <AppInputLabeled
                label="Email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => update('email', e.target.value)}
                disabled={saving}
              />
              <AppInputLabeled
                label="Phone"
                type="text"
                value={form.phone ?? ''}
                onChange={(e) => update('phone', e.target.value)}
                disabled={saving}
              />
            </div>
            <CompanyAddressFields
              addressLookup={addressLookup}
              onAddressLookupChange={setAddressLookup}
              addressLookupRef={addressLookupRef}
              mapsStatus={mapsStatus}
              addressForm={addressForm}
              onAddressFieldChange={updateAddressField}
              disabled={saving}
            />
          </section>

          {/* Business credentials + Banking */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Business credentials
            </h2>
            <CompanyCredentialsFields
              form={form}
              onChange={update}
              disabled={saving}
            />
            <CompanyBankingFields
              includeBankingDetails={includeBankingDetails}
              onToggle={setIncludeBankingDetails}
              bankingForm={bankingForm}
              onBankingFormChange={(updates) => setBankingForm((prev) => ({ ...prev, ...updates }))}
              disabled={saving}
            />
          </section>
        </div>

        <div className="mt-8 flex shrink-0 gap-3 border-t border-slate-200 dark:border-slate-700 pt-6">
          <button
            type="submit"
            disabled={saving || (hasNoBusiness && !isEditMode)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                Saving…
              </>
            ) : isEditMode ? (
              'Save changes'
            ) : (
              'Create company'
            )}
          </button>
          <Link
            to={isEditMode ? `/app/companies/${id}` : '/app/companies'}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 no-underline hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
