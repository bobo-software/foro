import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { InvoiceDetail } from '@/components/elements/InvoiceDetail';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = id ? parseInt(id, 10) : NaN;
  const fromCompany = searchParams.get('from_company');

  if (!id || isNaN(invoiceId)) {
    navigate('/app/dashboard', { replace: true });
    return null;
  }

  return (
    <InvoiceDetail
      invoiceId={invoiceId}
      fromCompanyId={fromCompany}
      onEdit={() => navigate(`/app/invoices/${id}/edit${fromCompany ? `?from_company=${fromCompany}` : ''}`)}
      onDelete={() => {
        if (fromCompany) navigate(`/app/companies/${fromCompany}?tab=invoices`);
        else navigate(-1);
      }}
    />
  );
}
