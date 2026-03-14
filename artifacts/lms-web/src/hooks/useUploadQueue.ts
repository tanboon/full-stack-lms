import { useState, useCallback, useEffect, useRef } from 'react';

export type UploadStatus = 'Pending' | 'Uploading' | 'Done' | 'Failed';

export interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

// [1.5] Async Task Orchestrator (Queue system with max concurrency 2)
export function useUploadQueue(maxConcurrent: number = 2) {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const activeUploads = useRef(0);

  const addFiles = useCallback((files: File[]) => {
    const newItems: UploadItem[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'Pending',
      progress: 0
    }));
    setQueue(prev => [...prev, ...newItems]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<UploadItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const processQueue = useCallback(() => {
    if (activeUploads.current >= maxConcurrent) return;

    setQueue(prev => {
      const pendingItem = prev.find(item => item.status === 'Pending');
      if (!pendingItem) return prev;

      // Start upload
      activeUploads.current += 1;
      
      // Simulate an actual file upload process with progress
      const simulateUpload = async () => {
        updateItem(pendingItem.id, { status: 'Uploading', progress: 0 });
        
        try {
          for (let i = 1; i <= 10; i++) {
            await new Promise(r => setTimeout(r, 400));
            
            // Random chance of failure to demonstrate 'Failed' state
            if (i === 5 && Math.random() > 0.8) {
              throw new Error("Network error during upload");
            }
            
            updateItem(pendingItem.id, { progress: i * 10 });
          }
          updateItem(pendingItem.id, { status: 'Done', progress: 100 });
        } catch (err: any) {
          updateItem(pendingItem.id, { status: 'Failed', error: err.message });
        } finally {
          activeUploads.current -= 1;
          // Trigger next process
          setTimeout(processQueue, 100);
        }
      };

      simulateUpload();
      
      // Return updated state marking it as starting so it's not picked up again immediately
      return prev.map(item => item.id === pendingItem.id ? { ...item, status: 'Uploading' } : item);
    });
  }, [maxConcurrent, updateItem]);

  // Effect to automatically process queue when it changes or an upload finishes
  useEffect(() => {
    processQueue();
  }, [queue, processQueue]);

  return { queue, addFiles, removeFile: (id: string) => setQueue(q => q.filter(i => i.id !== id)) };
}
