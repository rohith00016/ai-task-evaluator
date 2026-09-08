import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchSubmissions, 
  fetchSubmissionById, 
  submitAndEvaluate, 
  reevaluateSubmission 
} from '../services/api';

export const SUBMISSION_KEYS = {
  all: ['submissions'],
  list: (projectId) => ['submissions', { projectId: projectId || 'all' }],
  detail: (id) => ['submission', id]
};

export function useSubmissions(projectId = null, options = {}) {
  return useQuery({
    queryKey: SUBMISSION_KEYS.list(projectId),
    queryFn: () => fetchSubmissions(projectId),
    ...options
  });
}

export function useSubmission(id, options = {}) {
  return useQuery({
    queryKey: SUBMISSION_KEYS.detail(id),
    queryFn: () => fetchSubmissionById(id),
    enabled: Boolean(id),
    ...options
  });
}

export function useSubmitEvaluationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (submissionData) => submitAndEvaluate(submissionData),
    onSuccess: (newSubmission) => {
      queryClient.invalidateQueries({ queryKey: SUBMISSION_KEYS.all });
      if (newSubmission?.id) {
        queryClient.setQueryData(SUBMISSION_KEYS.detail(newSubmission.id), newSubmission);
      }
    }
  });
}

export function useReevaluateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => reevaluateSubmission(id),
    onSuccess: (updatedSubmission) => {
      queryClient.invalidateQueries({ queryKey: SUBMISSION_KEYS.all });
      if (updatedSubmission?.id) {
        queryClient.setQueryData(SUBMISSION_KEYS.detail(updatedSubmission.id), updatedSubmission);
      }
    }
  });
}
