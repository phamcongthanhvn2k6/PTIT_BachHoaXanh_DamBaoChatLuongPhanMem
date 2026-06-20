import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../types';
import { authService } from '../services/authService';

interface LoginPayload {
  emailOrPhone: string;
  password: string;
}

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  otpSent: boolean;
  otpPhone: string | null;
  successMessage: string | null;
  _initialized: boolean;
}

const clearTokenStorage = () => {
  localStorage.removeItem('lottemart_token');
  localStorage.removeItem('lottemart_refresh_token');
};

const persistAuthState = (state: AuthState) => {
  localStorage.setItem(
    'authState',
    JSON.stringify({
      isAuthenticated: state.isAuthenticated,
      otpSent: state.otpSent,
      otpPhone: state.otpPhone,
    })
  );
};

const loadState = (): AuthState => {
  try {
    const serializedState = localStorage.getItem('authState');
    const token = localStorage.getItem('lottemart_token');
    if (!serializedState) {
      return {
        user: null,
        token,
        isAuthenticated: false,
        loading: false,
        error: null,
        status: 'idle',
        otpSent: false,
        otpPhone: null,
        successMessage: null,
        _initialized: false,
      };
    }

    const parsedState = JSON.parse(serializedState);
    return {
      user: null, // do not load user details from localStorage to guarantee fresh re-hydration
      token: token || null,
      isAuthenticated: Boolean(parsedState.isAuthenticated),
      loading: false,
      error: null,
      status: 'idle',
      otpSent: Boolean(parsedState.otpSent),
      otpPhone: parsedState.otpPhone || null,
      successMessage: null,
      _initialized: false,
    };
  } catch {
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      status: 'idle',
      otpSent: false,
      otpPhone: null,
      successMessage: null,
      _initialized: false,
    };
  }
};

