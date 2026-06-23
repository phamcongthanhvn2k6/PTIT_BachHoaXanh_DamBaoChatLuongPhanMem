import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Branch } from '../types';
import { dataService } from '../services/dataService';

// ─── Async thunks ───────────────────────────────────────
export const loadBranches = createAsyncThunk(
  'branch/loadBranches',
  async () => {
    const branches = await dataService.getBranches();
    return branches;
  }
);

// ─── State shape ────────────────────────────────────────
interface BranchState {
  branches: Branch[];
  currentBranch: Branch | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Rehydrate from localStorage
const getSavedBranch = (): Branch | null => {
  try {
    const saved = localStorage.getItem('lotte_current_branch');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const initialState: BranchState = {
  branches: [],
  currentBranch: getSavedBranch(),
  status: 'idle',
  error: null,
};

// ─── Slice ──────────────────────────────────────────────
export const branchSlice = createSlice({
  name: 'branch',
  initialState,
  reducers: {
    setCurrentBranch: (state, action: PayloadAction<Branch | null>) => {
      state.currentBranch = action.payload;
      if (action.payload) {
        localStorage.setItem('lotte_current_branch', JSON.stringify(action.payload));
      } else {
        localStorage.removeItem('lotte_current_branch');
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadBranches.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadBranches.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.branches = action.payload;
        // Auto-select first branch if nothing saved
        if (!state.currentBranch && action.payload.length > 0) {
          state.currentBranch = action.payload[0];
          localStorage.setItem('lotte_current_branch', JSON.stringify(action.payload[0]));
        }
        // If saved branch exists, update with fresh server data. If it no longer exists, reset to first.
        if (state.currentBranch) {
          const exists = action.payload.find(
            (b) => String(b.id || (b as any)._id) === String(state.currentBranch!.id || (state.currentBranch as any)?._id)
          );
          if (exists) {
            state.currentBranch = exists;
            localStorage.setItem('lotte_current_branch', JSON.stringify(exists));
          } else if (action.payload.length > 0) {
            state.currentBranch = action.payload[0];
            localStorage.setItem('lotte_current_branch', JSON.stringify(action.payload[0]));
          }
        }
      })
      .addCase(loadBranches.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || null;
      });
  },
});

export const { setCurrentBranch } = branchSlice.actions;
export default branchSlice.reducer;
