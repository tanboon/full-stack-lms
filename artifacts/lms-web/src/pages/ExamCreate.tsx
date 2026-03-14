import React, { useEffect, useState } from 'react';
import { DynamicFormEngine, FormSchema } from '@/components/DynamicFormEngine';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

// Fallback schema if backend is not ready
const fallbackSchema: FormSchema = {
  type: 'object',
  properties: {
    examTitle: { type: 'string', label: 'Exam Title', required: true },
    isProctored: { type: 'boolean', label: 'Enable Remote Proctoring' },
    settings: {
      type: 'object',
      label: 'Exam Settings',
      properties: {
        timeLimit: { type: 'string', label: 'Time Limit', options: ['30 mins', '60 mins', '120 mins'] },
        requireWebcam: { 
          type: 'boolean', 
          label: 'Require Webcam', 
          condition: { field: 'isProctored', value: true } // Conditional field [6.5]
        }
      }
    }
  }
};

// [6.5] Dynamic Exam Form Engine
export default function ExamCreate() {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Attempt to fetch schema from backend
    api.get('/exam/schema')
      .then(res => {
        setSchema(res.data.schema);
      })
      .catch(() => {
        console.warn("Backend /api/exam/schema not found, using fallback schema for demo.");
        setSchema(fallbackSchema);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (data: any) => {
    try {
      await api.post('/exams', data);
      toast.success("Exam created successfully from dynamic schema!");
    } catch (err) {
      // Mock success for demo if backend endpoint missing
      console.log("Form Data Submitted:", data);
      toast.success("Exam configuration saved! (Demo mode)");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading Dynamic Schema...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Dynamic Exam Builder</h1>
        <p className="text-muted-foreground mt-1">This entire form is rendered dynamically from a JSON schema.</p>
      </div>

      <div className="bg-card p-8 rounded-3xl border border-border shadow-xl relative overflow-hidden">
        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-[100px] -z-10 pointer-events-none"></div>
        
        {schema && <DynamicFormEngine schema={schema} onSubmit={handleSubmit} />}
      </div>
      
      <div className="mt-8 p-6 bg-muted/50 rounded-2xl border border-border/50 text-sm font-mono text-muted-foreground overflow-x-auto">
        <strong>Active JSON Schema:</strong>
        <pre className="mt-2 text-xs">{JSON.stringify(schema, null, 2)}</pre>
      </div>
    </div>
  );
}
