import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Application {
  id: string;
  job_id: string;
  applicant: string;
  cover_message: string;
  cv_blob_id: string;
  applied_at: number;
  ai_score: number | null;
  ai_analysis: string | null;
}

interface ApplicationsState {
  items: Application[];
  loading: boolean;
  error: string | null;
}

const initialState: ApplicationsState = {
  items: [],
  loading: false,
  error: null,
};

const applicationsSlice = createSlice({
  name: "applications",
  initialState,
  reducers: {
    setApplications: (state, action: PayloadAction<Application[]>) => {
      state.items = action.payload;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    addApplication: (state, action: PayloadAction<Application>) => {
      state.items.push(action.payload);
    },
    updateApplication: (state, action: PayloadAction<Application>) => {
      const index = state.items.findIndex((a) => a.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
  },
});

export const { setApplications, setLoading, setError, addApplication, updateApplication } =
  applicationsSlice.actions;
export default applicationsSlice.reducer;
