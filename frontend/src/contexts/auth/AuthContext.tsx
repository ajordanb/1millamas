import { createContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  _formPostRequest,
  _jsonPostRequest,
  _postRequest,
  _getRequest,
  _putRequest,
  _patchRequest,
  _deleteRequest,
  _postFormRequest,
  _putFormRequest,
  decodeToken,
} from '@/api/helpers';
import type {
  AuthContextType,
  AuthPostOptions,
  AuthResponse,
  SocialLoginParams,
  TokenData,
} from './model';

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (value === null || value === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // ignore write errors
    }
  };

  return [storedValue, setValue] as const;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useLocalStorage<string | null>('accessToken', null);
  const [refreshToken, setRefreshToken] = useLocalStorage<string | null>('refreshToken', null);
  const [currentUser, setCurrentUser] = useLocalStorage<string | null>('currentUser', null);
  const [userRoles, setUserRoles] = useLocalStorage<string[]>('roles', []);
  const [userScopes, setUserScopes] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const queryClient = useQueryClient();

  const handleAuthenticationResponse = (tokenResponse: TokenData) => {
    setAccessToken(tokenResponse.accessToken);
    setRefreshToken(tokenResponse.refreshToken);
    const decodedToken = decodeToken(tokenResponse.accessToken);
    setCurrentUser(decodedToken.sub);
    setUserRoles(decodedToken.roles || []);
    setUserScopes(decodedToken.scopes || []);
  };

  const basicLogin = async (username: string, password: string): Promise<void> => {
    setIsLoggingIn(true);

    return _formPostRequest('auth/token', { username, password })
      .then((response) => {
        queryClient.clear(); // drop any previous session's cached data
        handleAuthenticationResponse(response as TokenData);
      })
      .catch((error) => {
        logout();
        throw error;
      })
      .finally(() => {
        setIsLoggingIn(false);
      });
  };

  const socialLogin = async ({ provider, data }: SocialLoginParams): Promise<void> => {
    setIsLoggingIn(true);
    try {
      const response = (await _jsonPostRequest('auth/social_login', {
        provider,
        data,
      })) as TokenData;
      queryClient.clear(); // drop any previous session's cached data
      handleAuthenticationResponse(response);
    } catch (error) {
      console.error('Authentication failed:', error);
      logout();
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    setIsLoggingIn(true);

    return _jsonPostRequest('auth/register', { name, email, password })
      .then((response) => {
        queryClient.clear(); // drop any previous session's cached data
        handleAuthenticationResponse(response as TokenData);
      })
      .catch((error) => {
        logout();
        throw error;
      })
      .finally(() => {
        setIsLoggingIn(false);
      });
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!accessToken) {
          setIsAuthenticated(false);
          return;
        }
        const decodedToken = decodeToken(accessToken);
        const isExpired = Date.now() >= parseInt(decodedToken.exp) * 1000;
        if (isExpired) {
          if (refreshToken) {
            try {
              await refresh();
              setIsAuthenticated(true);
            } catch (error) {
              console.error('Token refresh failed:', error);
              logout();
            }
          } else {
            logout();
          }
        } else {
          setCurrentUser(decodedToken.sub);
          setUserRoles(decodedToken.roles || []);
          setUserScopes(decodedToken.scopes || []);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        logout();
      }
    };
    checkAuth();
  }, [accessToken, refreshToken]);

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setAccessToken(null);
    setRefreshToken(null);
    setUserRoles([]);
    setUserScopes([]);
    queryClient.clear(); // drop cached profile/registration so nothing leaks across sessions
  };

  const hasRole = (requiredRoles: string | string[]): boolean => {
    if (!currentUser) return false;

    if (Array.isArray(requiredRoles)) {
      return requiredRoles.some((role) => userRoles.includes(role));
    }

    return userRoles.includes(requiredRoles);
  };

  const hasScope = (requiredScopes: string | string[]): boolean => {
    if (!currentUser) return false;

    if (Array.isArray(requiredScopes)) {
      return requiredScopes.some((scope) => userScopes.includes(scope));
    }

    return userScopes.includes(requiredScopes);
  };

  const refresh = async () => {
    try {
      const response = (await _jsonPostRequest('auth/refresh', {
        refreshToken,
      })) as TokenData;
      handleAuthenticationResponse(response);
      return response;
    } catch (error) {
      console.error('Refresh failed:', error);
      logout();
      throw error;
    }
  };

  async function handleAuthRequest<T = any>(
    requestFn: () => Promise<Response>,
    retryFn: (token: string) => Promise<Response>,
    options: AuthPostOptions = {},
  ): Promise<T | Blob | AuthResponse<T>> {
    try {
      let response = await requestFn();

      // Handle 401 with retry
      if (response.status === 401) {
        const tokenData = await refresh();
        if (!tokenData) {
          logout();
          throw new Error('Failed to refresh token');
        }

        // Retry with the new token
        response = await retryFn(tokenData.accessToken);
      }

      // Handle other error statuses
      if (!response.ok) {
        switch (response.status) {
          case 401:
            logout();
            throw new Error('Authentication failed');
          case 403:
            logout();
            throw new Error('Access forbidden');
          case 429: {
            const errorData = await response.json();
            return {
              error: 'Too many requests',
              msg: errorData.detail,
              status: 429,
            };
          }
          default:
            throw new Error(`Request failed with status ${response.status}`);
        }
      }

      // Handle successful response
      if (options.isFileResp) {
        return await response.blob();
      }
      return (await response.json()) as T;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  async function authPost<T = any>(
    url: string,
    body?: any,
    options: AuthPostOptions = {},
  ): Promise<T | Blob | AuthResponse<T>> {
    return handleAuthRequest<T>(
      () => _postRequest(url, body, accessToken, options.params),
      (token) => _postRequest(url, body, token, options.params),
      options,
    );
  }

  async function authGet<T = any>(
    url: string,
    options: AuthPostOptions = {},
  ): Promise<T | Blob | AuthResponse<T>> {
    return handleAuthRequest<T>(
      () => _getRequest(url, accessToken, options.params),
      (token) => _getRequest(url, token, options.params),
      options,
    );
  }

  async function authPostForm<T = any>(
    url: string,
    formData: FormData,
    options: AuthPostOptions = {},
  ): Promise<T | Blob | AuthResponse<T>> {
    return handleAuthRequest<T>(
      () => _postFormRequest(url, formData, accessToken, options.params),
      (token) => _postFormRequest(url, formData, token, options.params),
      options,
    );
  }

  async function authPutForm<T = any>(
    url: string,
    formData: FormData,
    options: AuthPostOptions = {},
  ): Promise<T | Blob | AuthResponse<T>> {
    return handleAuthRequest<T>(
      () => _putFormRequest(url, formData, accessToken, options.params),
      (token) => _putFormRequest(url, formData, token, options.params),
      options,
    );
  }

  async function authPut<T = any>(
    url: string,
    body?: any,
    options: AuthPostOptions = {},
  ): Promise<T | Blob | AuthResponse<T>> {
    return handleAuthRequest<T>(
      () => _putRequest(url, body, accessToken, options.params),
      (token) => _putRequest(url, body, token, options.params),
      options,
    );
  }

  async function authPatch<T = any>(
    url: string,
    body?: any,
    options: AuthPostOptions = {},
  ): Promise<T | Blob | AuthResponse<T>> {
    return handleAuthRequest<T>(
      () => _patchRequest(url, body, accessToken, options.params),
      (token) => _patchRequest(url, body, token, options.params),
      options,
    );
  }

  async function authDelete<T = any>(
    url: string,
    options: AuthPostOptions = {},
  ): Promise<T | Blob | AuthResponse<T>> {
    return handleAuthRequest<T>(
      () => _deleteRequest(url, accessToken, options.params),
      (token) => _deleteRequest(url, token, options.params),
      options,
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoggingIn,
        currentUser,
        basicLogin,
        logout,
        hasRole,
        hasScope,
        authPost,
        authGet,
        authPut,
        authPatch,
        authDelete,
        authPostForm,
        authPutForm,
        socialLogin,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
