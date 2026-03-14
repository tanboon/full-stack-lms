import React, { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Filter, Trash2, Plus, PlayCircle, Users, BarChart2 } from 'lucide-react';

export default function Courses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  // Sync state with URL [2.5]
  const tagFilter = searchParams.get('tags') || '';

  const fetchCourses = async () => {
    try {
      const q = new URLSearchParams();
      if (searchInput) q.append('search', searchInput);
      if (tagFilter) q.append('tags', tagFilter);
      const res = await api.get(`/courses?${q.toString()}`);
      setCourses(res.data.data || []);
    } catch (err) {
      toast.error("Failed to load courses");
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(prev => {
      if (searchInput) prev.set('search', searchInput);
      else prev.delete('search');
      return prev;
    });
  };

  // [6.4] Optimistic UI Update for Delete
  const handleDelete = async (id: string) => {
    const previousCourses = [...courses];
    
    // 1. Optimistic removal
    setCourses(courses.filter(c => c._id !== id));
    toast.success("Course deleted (optimistic)");

    try {
      // 2. Network call with interceptor retry enabled { retry: true }
      await api.delete(`/courses/${id}`, { retry: true } as any);
      toast.success("Delete confirmed by server");
    } catch (err) {
      // 3. Rollback on ultimate failure
      setCourses(previousCourses);
      toast.error("Delete failed after 3 retries. Restored item.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Course Library</h1>
          <p className="text-muted-foreground mt-1">Browse, search, and manage your educational content.</p>
        </div>
        
        <Link to="/courses/new" className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <Plus className="w-5 h-5" />
          Create Course
        </Link>
      </div>

      <div className="bg-card p-4 rounded-2xl border border-border flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search courses..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </form>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <select 
            value={tagFilter}
            onChange={(e) => {
              setSearchParams(prev => {
                if (e.target.value) prev.set('tags', e.target.value);
                else prev.delete('tags');
                return prev;
              });
            }}
            className="bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none flex-1 md:w-48"
          >
            <option value="">All Tags</option>
            <option value="nodejs">Node.js</option>
            <option value="backend">Backend</option>
            <option value="react">React</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => (
          <div key={course._id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:border-border/80 transition-all group flex flex-col h-full">
            {/* abstract visual placeholder for course image */}
            <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 relative flex items-center justify-center border-b border-border/50">
              <PlayCircle className="w-12 h-12 text-primary/40 group-hover:scale-110 group-hover:text-primary transition-all duration-300" />
              <div className="absolute top-3 right-3 bg-background/80 backdrop-blur text-foreground text-xs font-bold px-2 py-1 rounded-md border border-border">
                {course.level}
              </div>
            </div>
            
            <div className="p-5 flex flex-col flex-1">
              <div className="flex gap-2 mb-3 flex-wrap">
                {course.tags?.map((tag: string) => (
                  <span key={tag} className="text-[10px] uppercase tracking-wider font-bold bg-muted text-muted-foreground px-2 py-1 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="text-xl font-bold font-display leading-tight mb-2 line-clamp-2">
                <Link to={`/courses/${course._id}`} className="hover:text-primary transition-colors">
                  {course.title}
                </Link>
              </h3>
              <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
                {course.description}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto">
                <div className="flex flex-col">
                  {course.discount > 0 ? (
                    <>
                      <span className="text-xs text-muted-foreground line-through">${course.price}</span>
                      <span className="text-lg font-bold text-primary">${course.salePrice}</span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-foreground">${course.price}</span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Link
                    to={`/courses/${course._id}`}
                    className="p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                    title="View Details & Enrollments"
                  >
                    <BarChart2 className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={() => handleDelete(course._id)}
                    className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive hover:text-white transition-colors"
                    title="Delete Course (Optimistic)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {courses.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
            No courses found. Try adjusting your search filters.
          </div>
        )}
      </div>
    </div>
  );
}
