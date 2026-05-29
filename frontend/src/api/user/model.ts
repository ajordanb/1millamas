import { type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

export interface UserApi {
  // Query hooks
  useUserProfileQuery: () => UseQueryResult<User, Error>;
  useAllUsersQuery: (skip?: number, limit?: number) => UseQueryResult<User[], Error>;
  useUserByIdQuery: (userId: string, enabled?: boolean) => UseQueryResult<User, Error>;
  useUserByEmailQuery: (email: string, enabled?: boolean) => UseQueryResult<User, Error>;

  // Mutations
  sendUserPasswordReset: UseMutationResult<Message, Error, string>;
  sendMagicLink: UseMutationResult<Message, Error, string>;
  resetPassword: UseMutationResult<Message, Error, ResetPasswordRequest>;
  createUser: UseMutationResult<User, Error, UserCreateRequest>;
  updateUser: UseMutationResult<User, Error, User>;
  deleteUser: UseMutationResult<Message, Error, string>;
  updateMyPassword: UseMutationResult<Message, Error, UpdatePasswordRequest>;
  updateMyProfile: UseMutationResult<User, Error, User>;

  // API Key mutations
  createApiKey: UseMutationResult<ApiKey, Error, CreateApiKeyRequest>;
  updateApiKey: UseMutationResult<ApiKey, Error, UpdateApiKeyRequest>;
  deleteApiKey: UseMutationResult<Message, Error, string>;
}

export interface UserRole {
  name: string;
  description: string;
  created_by: string;
  scopes: string[];
}

export interface AuthResponse<T = any> {
  data?: T;
  error?: string;
  msg?: string;
  status?: number;
}

export interface ApiKey {
  id: string;
  client_id: string;
  scopes: string[];
  active: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  name: string;
  source: string;
  email_confirmed: boolean;
  roles: UserRole[];
  api_keys?: ApiKey[];
}

export interface Message {
  message: string;
  type?: string;
}

export interface UserCreateRequest {
  email: string;
  password: string;
  name?: string;
  roles?: string[];
}

export interface UpdatePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ResetPasswordRequest {
  new_password: string;
  token: string;
}

export interface CreateApiKeyRequest {
  email: string;
  api_key: {
    scopes: string[];
    active: boolean;
  };
}

export interface UpdateApiKeyRequest {
  client_id: string;
  scopes?: string[];
  active?: boolean;
}
