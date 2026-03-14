import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCourseCreationStore } from '@/store/courseCreationStore';

const step2Schema = z.object({
  price: z.number().min(0, "Price cannot be negative"),
  tags: z.string().min(2, "Add at least one tag"),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
});

type Step2Form = z.infer<typeof step2Schema>;

export default function Step2() {
  const navigate = useNavigate();
  const { data, updateData } = useCourseCreationStore();
  
  const { register, handleSubmit, formState: { errors } } = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      price: data.price || 0,
      tags: data.tags ? data.tags.join(', ') : '',
      videoUrl: data.videoUrl || ''
    }
  });

  const onSubmit = (formData: Step2Form) => {
    // Transform tags string back to array
    const formattedData = {
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    };
    updateData(formattedData);
    navigate('/courses/new/step3');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div>
        <label className="block text-sm font-medium mb-2">Price ($)</label>
        <input 
          type="number"
          {...register('price', { valueAsNumber: true })} 
          className="w-full bg-background border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20"
        />
        {errors.price && <p className="text-destructive text-sm mt-1">{errors.price.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tags (comma separated)</label>
        <input 
          {...register('tags')} 
          className="w-full bg-background border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20"
          placeholder="react, frontend, javascript"
        />
        {errors.tags && <p className="text-destructive text-sm mt-1">{errors.tags.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Promo Video URL (Optional)</label>
        <input 
          {...register('videoUrl')} 
          className="w-full bg-background border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20"
          placeholder="https://youtube.com/..."
        />
        {errors.videoUrl && <p className="text-destructive text-sm mt-1">{errors.videoUrl.message}</p>}
      </div>

      <div className="pt-6 flex justify-between">
        <button type="button" onClick={() => navigate('/courses/new')} className="text-muted-foreground hover:text-foreground font-medium px-6 py-3 transition-colors">
          Back
        </button>
        <button type="submit" className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/25 transition-all">
          Next: Review
        </button>
      </div>
    </form>
  );
}
