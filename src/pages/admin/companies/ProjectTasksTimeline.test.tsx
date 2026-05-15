import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectTasksTimeline } from './ProjectTasksTimeline';

describe('ProjectTasksTimeline', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('orders dated tasks before listing unscheduled', () => {
    vi.useFakeTimers({ now: new Date('2026-05-01T12:00:00') });

    const tasks = [
      { id: 1, business_id: 1, project_id: 1, title: 'Later', due_on: '2026-06-01', status: 'todo', position: 0 },
      { id: 2, business_id: 1, project_id: 1, title: 'No due', status: 'todo', position: 1 },
      { id: 3, business_id: 1, project_id: 1, title: 'Earlier', due_on: '2026-05-10', status: 'done', position: 2 },
    ] as const;

    const { container } = render(<ProjectTasksTimeline tasks={[...tasks]} />);

    expect(screen.getByText('Unscheduled (1)')).toBeInTheDocument();
    expect(screen.getByText('No due')).toBeInTheDocument();

    const text = container.textContent ?? '';
    expect(text.indexOf('Earlier')).toBeLessThan(text.indexOf('Later'));
  });

  it('lists open tasks past due under Overdue', () => {
    vi.useFakeTimers({ now: new Date('2026-07-01T12:00:00') });

    const tasks = [
      { id: 1, business_id: 1, project_id: 1, title: 'Late task', due_on: '2026-06-01', status: 'todo', position: 0 },
      { id: 2, business_id: 1, project_id: 1, title: 'Done old', due_on: '2026-06-01', status: 'done', position: 1 },
    ] as const;

    render(<ProjectTasksTimeline tasks={[...tasks]} />);

    expect(screen.getByText(/Overdue \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Late task')).toBeInTheDocument();
    expect(screen.getByText('By due date')).toBeInTheDocument();
    expect(screen.getByText('Done old')).toBeInTheDocument();
  });

  it('marks tasks due today with Today', () => {
    vi.useFakeTimers({ now: new Date('2026-06-15T08:00:00') });

    const tasks = [
      { id: 1, business_id: 1, project_id: 1, title: 'Due today', due_on: '2026-06-15', status: 'in_progress', position: 0 },
    ] as const;

    render(<ProjectTasksTimeline tasks={[...tasks]} />);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Due today')).toBeInTheDocument();
  });
});
