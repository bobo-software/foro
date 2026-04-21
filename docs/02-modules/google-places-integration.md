# Google Places Integration

## Overview

Foroman uses the Google Maps JavaScript API (Places library) to provide address autocomplete on forms. When a user types into the address lookup field, Google Places returns structured address components that are parsed and mapped into the app's `Address` model.

## Environment Variable

| Variable | Required | Description |
|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Google Maps JavaScript API key with Places library enabled |

Defined in `src/config/env.ts` via Zod schema. Falls back to empty string if unset — autocomplete degrades gracefully (manual entry still works).

## How the Script Loads

A singleton loader function is used to avoid duplicate `<script>` tags:

```ts
// Defined locally in each page that needs it
function loadGoogleMapsPlaces(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__foromanGoogleMapsPromise) return window.__foromanGoogleMapsPromise;

  window.__foromanGoogleMapsPromise = new Promise((resolve, reject) => {
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
```

The promise is cached on `window.__foromanGoogleMapsPromise` so concurrent calls from different components share one load.

## Address Parsing

`parseGooglePlace(place)` maps Google's `address_components` array to `CreateAddressDto`:

| Google component type | Maps to |
|---|---|
| `street_number` + `route` | `street_address` |
| `sublocality_level_1` / `neighborhood` | `suburb` |
| `locality` / `postal_town` / `administrative_area_level_2` | `city` |
| `administrative_area_level_1` | `province` |
| `postal_code` | `postal_code` |
| `country` | `country` (defaults to `"South Africa"`) |

Falls back to `place.formatted_address` for `street_address` if components are missing.

## Where It Is Used

| File | Purpose |
|---|---|
| [src/pages/admin/companies/CompanyFormPage.tsx](../src/pages/admin/companies/CompanyFormPage.tsx) | Address autocomplete when creating/editing a company |
| [src/pages/admin/Onboard.tsx](../src/pages/admin/Onboard.tsx) | Address autocomplete during business onboarding |

Both pages follow the same pattern:
1. Read `VITE_GOOGLE_MAPS_API_KEY` via `import.meta.env`
2. Call `loadGoogleMapsPlaces(apiKey)` inside a `useEffect`
3. Attach `new window.google.maps.places.Autocomplete(inputRef.current)` to a text input
4. Listen for `place_changed`, call `parseGooglePlace`, and populate form state
5. Clean up listeners on unmount via `window.google.maps.event.clearInstanceListeners`

## Status States

Pages that use this integration track a `mapsStatus` state:

| Value | Meaning |
|---|---|
| `'idle'` | Not yet attempted |
| `'loaded'` | Script loaded, autocomplete active |
| `'failed'` | API key missing or script load error — falls back to manual address entry |

## Address Model

Autocomplete populates fields defined in `src/types/address.ts` → `CreateAddressDto`. After selection, the address is persisted via `AddressService` to the `addresses` table (linked to `company_id` or `user_id`).

See [src/services/addressService.ts](../src/services/addressService.ts) for CRUD operations.

## Setup Requirements

1. Create a Google Cloud project
2. Enable **Maps JavaScript API** and **Places API**
3. Restrict the API key to your domain (HTTP referrer restriction recommended)
4. Add `VITE_GOOGLE_MAPS_API_KEY=<your-key>` to `.env.local`

## Known Limitations

- `loadGoogleMapsPlaces` is duplicated in `CompanyFormPage.tsx` and `Onboard.tsx` — candidate for extraction to a shared util
- No server-side address validation; Places data is trusted as-is
- Province matching relies on Google returning SA province names exactly — edge cases may require manual correction
