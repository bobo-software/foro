import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CompanyService from '@/services/companyService';
import ProjectService from '@/services/projectService';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import type { Company } from '@/types/company';
import type { Project } from '@/types/project';
import { AppPageHeader } from '@/components/ComponentsIndex';

type ProjectScope = 'all' | number;

export function CompanyProjectsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const [company, setCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedScope, setSelectedScope] = useState<ProjectScope>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  const loadProjects = useCallback(async (companyId: number) => {
    const where: Record<string, unknown> = { company_id: companyId };
    if (businessId != null) where.business_id = businessId;
    const data = await ProjectService.findAll({
      where,
      orderBy: 'name',
      orderDirection: 'ASC',
      limit: 500,
    });
    setProjects(data);
    return data;
  }, [businessId]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    CompanyService.findById(Number(id))
      .then((data) => {
        if (!cancelled) setCompany(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load company');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;
    loadProjects(company.id)
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [company?.id, loadProjects]);

  useEffect(() => {
    if (selectedScope === 'all') return;
    const exists = projects.some((p) => p.id === selectedScope);
    if (!exists) setSelectedScope('all');
  }, [projects, selectedScope]);

  const selectedProject = useMemo(
    () => (selectedScope === 'all' ? null : projects.find((p) => p.id === selectedScope) ?? null),
    [projects, selectedScope]
  );

  const queryString = useMemo(() => {
    if (!company?.id) return '';
    const params = new URLSearchParams({ company_id: String(company.id) });
    if (selectedScope !== 'all') params.set('project_id', String(selectedScope));
    return params.toString();
  }, [company?.id, selectedScope]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;
    const trimmedName = newProjectName.trim();
    if (!trimmedName) {
      setProjectError('Project name is required');
      return;
    }
    setProjectError(null);
    setCreatingProject(true);
    try {
      const created = await ProjectService.create({
        business_id: businessId,
        company_id: company.id,
        name: trimmedName,
        code: newProjectCode.trim() || undefined,
        description: newProjectDescription.trim() || undefined,
        status: 'active',
      });
      await loadProjects(company.id);
      if (created.id != null) setSelectedScope(created.id);
      setNewProjectName('');
      setNewProjectCode('');
      setNewProjectDescription('');
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreatingProject(false);
    }
  };

  if (loading) {
    return <div className="text-slate-500 dark:text-slate-400">Loading…</div>;
  }

  if (error || !company) {
    return (
      <div className="space-y-4">
        <p className="text-red-600 dark:text-red-400">{error ?? 'Company not found.'}</p>
        <Link to="/app/companies" className="text-indigo-600 dark:text-indigo-400 hover:underline no-underline">
          Back to companies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppPageHeader
        title={`${company.name} Projects`}
        subtitle="Choose one project or work across all projects"
        showBackButton={true}
        buttonText="Back"
        showButton={true}
        onBackClick={() => navigate(`/app/companies/${company.id}`)}
      />

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="project-scope-page" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Active scope
          </label>
          <select
            id="project-scope-page"
            value={selectedScope === 'all' ? 'all' : String(selectedScope)}
            onChange={(e) => setSelectedScope(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          >
            <option value="all">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {selectedProject ? `Selected: ${selectedProject.name}` : 'Selected: All projects'}
          </span>
        </div>

        <form onSubmit={handleCreateProject} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name *"
            required
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            value={newProjectCode}
            onChange={(e) => setNewProjectCode(e.target.value)}
            placeholder="Code (optional)"
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
            placeholder="Description (optional)"
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={creatingProject}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creatingProject ? 'Creating…' : 'Create project'}
          </button>
        </form>
        {projectError && <p className="text-sm text-red-600 dark:text-red-400">{projectError}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/app/invoices/create?${queryString}`}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-indigo-500"
          >
            Create Invoice
          </Link>
          <Link
            to={`/app/quotations/create?${queryString}`}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-indigo-500"
          >
            Create Quotation
          </Link>
          <Link
            to={`/app/payments/create?${queryString}&company=${encodeURIComponent(company.name)}`}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-indigo-500"
          >
            Record Payment
          </Link>
          <Link
            to={`/app/companies/${company.id}`}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 no-underline hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            View Company Detail
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Projects ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No projects yet for this company.</p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {projects.map((project) => (
              <li key={project.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{project.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {project.code ? `Code: ${project.code}` : 'No code'}
                    {project.description ? ` · ${project.description}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (project.id != null) setSelectedScope(project.id);
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Use this project
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

