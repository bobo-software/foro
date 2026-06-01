import { useState, useCallback, useEffect, useRef } from 'react';
import { LuUpload, LuTrash2, LuImage } from 'react-icons/lu';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import useAuthStore from '@/stores/data/AuthStore';
import BusinessService from '@/services/businessService';
import AddressService from '@/services/addressService';
import StorageService from '@/services/storageService';
import type { CreateBusinessDto } from '@/types/business';
import type { Address, CreateAddressDto } from '@/types/address';
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

export function BusinessSettingsTab() {
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const setCurrentBusiness = useBusinessStore((s) => s.setCurrentBusiness);
  const loading = useBusinessStore((s) => s.loading);

  const [form, setForm] = useState<CreateBusinessDto>({
    name: '',
    address: '',
    phone: '',
    tax_id: '',
    vat_number: '',
    registration_number: '',
  });

  // Address state
  const [existingAddress, setExistingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState<CreateAddressDto>({
    company_id: currentBusiness?.id,
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

  const [saving, setSaving] = useState(false);

  // Logo state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [hasExistingLogo, setHasExistingLogo] = useState(false);

  // Load business data into form
  useEffect(() => {
    if (currentBusiness) {
      setForm({
        name: currentBusiness.name || '',
        address: currentBusiness.address || '',
        phone: currentBusiness.phone || '',
        tax_id: currentBusiness.tax_id || '',
        vat_number: currentBusiness.vat_number || '',
        registration_number: currentBusiness.registration_number || '',
      });

      // Load existing logo — logo_url stores the file path, we get a fresh presigned URL
      if (currentBusiness.logo_url) {
        StorageService.getFileDownloadUrl(currentBusiness.logo_url).then((url) => {
          if (url) {
            setLogoPreview(url);
            setHasExistingLogo(true);
          }
        }).catch(() => {
          setLogoPreview(null);
          setHasExistingLogo(false);
        });
      }

      // Fetch address for this company
      if (currentBusiness.id) {
        AddressService.findByCompanyId(currentBusiness.id).then((addresses) => {
          if (addresses.length > 0) {
            const primaryAddress = addresses.find(a => a.is_primary) || addresses[0];
            setExistingAddress(primaryAddress);
            setAddressForm({
              company_id: currentBusiness.id,
              label: primaryAddress.label ?? 'Business Address',
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
        }).catch(() => {
          // Silently fail
        });
      }
    }
  }, [currentBusiness]);

  const handleChange = useCallback((field: keyof CreateBusinessDto, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddressChange = useCallback((field: keyof CreateAddressDto, value: string | boolean) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleLogoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a PNG, JPG, SVG, or WebP image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be smaller than 5MB');
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleLogoUpload = useCallback(async () => {
    if (!logoFile || !currentBusiness?.id) return;

    setUploadingLogo(true);
    try {
      // Upload file — returns the stored file path
      const { filePath } = await StorageService.uploadCompanyLogo(currentBusiness.id, logoFile);

      // Save the file PATH (not URL) to the business record
      await BusinessService.update(currentBusiness.id, { logo_url: filePath });

      // Use the selected file directly for instant preview
      const objectUrl = URL.createObjectURL(logoFile);
      setLogoPreview(objectUrl);
      setLogoFile(null);
      setHasExistingLogo(true);
      toast.success('Logo uploaded successfully');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh business data
      const updated = await BusinessService.getById(currentBusiness.id);
      if (updated) {
        setCurrentBusiness(updated);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  }, [logoFile, currentBusiness, setCurrentBusiness]);

  const handleLogoRemove = useCallback(async () => {
    if (!currentBusiness?.id) return;

    try {
      // Clear the logo_url on the business record
      await BusinessService.update(currentBusiness.id, { logo_url: '' });
      setLogoPreview(null);
      setLogoFile(null);
      setHasExistingLogo(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success('Logo removed');

      // Refresh business data
      const updated = await BusinessService.getById(currentBusiness.id);
      if (updated) {
        setCurrentBusiness(updated);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove logo');
    }
  }, [currentBusiness, setCurrentBusiness]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Business name is required');
      return;
    }
    if (!currentBusiness?.id) {
      toast.error('No business found');
      return;
    }

    setSaving(true);
    try {
      // Update business details
      await BusinessService.update(currentBusiness.id, {
        name: form.name.trim(),
        address: form.address?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        tax_id: form.tax_id?.trim() || undefined,
        vat_number: form.vat_number?.trim() || undefined,
        registration_number: form.registration_number?.trim() || undefined,
      });

      // Save address (create or update)
      const addressData: CreateAddressDto = {
        company_id: currentBusiness.id,
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

      const hasAddressData = addressData.street_address || addressData.suburb || 
        addressData.town || addressData.city || addressData.province || addressData.postal_code;

      if (hasAddressData && currentBusiness.id) {
        if (existingAddress?.id) {
          await AddressService.update(existingAddress.id, addressData);
        } else {
          const newAddress = await AddressService.create(addressData);
          setExistingAddress(newAddress);
        }
      }

      toast.success('Business details updated');

      // Refresh business data
      const updated = await BusinessService.getById(currentBusiness.id);
      if (updated) {
        setCurrentBusiness(updated);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update business');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors';
  const labelClass = 'block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300';

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!currentBusiness) {
    return <CreateBusinessForm />;
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
        Business Details
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Your business information used on invoices and documents.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Logo */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Company Logo
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            This logo will appear on your invoices, quotations, and other documents. Recommended size: 300x100px. Max 5MB.
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
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleLogoSelect}
                className="hidden"
                id="logo-upload"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <LuUpload className="w-4 h-4" />
                {hasExistingLogo ? 'Change Logo' : 'Select Logo'}
              </button>

              {/* Upload button - shown when a new file is selected */}
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

              {/* Remove button - shown when a logo exists */}
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
              <label htmlFor="name" className={labelClass}>Business Name *</label>
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
              <label htmlFor="phone" className={labelClass}>Phone</label>
              <input
                id="phone"
                type="tel"
                value={form.phone ?? ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={inputClass}
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

        {/* Business Credentials */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Business Credentials
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <label htmlFor="registration_number" className={labelClass}>Registration Number</label>
              <input
                id="registration_number"
                type="text"
                value={form.registration_number ?? ''}
                onChange={(e) => handleChange('registration_number', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="vat_number" className={labelClass}>VAT Number</label>
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

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Create Business Form (shown when no business exists) ────────────────────

function CreateBusinessForm() {
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const fetchUserBusinesses = useBusinessStore((s) => s.fetchUserBusinesses);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    tax_id: '',
    vat_number: '',
    registration_number: '',
  });

  const [addressForm, setAddressForm] = useState({
    street_address: '',
    street_address_2: '',
    suburb: '',
    town: '',
    city: '',
    province: '',
    country: 'South Africa',
    postal_code: '',
  });

  const handleChange = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddressChange = useCallback((field: string, value: string) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Business name is required');
      return;
    }
    if (!sessionUser) {
      toast.error('You must be logged in');
      return;
    }

    setSaving(true);
    try {
      // Build a flat address string from the structured fields
      const addressParts = [
        addressForm.street_address,
        addressForm.street_address_2,
        addressForm.suburb,
        addressForm.city || addressForm.town,
        addressForm.province,
        addressForm.postal_code,
        addressForm.country,
      ].filter(Boolean);

      const business = await BusinessService.create({
        name: form.name.trim(),
        address: addressParts.join(', ') || undefined,
        phone: form.phone.trim() || undefined,
        tax_id: form.tax_id.trim() || undefined,
        vat_number: form.vat_number.trim() || undefined,
        registration_number: form.registration_number.trim() || undefined,
      });

      // Link the new business to the current user
      await BusinessService.linkUserToBusiness(Number(sessionUser.id), business.id!);

      // Save structured address if any fields were filled
      const hasAddressData = addressForm.street_address || addressForm.suburb ||
        addressForm.town || addressForm.city || addressForm.province || addressForm.postal_code;

      if (hasAddressData) {
        try {
          await AddressService.create({
            company_id: Number(business.id),
            label: 'Business Address',
            street_address: addressForm.street_address.trim() || undefined,
            street_address_2: addressForm.street_address_2.trim() || undefined,
            suburb: addressForm.suburb.trim() || undefined,
            town: addressForm.town.trim() || undefined,
            city: addressForm.city.trim() || undefined,
            province: addressForm.province || undefined,
            country: addressForm.country.trim() || 'South Africa',
            postal_code: addressForm.postal_code.trim() || undefined,
            is_primary: true,
            address_type: 'physical',
          });
        } catch {
          // Address save failure shouldn't block business creation
        }
      }

      // Refresh the store so the edit form appears
      await fetchUserBusinesses(Number(sessionUser.id));
      toast.success('Business created successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create business');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors';
  const labelClass = 'block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
        Set Up Your Business
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        Enter your business details below. This information will be used on invoices, quotations, and other documents.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="create-name" className={labelClass}>Business Name *</label>
            <input
              id="create-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={inputClass}
              placeholder="Acme Solutions (Pty) Ltd"
            />
          </div>
          <div>
            <label htmlFor="create-phone" className={labelClass}>Phone</label>
            <input
              id="create-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={inputClass}
              placeholder="+27 11 123 4567"
            />
          </div>
        </div>

        {/* Physical Address */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Physical Address
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="create-street" className={labelClass}>Street Address</label>
              <input
                id="create-street"
                type="text"
                value={addressForm.street_address}
                onChange={(e) => handleAddressChange('street_address', e.target.value)}
                className={inputClass}
                placeholder="123 Main Street"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="create-street2" className={labelClass}>Street Address 2</label>
              <input
                id="create-street2"
                type="text"
                value={addressForm.street_address_2}
                onChange={(e) => handleAddressChange('street_address_2', e.target.value)}
                className={inputClass}
                placeholder="Suite, Unit, Building, Floor, etc."
              />
            </div>
            <div>
              <label htmlFor="create-suburb" className={labelClass}>Suburb</label>
              <input
                id="create-suburb"
                type="text"
                value={addressForm.suburb}
                onChange={(e) => handleAddressChange('suburb', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="create-city" className={labelClass}>City</label>
              <input
                id="create-city"
                type="text"
                value={addressForm.city}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="create-province" className={labelClass}>Province</label>
              <select
                id="create-province"
                value={addressForm.province}
                onChange={(e) => handleAddressChange('province', e.target.value)}
                className={inputClass}
              >
                {SA_PROVINCES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="create-postal" className={labelClass}>Postal Code</label>
              <input
                id="create-postal"
                type="text"
                value={addressForm.postal_code}
                onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                className={inputClass}
                placeholder="0001"
              />
            </div>
            <div>
              <label htmlFor="create-country" className={labelClass}>Country</label>
              <input
                id="create-country"
                type="text"
                value={addressForm.country}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Business Credentials */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Business Credentials
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="create-tax" className={labelClass}>Tax ID</label>
              <input
                id="create-tax"
                type="text"
                value={form.tax_id}
                onChange={(e) => handleChange('tax_id', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="create-reg" className={labelClass}>Registration Number</label>
              <input
                id="create-reg"
                type="text"
                value={form.registration_number}
                onChange={(e) => handleChange('registration_number', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="create-vat" className={labelClass}>VAT Number</label>
              <input
                id="create-vat"
                type="text"
                value={form.vat_number}
                onChange={(e) => handleChange('vat_number', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Creating…' : 'Create Business'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default BusinessSettingsTab;
