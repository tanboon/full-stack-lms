import React, { useRef } from 'react';
import { useUploadQueue } from '@/hooks/useUploadQueue';
import { UploadCloud, FileVideo, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';

// [1.5] File Upload Queue with Max Concurrency 2
export default function UploadManager() {
  const { queue, addFiles, removeFile } = useUploadQueue(2); // Max 2 concurrent
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Done': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Failed': return <AlertCircle className="w-5 h-5 text-destructive" />;
      case 'Uploading': return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"></div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Media Upload Manager</h1>
        <p className="text-muted-foreground mt-1">Global upload queue. Processes maximum 2 files concurrently.</p>
      </div>

      {/* Drag & Drop Zone */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="bg-card border-2 border-dashed border-primary/40 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-primary/5 hover:border-primary transition-all group"
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-2xl font-bold font-display mb-2">Click or drag files to upload</h3>
        <p className="text-muted-foreground max-w-sm">Support for MP4, PDF, and ZIP. Files are automatically queued and processed.</p>
        <input 
          type="file" 
          multiple 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelect}
        />
      </div>

      {/* Queue List */}
      {queue.length > 0 && (
        <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border flex justify-between items-center bg-background/50">
            <h2 className="text-xl font-bold font-display">Active Queue ({queue.length})</h2>
            <div className="text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">
              {queue.filter(q => q.status === 'Uploading').length} / 2 Concurrent
            </div>
          </div>
          
          <div className="divide-y divide-border/50">
            {queue.map(item => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={item.id} 
                className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-muted/10 transition-colors"
              >
                <div className="w-12 h-12 bg-background border border-border rounded-xl flex items-center justify-center shrink-0">
                  <FileVideo className="w-6 h-6 text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-foreground truncate pr-4">{item.file.name}</h4>
                    <div className="flex items-center gap-3 shrink-0">
                      {getStatusIcon(item.status)}
                      <span className="text-sm font-medium w-16 text-right">
                        {item.status === 'Uploading' ? `${item.progress}%` : item.status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        item.status === 'Failed' ? 'bg-destructive' :
                        item.status === 'Done' ? 'bg-green-500' : 'bg-primary'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                  {item.error && <p className="text-xs text-destructive mt-2">{item.error}</p>}
                </div>
                
                <button 
                  onClick={() => removeFile(item.id)}
                  className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
