import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCourseCreationStore } from '@/store/courseCreationStore';

const step1Schema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.enum(['web-dev', 'mobile-dev', 'data-science', 'design', 'business', 'other']),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
});

type Step1Form = z.infer<typeof step1Schema>;

export default function Step1() {
  const navigate = useNavigate();
  const { data, updateData } = useCourseCreationStore();
  
  const { register, handleSubmit, formState: { errors } } = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      title: data.title || '',
      description: data.description || '',
      category: (data.category as any) || 'web-dev',
      level: (data.level as any) || 'beginner'
    }
  });

  const onSubmit = (formData: Step1Form) => {
    updateData(formData);
    navigate('/courses/new/step2'); // Go to next step
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div>
        <label className="block text-sm font-medium mb-2">Course Title</label>
        <input 
          {...register('title')} 
          className="w-full bg-background border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="e.g. Master React in 30 Days"
        />
        {errors.title && <p className="text-destructive text-sm mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Detailed Description</label>
        <textarea 
          {...register('description')} 
          rows={5}
          className="w-full bg-background border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          placeholder="What will students learn?"
        />
        {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select {...register('category')} className="w-full bg-background border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20">
            <option value="web-dev">Web Development</option>
            <option value="mobile-dev">Mobile Development</option>
            <option value="data-science">Data Science</option>
            <option value="design">Design</option>
            <option value="business">Business</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Difficulty Level</label>
          <select {...register('level')} className="w-full bg-background border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div className="pt-6 flex justify-end">
        <button type="submit" className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/25 transition-all">
          Next: Content & Media
        </button>
      </div>
    </form>
  );
}
