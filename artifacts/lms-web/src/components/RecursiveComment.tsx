import React, { useState } from 'react';
import { MessageSquare, CornerDownRight, ThumbsUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CommentData {
  id: string;
  author: string;
  text: string;
  likes: number;
  timestamp: string;
  replies: CommentData[];
}

interface RecursiveCommentProps {
  comment: CommentData;
  depth?: number;
  onReplyAdd: (parentId: string, text: string) => void;
}

// [1.4] Dynamic Recursive Comment System
export function RecursiveComment({ comment, depth = 0, onReplyAdd }: RecursiveCommentProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(true);

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onReplyAdd(comment.id, replyText);
    setReplyText('');
    setIsReplying(false);
    setShowReplies(true);
  };

  return (
    <div className={`mt-4 ${depth > 0 ? 'ml-4 md:ml-8 border-l-2 border-border/50 pl-4' : ''}`}>
      <div className="bg-card rounded-xl p-4 shadow-sm border border-border/30 hover:border-border transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-primary">{comment.author}</span>
          <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
        </div>
        <p className="text-foreground/90 text-sm leading-relaxed mb-3">{comment.text}</p>
        
        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <ThumbsUp className="w-3.5 h-3.5" />
            {comment.likes}
          </button>
          <button 
            onClick={() => setIsReplying(!isReplying)}
            className="flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Reply
          </button>
          
          {comment.replies.length > 0 && (
            <button 
              onClick={() => setShowReplies(!showReplies)}
              className="hover:text-foreground transition-colors ml-auto"
            >
              {showReplies ? 'Hide' : 'Show'} Replies ({comment.replies.length})
            </button>
          )}
        </div>

        <AnimatePresence>
          {isReplying && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
              onSubmit={handleReplySubmit}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
                  autoFocus
                />
                <button 
                  type="submit"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Post
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showReplies && comment.replies.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {comment.replies.map(reply => (
              <RecursiveComment 
                key={reply.id} 
                comment={reply} 
                depth={depth + 1} 
                onReplyAdd={onReplyAdd} 
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
