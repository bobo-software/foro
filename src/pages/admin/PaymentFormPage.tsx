import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { PaymentForm } from '@/components/elements/PaymentForm';

export function PaymentFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentId = id ? parseInt(id, 10) : undefined;
  const companyName = searchParams.get('company') ?? undefined;
  const companyIdParam = searchParams.get('company_id');
  const projectIdParam = searchParams.get('project_id');
  const fromCompany = searchParams.get('from_company');
  const initialCompanyId = companyIdParam ? parseInt(companyIdParam, 10) : undefined;
  const initialProjectId = projectIdParam ? parseInt(projectIdParam, 10) : undefined;
  const backPath = fromCompany ? `/app/companies/${fromCompany}?tab=payments` : '/app/payments';

  return (
    <PaymentForm
      paymentId={paymentId}
      initialCompanyId={initialCompanyId}
      initialProjectId={initialProjectId}
      initialCompanyName={companyName}
      onSuccess={() => navigate(backPath)}
      onCancel={() => navigate(backPath)}
    />
  );
}
