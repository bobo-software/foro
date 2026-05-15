import { Link } from 'react-router-dom';
import { usePortalNoIndex } from '@/hooks/usePortalNoIndex';

/**
 * Public entry for the **client portal** (information + team sign-in).
 * Project sharing uses `/portal/v/:token` — see docs/02-modules/project-phase8-portal-gantt-automation.md.
 */
export function PortalLandingPage() {
  usePortalNoIndex();
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[50vh] bg-gradient-to-b from-indigo-500/5 to-transparent dark:from-indigo-500/10 rounded-b-[50%] blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 text-slate-900 dark:text-white no-underline">
            <img src="/favicon.png" alt="" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-xl font-bold tracking-tight">Foro</span>
          </Link>
          <Link
            to="/login"
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline no-underline"
          >
            Team sign in
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Client portal</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
          This area will host <span className="font-medium text-slate-800 dark:text-slate-200">read-only project updates</span>{' '}
          for your customers — timelines, approvals, and shared files — without giving them full Foro access.
        </p>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-500 leading-relaxed">
          If your provider sent a project link, it looks like{' '}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">/portal/v/…</code> — open that
          URL directly (this page is only general information).
        </p>
        <ul className="mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex gap-2">
            <span className="text-indigo-500 dark:text-indigo-400 shrink-0">→</span>
            <span>If you are a <span className="font-medium text-slate-800 dark:text-slate-200">team member</span>, use the main app sign-in.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-indigo-500 dark:text-indigo-400 shrink-0">→</span>
            <span>
              Architecture and roadmap: <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">docs/02-modules/project-phase8-portal-gantt-automation.md</code>
            </span>
          </li>
        </ul>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition shadow-sm shadow-indigo-500/25 no-underline"
          >
            Sign in to Foro
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 no-underline"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
