import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PortalProjectViewPage } from './PortalProjectViewPage';

const hoisted = vi.hoisted(() => ({
  sha256Hex: vi.fn(),
  findActiveByTokenHash: vi.fn(),
  projectFindById: vi.fn(),
  taskFindAll: vi.fn(),
  taskDepFindByProject: vi.fn(),
  companyFindById: vi.fn(),
}));

vi.mock('@/utils/sha256Hex', () => ({
  sha256Hex: hoisted.sha256Hex,
}));

vi.mock('@/services/portalInviteService', () => ({
  __esModule: true,
  default: {
    findActiveByTokenHash: hoisted.findActiveByTokenHash,
  },
}));

vi.mock('@/services/projectService', () => ({
  __esModule: true,
  default: {
    findById: hoisted.projectFindById,
  },
}));

vi.mock('@/services/taskService', () => ({
  __esModule: true,
  default: {
    findAll: hoisted.taskFindAll,
  },
}));

vi.mock('@/services/taskDependencyService', () => ({
  __esModule: true,
  default: {
    findByProject: hoisted.taskDepFindByProject,
  },
}));

vi.mock('@/services/companyService', () => ({
  __esModule: true,
  default: {
    findById: hoisted.companyFindById,
  },
}));

function renderAtToken(token: string) {
  const path = `/portal/v/${encodeURIComponent(token)}`;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/portal/v/:portalToken" element={<PortalProjectViewPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PortalProjectViewPage', () => {
  beforeEach(() => {
    hoisted.sha256Hex.mockReset();
    hoisted.findActiveByTokenHash.mockReset();
    hoisted.projectFindById.mockReset();
    hoisted.taskFindAll.mockReset();
    hoisted.taskDepFindByProject.mockReset();
    hoisted.companyFindById.mockReset();

    hoisted.sha256Hex.mockResolvedValue('deadbeef');
    hoisted.findActiveByTokenHash.mockResolvedValue({
      id: 1,
      business_id: 7,
      project_id: 20,
      token_hash: 'deadbeef',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      revoked_at: null,
    });
    hoisted.projectFindById.mockResolvedValue({
      id: 20,
      company_id: 10,
      name: 'Shared Roadmap',
      business_id: 7,
    });
    hoisted.taskFindAll.mockImplementation(async (params?: { offset?: number }) => {
      if ((params?.offset ?? 0) > 0) return [];
      return [
        {
          id: 1,
          business_id: 7,
          project_id: 20,
          title: 'Portal task',
          status: 'todo',
          position: 0,
        },
      ];
    });
    hoisted.taskDepFindByProject.mockResolvedValue([]);
    hoisted.companyFindById.mockResolvedValue({ id: 10, name: 'North Ltd' });
  });

  afterEach(() => {
    document.querySelector('meta[name="robots"][data-foro-portal]')?.remove();
  });

  it('shows a friendly message when the invite is not valid', async () => {
    hoisted.findActiveByTokenHash.mockResolvedValue(null);
    renderAtToken('fp_testtoken');
    expect(await screen.findByText(/invalid, expired, or has been revoked/i)).toBeInTheDocument();
  });

  it('renders project title when the invite resolves', async () => {
    renderAtToken('fp_abc');
    await waitFor(() => {
      expect(hoisted.sha256Hex).toHaveBeenCalledWith('fp_abc');
    });
    expect(await screen.findByRole('heading', { name: 'Shared Roadmap' })).toBeInTheDocument();
    expect(screen.getByText('North Ltd')).toBeInTheDocument();
  });

  it('adds noindex robots meta while mounted', async () => {
    renderAtToken('fp_xyz');
    await screen.findByRole('heading', { name: 'Shared Roadmap' });
    const meta = document.querySelector('meta[name="robots"][data-foro-portal]');
    expect(meta?.getAttribute('content')).toBe('noindex, nofollow');
  });
});
