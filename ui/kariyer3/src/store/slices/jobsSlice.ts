import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Job {
  id: string;
  employer: string;
  title: string;
  description: string;
  company: string;
  location: string;
  category: string;
  salary_range: [number, number];
  tags: string[];
  created_at: number;
  status: number;
  hired_candidate: string | null;
}

interface JobsState {
  items: Job[];
  loading: boolean;
  error: string | null;
  selectedJob: Job | null;
}

const initialState: JobsState = {
  items: [],
  loading: false,
  error: null,
  selectedJob: null,
};

const jobsSlice = createSlice({
  name: "jobs",
  initialState,
  reducers: {
    setJobs: (state, action: PayloadAction<Job[]>) => {
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
    setSelectedJob: (state, action: PayloadAction<Job | null>) => {
      state.selectedJob = action.payload;
    },
    addJob: (state, action: PayloadAction<Job>) => {
      state.items.unshift(action.payload);
    },
    updateJob: (state, action: PayloadAction<Job>) => {
      const index = state.items.findIndex((j) => j.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.selectedJob?.id === action.payload.id) {
        state.selectedJob = action.payload;
      }
    },
  },
});

export const { setJobs, setLoading, setError, setSelectedJob, addJob, updateJob } = jobsSlice.actions;
export default jobsSlice.reducer;
