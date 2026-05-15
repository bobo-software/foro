import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectsOverviewPage } from './ProjectsOverviewPage';

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
    hoisted.projectFindAll.mockResolvedValue([
      { id: 10, company_id: 3, name: 'Website', status: 'active', business_id: 7 },
    ]);
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

    expect(screen.getByText('North Ltd')).toBeInTheDocument();
    expect(screen.getByText('Projects overview')).toBeInTheDocument();
  });
});
