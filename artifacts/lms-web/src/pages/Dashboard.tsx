import React, { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Activity, Users, BookOpen, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    // Fetch Phase 1 health and aggregation endpoints
    api.get('/health').then(res => setHealth(res.data)).catch(console.error);
    api.get('/courses/stats/aggregation').then(res => setStats(res.data?.data)).catch(console.error);
  }, []);

  const totalCourses = stats?.reduce((acc: number, curr: any) => acc + curr.totalCourses, 0) || 0;
  const totalEnrolled = stats?.reduce((acc: number, curr: any) => acc + curr.totalEnrolled, 0) || 0;

  const statCards = [
    { label: 'Total Courses', value: totalCourses, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Enrolled', value: totalEnrolled, icon: Users, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Avg Rating', value: '4.8', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Server Memory', value: health ? `${health.memory.heapUsed}MB` : '...', icon: Activity, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's what's happening today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                <card.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{card.value}</h3>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Aggregation Pipeline Results [4.5] */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold font-display">Course Statistics by Category</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time MongoDB aggregation pipeline results</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-4 font-semibold text-sm text-muted-foreground">Category</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">Courses</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">Avg Price</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {stats?.length > 0 ? stats.map((stat: any) => (
                <tr key={stat._id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-medium capitalize">{stat._id}</td>
                  <td className="p-4 text-muted-foreground">{stat.totalCourses}</td>
                  <td className="p-4 text-muted-foreground">${stat.avgPrice.toFixed(2)}</td>
                  <td className="p-4 font-semibold text-primary">${stat.totalRevenue.toFixed(2)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading aggregation data...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
