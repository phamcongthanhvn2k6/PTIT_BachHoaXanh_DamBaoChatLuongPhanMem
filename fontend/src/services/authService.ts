import type { User } from '../types';
import httpClient from '../api/httpClient';
import { endpoints } from '../api/endpoints';

export interface LoginInput {
  emailOrPhone: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthPayload {
  token: string;
  user: User;
  refreshToken?: string;
  needs_email_verification?: boolean;
}

interface VerifyOtpInput {
  phone: string;
  otp: string;
}

interface VerifyEmailOtpInput {
  email: string;
  otp: string;
}

const normalizeAuthResponse = (raw: any): AuthPayload => {
  const data = raw?.data ?? raw;
  const token = data?.token;
  const user = data?.user;
  const refreshToken = data?.refreshToken;
  const needs_email_verification = data?.needs_email_verification;

  if (!token || !user) {
    throw new Error('Invalid auth response from server');
  }

  return { token, user, refreshToken, needs_email_verification };
};

const saveTokenPair = (token: string, refreshToken?: string) => {
  localStorage.removeItem('lottemart_token');
  localStorage.setItem('lottemart_token', token);
  if (refreshToken) {
    localStorage.removeItem('lottemart_refresh_token');
    localStorage.setItem('lottemart_refresh_token', refreshToken);
  }
};

const unwrapEnvelope = (response: any) => {
  const body = response?.data ?? response;
  const data = body?.data ?? body;
  return { body, data };
};

const getApiBase = () => {
  const envApiHost = (import.meta.env.VITE_API_HOST || '').trim();
  if (!envApiHost) return '/api';
  const normalized = envApiHost.replace(/\/+$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

export const authService = {
  login: async (credentials: LoginInput): Promise<AuthPayload> => {
    const response = await httpClient.post(endpoints.auth.login, credentials);
    const payload = normalizeAuthResponse(response.data);
    saveTokenPair(payload.token, payload.refreshToken);
    return payload;
  },

  register: async (payload: RegisterInput): Promise<AuthPayload> => {
    const response = await httpClient.post(endpoints.auth.register, payload);
    const authPayload = normalizeAuthResponse(response.data);
    saveTokenPair(authPayload.token, authPayload.refreshToken);
    return authPayload;
  },

  verifyToken: async (token: string): Promise<AuthPayload> => {
    const response = await httpClient.get(endpoints.auth.verify, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = response.data?.data ?? response.data;
    const user = data?.user || data;
    if (!user) {
      throw new Error('Token verification failed');
    }

    return { token, user };
  },

  loginWithGoogle: async (credential: string): Promise<AuthPayload> => {
    if (!credential || !credential.trim()) {
      throw new Error('Thiếu credential Google');
    }
    const response = await httpClient.post(endpoints.auth.google, { credential });
    const payload = normalizeAuthResponse(response.data);
    saveTokenPair(payload.token, payload.refreshToken);
    return payload;
  },

  googleLogin: async (credential: string): Promise<AuthPayload> => {
    return authService.loginWithGoogle(credential);
  },

  loginWithFacebook: async (accessToken: string): Promise<AuthPayload> => {
    if (!accessToken || !accessToken.trim()) {
      throw new Error('Thiếu access token Facebook');
    }
    const response = await httpClient.post(endpoints.auth.facebook, { accessToken });
    const payload = normalizeAuthResponse(response.data);
    saveTokenPair(payload.token, payload.refreshToken);
    return payload;
  },

  getFacebookOAuthUrl: (frontendRedirect?: string): string => {
    let redirect = (frontendRedirect || '').trim();
    if (!redirect) {
      redirect = '/';
    }

    if (redirect.startsWith('/')) {
      return `${getApiBase()}${endpoints.auth.facebook}?redirect=${encodeURIComponent(redirect)}`;
    }

    try {
      const parsed = new URL(redirect);
      redirect = `${parsed.pathname || '/'}${parsed.search || ''}${parsed.hash || ''}`;
    } catch {
      redirect = '/';
    }

    return `${getApiBase()}${endpoints.auth.facebook}?redirect=${encodeURIComponent(redirect)}`;
  },

  sendOTP: async (phone: string): Promise<{ success: boolean; message?: string }> => {
    const response = await httpClient.post(endpoints.auth.otpSend, { phone });
    const data = response.data?.data ?? response.data;
    return {
      success: Boolean(data?.success ?? true),
      message: data?.message,
    };
  },

  verifyOTP: async (payload: VerifyOtpInput): Promise<AuthPayload> => {
    const response = await httpClient.post(endpoints.auth.otpVerify, payload);
    const authPayload = normalizeAuthResponse(response.data);
    saveTokenPair(authPayload.token, authPayload.refreshToken);
    return authPayload;
  },

  requestEmailOtp: async (email: string): Promise<{ success: boolean; message?: string; retry_after?: number }> => {
    const response = await httpClient.post(endpoints.auth.emailRequestOtp, { email });
    const { body, data } = unwrapEnvelope(response);
    return {
      success: Boolean(body?.success ?? data?.success ?? true),
      message: body?.message || data?.message,
      retry_after: body?.retry_after ?? data?.retry_after,
    };
  },

  resendEmailOtp: async (email: string): Promise<{ success: boolean; message?: string; retry_after?: number }> => {
    const response = await httpClient.post(endpoints.auth.emailResendOtp, { email });
    const { body, data } = unwrapEnvelope(response);
    return {
      success: Boolean(body?.success ?? data?.success ?? true),
      message: body?.message || data?.message,
      retry_after: body?.retry_after ?? data?.retry_after,
    };
  },

  verifyEmailOtp: async (payload: VerifyEmailOtpInput): Promise<{ success: boolean; user?: User; message?: string }> => {
    const response = await httpClient.post(endpoints.auth.emailVerifyOtp, payload);
    const { body, data } = unwrapEnvelope(response);
    return {
      success: Boolean(body?.success ?? data?.success ?? true),
      user: data?.user || data,
      message: body?.message || data?.message,
    };
  },

  getProfile: async (_userId: number | string): Promise<User> => {
    const response = await httpClient.get(endpoints.auth.profile);
    const data = response.data?.data ?? response.data;
    return data?.user || data;
  },

  updateProfile: async (_userId: number | string, payload: Partial<User>): Promise<User> => {
    const response = await httpClient.put(endpoints.auth.updateProfile, payload);
    const data = response.data?.data ?? response.data;
    return data?.user || data;
  },

  updateMyPhone: async (phone: string): Promise<User> => {
    const response = await httpClient.put(endpoints.users.me, { phone });
    const data = response.data?.data ?? response.data;
    return data?.user || data;
  },

  updateUserSettings: async (userId: number | string, patch: Partial<User>): Promise<User> => {
    const response = await httpClient.put(endpoints.users.settings(userId), patch);
    const data = response.data?.data ?? response.data;
    return data?.user || data;
  },

  changePassword: async (_userId: number, currentPass: string, newPass: string): Promise<{ success: boolean; message?: string }> => {
    const response = await httpClient.post(endpoints.auth.changePassword, {
      currentPassword: currentPass,
      newPassword: newPass,
    });
    const data = response.data?.data ?? response.data;
    return {
      success: Boolean(data?.success ?? true),
      message: data?.message,
    };
  },

  logoutAllDevices: async (_userId: number): Promise<{ success: boolean; message?: string }> => {
    const response = await httpClient.post(endpoints.auth.logoutAll);
    const data = response.data?.data ?? response.data;
    return {
      success: Boolean(data?.success ?? true),
      message: data?.message,
    };
  },

  forgotPassword: async (email: string) => {
    const response = await httpClient.post(endpoints.auth.forgotPassword, { email });
    return response.data;
  },
  resetPassword: async (payload: { email: string; otp: string; newPassword: string }) => {
    const response = await httpClient.post(endpoints.auth.resetPassword, payload);
    return response.data;
  },
  validateBalance: async (): Promise<{ points: number; corrected: boolean; previousPoints?: number }> => {
    const response = await httpClient.get(endpoints.auth.validateBalance);
    const data = response.data?.data ?? response.data;
    return data;
  },
};
