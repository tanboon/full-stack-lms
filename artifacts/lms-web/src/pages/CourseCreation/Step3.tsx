import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseCreationStore } from '@/store/courseCreationStore';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';

export default function Step3() {
  const navigate = useNavigate();
  const { data, reset } = useCourseCreationStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/courses', data);
      toast.success("Course published successfully!");
      reset();
      navigate('/courses');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create course");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
      <div className="bg-background/50 rounded-2xl p-6 border border-border">
        <h3 className="text-xl font-bold font-display mb-4">Review Your Course</h3>
        
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-muted-foreground font-medium">Title</dt>
            <dd className="font-bold text-foreground mt-1">{data.title}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground font-medium">Category</dt>
            <dd className="font-bold text-foreground mt-1 uppercase">{data.category}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground font-medium">Price</dt>
            <dd className="font-bold text-foreground mt-1">${data.price}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground font-medium">Level</dt>
            <dd className="font-bold text-foreground mt-1 capitalize">{data.level}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-muted-foreground font-medium">Description</dt>
            <dd className="text-foreground mt-1 bg-background p-4 rounded-xl border border-border">{data.description}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-muted-foreground font-medium">Tags</dt>
            <dd className="flex gap-2 mt-2">
              {data.tags?.map(t => (
                <span key={t} className="bg-primary/20 text-primary px-2 py-1 rounded-md text-xs font-bold">{t}</span>
              ))}
            </dd>
          </div>
        </dl>
      </div>

      <div className="pt-6 flex justify-between border-t border-border">
        <button type="button" onClick={() => navigate('/courses/new/step2')} className="text-muted-foreground hover:text-foreground font-medium px-6 py-3 transition-colors">
          Back to Edit
        </button>
        <button 
          onClick={handlePublish}
          disabled={isSubmitting}
          className="bg-accent text-accent-foreground px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-accent/25 transition-all flex items-center gap-2"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          Publish Course
        </button>
      </div>
    </div>
  );
}
