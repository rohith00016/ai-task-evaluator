import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchProjects, 
  fetchProjectById, 
  createProject, 
  updateProject, 
  deleteProject 
} from '../services/api';

export const PROJECT_KEYS = {
  all: ['projects'],
  detail: (id) => ['project', id]
};

export function useProjects(options = {}) {
  return useQuery({
    queryKey: PROJECT_KEYS.all,
    queryFn: fetchProjects,
    ...options
  });
}

export function useProject(id, options = {}) {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(id),
    queryFn: () => fetchProjectById(id),
    enabled: Boolean(id),
    ...options
  });
}

export function useSaveProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectData) => {
      const id = projectData.id || projectData._id;
      if (id) {
        return updateProject(id, projectData);
      }
      return createProject(projectData);
    },
    onSuccess: (savedProject) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
      if (savedProject?.id) {
        queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(savedProject.id) });
      }
    }
  });
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    }
  });
}
