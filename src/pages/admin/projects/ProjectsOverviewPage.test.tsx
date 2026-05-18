import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { buildOverviewCompanies, ProjectsOverviewPage } from './ProjectsOverviewPage';

const hoisted = vi.hoisted(() => ({
  projectFindAll: vi.fn(),
  companyFindAll: vi.fn(),
  taskFindAll: vi.fn(),
  sumBillable: vi.fn(),
}));

vi.mock('@/services/projectService', () => ({
  __esModule: true,
  default: { findAll: hoisted.projectFindAll },
}));

vi.mock('@/services/companyService', () => ({
  __esModule: true,
  default: { findAll: hoisted.companyFindAll },
}));

vi.mock('@/services/taskService', () => ({
  __esModule: true,
  default: { findAll: hoisted.taskFindAll },
}));

vi.mock('@/services/timeEntryService', () => ({
  __esModule: true,
  default: { sumBillableMinutesForProject: hoisted.sumBillable },
}));

vi.mock('@/stores/data/BusinessStore', () => ({
  __esModule: true,
  useBusinessStore: (selector: (s: { currentBusiness: { id: number; name: string } | null }) => unknown) =>
    selector({ currentBusiness: { id: 7, name: 'Acme' } }),
}));

describe('ProjectsOverviewPage', () => {
  beforeEach(() => {
    hoisted.projectFindAll.mockReset();
    hoisted.companyFindAll.mockReset();
    hoisted.taskFindAll.mockReset();
    hoisted.sumBillable.mockReset();
    hoisted.sumBillable.mockResolvedValue({ totalMinutes: 120, capped: false });
    hoisted.projectFindAll.mockImplementation((params?: { where?: Record<string, unknown> }) => {
      if (params?.where?.company_id != null) return Promise.resolve([]);
      return Promise.resolve([]);
    });
  });

  it('shows empty state when there are no projects', async () => {
    hoisted.projectFindAll.mockResolvedValue([]);
    hoisted.companyFindAll.mockResolvedValue([]);
    hoisted.taskFindAll.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <ProjectsOverviewPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('No projects in this business yet.')).toBeInTheDocument();
  });

  it('renders project rollups and links to project detail', async () => {
    hoisted.projectFindAll.mockImplementation((params?: { where?: Record<string, unknown> }) => {
      if (params?.where?.company_id === 7) return Promise.resolve([]);
      if (params?.where?.business_id === 7) {
        return Promise.resolve([
          { id: 10, company_id: 3, name: 'Website', status: 'active', business_id: 7 },
        ]);
      }
      return Promise.resolve([]);
    });
    hoisted.companyFindAll.mockResolvedValue([{ id: 3, name: 'North Ltd', business_id: 7 }]);
    hoisted.taskFindAll.mockResolvedValue([
      { id: 1, business_id: 7, project_id: 10, title: 'A', status: 'todo', due_on: '2020-01-01' },
      { id: 2, business_id: 7, project_id: 10, title: 'B', status: 'done' },
    ]);

    render(
      <MemoryRouter>
        <ProjectsOverviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
        'href',
        '/app/companies/3/projects/10'
      );
    });

    expect(screen.getByRole('cell', { name: 'North Ltd' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Projects Overview' })).toBeInTheDocument();
  });

  it('shows owner company name for internal projects', async () => {
    hoisted.projectFindAll.mockImplementation((params?: { where?: Record<string, unknown> }) => {
      if (params?.where?.company_id === 7) return Promise.resolve([]);
      if (params?.where?.business_id === 7) {
        return Promise.resolve([
          { id: 11, company_id: 7, name: 'Internal Tooling', status: 'active', business_id: 7 },
        ]);
      }
      return Promise.resolve([]);
    });
    hoisted.companyFindAll.mockResolvedValue([]);
    hoisted.taskFindAll.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <ProjectsOverviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Internal Tooling' })).toHaveAttribute(
        'href',
        '/app/companies/7/projects/11'
      );
    });

    expect(screen.getByRole('cell', { name: 'Acme' })).toBeInTheDocument();
    expect(screen.queryByText('Company #7')).not.toBeInTheDocument();
  });
});

describe('buildOverviewCompanies', () => {
  it('puts owner company first with Your company label', () => {
    const map = new Map<number, string>([
      [7, 'Acme'],
      [3, 'North Ltd'],
    ]);
    expect(buildOverviewCompanies(7, 'Acme', map)).toEqual([
      { id: 7, name: 'Acme (Your company)' },
      { id: 3, name: 'North Ltd' },
    ]);
  });
});
