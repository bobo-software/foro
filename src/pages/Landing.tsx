import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuFileText, LuReceipt, LuWallet, LuClipboardList } from 'react-icons/lu';
import toast from 'react-hot-toast';
import useAuthStore from '../stores/data/AuthStore';

export function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    const { sessionUser, accessToken } = useAuthStore.getState();
    if (sessionUser?.accessToken || accessToken) {
      toast.success('Session Restored');
      navigate('/app', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[60vh] bg-gradient-to-b from-indigo-500/5 to-transparent dark:from-indigo-500/10 rounded-b-[50%] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#64748b0a_1px,transparent_1px),linear-gradient(to_bottom,#64748b0a_1px,transparent_1px)] bg-[size:4rem_4rem] dark:opacity-30" />
      </div>

      {/* Nav */}
      <header className="relative z-10 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 text-slate-900 dark:text-white no-underline">
            <img src="/favicon.png" alt="" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-xl font-bold tracking-tight">Foroman</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 no-underline"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition no-underline shadow-sm shadow-indigo-500/25"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.1]">
            Invoicing and statements,{' '}
            <span className="text-indigo-600 dark:text-indigo-400">simplified</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Create quotes, turn them into invoices, record payments, and run company statements—all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/30 no-underline"
            >
              Start free
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-8 py-4 text-base font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition no-underline"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-5xl mx-auto w-full mt-24 sm:mt-32 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: LuFileText,
              title: 'Quotations',
              description: 'Create and send quotes. Convert accepted quotes to invoices in one click.',
            },
            {
              icon: LuReceipt,
              title: 'Invoices',
              description: 'Issue invoices in ZAR, USD or EUR. Download PDFs and track status.',
            },
            {
              icon: LuWallet,
              title: 'Payments',
              description: 'Record payments by method—cash, EFT, card. Keep balances up to date.',
            },
            {
              icon: LuClipboardList,
              title: 'Statements',
              description: 'Run statements per company with date range and running balance.',
            },
          ].map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900/50 transition"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-4 group-hover:bg-indigo-500/15 dark:group-hover:bg-indigo-500/25 transition">
                <Icon size={24} strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} Foroman
          </span>
          <div className="flex items-center gap-6">
            <Link
              to="/login"
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 no-underline"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 no-underline"
            >
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
