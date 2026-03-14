import { create } from 'zustand';

interface CourseData {
  title: string;
  description: string;
  price: number;
  category: string;
  level: string;
  tags: string[];
  videoUrl?: string;
}

interface CourseCreationStore {
  data: Partial<CourseData>;
  updateData: (newData: Partial<CourseData>) => void;
  reset: () => void;
}

// [2.4] State persistence across multi-step forms
export const useCourseCreationStore = create<CourseCreationStore>((set) => ({
  data: {},
  updateData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
  reset: () => set({ data: {} }),
}));
