import { useAuth } from '@/hooks/useAuth';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  User,
  UserApi,
  Message,
  UserCreateRequest,
  UpdatePasswordRequest,
  ResetPasswordRequest,
  CreateApiKeyRequest,
  UpdateApiKeyRequest,
  ApiKey,
} from './model';

export const userApi = (): UserApi => {
  const { authGet, authPost, authPut, authDelete, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const baseUrl = 'user';

  // Query hooks
  const useUserProfileQuery = (): UseQueryResult<User, Error> =>
    useQuery({
      queryKey: ['profile'],
      queryFn: async () => (await authGet<User>(`${baseUrl}/me`)) as User,
      enabled: isAuthenticated,
    });

  const useAllUsersQuery = (
    skip: number = 0,
    limit: number = 1000,
  ): UseQueryResult<User[], Error> =>
    useQuery({
      queryKey: ['allUsers', skip, limit],
      queryFn: async () =>
        (await authGet<User[]>(`${baseUrl}/all`, { params: { skip, limit } })) as User[],
      enabled: isAuthenticated,
    });

  const useUserByIdQuery = (
    userId: string,
    enabled: boolean = true,
  ): UseQueryResult<User, Error> =>
    useQuery({
      queryKey: ['userById', userId],
      queryFn: async () => (await authGet<User>(`${baseUrl}/by_id/${userId}`)) as User,
      enabled: isAuthenticated && enabled && !!userId,
    });

  const useUserByEmailQuery = (
    email: string,
    enabled: boolean = true,
  ): UseQueryResult<User, Error> =>
    useQuery({
      queryKey: ['userByEmail', email],
      queryFn: async () => (await authGet<User>(`${baseUrl}/by_email/${email}`)) as User,
      enabled: isAuthenticated && enabled && !!email,
    });

  // Mutations
  const sendUserPasswordReset = useMutation<Message, Error, string>({
    mutationFn: async (email) =>
      (await authPost<Message>(`${baseUrl}/email_password_reset_link`, {}, { params: { email } })) as Message,
  });

  const sendMagicLink = useMutation<Message, Error, string>({
    mutationFn: async (email) =>
      (await authPost<Message>(`${baseUrl}/send_magic_link`, {}, { params: { email } })) as Message,
  });

  const resetPassword = useMutation<Message, Error, ResetPasswordRequest>({
    mutationFn: async ({ new_password, token }) =>
      (await authPost<Message>(
        `${baseUrl}/reset_password`,
        { new_password },
        { params: { token } },
      )) as Message,
  });

  const createUser = useMutation<User, Error, UserCreateRequest>({
    mutationFn: async (userData) =>
      (await authPost<User>(`${baseUrl}/register`, userData)) as User,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });

  const updateUser = useMutation<User, Error, User>({
    mutationFn: async (userData) =>
      (await authPut<User>(`${baseUrl}/update`, userData)) as User,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userById'] });
      queryClient.invalidateQueries({ queryKey: ['userByEmail'] });
    },
  });

  const deleteUser = useMutation<Message, Error, string>({
    mutationFn: async (userId) =>
      (await authDelete<Message>(`${baseUrl}/delete/${userId}`)) as Message,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });

  const updateMyPassword = useMutation<Message, Error, UpdatePasswordRequest>({
    mutationFn: async (passwordData) =>
      (await authPut<Message>(`${baseUrl}/me/update_password`, passwordData)) as Message,
  });

  const updateMyProfile = useMutation<User, Error, User>({
    mutationFn: async (userData) =>
      (await authPut<User>(`${baseUrl}/me/update`, userData)) as User,
  });

  // API Key mutations
  const createApiKey = useMutation<ApiKey, Error, CreateApiKeyRequest>({
    mutationFn: async ({ email, api_key }) =>
      (await authPost<ApiKey>(`${baseUrl}/api_key/create`, { ...api_key, email })) as ApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userById'] });
      queryClient.invalidateQueries({ queryKey: ['userByEmail'] });
    },
  });

  const updateApiKey = useMutation<ApiKey, Error, UpdateApiKeyRequest>({
    mutationFn: async (keyData) =>
      (await authPut<ApiKey>(`${baseUrl}/api_key/update`, keyData)) as ApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userById'] });
      queryClient.invalidateQueries({ queryKey: ['userByEmail'] });
    },
  });

  const deleteApiKey = useMutation<Message, Error, string>({
    mutationFn: async (clientId) =>
      (await authDelete<Message>(`${baseUrl}/api_key/delete/${clientId}`)) as Message,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userById'] });
      queryClient.invalidateQueries({ queryKey: ['userByEmail'] });
    },
  });

  return {
    useUserProfileQuery,
    useAllUsersQuery,
    useUserByIdQuery,
    useUserByEmailQuery,
    sendUserPasswordReset,
    sendMagicLink,
    resetPassword,
    createUser,
    updateUser,
    deleteUser,
    updateMyPassword,
    updateMyProfile,
    createApiKey,
    updateApiKey,
    deleteApiKey,
  };
};
