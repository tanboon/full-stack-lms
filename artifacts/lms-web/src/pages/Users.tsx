import React, { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, RefreshCw, Mail, Shield } from 'lucide-react';

// [1.2] Async User Directory with Debounce, Skeleton, and Retry
export default function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  // [1.2] 600ms debounce
  const debouncedSearch = useDebounce(searchTerm, 600);
  
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/gateway/users'); // Use gateway endpoint from Phase 1 for demo users
      // Filter locally for demo purposes since gateway returns jsonplaceholder
      let filtered = res.data.data;
      if (debouncedSearch) {
        filtered = filtered.filter((u: any) => 
          u.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
      }
      setUsers(filtered);
    } catch (err: any) {
      setError('Failed to fetch user directory. Network error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">User Directory</h1>
          <p className="text-muted-foreground mt-1">Manage and search through all platform users.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search users... (600ms debounce)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Error State with Retry Button [1.2] */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <Shield className="w-12 h-12 text-destructive mb-3" />
          <h3 className="text-lg font-bold text-destructive mb-2">{error}</h3>
          <button 
            onClick={fetchUsers}
            className="flex items-center gap-2 bg-destructive text-destructive-foreground px-6 py-2.5 rounded-xl font-medium hover:bg-destructive/90 transition-colors shadow-lg shadow-destructive/20"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      )}

      {/* Grid Layout */}
      {!error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            /* Skeleton Loading State [1.2] */
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card p-6 rounded-2xl border border-border animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-5/6"></div>
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
              No users found matching "{searchTerm}"
            </div>
          ) : (
            users.map((user: any) => (
              <div key={user.id} className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300 group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-110 transition-transform">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{user.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" /> {user.email}
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border/50 text-sm">
                  <div className="flex justify-between mb-1 text-muted-foreground">
                    <span>Company:</span>
                    <span className="font-medium text-foreground truncate max-w-[150px]">{user.company || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>City:</span>
                    <span className="font-medium text-foreground">{user.city || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
