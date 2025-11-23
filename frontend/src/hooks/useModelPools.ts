import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ModelPool } from '../types';

export function useModelPools() {
  return useQuery<ModelPool[]>({
    queryKey: ['modelPools'],
    queryFn: () => apiClient.getModelPools(),
    staleTime: 60_000,
  });
}





