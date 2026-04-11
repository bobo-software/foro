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
  const creditFromParam = searchParams.get('credit_from');
  const creditFromInvoiceId = creditFromParam ? parseInt(creditFromParam, 10) : undefined;
  const standaloneCreditNote = searchParams.get('credit_note') === '1';
  const fromCompany = searchParams.get('from_company');
  const companyInvoicesTab = fromCompany ? `/app/companies/${fromCompany}?tab=invoices` : null;

  return (
    <InvoiceForm
      invoiceId={invoiceId}
      creditFromInvoiceId={Number.isFinite(creditFromInvoiceId) ? creditFromInvoiceId : undefined}
      standaloneCreditNote={standaloneCreditNote}
      initialCompanyId={initialCompanyId}
      initialProjectId={initialProjectId}
      onSuccess={(createdId) => {
        if (createdId != null) navigate(`/app/invoices/${createdId}`);
        else navigate(-1);
      }}
      onCancel={() => {
        if (invoiceId) navigate(`/app/invoices/${invoiceId}`);
        else if (Number.isFinite(creditFromInvoiceId))
          navigate(`/app/invoices/${creditFromInvoiceId}`);
        else if (companyInvoicesTab) navigate(companyInvoicesTab);
        else navigate(-1);
      }}
    />
  );
}
