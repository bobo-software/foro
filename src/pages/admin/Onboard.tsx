import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '@stores/data/AuthStore';
import { useBusinessStore } from '@stores/data/BusinessStore';
import CompanyService from '@/services/companyService';
import AddressService from '@/services/addressService';
import type { CreateAddressDto } from '@/types/address';
import type { CreateCompanyDto } from '@/types/company';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import { CompanyAddressFields } from './companies/CompanyAddressFields';
import { companySchema } from '@/validation/schemas';

declare global {
  interface Window {
    google?: any;
    __foroGoogleMapsPromise?: Promise<void>;
  }
}

/** ISO 3166-1 alpha-2 — Google Places `componentRestrictions` */
const SA_COUNTRY_CODE = 'za' as const;

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

function placeCountryIsSouthAfrica(place: any): boolean {
  const components = place?.address_components ?? [];
  const country = components.find(
    (c: any) => Array.isArray(c.types) && c.types.includes('country')
  );
  const code = String(country?.short_name ?? '').toUpperCase();
  return code === 'ZA';
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

export function Onboard() {
  const navigate = useNavigate();
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const isLoggedIn = !!useAuthStore((s) => s.accessToken ?? s.sessionUser?.accessToken);
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const fetchUserBusinesses = useBusinessStore((s) => s.fetchUserBusinesses);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [existingAddressId, setExistingAddressId] = useState<number | null>(null);
  const [addressLookup, setAddressLookup] = useState('');
  const [addressForm, setAddressForm] = useState<CreateAddressDto>({
    label: 'Business Address',
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
  const [loading, setLoading] = useState(false);
  const [mapsStatus, setMapsStatus] = useState<'idle' | 'ready' | 'failed'>('idle');
  const googleMapsApiKey = useMemo(
    () => String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim(),
    []
  );
  const addressLookupRef = useRef<HTMLInputElement | null>(null);

  const isEditMode = !!currentBusiness;

  // Pre-fill form when editing existing business
  useEffect(() => {
    if (currentBusiness) {
      setName(currentBusiness.name || '');
      setPhone(currentBusiness.phone || '');
      setTaxId(currentBusiness.tax_id || '');
      setVatNumber(currentBusiness.vat_number || '');
      setRegistrationNumber(currentBusiness.registration_number || '');
    }
  }, [currentBusiness]);

  useEffect(() => {
    const companyId = currentBusiness?.id;
    if (!companyId) return;

    AddressService.findByCompanyId(companyId)
      .then((addresses) => {
        const primary = addresses.find((a) => a.is_primary) || addresses[0];
        if (!primary) return;
        setExistingAddressId(primary.id ?? null);
        const nextAddress: CreateAddressDto = {
          company_id: companyId,
          label: primary.label ?? 'Business Address',
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
        };
        setAddressForm(nextAddress);
        const lookupText = [
          nextAddress.street_address,
          nextAddress.suburb,
          nextAddress.city || nextAddress.town,
          nextAddress.province,
          nextAddress.postal_code,
          nextAddress.country,
        ]
          .filter(Boolean)
          .join(', ');
        setAddressLookup(lookupText);
      })
      .catch(() => {
        // Non-blocking: user can still continue and enter address manually.
      });
  }, [currentBusiness?.id]);

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
          componentRestrictions: { country: SA_COUNTRY_CODE },
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place?.address_components?.length) return;
          if (!placeCountryIsSouthAfrica(place)) {
            toast.error('Please choose a South African address');
            return;
          }
          const parsed = parseGooglePlace(place);
          setAddressLookup(place?.formatted_address ?? '');
          setAddressForm((prev) => ({
            ...prev,
            ...parsed,
            country: 'South Africa',
          }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = companySchema.safeParse({ name, phone, tax_id: taxId, vat_number: vatNumber, registration_number: registrationNumber });
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Please check your input');
      return;
    }
    if (!isLoggedIn || !sessionUser) {
      toast.error('Please log in to save your business');
      navigate('/login', { replace: true });
      return;
    }
    setLoading(true);
    try {
      const payload: CreateCompanyDto = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        tax_id: taxId.trim() || undefined,
        vat_number: vatNumber.trim() || undefined,
        registration_number: registrationNumber.trim() || undefined,
      };
      let companyId = currentBusiness?.id;

      if (isEditMode && companyId) {
        await CompanyService.updateOwnerCompany(companyId, payload);
        toast.success('Company updated');
      } else {
        const company = await CompanyService.createOwnerCompany(Number(sessionUser.id), payload);
        companyId = Number(company.id);
        toast.success('Company saved');
      }

      const hasAddressData =
        addressForm.street_address ||
        addressForm.suburb ||
        addressForm.town ||
        addressForm.city ||
        addressForm.province ||
        addressForm.postal_code;

      if (companyId && hasAddressData) {
        const addressData: CreateAddressDto = {
          company_id: companyId,
          label: addressForm.label?.trim() || 'Business Address',
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

        if (existingAddressId) {
          await AddressService.update(existingAddressId, addressData);
        } else {
          const createdAddress = await AddressService.create(addressData);
          setExistingAddressId(createdAddress.id ?? null);
        }
      }

      await fetchUserBusinesses(Number(sessionUser.id));
      navigate('/app/dashboard', { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save business';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    toast.success('You can add your company later in Settings');
    navigate(isLoggedIn ? '/app/dashboard' : '/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <Link to="/app" className="inline-flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100 no-underline">
            <img src="/favicon.png" alt="" className="h-10 w-10 rounded-lg object-contain" />
            Foro
          </Link>
          <h2 className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-100">
            {isEditMode ? 'Edit company details' : 'Company details'}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {isEditMode
              ? 'Update your company information that appears on quotes and invoices.'
              : 'Add your company now or skip and do it later.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <AppInputLabeled
                label="Company name *"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Ltd"
              />
            </div>

            <div className="sm:col-span-2">
              <CompanyAddressFields
                addressLookup={addressLookup}
                onAddressLookupChange={setAddressLookup}
                addressLookupRef={addressLookupRef}
                mapsStatus={mapsStatus}
                addressForm={addressForm}
                onAddressFieldChange={(key, value) =>
                  setAddressForm((prev) => ({ ...prev, [key]: value }))
                }
                disabled={loading}
              />
            </div>

            <AppInputLabeled
              label="Phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+27 11 123 4567"
            />
            <AppInputLabeled
              label="Tax ID"
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="Tax number"
            />
            <AppInputLabeled
              label="VAT number"
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="e.g. 4123456789"
            />
            <AppInputLabeled
              label="Registration number"
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="Company registration"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-slate-900 dark:bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 transition"
            >
              {loading ? 'Saving…' : isEditMode ? 'Save changes' : 'Save'}
            </button>
            {!isEditMode && (
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Skip for now
              </button>
            )}
            {isEditMode && (
              <Link
                to="/app/settings"
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition no-underline text-center"
              >
                Cancel
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
