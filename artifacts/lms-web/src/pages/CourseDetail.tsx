import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Star, ArrowLeft, Send } from 'lucide-react';
import { RecursiveComment, CommentData } from '@/components/RecursiveComment';

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(5, "Comment must be at least 5 characters"),
});

type ReviewForm = z.infer<typeof reviewSchema>;

export default function CourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState<any>(null);
  
  // [1.4] Immutable State for Recursive Comments
  const [comments, setComments] = useState<CommentData[]>([
    {
      id: 'c1', author: 'Jane Doe', text: 'Is the API gateway section included?', likes: 12, timestamp: '2 days ago',
      replies: [
        { id: 'c1r1', author: 'Instructor', text: 'Yes, it is covered in section 3.', likes: 5, timestamp: '1 day ago', replies: [] }
      ]
    }
  ]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5 }
  });

  useEffect(() => {
    if (id) {
      api.get(`/courses/${id}`).then(res => setCourse(res.data.data)).catch(err => toast.error("Failed to load course"));
    }
  }, [id]);

  // [6.1] Course Review Form Submit
  const onSubmitReview = async (data: ReviewForm) => {
    try {
      await api.post(`/courses/${id}/reviews`, data);
      toast.success("Review submitted successfully!");
      reset();
      // Optimistically update local state if needed
    } catch (err) {
      toast.error("Failed to submit review");
    }
  };

  // [1.4] Helper to deeply update immutable comment tree
  const addReplyToTree = (nodes: CommentData[], parentId: string, newReply: CommentData): CommentData[] => {
    return nodes.map(node => {
      if (node.id === parentId) {
        // Use spread to create entirely new objects/arrays
        return { ...node, replies: [...node.replies, newReply] };
      }
      if (node.replies.length > 0) {
        return { ...node, replies: addReplyToTree(node.replies, parentId, newReply) };
      }
      return node;
    });
  };

  const handleAddReply = (parentId: string, text: string) => {
    const newReply: CommentData = {
      id: Math.random().toString(),
      author: 'You (Instructor)',
      text,
      likes: 0,
      timestamp: 'Just now',
      replies: []
    };
    // Immutable state update
    setComments(prev => addReplyToTree(prev, parentId, newReply));
  };

  if (!course) return <div className="p-8 animate-pulse text-muted-foreground">Loading course data...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
      <Link to="/courses" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Library
      </Link>
      
      <div className="bg-card rounded-3xl p-8 border border-border shadow-xl">
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{course.category}</span>
          <span className="bg-accent/20 text-accent px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{course.level}</span>
        </div>
        
        <h1 className="text-4xl font-display font-bold mb-4">{course.title}</h1>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{course.description}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-background/50 rounded-2xl border border-border/50">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Price</p>
            <p className="text-2xl font-bold text-foreground">${course.salePrice || course.price}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Enrolled</p>
            <p className="text-2xl font-bold text-foreground">{course.enrolledCount} / {course.seats}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Rating</p>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-amber-500">{course.averageRating?.toFixed(1) || 'New'}</span>
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Instructor</p>
            <p className="text-lg font-medium text-foreground">{course.instructor?.name || 'Unknown'}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* [1.4] Recursive Comment Section */}
        <div className="bg-card p-6 rounded-3xl border border-border">
          <h2 className="text-2xl font-bold font-display mb-6">Course Q&A</h2>
          <div className="space-y-2">
            {comments.map(comment => (
              <RecursiveComment 
                key={comment.id} 
                comment={comment} 
                onReplyAdd={handleAddReply} 
              />
            ))}
          </div>
        </div>

        {/* [6.1] RHF Review Form */}
        <div className="bg-card p-6 rounded-3xl border border-border h-fit sticky top-24">
          <h2 className="text-2xl font-bold font-display mb-6">Leave a Review</h2>
          <form onSubmit={handleSubmit(onSubmitReview)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rating (1-5)</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(num => (
                  <label key={num} className="cursor-pointer relative">
                    <input type="radio" value={num} {...register('rating', { valueAsNumber: true })} className="peer sr-only" />
                    <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center peer-checked:bg-amber-500 peer-checked:border-amber-500 peer-checked:text-white text-muted-foreground hover:bg-muted transition-all">
                      {num}
                    </div>
                  </label>
                ))}
              </div>
              {errors.rating && <p className="text-destructive text-sm mt-1">{errors.rating.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Your Feedback</label>
              <textarea 
                {...register('comment')}
                rows={4}
                className="w-full bg-background border border-border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="What did you think of this course?"
              />
              {errors.comment && <p className="text-destructive text-sm mt-1">{errors.comment.message}</p>}
            </div>

            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all">
              <Send className="w-4 h-4" /> Submit Review
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
