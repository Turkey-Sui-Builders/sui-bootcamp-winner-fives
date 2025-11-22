import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FiltersState {
  category: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  tags: string[];
  searchQuery: string;
  status: number | null;
}

const initialState: FiltersState = {
  category: null,
  salaryMin: null,
  salaryMax: null,
  tags: [],
  searchQuery: "",
  status: null,
};

const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    setCategory: (state, action: PayloadAction<string | null>) => {
      state.category = action.payload;
    },
    setSalaryRange: (state, action: PayloadAction<{ min: number | null; max: number | null }>) => {
      state.salaryMin = action.payload.min;
      state.salaryMax = action.payload.max;
    },
    setTags: (state, action: PayloadAction<string[]>) => {
      state.tags = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setStatus: (state, action: PayloadAction<number | null>) => {
      state.status = action.payload;
    },
    resetFilters: (state) => {
      state.category = null;
      state.salaryMin = null;
      state.salaryMax = null;
      state.tags = [];
      state.searchQuery = "";
      state.status = null;
    },
  },
});

export const { setCategory, setSalaryRange, setTags, setSearchQuery, setStatus, resetFilters } =
  filtersSlice.actions;
export default filtersSlice.reducer;
