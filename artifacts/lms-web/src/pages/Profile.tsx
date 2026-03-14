import React, { useState, useEffect } from 'react';
import { Trophy, Star, Shield, Award } from 'lucide-react';

// [1.1] Identity Profile with useState for Rank calculation
export default function Profile() {
  const [points, setPoints] = useState(45); // Start with Bronze

  // Rank calculation based on university requirement
  const getRank = (pts: number) => {
    if (pts < 50) return { name: 'Bronze', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/50', img: 'bronze-badge.png' };
    if (pts <= 80) return { name: 'Silver', color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/50', img: 'silver-badge.png' };
    return { name: 'Gold', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50', img: 'gold-badge.png' };
  };

  const rank = getRank(points);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Identity Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your platform reputation and progress.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Identity Card */}
        <div className={`md:col-span-2 bg-card rounded-3xl p-8 border-2 ${rank.border} shadow-xl relative overflow-hidden transition-all duration-500`}>
          {/* Decorative background glow based on rank */}
          <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl ${rank.bg} opacity-50 pointer-events-none`}></div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
            <img 
              src={`${import.meta.env.BASE_URL}images/${rank.img}`} 
              alt={`${rank.name} Badge`} 
              className="w-32 h-32 drop-shadow-2xl animate-in zoom-in duration-700"
            />
            
            <div className="text-center md:text-left flex-1">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 ${rank.bg} ${rank.color}`}>
                <Trophy className="w-3.5 h-3.5" /> {rank.name} Rank
              </div>
              <h2 className="text-3xl font-bold font-display mb-1">Admin User</h2>
              <p className="text-muted-foreground mb-6">admin@lms.com</p>
              
              <div className="bg-background/80 backdrop-blur rounded-2xl p-4 border border-border/50">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Reputation Points</span>
                  <span className="text-2xl font-bold font-display text-foreground">{points}</span>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${rank.bg.replace('/10', '')}`}
                    style={{ width: `${Math.min((points / 100) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2 text-xs font-medium text-muted-foreground">
                  <span>0 (Bronze)</span>
                  <span>50 (Silver)</span>
                  <span>80 (Gold)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Controls */}
        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col justify-center">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Simulate Actions</h3>
          <p className="text-sm text-muted-foreground mb-6">Complete actions to earn points and rank up.</p>
          
          <div className="space-y-3">
            <button 
              onClick={() => setPoints(p => p + 10)}
              className="w-full bg-background border border-border hover:border-primary/50 text-foreground px-4 py-3 rounded-xl flex items-center justify-between transition-colors text-sm font-medium"
            >
              <span>Complete Course</span>
              <span className="text-green-500 font-bold">+10 pts</span>
            </button>
            <button 
              onClick={() => setPoints(p => p + 5)}
              className="w-full bg-background border border-border hover:border-primary/50 text-foreground px-4 py-3 rounded-xl flex items-center justify-between transition-colors text-sm font-medium"
            >
              <span>Leave Review</span>
              <span className="text-green-500 font-bold">+5 pts</span>
            </button>
            <button 
              onClick={() => setPoints(45)}
              className="w-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white px-4 py-3 rounded-xl transition-colors text-sm font-bold mt-4"
            >
              Reset to Bronze
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Settings(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
}
