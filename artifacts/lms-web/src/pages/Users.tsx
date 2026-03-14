import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/axios';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import {
  Search, RefreshCw, Mail, Shield, Users as UsersIcon,
  Trash2, Edit2, Check, X, ChevronLeft, ChevronRight,
  BookOpen, GraduationCap, ShieldCheck,
} from 'lucide-react';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  admin:      { label: 'Admin',      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',      icon: <ShieldCheck className="w-3 h-3" /> },
  instructor: { label: 'Instructor', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',  icon: <BookOpen className="w-3 h-3" /> },
  student:    { label: 'Student',    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <GraduationCap className="w-3 h-3" /> },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] || { label: role, color: 'bg-muted text-muted-foreground', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function EditRoleModal({ user, onClose, onSave }: { user: any; onClose: () => void; onSave: (id: string, role: string, name: string) => void }) {
  const [role, setRole] = useState(user.role);
  const [name, setName] = useState(user.name);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Edit User</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <div className="flex gap-3">
              {Object.keys(ROLE_CONFIG).map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${role === r ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'}`}
                >
                  {ROLE_CONFIG[r].label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={() => { onSave(user._id, role, name); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20 transition-all text-sm font-semibold"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 600);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { page: String(page), limit: '9' };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/users', { params });
      setUsers(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users. Are you signed in as Admin?');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, roleFilter, page]);

  useEffect(() => { setPage(1); }, [debouncedSearch, roleFilter]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSaveUser = async (id: string, role: string, name: string) => {
    try {
      await api.patch(`/users/${id}`, { role, name });
      toast.success('User updated successfully');
      fetchUsers();
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Soft-delete "${name}"? They won't be able to log in.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/users/${id}`);
      toast.success(`"${name}" has been deactivated`);
      fetchUsers();
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const roleTabs = [
    { value: '', label: 'All Users', count: total },
    { value: 'admin', label: 'Admins' },
    { value: 'instructor', label: 'Instructors' },
    { value: 'student', label: 'Students' },
  ];

  return (
    <div className="space-y-6">
      {editUser && (
        <EditRoleModal user={editUser} onClose={() => setEditUser(null)} onSave={handleSaveUser} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">User Directory</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Loading…' : `${total} registered users on the platform`}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm text-sm"
          />
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {roleTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setRoleFilter(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              roleFilter === tab.value
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                : 'border-border hover:border-primary/40 bg-card'
            }`}
          >
            {tab.label}
            {tab.value === '' && <span className="ml-2 opacity-60 text-xs">{total}</span>}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <Shield className="w-12 h-12 text-destructive mb-3" />
          <h3 className="text-lg font-bold text-destructive mb-1">{error}</h3>
          <p className="text-sm text-muted-foreground mb-4">Only Admin accounts can access the user directory.</p>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 bg-destructive text-destructive-foreground px-6 py-2.5 rounded-xl font-medium hover:bg-destructive/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* User Grid */}
      {!error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading ? (
              Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="bg-card p-5 rounded-2xl border border-border animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-muted rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              ))
            ) : users.length === 0 ? (
              <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No users found</p>
                {searchTerm && <p className="text-sm mt-1">Try a different search term</p>}
              </div>
            ) : (
              users.map((user: any) => {
                const initials = user.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
                const enrolledCount = user.enrolledCourses?.length ?? 0;
                return (
                  <div
                    key={user._id}
                    className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-base shadow-md group-hover:scale-105 transition-transform shrink-0">
                        {initials}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground truncate">{user.name}</span>
                          <RoleBadge role={user.role} />
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <Mail className="w-3 h-3 shrink-0" /> {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {enrolledCount} course{enrolledCount !== 1 ? 's' : ''} enrolled
                      </span>
                      <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setEditUser(user)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border hover:border-primary/60 hover:bg-primary/5 transition-all text-xs font-medium"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id, user.name)}
                        disabled={deletingId === user._id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border hover:border-destructive/60 hover:bg-destructive/5 hover:text-destructive transition-all text-xs font-medium disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Deactivate
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · {total} total users
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
