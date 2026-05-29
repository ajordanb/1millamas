import { useMutation, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { _jsonPostRequest } from '@/api/helpers';
import type { AuthApi, RefreshTokenResponse, PasswordStrengthResponse } from './model';

export const authApi = (): AuthApi => {
  const baseUrl = 'auth';

  const useValidateMagicLinkQuery = (
    token: string | undefined,
  ): UseQueryResult<RefreshTokenResponse, Error> =>
    useQuery({
      queryKey: ['validateMagicLink', token],
      queryFn: async () => {
        if (!token) throw new Error('Token is required');
        return (await _jsonPostRequest(`${baseUrl}/validate_magic_link`, {
          token,
        })) as RefreshTokenResponse;
      },
      enabled: !!token,
      retry: false,
      refetchOnWindowFocus: false,
    });

  const checkPasswordStrength = useMutation<PasswordStrengthResponse, Error, string>({
    mutationFn: async (password) => {
      return (await _jsonPostRequest(`${baseUrl}/check_password`, {
        password,
      })) as PasswordStrengthResponse;
    },
  });

  return {
    useValidateMagicLinkQuery,
    checkPasswordStrength,
  };
};
