import { describe, it, expect } from 'vitest';
import {
  collectTaskDoneToastMessages,
  collectTaskCreatedToastMessages,
  collectTaskStatusChangedToastMessages,
} from './automationTriggerRunner';
import type { AutomationRule } from '../types/automationRule';

describe('collectTaskDoneToastMessages', () => {
  it('collects toast messages from enabled task_status_done rules', () => {
    const rules: AutomationRule[] = [
      {
        id: 1,
        business_id: 1,
        project_id: 2,
        name: 'A',
        trigger_key: 'task_created',
        definition: { action: 'toast', message: 'skip' },
        enabled: true,
      },
      {
        id: 2,
        business_id: 1,
        project_id: 2,
        name: 'B',
        trigger_key: 'task_status_done',
        definition: { action: 'toast', message: '  Done!  ' },
        enabled: true,
      },
      {
        id: 3,
        business_id: 1,
        project_id: 2,
        name: 'C',
        trigger_key: 'task_status_done',
        definition: { action: 'toast', message: '' },
        enabled: true,
      },
      {
        id: 4,
        business_id: 1,
        project_id: 2,
        name: 'D',
        trigger_key: 'task_status_done',
        definition: { action: 'email' },
        enabled: true,
      },
      {
        id: 5,
        business_id: 1,
        project_id: 2,
        name: 'E',
        trigger_key: 'task_status_done',
        definition: { action: 'toast', message: 'Second' },
        enabled: false,
      },
    ];
    expect(collectTaskDoneToastMessages(rules)).toEqual(['Done!']);
  });
});

describe('collectTaskCreatedToastMessages', () => {
  it('collects toast messages from enabled task_created rules', () => {
    const rules: AutomationRule[] = [
      {
        id: 1,
        business_id: 1,
        project_id: 2,
        name: 'A',
        trigger_key: 'task_status_done',
        definition: { action: 'toast', message: 'skip' },
        enabled: true,
      },
      {
        id: 2,
        business_id: 1,
        project_id: 2,
        name: 'B',
        trigger_key: 'task_created',
        definition: { action: 'toast', message: '  New!  ' },
        enabled: true,
      },
    ];
    expect(collectTaskCreatedToastMessages(rules)).toEqual(['New!']);
  });
});

describe('collectTaskStatusChangedToastMessages', () => {
  it('collects toast messages from enabled task_status_changed rules', () => {
    const rules: AutomationRule[] = [
      {
        id: 1,
        business_id: 1,
        project_id: 2,
        name: 'X',
        trigger_key: 'task_status_changed',
        definition: { action: 'toast', message: 'Status!' },
        enabled: true,
      },
    ];
    expect(collectTaskStatusChangedToastMessages(rules)).toEqual(['Status!']);
  });
});
