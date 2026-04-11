import { create } from 'zustand';
import ProjectService from '../../services/projectService';
import { useBusinessStore } from './BusinessStore';
import type { Project } from '../../types/project';

interface ProjectState {
  /** Cached project lists keyed by company id */
  cache: Record<number, Project[]>;
  fetchProjectsForCompany: (companyId: number) => Promise<Project[]>;
  findProjectById: (projectId: number) => Promise<Project | null>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  cache: {},

  fetchProjectsForCompany: async (companyId: number) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    const where: Record<string, unknown> = { company_id: companyId };
    if (businessId != null) where.business_id = businessId;
    const list = await ProjectService.findAll({
      where,
      orderBy: 'name',
      orderDirection: 'ASC',
      limit: 500,
    });
    set((s) => ({ cache: { ...s.cache, [companyId]: list } }));
    return list;
  },

  findProjectById: (projectId: number) => ProjectService.findById(projectId),
}));
