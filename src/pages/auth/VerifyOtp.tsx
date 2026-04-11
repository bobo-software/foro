import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService';
import useAuthStore from '../../stores/data/AuthStore';

export function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  
  const state = location.state as { email?: string; userId?: number } | null;
  const email = state?.email ?? sessionUser?.email ?? '';
  const userId = state?.userId ?? (sessionUser?.id as number | undefined);

  const [otp, setOtp] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/register', { replace: true });
    }
  }, [email, navigate]);

  // Clear error on unmount
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  if (!email) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error('Please enter the verification code');
      return;
    }
    if (userId == null || Number.isNaN(Number(userId))) {
      toast.error('Missing account id. Please register again.');
      return;
    }

    clearError();

    try {
      const verifiedUser = await authService.verifyOtp(Number(userId), otp.trim());
      if (verifiedUser) {
        toast.success('Account verified');
        navigate('/onboard', { replace: true });
      } else {
        toast.success('Account verified — please sign in');
        navigate('/login', { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      toast.error(message);
    }
  };

  const handleResend = async () => {
    if (userId == null) {
      toast.error('Cannot resend. Please register again.');
      return;
    }
    setResendLoading(true);
    try {
      await authService.resendOtp(userId, 'email');
      toast.success('Verification code sent again');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend';
      toast.error(message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white no-underline"
          >
            <img src="/favicon.png" alt="" className="h-10 w-10 rounded-lg object-contain" />
            Foroman
          </Link>
          <h2 className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-100">
            Verify your account
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            We sent a verification code to <strong className="text-slate-700 dark:text-slate-200">{email}</strong>. 
            Enter it below to activate your account.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label 
              htmlFor="otp" 
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Verification code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-slate-100 text-center text-lg tracking-widest focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="000000"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || otp.length < 4}
            className="w-full rounded-lg bg-slate-900 dark:bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                Verifying…
              </>
            ) : (
              'Verify & activate account'
            )}
          </button>
          
          {userId != null && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading || isLoading}
              className="w-full text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-50 transition"
            >
              {resendLoading ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </form>
        
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          <Link to="/login" className="font-medium text-slate-900 dark:text-slate-100 hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
