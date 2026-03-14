import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground text-center p-4">
      <AlertCircle className="w-20 h-20 text-destructive mb-6" />
      <h1 className="text-5xl font-display font-bold mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Oops! The page you're looking for doesn't exist.</p>
      <Link 
        to="/" 
        className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
