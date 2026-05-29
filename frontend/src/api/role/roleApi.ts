import { useAuth } from '@/hooks/useAuth';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { Role, RoleApi, Message, RoleCreateRequest, RoleUpdateRequest } from './model';

export const roleApi = (): RoleApi => {
  const { authGet, authPost, authPut, authDelete, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const baseUrl = 'role';

  // Query hooks
  const useAllRolesQuery = (
    skip: number = 0,
    limit: number = 100,
  ): UseQueryResult<Role[], Error> =>
    useQuery({
      queryKey: ['allRoles', skip, limit],
      queryFn: async () =>
        (await authGet<Role[]>(`${baseUrl}/all`, { params: { skip, limit } })) as Role[],
      enabled: isAuthenticated,
    });

  const useRoleByIdQuery = (
    roleId: string,
    enabled: boolean = true,
  ): UseQueryResult<Role, Error> =>
    useQuery({
      queryKey: ['roleById', roleId],
      queryFn: async () => (await authGet<Role>(`${baseUrl}/by_id/${roleId}`)) as Role,
      enabled: isAuthenticated && enabled && !!roleId,
    });

  // Mutations
  const createRole = useMutation<Role, Error, RoleCreateRequest>({
    mutationFn: async (roleData) =>
      (await authPost<Role>(`${baseUrl}/create`, roleData)) as Role,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
    },
  });

  const updateRole = useMutation<Role, Error, RoleUpdateRequest>({
    mutationFn: async ({ id, ...roleData }) =>
      (await authPut<Role>(`${baseUrl}/update/${id}`, roleData)) as Role,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
      queryClient.invalidateQueries({ queryKey: ['roleById'] });
    },
  });

  const deleteRole = useMutation<Message, Error, string>({
    mutationFn: async (roleId) =>
      (await authDelete<Message>(`${baseUrl}/delete/${roleId}`)) as Message,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
    },
  });

  return {
    useAllRolesQuery,
    useRoleByIdQuery,
    createRole,
    updateRole,
    deleteRole,
  };
};
