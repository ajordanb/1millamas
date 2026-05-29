import type { UserApi } from './user/model';
import type { AuthApi } from './auth/model';
import type { RoleApi } from './role/model';
import { userApi } from './user/userApi';
import { authApi } from './auth/authApi';
import { roleApi } from './role/roleApi';
import { messagesApi } from './messages/messagesApi';

interface ApiCollection {
  user: UserApi;
  auth: AuthApi;
  role: RoleApi;
  messages: ReturnType<typeof messagesApi>;
}

export const useApi = (): ApiCollection => {
  return {
    user: userApi(),
    auth: authApi(),
    role: roleApi(),
    messages: messagesApi(),
  };
};
