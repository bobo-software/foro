import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { InvoiceForm } from '@/components/elements/InvoiceForm';

export function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = id ? parseInt(id, 10) : undefined;
  const companyIdParam = searchParams.get('company_id');
  const initialCompanyId = companyIdParam ? parseInt(companyIdParam, 10) : undefined;
  const projectIdParam = searchParams.get('project_id');
  const initialProjectId = projectIdParam ? parseInt(projectIdParam, 10) : undefined;

  return (
    <InvoiceForm
      invoiceId={invoiceId}
      initialCompanyId={initialCompanyId}
      initialProjectId={initialProjectId}
      onSuccess={() => navigate(-1)}
      onCancel={() =>
        invoiceId ? navigate(`/app/invoices/${invoiceId}`) : navigate(-1)
      }
    />
  );
}
