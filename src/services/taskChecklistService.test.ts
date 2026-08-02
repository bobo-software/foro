import { describe, it, expect, vi, beforeEach } from 'vitest';
import TaskChecklistService from './taskChecklistService';
import TaskService from './taskService';

vi.mock('../backend', () => ({
  foroApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./taskService', () => ({
  default: { findById: vi.fn() },
}));

import { foroApiClient } from '../backend';

const get = vi.mocked(foroApiClient.get);
const post = vi.mocked(foroApiClient.post);
const findById = vi.mocked(TaskService.findById);

describe('TaskChecklistService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockResolvedValue({
      id: 10,
      business_id: 7,
      project_id: 3,
      title: 'Task',
    });
  });

  it('findByTask returns checklists with nested items', async () => {
    get
      .mockResolvedValueOnce({
        success: true,
        data: [{ id: 1, businessId: 7, projectId: 3, taskId: 10, title: 'QA', position: 0 }],
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          { id: 100, businessId: 7, projectId: 3, checklistId: 1, label: 'Step 1', isDone: true, position: 0 },
          { id: 101, businessId: 7, projectId: 3, checklistId: 1, label: 'Step 2', isDone: false, position: 1 },
        ],
      });

    const result = await TaskChecklistService.findByTask(10, 7);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('QA');
    expect(result[0].items).toHaveLength(2);
    expect(result[0].items[0].is_done).toBe(true);
  });

  it('createChecklist rejects when task scope mismatches', async () => {
    findById.mockResolvedValue({
      id: 10,
      business_id: 99,
      project_id: 3,
      title: 'Task',
    });

    await expect(
      TaskChecklistService.createChecklist({
        business_id: 7,
        project_id: 3,
        task_id: 10,
        title: 'Deploy',
      })
    ).rejects.toThrow(/business and project/);
  });

  it('createChecklist inserts when task is valid', async () => {
    post.mockResolvedValueOnce({
      success: true,
      data: { id: 2, businessId: 7, projectId: 3, taskId: 10, title: 'Deploy', position: 0 },
    });

    const created = await TaskChecklistService.createChecklist({
      business_id: 7,
      project_id: 3,
      task_id: 10,
      title: 'Deploy',
      position: 0,
    });

    expect(created.title).toBe('Deploy');
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('project-task-checklists'),
      expect.objectContaining({ title: 'Deploy', taskId: 10 })
    );
  });
});
