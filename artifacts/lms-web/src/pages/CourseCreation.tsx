import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';

// [2.4 & 6.3] Multi-Step Course Creation Form Parent
export default function CourseCreation() {
  const location = useLocation();
  const currentStep = location.pathname.split('/').pop();

  const steps = [
    { id: 'new', label: 'Basic Info', num: 1 },
    { id: 'step2', label: 'Content & Media', num: 2 },
    { id: 'step3', label: 'Review & Publish', num: 3 },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-display font-bold">Create New Course</h1>
        <p className="text-muted-foreground mt-2">Design your curriculum step by step.</p>
      </div>

      {/* Progress Tracker */}
      <div className="flex justify-between relative mb-12 px-4 md:px-12">
        <div className="absolute top-1/2 left-12 right-12 h-1 bg-muted -z-10 -translate-y-1/2 rounded-full">
           <div className={`h-full bg-primary rounded-full transition-all duration-500 ${currentStep === 'new' ? 'w-0' : currentStep === 'step2' ? 'w-1/2' : 'w-full'}`}></div>
        </div>
        
        {steps.map((step) => {
          const isActive = currentStep === step.id || (step.id === 'new' && currentStep === 'new'); // naive path matching
          return (
            <div key={step.id} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${isActive || (currentStep === 'step3') || (currentStep === 'step2' && step.id === 'new') ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110' : 'bg-card border-2 border-border text-muted-foreground'}`}>
                {step.num}
              </div>
              <span className={`text-xs font-semibold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
            </div>
          )
        })}
      </div>

      {/* Renders nested routes (Step1, Step2, Step3) */}
      <div className="bg-card p-8 rounded-3xl border border-border shadow-xl">
        <Outlet />
      </div>
    </div>
  );
}
