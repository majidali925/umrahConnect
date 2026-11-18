import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '@/services/auth.service';

/**
 * status:
 *  - idle:            nothing attempted yet (first render)
 *  - loading:         restoring the session from the refresh cookie
 *  - authenticated:   user + access token in memory
 *  - unauthenticated: no valid session
 */
const initialState = { user: null, agency: null, accessToken: null, status: 'idle' };

/** Restores the session on page load by exchanging the HTTP-only refresh cookie. */
export const initAuth = createAsyncThunk('auth/init', async () => {
  try {
    return await authService.refresh();
  } catch {
    return null;
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authService.logout();
  } catch {
    // Clear local state even if the network request fails.
  }
});

const applySession = (state, session) => {
  state.user = session.user;
  state.agency = session.agency ?? null;
  if (session.accessToken) state.accessToken = session.accessToken;
  state.status = 'authenticated';
};

const clear = (state) => {
  state.user = null;
  state.agency = null;
  state.accessToken = null;
  state.status = 'unauthenticated';
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionStarted: (state, { payload }) => applySession(state, payload),
    sessionRefreshed: (state, { payload }) => applySession(state, payload),
    sessionCleared: clear,
    agencyStatusChanged: (state, { payload }) => {
      if (state.agency) state.agency.verificationStatus = payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initAuth.pending, (state) => {
        if (state.status === 'idle') state.status = 'loading';
      })
      .addCase(initAuth.fulfilled, (state, { payload }) => {
        if (payload?.accessToken) applySession(state, payload);
        else if (state.status !== 'authenticated') clear(state);
      })
      .addCase(logout.fulfilled, clear);
  },
});

export const { sessionStarted, sessionRefreshed, sessionCleared, agencyStatusChanged } = authSlice.actions;

export const selectAuth = (state) => state.auth;

export default authSlice.reducer;
