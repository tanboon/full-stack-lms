import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from 'sonner';

// Contexts
import { ThemeProvider } from './contexts/ThemeContext';

// Layout
import { DashboardLayout } from './components/layout/DashboardLayout';
import Cart from './pages/Cart';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import CourseCreation from './pages/CourseCreation';
import Step1 from './pages/CourseCreation/Step1';
import Step2 from './pages/CourseCreation/Step2';
import Step3 from './pages/CourseCreation/Step3';
import Profile from './pages/Profile';
import ExamCreate from './pages/ExamCreate';
import UploadManager from './pages/UploadManager';
import NotFound from './pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    }
  }
});

function App() {
  // [2.1 & 2.2] React Router v6 SPA Implementation
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes Wrapper */}
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<CourseDetail />} />
              
              {/* [2.4] Nested Routing for Multi-step Form */}
              <Route path="/courses/new" element={<CourseCreation />}>
                <Route index element={<Step1 />} />
                <Route path="step2" element={<Step2 />} />
                <Route path="step3" element={<Step3 />} />
              </Route>
              
              <Route path="/profile" element={<Profile />} />
              <Route path="/exams/create" element={<ExamCreate />} />
              <Route path="/upload" element={<UploadManager />} />
            </Route>

            {/* 404 Handling */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          {/* Global Cart UI [2.3] */}
          <Cart />
        </BrowserRouter>
        
        {/* Global Toast Notifications [6.2] */}
        <Toaster position="top-center" theme="system" richColors />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
