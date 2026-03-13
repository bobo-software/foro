import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { QuotationDetail } from '@/components/elements/QuotationDetail';

export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromCompany = searchParams.get('from_company');
  const quotationId = id ? parseInt(id, 10) : NaN;
  const backPath = fromCompany ? `/app/companies/${fromCompany}?tab=quotations` : '/app/quotations';

  if (!id || isNaN(quotationId)) {
    navigate(backPath, { replace: true });
    return null;
  }

  return (
    <QuotationDetail
      quotationId={quotationId}
      onEdit={() => navigate(`/app/quotations/${id}/edit${fromCompany ? `?from_company=${fromCompany}` : ''}`)}
      onDelete={() => navigate(backPath)}
    />
  );
}
