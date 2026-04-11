import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { authService } from '../../services/authService';
import useAuthStore from '../../stores/data/AuthStore';

export function Register() {
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  
  // Use store state
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const accessToken = useAuthStore((s) => s.accessToken);
  const requiresOtpVerification = useAuthStore((s) => s.requiresOtpVerification);
  const clearError = useAuthStore((s) => s.clearError);

  const isAuthenticated = !!(sessionUser?.accessToken || accessToken);

  // Redirect if already signed in (OTP first when verification is still pending)
  useEffect(() => {
    if (requiresOtpVerification && sessionUser?.email) {
      navigate('/verify-otp', {
        replace: true,
        state: { email: sessionUser.email, userId: sessionUser.id },
      });
      return;
    }
    if (isAuthenticated && !requiresOtpVerification) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, requiresOtpVerification, sessionUser, navigate]);

  // Clear errors on unmount
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();
    
    if (!name.trim() || !email.trim() || !password) {
      setLocalError('Please fill in name, email and password');
      return;
    }
    
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    
    try {
      const result = await authService.register({
        name: name.trim(),
        last_name: lastName.trim() || undefined,
        email: email.trim(),
        password,
        otp_method: 'email',
      });
      
      if (result.requiresOtp) {
        toast.success('Check your email for the verification code');
        navigate('/verify-otp', { replace: true, state: { email: email.trim(), userId: result.userId } });
      } else {
        toast.success('Account created');
        navigate('/onboard', { replace: true });
      }
    } catch (err: unknown) {
      // Error is already set in the store by authService
      const message = err instanceof Error ? err.message : 'Registration failed';
      toast.error(message);
    }
  };

  const displayError = localError || error;

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
            Create your account
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {displayError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-700 dark:text-red-400">{displayError}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label 
                htmlFor="name" 
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                First name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="given-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="John"
              />
            </div>
            <div>
              <label 
                htmlFor="lastName" 
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Doe"
              />
            </div>
          </div>
          
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
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 pr-10 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <LuEyeOff size={20} /> : <LuEye size={20} />}
              </button>
            </div>
          </div>
          
          <div>
            <label 
              htmlFor="confirmPassword" 
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Confirm your password"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-slate-900 dark:bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>
        
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-slate-900 dark:text-slate-100 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
