import { useNavigate, useSearchParams } from 'react-router-dom';
import { PaymentForm } from '@/components/elements/PaymentForm';

export function PaymentFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyName = searchParams.get('company') ?? undefined;
  const companyIdParam = searchParams.get('company_id');
  const projectIdParam = searchParams.get('project_id');
  const initialCompanyId = companyIdParam ? parseInt(companyIdParam, 10) : undefined;
  const initialProjectId = projectIdParam ? parseInt(projectIdParam, 10) : undefined;

  return (
    <PaymentForm
      initialCompanyId={initialCompanyId}
      initialProjectId={initialProjectId}
      initialCompanyName={companyName}
      onSuccess={() => navigate('/app/payments')}
      onCancel={() => navigate('/app/payments')}
    />
  );
}
