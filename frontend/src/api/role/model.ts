import { type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

export interface RoleApi {
  // Query hooks
  useAllRolesQuery: (skip?: number, limit?: number) => UseQueryResult<Role[], Error>;
  useRoleByIdQuery: (roleId: string, enabled?: boolean) => UseQueryResult<Role, Error>;

  // Mutations
  createRole: UseMutationResult<Role, Error, RoleCreateRequest>;
  updateRole: UseMutationResult<Role, Error, RoleUpdateRequest>;
  deleteRole: UseMutationResult<Message, Error, string>;
}

export interface Role {
  id?: string;
  _id?: string; // Backend returns _id due to MongoDB/Pydantic alias
  name: string;
  description: string;
  created_by: string;
  scopes: string[];
}

export interface RoleCreateRequest {
  name: string;
  description: string;
  scopes: string[];
}

export interface RoleUpdateRequest {
  id: string;
  name?: string;
  description?: string;
  scopes?: string[];
}

export interface Message {
  message: string;
  type?: string;
}
