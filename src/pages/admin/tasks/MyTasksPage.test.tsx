import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MyTasksPage } from './MyTasksPage';

const hoisted = vi.hoisted(() => ({
  taskFindAll: vi.fn(),
  projectFindById: vi.fn(),
}));

vi.mock('@/services/taskService', () => ({
  __esModule: true,
  default: {
    findAll: hoisted.taskFindAll,
  },
}));

vi.mock('@/services/projectService', () => ({
  __esModule: true,
  default: {
    findById: hoisted.projectFindById,
  },
}));

vi.mock('@/stores/data/AuthStore', () => ({
  __esModule: true,
  default: (selector: (s: { sessionUser: { id: number; accessToken: string } | null }) => unknown) =>
    selector({ sessionUser: { id: 42, accessToken: 'test-token' } }),
}));

vi.mock('@/stores/data/BusinessStore', () => ({
  __esModule: true,
  useBusinessStore: (selector: (s: { currentBusiness: { id: number; name: string } | null }) => unknown) =>
    selector({ currentBusiness: { id: 7, name: 'Acme' } }),
}));

describe('MyTasksPage', () => {
  beforeEach(() => {
    hoisted.taskFindAll.mockReset();
    hoisted.projectFindById.mockReset();
  });

  it('shows empty state when no tasks are assigned', async () => {
    hoisted.taskFindAll.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <MyTasksPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(hoisted.taskFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { business_id: 7, assigned_to_user_id: 42 },
        })
      );
    });

    expect(await screen.findByText('No tasks assigned to you in this business.')).toBeInTheDocument();
  });

  it('links a task title to its project when project metadata loads', async () => {
    hoisted.taskFindAll.mockResolvedValue([
      {
        id: 1,
        business_id: 7,
        project_id: 99,
        title: 'Wire invoices',
        status: 'todo',
      },
    ]);
    hoisted.projectFindById.mockImplementation(async (id: number) => {
      if (id === 99) {
        return { id: 99, company_id: 3, name: 'Website', business_id: 7 } as never;
      }
      return null;
    });

    render(
      <MemoryRouter>
        <MyTasksPage />
      </MemoryRouter>
    );

    const link = await screen.findByRole('link', { name: 'Wire invoices' });
    expect(link).toHaveAttribute('href', '/app/companies/3/projects/99');
  });
});
