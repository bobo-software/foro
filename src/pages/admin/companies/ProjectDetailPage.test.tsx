import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectDetailPage } from './ProjectDetailPage';

const hoisted = vi.hoisted(() => ({
  companyFindById: vi.fn(),
  projectFindById: vi.fn(),
  projectUpdate: vi.fn(),
  taskFindAll: vi.fn(),
  timeFindAll: vi.fn(),
  sumBillableRollup: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}));

const downloadCsvFileMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/csvDownload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/csvDownload')>();
  return {
    ...actual,
    downloadCsvFile: downloadCsvFileMock,
  };
});

vi.mock('./ProjectTasksKanban', () => ({
  ProjectTasksKanban: () => <div data-testid="kanban-mock" />,
}));

vi.mock('@/services/companyService', () => ({
  __esModule: true,
  default: {
    findById: hoisted.companyFindById,
  },
}));

vi.mock('@/services/projectService', () => ({
  __esModule: true,
  default: {
    findById: hoisted.projectFindById,
    update: hoisted.projectUpdate,
  },
}));

vi.mock('@/services/taskService', () => ({
  __esModule: true,
  default: {
    findAll: hoisted.taskFindAll,
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/services/timeEntryService', () => ({
  __esModule: true,
  default: {
    findAll: hoisted.timeFindAll,
    create: vi.fn(),
    sumBillableMinutesForProject: hoisted.sumBillableRollup,
  },
}));

vi.mock('@/services/taskDependencyService', () => ({
  __esModule: true,
  default: {
    findByProject: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/portalInviteService', () => ({
  __esModule: true,
  default: {
    findByProject: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/automationRuleService', () => ({
  __esModule: true,
  default: {
    findByProject: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/automationTriggerRunner', () => ({
  __esModule: true,
  notifyTaskMarkedDoneAutomation: vi.fn().mockResolvedValue(undefined),
  notifyTaskCreatedAutomation: vi.fn().mockResolvedValue(undefined),
  notifyTaskStatusChangedAutomation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/stores/data/AuthStore', () => ({
  __esModule: true,
  default: (selector: (s: { sessionUser: { id: number } | null }) => unknown) =>
    selector({ sessionUser: { id: 42 } }),
}));

vi.mock('@/stores/data/BusinessStore', () => ({
  __esModule: true,
  useBusinessStore: (selector: (s: { currentBusiness: { id: number; name: string } | null }) => unknown) =>
    selector({ currentBusiness: { id: 7, name: 'Acme' } }),
}));

vi.mock('@/stores/data/TeamStore', () => ({
  __esModule: true,
  useTeamStore: (selector: (s: { members: []; fetchMembers: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({
      members: [],
      fetchMembers: vi.fn().mockResolvedValue(undefined),
    }),
}));

function renderAtProject(path = '/app/companies/10/projects/20') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/companies/:id/projects/:projectId" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    localStorage.clear();
    hoisted.companyFindById.mockReset();
    hoisted.projectFindById.mockReset();
    hoisted.projectUpdate.mockReset();
    hoisted.taskFindAll.mockReset();
    hoisted.timeFindAll.mockReset();
    hoisted.sumBillableRollup.mockReset();
    downloadCsvFileMock.mockReset();

    hoisted.companyFindById.mockResolvedValue({ id: 10, name: 'North Ltd' });
    hoisted.projectFindById.mockResolvedValue({
      id: 20,
      company_id: 10,
      name: 'Roadmap',
      business_id: 7,
      budget_hours: null,
      budget_amount: null,
    });
    hoisted.taskFindAll.mockResolvedValue([]);
    hoisted.timeFindAll.mockResolvedValue([]);
    hoisted.sumBillableRollup.mockResolvedValue({ totalMinutes: 0, entryCount: 0, capped: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the project title and budget section', async () => {
    renderAtProject();

    expect(await screen.findByRole('heading', { level: 1, name: 'Roadmap' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^insights$/i })).toBeInTheDocument();
    expect(await screen.findByTestId('billable-rollup-summary')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /budget and time/i })).toBeInTheDocument();
  });

  it('exports loaded tasks as CSV when Export tasks is clicked', async () => {
    hoisted.taskFindAll.mockResolvedValue([
      {
        id: 1,
        business_id: 7,
        project_id: 20,
        title: 'Alpha',
        status: 'todo',
        position: 0,
      },
    ]);
    renderAtProject();
    await screen.findByRole('heading', { level: 1, name: 'Roadmap' });
    await userEvent.click(await screen.findByRole('button', { name: /export tasks \(csv\)/i }));
    expect(downloadCsvFileMock).toHaveBeenCalledWith(
      'project-20-tasks-loaded.csv',
      expect.stringContaining('Alpha')
    );
  });

  it('shows Load more time entries when the first page is full', async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      business_id: 7,
      project_id: 20,
      user_id: 42,
      duration_minutes: 30,
      billable: true,
      logged_at: '2026-01-15T10:00:00Z',
    }));
    hoisted.timeFindAll.mockResolvedValue(many);
    renderAtProject();
    await screen.findByRole('heading', { level: 1, name: 'Roadmap' });
    expect(await screen.findByRole('button', { name: /load more time entries/i })).toBeInTheDocument();
  });

  it('requests the next time-entry offset when Load more is clicked', async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      business_id: 7,
      project_id: 20,
      user_id: 42,
      duration_minutes: 30,
      billable: true,
      logged_at: '2026-01-15T10:00:00Z',
    }));
    hoisted.timeFindAll
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce([
        {
          id: 99,
          business_id: 7,
          project_id: 20,
          user_id: 42,
          duration_minutes: 15,
          billable: false,
          logged_at: '2025-12-01T10:00:00Z',
        },
      ]);
    renderAtProject();
    await screen.findByRole('heading', { level: 1, name: 'Roadmap' });
    const btn = await screen.findByRole('button', { name: /load more time entries/i });
    await userEvent.click(btn);
    await waitFor(() => {
      expect(hoisted.timeFindAll).toHaveBeenLastCalledWith(
        expect.objectContaining({
          offset: 50,
          limit: 50,
          where: { project_id: 20, business_id: 7 },
        })
      );
    });
  });

  it('debounces list title search into TaskService where.ilike', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    hoisted.taskFindAll.mockResolvedValue([
      {
        id: 1,
        business_id: 7,
        project_id: 20,
        title: 'Wire filters',
        status: 'todo',
        position: 0,
      },
    ]);

    renderAtProject();

    await screen.findByRole('heading', { level: 1, name: 'Roadmap' });

    await user.click(await screen.findByRole('button', { name: /^list$/i }));

    await waitFor(() => {
      expect(hoisted.taskFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { project_id: 20, business_id: 7 },
        })
      );
    });

    hoisted.taskFindAll.mockClear();

    const titleInput = screen.getByLabelText(/search title/i);
    await user.type(titleInput, 'xyz');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });

    await waitFor(() => {
      expect(hoisted.taskFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            project_id: 20,
            business_id: 7,
            title: { ilike: '%xyz%' },
          }),
        })
      );
    });
  });

  it('shows filter-specific empty copy when status filter returns no rows', async () => {
    hoisted.taskFindAll.mockImplementation(async (params: { where?: Record<string, unknown> }) => {
      const st = params.where?.status;
      if (st === 'done') return [];
      return [
        {
          id: 1,
          business_id: 7,
          project_id: 20,
          title: 'Open item',
          status: 'todo',
          position: 0,
        },
      ];
    });

    renderAtProject();

    await screen.findByRole('heading', { level: 1, name: 'Roadmap' });

    await userEvent.click(await screen.findByRole('button', { name: /^list$/i }));

    const statusSelect = await waitFor(() => {
      const el = document.getElementById('task-list-status-filter');
      expect(el).not.toBeNull();
      return el as HTMLSelectElement;
    });

    await userEvent.selectOptions(statusSelect, 'done');

    await waitFor(() => {
      expect(hoisted.taskFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { project_id: 20, business_id: 7, status: 'done' },
        })
      );
    });

    expect(await screen.findByText(/no tasks match the current filters/i)).toBeInTheDocument();
    const clear = screen.getByRole('button', { name: /clear filters/i });
    await userEvent.click(clear);
    await waitFor(() => {
      expect(hoisted.taskFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { project_id: 20, business_id: 7 },
        })
      );
    });
  });
});
