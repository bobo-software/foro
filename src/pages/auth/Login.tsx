import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { authService } from '../../services/authService';
import useAuthStore from '../../stores/data/AuthStore';
import { AppButton } from '@components/ComponentsIndex';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const returnTo = new URLSearchParams(location.search).get('returnTo') ?? undefined;
  const from = stateFrom ?? returnTo;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Use store state
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearError = useAuthStore((s) => s.clearError);
  const setRememberMeStore = useAuthStore((s) => s.setRememberMe);

  const isAuthenticated = !!(sessionUser?.accessToken || accessToken);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from ?? '/app', { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

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
      await authService.login({ username: email.trim(), password });
      setRememberMeStore(rememberMe);
      if (!rememberMe) {
        window.sessionStorage.setItem('_fm_sess', '1');
      }
      toast.success('Welcome back');
      navigate(from ?? '/app', { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toast.error(message);
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
            Foro
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

          <div className="flex items-center gap-2">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
            />
            <label
              htmlFor="remember-me"
              className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none"
            >
              Remember me
            </label>
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
            to={from ? `/register?returnTo=${encodeURIComponent(from)}` : '/register'}
            className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
