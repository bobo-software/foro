import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskChecklistsSection } from './TaskChecklistsSection';
import TaskChecklistService from '@/services/taskChecklistService';

vi.mock('@/services/taskChecklistService', () => ({
  __esModule: true,
  default: {
    listItemsByTask: vi.fn(),
    ensureChecklistForTask: vi.fn(),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

const listItemsByTask = vi.mocked(TaskChecklistService.listItemsByTask);
const ensureChecklistForTask = vi.mocked(TaskChecklistService.ensureChecklistForTask);
const createItem = vi.mocked(TaskChecklistService.createItem);

const task = {
  id: 5,
  business_id: 7,
  project_id: 3,
  title: 'Fix bug',
};

describe('TaskChecklistsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listItemsByTask.mockResolvedValue([
      {
        id: 10,
        business_id: 7,
        project_id: 3,
        checklist_id: 1,
        label: 'Step 1',
        is_done: true,
        position: 0,
      },
      {
        id: 11,
        business_id: 7,
        project_id: 3,
        checklist_id: 1,
        label: 'Step 2',
        is_done: false,
        position: 1,
      },
    ]);
    ensureChecklistForTask.mockResolvedValue(1);
    createItem.mockResolvedValue({
      id: 12,
      business_id: 7,
      project_id: 3,
      checklist_id: 1,
      label: 'Step 3',
      is_done: false,
      position: 2,
    });
  });

  it('renders a flat list of checklist items', async () => {
    render(<TaskChecklistsSection task={task} businessId={7} />);
    expect(await screen.findByDisplayValue('Step 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Step 2')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Checklist name')).not.toBeInTheDocument();
  });

  it('adds an item when Add item is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskChecklistsSection task={task} businessId={7} />);
    await screen.findByDisplayValue('Step 1');

    await user.type(screen.getByPlaceholderText('Add checklist item…'), 'Step 3');
    await user.click(screen.getByRole('button', { name: /add item/i }));

    await waitFor(() => {
      expect(ensureChecklistForTask).toHaveBeenCalledWith(5, 7, 3);
      expect(createItem).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'Step 3', checklist_id: 1 })
      );
    });
    expect(await screen.findByDisplayValue('Step 3')).toBeInTheDocument();
  });
});
