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
  const [activeTab, setActiveTab] = useState<'exams' | 'results'>('exams');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const [examSubmissions, setExamSubmissions] = useState<Record<string, any[]>>({});

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

  const loadAllSubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      const res = await api.get('/submissions');
      setSubmissions(res.data.data ?? []);
    } catch {
      toast.error('Failed to load submissions.');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const loadExamSubmissions = async (examId: string) => {
    if (examSubmissions[examId]) return;
    try {
      const res = await api.get(`/exams/${examId}/submissions`);
      setExamSubmissions(prev => ({ ...prev, [examId]: res.data.data ?? [] }));
    } catch {
      toast.error('Failed to load submissions for this exam.');
    }
  };

  const handleTabChange = (tab: 'exams' | 'results') => {
    setActiveTab(tab);
    if (tab === 'results' && submissions.length === 0) loadAllSubmissions();
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

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {(['exams', 'results'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              activeTab === tab
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'exams' ? `Exams (${exams.length})` : `Student Results (${submissions.length})`}
          </button>
        ))}
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

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Student Results
              <span className="text-sm font-normal text-muted-foreground">({submissions.length} submissions)</span>
            </h2>
            <button onClick={loadAllSubmissions} disabled={submissionsLoading}
              className="text-xs text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
              <svg className={`w-3.5 h-3.5 ${submissionsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Refresh
            </button>
          </div>

          {submissionsLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Loading submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-3xl text-muted-foreground">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="font-medium">No submissions yet</p>
              <p className="text-sm mt-1">Students submit exams through the mobile app</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map(sub => (
                <div key={sub._id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                      sub.passed ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {sub.percentage}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{sub.userName}</span>
                        <span className="text-xs text-muted-foreground">{sub.userEmail}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          sub.passed ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {sub.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{sub.examTitle}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <span>Score: <strong className="text-foreground">{sub.score}/{sub.totalPoints}</strong></span>
                        <span>Passing: {sub.passingScore ?? '—'}%</span>
                        <span>{new Date(sub.submittedAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedExam(expandedExam === sub._id ? null : sub._id)}
                      className="text-xs text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      {expandedExam === sub._id ? 'Hide' : 'Breakdown'}
                    </button>
                  </div>

                  {/* Score bar */}
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${sub.passed ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${sub.percentage}%` }}
                    />
                  </div>

                  {/* Breakdown expandable */}
                  {expandedExam === sub._id && (
                    <div className="mt-4 space-y-2 border-t border-border pt-4">
                      {(sub.breakdown ?? []).map((b: any, i: number) => (
                        <div key={i} className={`flex items-start gap-3 p-2.5 rounded-xl text-sm ${
                          b.isCorrect ? 'bg-green-500/5 border border-green-500/20' : 'bg-red-500/5 border border-red-500/20'
                        }`}>
                          <span className={`mt-0.5 shrink-0 ${b.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                            {b.isCorrect ? '✓' : '✗'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground line-clamp-1">{b.questionText}</p>
                            {!b.isCorrect && (
                              <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                                <span className="text-red-500">Given: {b.userAnswer || '(no answer)'}</span>
                                {' · '}
                                <span className="text-green-600 dark:text-green-400">Correct: {b.correctAnswer}</span>
                              </div>
                            )}
                          </div>
                          <span className={`text-xs font-semibold shrink-0 ${b.isCorrect ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {b.pointsEarned}/{b.pointsMax}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'exams' && (
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

      )}

      {/* Schema preview */}
      {activeTab === 'exams' && schema && (
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
