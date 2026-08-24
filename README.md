# Invoice App

A modern invoice management application built with React, TypeScript, and Skaftin backend integration.

## Features

- ✅ Create, read, update, and delete invoices
- ✅ Customer management
- ✅ Tax calculation
- ✅ Status tracking (draft, sent, paid, overdue, cancelled)
- ✅ Modern, responsive UI
- ✅ Backend integration via Skaftin SDK

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Backend

Create a `.env` file in the root directory:

```env
VITE_SKAFTIN_API_URL=http://localhost:4006
VITE_SKAFTIN_API_KEY=sk_your_api_key_here
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

See `.env.example` for reference.

### 3. Create Database Tables

Before using the app, you need to create the `invoices` table in your Skaftin project. You can use the MCP tools or the Skaftin UI to create the table with the following schema:

```sql
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_address TEXT,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port Vite assigns).

## Project Structure

```
src/
├── backend/              # Skaftin SDK integration
│   ├── client/
│   │   └── SkaftinClient.ts
│   └── index.ts
├── components/          # React components
│   ├── InvoiceList.tsx
│   ├── InvoiceForm.tsx
│   └── InvoiceDetail.tsx
├── services/           # API service layer
│   └── invoiceService.ts
├── types/              # TypeScript types
│   └── invoice.ts
├── App.tsx             # Main app component
└── main.tsx            # Entry point
```

## Usage

### Creating an Invoice

1. Click "New Invoice" in the navigation bar
2. Fill in the invoice details
3. The total will be calculated automatically based on subtotal and tax rate
4. Click "Create Invoice" to save

### Viewing Invoices

- The main page shows a list of all invoices
- Filter by status using the dropdown
- Click "View" to see invoice details
- Click "Delete" to remove an invoice

### Editing an Invoice

1. View an invoice
2. Click "Edit"
3. Make your changes
4. Click "Update Invoice"

## Backend Integration

This app uses the Skaftin SDK for backend integration. The SDK handles:

- API authentication
- Database operations (CRUD)
- Error handling
- Request/response formatting

See `client-sdk/` directory for detailed SDK documentation.

## Development

### Adding New Features

1. **New Invoice Fields**: Update `src/types/invoice.ts` and the form component
2. **New API Endpoints**: Add methods to `src/services/invoiceService.ts`
3. **New Components**: Add to `src/components/`

### Environment Variables

- `VITE_SKAFTIN_API_URL`: Backend API URL
- `VITE_SKAFTIN_API_KEY`: API key for authentication
- `VITE_SKAFTIN_ACCESS_TOKEN`: Alternative to API key
- `VITE_SKAFTIN_PROJECT_ID`: Optional project ID (auto-detected)
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps Places API key (used for company address autocomplete)

## License

MIT

## Coolify Deployment Notes

- Build Pack: `Dockerfile`
- Base Directory: `/`
- Dockerfile Location: `/dockerfile`
- Container Port: `80`
- Build-time variables:
  - `INFISICAL_TOKEN=<service-token>`
  - `INFISICAL_ENV=prod`
  - `INFISICAL_DOMAIN=https://infisical.bobosoftware.co.za`
- Remove backend-only pre-deploy commands (for example `php artisan migrate`) for this frontend service.
