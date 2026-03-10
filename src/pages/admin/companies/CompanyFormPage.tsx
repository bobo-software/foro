import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CompanyService from '@/services/companyService';
import BankingDetailsService from '@/services/bankingDetailsService';
import AddressService from '@/services/addressService';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import type { CreateCompanyDto, Company } from '@/types/company';
import type { CreateBankingDetailsDto, BankingDetails } from '@/types/bankingDetails';
import type { Address, CreateAddressDto } from '@/types/address';
import { SA_BANKS, ACCOUNT_TYPES } from '@/types/bankingDetails';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    google?: any;
    __foromanGoogleMapsPromise?: Promise<void>;
  }
}

function loadGoogleMapsPlaces(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__foromanGoogleMapsPromise) return window.__foromanGoogleMapsPromise;

  window.__foromanGoogleMapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps Places'));
    document.head.appendChild(script);
  });

  return window.__foromanGoogleMapsPromise;
}

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

const BUSINESS_TYPES = [
  { value: '', label: 'Select type…' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'other', label: 'Other' },
];

export function CompanyFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
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
  const updateAddressField = (key: keyof CreateAddressDto, value: string | boolean | undefined) => {
    setAddressForm((prev) => {
      const next = { ...prev, [key]: value };
      update('address', composeAddress(next));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Company name is required');
      return;
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
          if (!bankingForm.bank_name?.trim() || !bankingForm.account_number?.trim()) {
            throw new Error('Bank name and account number are required when adding banking details');
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
          if (!bankingForm.bank_name?.trim() || !bankingForm.account_number?.trim()) {
            throw new Error('Bank name and account number are required when adding banking details');
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

  const inputClass =
    'mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed';
  const addressInputClass =
    'mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 transition-colors duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed';

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
      <div className="flex shrink-0 items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {isEditMode ? 'Edit company' : 'New company'}
        </h1>
        <Link
          to={isEditMode ? `/app/companies/${id}` : '/app/companies'}
          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 no-underline"
        >
          ← {isEditMode ? 'Back to company' : 'Back to companies'}
        </Link>
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
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Company name *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  disabled={saving}
                  placeholder="e.g. Acme Corporation"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="contact_person" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Contact person
                </label>
                <input
                  id="contact_person"
                  type="text"
                  value={form.contact_person ?? ''}
                  onChange={(e) => update('contact_person', e.target.value)}
                  disabled={saving}
                  placeholder="e.g. John Smith"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => update('email', e.target.value)}
                  disabled={saving}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Phone
                </label>
                <input
                  id="phone"
                  type="text"
                  value={form.phone ?? ''}
                  onChange={(e) => update('phone', e.target.value)}
                  disabled={saving}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="address_lookup" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Address lookup
              </label>
              <input
                id="address_lookup"
                ref={addressLookupRef}
                type="text"
                value={addressLookup}
                onChange={(e) => setAddressLookup(e.target.value)}
                disabled={saving}
                placeholder="Search address with Google Places"
                className={addressInputClass}
              />
              {mapsStatus === 'ready' && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Select a suggestion to auto-fill the address.
                </p>
              )}
              {mapsStatus === 'failed' && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  Google Places unavailable. Enter address manually below.
                </p>
              )}
            </div>
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="street_address" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Street address
                </label>
                <input
                  id="street_address"
                  type="text"
                  value={addressForm.street_address ?? ''}
                  onChange={(e) => updateAddressField('street_address', e.target.value)}
                  disabled={saving}
                  placeholder="123 Main Street"
                  className={addressInputClass}
                />
              </div>
              <div>
                <label htmlFor="suburb" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Suburb
                </label>
                <input
                  id="suburb"
                  type="text"
                  value={addressForm.suburb ?? ''}
                  onChange={(e) => updateAddressField('suburb', e.target.value)}
                  disabled={saving}
                  className={addressInputClass}
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={addressForm.city ?? ''}
                  onChange={(e) => updateAddressField('city', e.target.value)}
                  disabled={saving}
                  className={addressInputClass}
                />
              </div>
              <div>
                <label htmlFor="province" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Province
                </label>
                <select
                  id="province"
                  value={addressForm.province ?? ''}
                  onChange={(e) => updateAddressField('province', e.target.value)}
                  disabled={saving}
                  className={addressInputClass}
                >
                  {SA_PROVINCES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="postal_code" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Postal code
                </label>
                <input
                  id="postal_code"
                  type="text"
                  value={addressForm.postal_code ?? ''}
                  onChange={(e) => updateAddressField('postal_code', e.target.value)}
                  disabled={saving}
                  placeholder="0001"
                  className={addressInputClass}
                />
              </div>
            </div>
          </section>

          {/* Business credentials */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Business credentials
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="business_type" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Business type
                </label>
                <select
                  id="business_type"
                  value={form.business_type ?? ''}
                  onChange={(e) => update('business_type', e.target.value)}
                  disabled={saving}
                  className={inputClass}
                >
                  {BUSINESS_TYPES.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tax_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tax ID
                </label>
                <input
                  id="tax_id"
                  type="text"
                  value={form.tax_id ?? ''}
                  onChange={(e) => update('tax_id', e.target.value)}
                  disabled={saving}
                  placeholder="EIN, SSN, or local tax number"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="registration_number" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Registration number
                </label>
                <input
                  id="registration_number"
                  type="text"
                  value={form.registration_number ?? ''}
                  onChange={(e) => update('registration_number', e.target.value)}
                  disabled={saving}
                  placeholder="Official company registration number"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="vat_number" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  VAT number
                </label>
                <input
                  id="vat_number"
                  type="text"
                  value={form.vat_number ?? ''}
                  onChange={(e) => update('vat_number', e.target.value)}
                  disabled={saving}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Industry
                </label>
                <input
                  id="industry"
                  type="text"
                  value={form.industry ?? ''}
                  onChange={(e) => update('industry', e.target.value)}
                  disabled={saving}
                  placeholder="e.g. Retail, Manufacturing"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Website
                </label>
                <input
                  id="website"
                  type="url"
                  value={form.website ?? ''}
                  onChange={(e) => update('website', e.target.value)}
                  disabled={saving}
                  placeholder="https://"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Notes
              </label>
              <textarea
                id="notes"
                rows={4}
                value={form.notes ?? ''}
                onChange={(e) => update('notes', e.target.value)}
                disabled={saving}
                placeholder="Additional notes about this company"
                className={inputClass}
              />
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={includeBankingDetails}
                  onChange={(e) => setIncludeBankingDetails(e.target.checked)}
                  disabled={saving}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Add banking details (optional)
              </label>

              {includeBankingDetails && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Bank name *
                    </label>
                    <select
                      value={bankingForm.bank_name ?? ''}
                      onChange={(e) =>
                        setBankingForm((prev) => {
                          const selectedBank = SA_BANKS.find((b) => b.name === e.target.value);
                          return {
                            ...prev,
                            bank_name: e.target.value,
                            branch_code: selectedBank?.branchCode ?? prev.branch_code,
                          };
                        })
                      }
                      disabled={saving}
                      className={inputClass}
                    >
                      <option value="">Select bank…</option>
                      {SA_BANKS.map((bank) => (
                        <option key={bank.name} value={bank.name}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Account number *
                    </label>
                    <input
                      type="text"
                      value={bankingForm.account_number ?? ''}
                      onChange={(e) =>
                        setBankingForm((prev) => ({ ...prev, account_number: e.target.value }))
                      }
                      disabled={saving}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Account holder
                    </label>
                    <input
                      type="text"
                      value={bankingForm.account_holder ?? ''}
                      onChange={(e) =>
                        setBankingForm((prev) => ({ ...prev, account_holder: e.target.value }))
                      }
                      disabled={saving}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Account type
                    </label>
                    <select
                      value={bankingForm.account_type ?? 'cheque'}
                      onChange={(e) =>
                        setBankingForm((prev) => ({
                          ...prev,
                          account_type: e.target.value as CreateBankingDetailsDto['account_type'],
                        }))
                      }
                      disabled={saving}
                      className={inputClass}
                    >
                      {ACCOUNT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Branch code
                    </label>
                    <input
                      type="text"
                      value={bankingForm.branch_code ?? ''}
                      onChange={(e) =>
                        setBankingForm((prev) => ({ ...prev, branch_code: e.target.value }))
                      }
                      disabled={saving}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      SWIFT code
                    </label>
                    <input
                      type="text"
                      value={bankingForm.swift_code ?? ''}
                      onChange={(e) =>
                        setBankingForm((prev) => ({ ...prev, swift_code: e.target.value }))
                      }
                      disabled={saving}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </div>
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
