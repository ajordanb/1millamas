import { type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

export interface AuthApi {
  useValidateMagicLinkQuery: (
    token: string | undefined,
  ) => UseQueryResult<RefreshTokenResponse, Error>;
  checkPasswordStrength: UseMutationResult<PasswordStrengthResponse, Error, string>;
}

export interface ValidateMagicLinkRequest {
  token: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  accessTokenExpires: string;
  refreshToken: string;
  refreshTokenExpires: string;
  access_token?: string; // Alternative field from model validator
}

export interface PasswordStrengthResponse {
  valid: boolean;
  message: string;
}
