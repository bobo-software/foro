import { Link, Outlet, useLocation } from 'react-router-dom';
import { LuFilePlus } from 'react-icons/lu';

const TABS = [
  { label: 'Invoices', path: '/app/documents/invoices', createPath: '/app/invoices/create', createLabel: '+ New Invoice' },
  { label: 'Quotations', path: '/app/documents/quotations', createPath: '/app/quotations/create', createLabel: '+ New Quotation' },
  { label: 'Credit Notes', path: '/app/documents/credit-notes', createPath: '/app/invoices/create?credit_note=1', createLabel: '+ New Credit Note' },
  { label: 'Trash', path: '/app/documents/trash' },
] as const;

export function DocumentsPage() {
  const location = useLocation();
  const activeTab = TABS.find((t) => location.pathname.startsWith(t.path)) ?? TABS[0];
  const createPath = 'createPath' in activeTab ? activeTab.createPath : undefined;
  const createLabel = 'createLabel' in activeTab ? activeTab.createLabel : undefined;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100 leading-none">
          Documents
        </h1>
        {createPath && createLabel && (
          <Link
            to={createPath}
            className="inline-flex items-center gap-1.5 shrink-0 rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white no-underline hover:bg-indigo-500"
          >
            <LuFilePlus size={13} />
            {createLabel}
          </Link>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((tab) => {
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors no-underline ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Tab content */}
      <Outlet />
    </div>
  );
}

export default DocumentsPage;
