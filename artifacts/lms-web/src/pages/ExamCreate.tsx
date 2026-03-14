import React, { useEffect, useState } from 'react';
import { DynamicFormEngine } from '@/components/DynamicFormEngine';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

// [6.5] Dynamic Exam Form Engine — full create + list flow
export default function ExamCreate() {
  const [schema, setSchema] = useState<any | null>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch schema (public) and exams (protected) simultaneously
  useEffect(() => {
    Promise.allSettled([
      api.get('/exam/schema'),
      api.get('/exams'),
    ]).then(([schemaRes, examsRes]) => {
      if (schemaRes.status === 'fulfilled') {
        setSchema(schemaRes.value.data.schema);
      } else {
        setSchemaError('Failed to load exam schema from server.');
      }
      if (examsRes.status === 'fulfilled') {
        setExams(examsRes.value.data.data ?? []);
      }
    }).finally(() => setIsLoading(false));
  }, []);

  const refreshExams = async () => {
    try {
      const res = await api.get('/exams');
      setExams(res.data.data ?? []);
    } catch {}
  };

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await api.post('/exams', data);
      toast.success('Exam created and saved to database!');
      setShowForm(false);
      await refreshExams();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to create exam.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this exam?')) return;
    try {
      await api.delete(`/exams/${id}`);
      toast.success('Exam deleted.');
      setExams(prev => prev.filter(e => e._id !== id));
    } catch {
      toast.error('Failed to delete exam.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 gap-3 text-muted-foreground">
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Loading exam data from database...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Exam Creator</h1>
          <p className="text-muted-foreground mt-1">
            Form rendered dynamically from backend JSON schema &bull; {exams.length} exam{exams.length !== 1 ? 's' : ''} in database
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 py-2.5 px-5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {showForm
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            }
          </svg>
          {showForm ? 'Cancel' : 'New Exam'}
        </button>
      </div>

      {/* Create Form (schema-driven) */}
      {showForm && (
        schema ? (
          <div className="bg-card p-8 rounded-3xl border border-border shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-[100px] -z-10 pointer-events-none"/>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">New Exam</h2>
                <p className="text-xs text-muted-foreground">Form rendered from <code className="bg-muted px-1 rounded">/api/exam/schema</code></p>
              </div>
            </div>
            {isSubmitting && (
              <div className="mb-4 flex items-center gap-2 text-sm text-primary bg-primary/10 px-4 py-2.5 rounded-xl">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Saving to MongoDB...
              </div>
            )}
            <DynamicFormEngine schema={schema} onSubmit={handleSubmit} />
          </div>
        ) : (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive px-6 py-4 rounded-2xl flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <span className="text-sm font-medium">{schemaError ?? 'Schema failed to load. Please refresh the page or log in again.'}</span>
          </div>
        )
      )}

      {/* Exams List */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          All Exams
          <span className="text-sm font-normal text-muted-foreground ml-1">({exams.length})</span>
        </h2>

        {exams.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-3xl text-muted-foreground">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p className="font-medium">No exams yet</p>
            <p className="text-sm mt-1">Click "New Exam" above to create one</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {exams.map(exam => (
              <div key={exam._id} className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 hover:border-primary/40 transition-colors shadow-sm">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{exam.examTitle}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {exam.courseId?.title && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{exam.courseId.title}</span>
                    )}
                    <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{exam.duration} min</span>
                    <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">Pass: {exam.passingScore}%</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${exam.role === 'admin' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'}`}>
                      {exam.role === 'admin' ? 'Admins Only' : 'Students'}
                    </span>
                    <span className="text-xs text-muted-foreground">{(exam.questions ?? []).length} question{exam.questions?.length !== 1 ? 's' : ''}</span>
                  </div>
                  {exam.instructions?.en && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{exam.instructions.en}</p>
                  )}
                </div>
                {/* Actions */}
                <button
                  onClick={() => handleDelete(exam._id)}
                  className="text-xs text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schema preview */}
      {schema && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 select-none">
            <svg className="w-4 h-4 group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
            View raw JSON schema from backend
          </summary>
          <pre className="mt-3 p-4 bg-muted/50 rounded-2xl border border-border/50 text-xs font-mono text-muted-foreground overflow-x-auto max-h-64">
            {JSON.stringify(schema, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
