import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { authPayloadNeedsOtpVerification, authService } from '../../services/authService';
import useAuthStore from '../../stores/data/AuthStore';
import { skaftinClient } from '../../backend';
import { SKAFTIN_CONFIG } from '../../config/skaftin.config';
import type { SessionUser } from '../../types/Types';
import { AppButton } from '@components/ComponentsIndex';

interface LoginApiShape {
  data?: {
    accessToken?: string;
    session?: { accessToken?: string };
    user?: {
      id: number | string;
      name?: string;
      full_name?: string;
      last_name?: string | null;
      email: string;
      phone?: string | null;
      is_active?: boolean;
      email_verified?: boolean;
      roles?: Array<{
        id?: number;
        role_name?: string;
        role_key: string;
        organisation_field_name?: string;
        organisation_lookup_table?: string;
        organisation_lookup_field?: string | null;
      }>;
    };
    organisation_id?: number;
    organisation_name?: string;
    organisation?: { id?: number; name?: string; is_admin?: boolean };
    is_admin?: boolean;
  };
}

function mapNewLoginResponseToSessionUser(raw: LoginApiShape): SessionUser {
  const payload = raw?.data ?? {};
  const token = payload.session?.accessToken ?? payload.accessToken ?? '';
  const user = payload.user;

  if (!user || !token) {
    throw new Error('Invalid login response');
  }

  const firstName = user.name ?? user.full_name ?? '';
  const fullName =
    [firstName, user.last_name].filter(Boolean).join(' ').trim() || firstName || user.email;
  const role = user.roles?.[0]?.role_key ?? '';
  const normalizedRoles = user.roles
    ?.filter(
      (r): r is NonNullable<SessionUser['roles']>[number] =>
        typeof r.id === 'number' &&
        typeof r.role_name === 'string' &&
        typeof r.role_key === 'string'
    );

  return {
    id: user.id,
    email: user.email,
    accessToken: token,
    access: token,
    association: payload.organisation_id ?? payload.organisation?.id ?? 0,
    association_name: payload.organisation_name ?? payload.organisation?.name ?? '',
    role,
    name: fullName,
    full_name: fullName,
    last_name: user.last_name ?? undefined,
    first_name: firstName || undefined,
    phone: user.phone ?? null,
    is_active: user.is_active,
    email_verified: user.email_verified,
    roles: normalizedRoles?.length ? normalizedRoles : undefined,
    is_admin: payload.is_admin ?? payload.organisation?.is_admin ?? false,
  };
}

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Use store state
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearError = useAuthStore((s) => s.clearError);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setError = useAuthStore((s) => s.setError);
  const loginToStore = useAuthStore((s) => s.login);
  const setRequiresOtpVerification = useAuthStore((s) => s.setRequiresOtpVerification);
  const requiresOtpVerification = useAuthStore((s) => s.requiresOtpVerification);

  const isAuthenticated = !!(sessionUser?.accessToken || accessToken);

  // Redirect if already authenticated (pending OTP → verify screen first)
  useEffect(() => {
    if (requiresOtpVerification && sessionUser?.email) {
      navigate('/verify-otp', {
        replace: true,
        state: { email: sessionUser.email, userId: sessionUser.id },
      });
      return;
    }
    if (isAuthenticated && !requiresOtpVerification) {
      navigate(from ?? '/app', { replace: true });
    }
  }, [isAuthenticated, requiresOtpVerification, sessionUser, navigate, from]);

  // Clear error on unmount
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    
    if (!email.trim() || !password) {
      toast.error('Please enter email and password');
      return;
    }
    
    clearError();
    
    try {
      const loggedIn = await authService.login({
        username: email.trim(),
        password,
        method: 'email',
      });
      const pendingOtp = useAuthStore.getState().requiresOtpVerification;
      if (pendingOtp) {
        toast.success('Check your email for the verification code');
        navigate('/verify-otp', {
          replace: true,
          state: { email: loggedIn.email, userId: loggedIn.id },
        });
      } else {
        toast.success('Welcome back');
        navigate(from ?? '/app', { replace: true });
      }
    } catch (err: unknown) {
      const isInvalidShape = err instanceof Error && err.message === 'Invalid login response';

      if (!isInvalidShape) {
        // Error is already set in the store by authService
        const message = err instanceof Error ? err.message : 'Login failed';
        toast.error(message);
        return;
      }

      try {
        // Fallback for new backend login payloads that return data.accessToken.
        clearError();
        setLoading(true);
        const response = await skaftinClient.post<LoginApiShape['data']>(SKAFTIN_CONFIG.endpoints.login, {
          credential: email.trim(),
          password,
          method: 'email',
        });
        const session = mapNewLoginResponseToSessionUser(response as LoginApiShape);
        loginToStore(session);
        const inner = (response as LoginApiShape).data ?? {};
        if (authPayloadNeedsOtpVerification(inner)) {
          setRequiresOtpVerification(true);
          toast.success('Check your email for the verification code');
          navigate('/verify-otp', {
            replace: true,
            state: { email: session.email, userId: session.id },
          });
        } else {
          toast.success('Welcome back');
          navigate(from ?? '/app', { replace: true });
        }
        setLoading(false);
      } catch (fallbackErr: unknown) {
        const fallbackMessage =
          fallbackErr instanceof Error ? fallbackErr.message : 'Login failed';
        setError(fallbackMessage);
        setLoading(false);
        toast.error(fallbackMessage);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
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
            Log in
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 pr-10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <LuEyeOff size={20} />
                ) : (
                  <LuEye size={20} />
                )}
              </button>
            </div>
            <div className="mt-1 text-right">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 no-underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <AppButton
            label={isLoading ? 'Signing in…' : 'Log in'}
            variant="blue"
            onClick={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
          />
        </form>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
