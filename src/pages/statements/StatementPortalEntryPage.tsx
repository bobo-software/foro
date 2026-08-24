import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePortalNoIndex } from '@/hooks/usePortalNoIndex';
import { ThemeToggleButton } from '@/components/elements/ThemeToggleButton';
import StatementPortalService from '@/services/statementPortalService';
import type { StatementPortalCompany } from '@/types/statementPortal';

type Step = 'email' | 'otp' | 'pick-company';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

/**
 * Public entry point for the client statement portal: email -> OTP -> statement.
 * No Foro login involved — the credential is a `contacts.is_primary` email.
 */
export function StatementPortalEntryPage() {
  usePortalNoIndex();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [companies, setCompanies] = useState<StatementPortalCompany[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const goToCompany = useCallback(
    (companyId: number) => {
      navigate(`/statements/${companyId}`);
    },
    [navigate],
  );

  const handleRequestOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) return;
      setSubmitting(true);
      setError(null);
      try {
        const message = await StatementPortalService.requestOtp(email.trim());
        setInfo(message);
        setStep('otp');
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        const message = err instanceof Error ? err.message : undefined;
        setError(status === 404 ? (message ?? 'This email is not registered as a contact.') : GENERIC_ERROR);
      } finally {
        setSubmitting(false);
      }
    },
    [email],
  );

  const handleVerifyOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!/^\d{6}$/.test(otp)) {
        setError('Enter the 6-digit code from your email.');
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        const matched = await StatementPortalService.verifyOtp(email.trim(), otp);
        if (matched.length === 0) {
          setError('Invalid or expired code');
          return;
        }
        if (matched.length === 1) {
          goToCompany(matched[0].id);
          return;
        }
        setCompanies(matched);
        setStep('pick-company');
      } catch {
        setError('Invalid or expired code');
      } finally {
        setSubmitting(false);
      }
    },
    [email, otp, goToCompany],
  );

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-md mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 text-slate-900 dark:text-white no-underline">
            <img src="/favicon.png" alt="" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-xl font-bold tracking-tight">Foro</span>
          </Link>
          <ThemeToggleButton />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 sm:px-6 py-14 sm:py-20">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Account statement</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Enter the email address registered as your company's primary contact to view your statement, invoices, and
          payments.
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={(e) => void handleRequestOtp(e)} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                placeholder="you@company.com"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition shadow-sm shadow-indigo-500/25 disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send code'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={(e) => void handleVerifyOtp(e)} className="mt-6 space-y-4">
            {info && <p className="text-sm text-slate-600 dark:text-slate-400">{info}</p>}
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                6-digit code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tracking-[0.3em] text-center font-mono"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition shadow-sm shadow-indigo-500/25 disabled:opacity-50"
            >
              {submitting ? 'Verifying…' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setOtp('');
                setError(null);
              }}
              className="w-full text-sm text-slate-500 dark:text-slate-400 hover:underline"
            >
              Use a different email
            </button>
          </form>
        )}

        {step === 'pick-company' && (
          <div className="mt-6 space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Which company's statement?</p>
            {companies.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => goToCompany(c.id)}
                className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default StatementPortalEntryPage;