const getErrorMessage = (error: any) => {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Authentication failed';
  const code = error?.response?.data?.code || '';
  // Append provider collision code so UI can detect and display special guidance
  if (code && (code.startsWith('PROVIDER_COLLISION') || code.startsWith('USE_') || code === 'EMAIL_NOT_VERIFIED')) {
    return `[${code}] ${message}`;
  }
  return message;
};

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      return await authService.forgotPassword(email);
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (payload: { email: string; otp: string; newPassword: string }, { rejectWithValue }) => {
    try {
      return await authService.resetPassword(payload);
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      return await authService.login(payload);
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (payload: RegisterPayload, { rejectWithValue }) => {
    try {
      return await authService.register(payload);
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const loginWithGoogle = createAsyncThunk(
  'auth/loginWithGoogle',
  async (credential: string, { rejectWithValue }) => {
    try {
      return await authService.loginWithGoogle(credential);
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const loginWithFacebook = createAsyncThunk(
  'auth/loginWithFacebook',
  async (accessToken: string, { rejectWithValue }) => {
    try {
      return await authService.loginWithFacebook(accessToken);
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const sendOTP = createAsyncThunk(
  'auth/sendOTP',
  async (phone: string, { rejectWithValue }) => {
    try {
      await authService.sendOTP(phone);
      return { phone };
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async ({ phone, otp }: { phone: string; otp: string }, { rejectWithValue }) => {
    try {
      return await authService.verifyOTP({ phone, otp });
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const verifySession = createAsyncThunk(
  'auth/verifySession',
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem('lottemart_token');
    if (!token) {
      return rejectWithValue('No active session');
    }

    try {
      return await authService.verifyToken(token);
    } catch (error: any) {
      clearTokenStorage();
      localStorage.removeItem('authState');
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateUserProfileThunk = createAsyncThunk(
  'auth/updateUserProfile',
  async ({ userId, payload }: { userId: number | string; payload: Partial<User> }, { rejectWithValue }) => {
    try {
      return await authService.updateProfile(userId, payload);
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateUserSettingsThunk = createAsyncThunk(
  'auth/updateUserSettings',
  async ({ userId, patch }: { userId: number | string; patch: Partial<User> }, { rejectWithValue }) => {
    try {
      return await authService.updateUserSettings(userId, patch);
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const validateLoyaltyBalance = createAsyncThunk(
  'auth/validateLoyaltyBalance',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.validateBalance();
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);


const initialState: AuthState = loadState();

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.status = 'idle';
      state.otpSent = false;
      state.otpPhone = null;
      state.successMessage = null;
      clearTokenStorage();
      localStorage.removeItem('authState');
      // Clear all user-scoped cached state to prevent data leakage between accounts
      localStorage.removeItem('orderState');
      localStorage.removeItem('addressState');
      localStorage.removeItem('paymentState');
      localStorage.removeItem('supportState');
      localStorage.removeItem('cartState');
      localStorage.removeItem('loyaltyState');
      localStorage.removeItem('notificationState');
      localStorage.removeItem('reviewState');
    },
    clearAuthMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
    hydrateOAuthSession: (state, action: PayloadAction<{ token: string; refreshToken?: string; user: User }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
      state.status = 'succeeded';
      state.error = null;
      state.successMessage = 'Đăng nhập thành công';

      localStorage.setItem('lottemart_token', action.payload.token);
      if (action.payload.refreshToken) {
        localStorage.setItem('lottemart_refresh_token', action.payload.refreshToken);
      }

      persistAuthState(state);
    },
    invalidateCache: (state) => {
      localStorage.removeItem('authState');
      state.user = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    const startLoading = (state: AuthState) => {
      state.loading = true;
      state.status = 'loading';
      state.error = null;
      state.successMessage = null;
    };

    const stopLoading = (state: AuthState) => {
      state.loading = false;
      state.status = 'succeeded';
      state.error = null;
    };

    const stopLoadingWithError = (state: AuthState, action: any) => {
      state.loading = false;
      state.status = 'failed';
      state.error = (action.payload as string) || action.error?.message || 'Authentication failed';
      state.successMessage = null;
      state.isAuthenticated = false;
    };

    const setAuthenticated = (state: AuthState, action: PayloadAction<{ token: string; user: User }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
      state.status = 'succeeded';
      state.error = null;
      state.otpSent = false;
      state.otpPhone = null;
      persistAuthState(state);
    };

    builder
      .addCase(login.pending, startLoading)
      .addCase(login.fulfilled, (state, action) => {
        stopLoading(state);
        setAuthenticated(state, action as PayloadAction<{ token: string; user: User }>);
        state.successMessage = 'Đăng nhập thành công';
      })
      .addCase(login.rejected, stopLoadingWithError)

      .addCase(register.pending, startLoading)
      .addCase(register.fulfilled, (state, action) => {
        stopLoading(state);
        setAuthenticated(state, action as PayloadAction<{ token: string; user: User }>);
        state.successMessage = 'Đăng ký thành công';
      })
      .addCase(register.rejected, stopLoadingWithError)

      .addCase(loginWithGoogle.pending, startLoading)
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        stopLoading(state);
        setAuthenticated(state, action as PayloadAction<{ token: string; user: User }>);
        state.successMessage = 'Đăng nhập Google thành công';
      })
      .addCase(loginWithGoogle.rejected, stopLoadingWithError)

      .addCase(loginWithFacebook.pending, startLoading)
      .addCase(loginWithFacebook.fulfilled, (state, action) => {
        stopLoading(state);
        setAuthenticated(state, action as PayloadAction<{ token: string; user: User }>);
        state.successMessage = 'Đăng nhập Facebook thành công';
      })
      .addCase(loginWithFacebook.rejected, stopLoadingWithError)

      .addCase(sendOTP.pending, startLoading)
      .addCase(sendOTP.fulfilled, (state, action) => {
        stopLoading(state);
        state.otpSent = true;
        state.otpPhone = action.payload.phone;
        state.successMessage = 'OTP đã được gửi';
        persistAuthState(state);
      })
      .addCase(sendOTP.rejected, stopLoadingWithError)

      .addCase(verifyOTP.pending, startLoading)
      .addCase(verifyOTP.fulfilled, (state, action) => {
        stopLoading(state);
        setAuthenticated(state, action as PayloadAction<{ token: string; user: User }>);
        state.successMessage = 'Xác thực OTP thành công';
      })
      .addCase(verifyOTP.rejected, stopLoadingWithError)

      .addCase(verifySession.pending, startLoading)
      .addCase(verifySession.fulfilled, (state, action) => {
        stopLoading(state);
        setAuthenticated(state, action as PayloadAction<{ token: string; user: User }>);
        state._initialized = true;
      })
      .addCase(verifySession.rejected, (state) => {
        state.loading = false;
        state.status = 'idle';
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.otpSent = false;
        state.otpPhone = null;
        state.error = null;
        state.successMessage = null;
        state._initialized = true;
      })

      .addCase(updateUserProfileThunk.fulfilled, (state, action) => {
        state.user = action.payload;
        persistAuthState(state);
      })
      .addCase(updateUserSettingsThunk.fulfilled, (state, action) => {
        state.user = action.payload;
        persistAuthState(state);
      })
      .addCase(validateLoyaltyBalance.fulfilled, (state, action) => {
        if (state.user) {
          state.user.lotte_points = action.payload.points;
          persistAuthState(state);
        }
      });
  },
});

export const authLogin = login;
export const authRegister = register;
export const authVerify = verifySession;

export const { logout, clearAuthMessages, hydrateOAuthSession, invalidateCache } = authSlice.actions;
export default authSlice.reducer;