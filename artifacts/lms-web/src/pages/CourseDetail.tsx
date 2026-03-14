import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import {
  Star, ArrowLeft, MessageSquare, User,
  ThumbsUp, BarChart2, RefreshCw,
} from 'lucide-react';
import { RecursiveComment, CommentData } from '@/components/RecursiveComment';

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sz = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`${sz} ${s <= Math.round(rating) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

function RatingBreakdown({ reviews }: { reviews: any[] }) {
  const counts = [5, 4, 3, 2, 1].map(r => ({
    star: r,
    count: reviews.filter(rv => rv.rating === r).length,
  }));
  const max = Math.max(...counts.map(c => c.count), 1);
  return (
    <div className="space-y-2">
      {counts.map(({ star, count }) => (
        <div key={star} className="flex items-center gap-2 text-sm">
          <span className="w-4 text-right text-muted-foreground">{star}</span>
          <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="w-5 text-muted-foreground text-xs">{count}</span>
        </div>
      ))}
    </div>
  );
}

export default function CourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [comments, setComments] = useState<CommentData[]>([
    {
      id: 'c1',
      author: 'Jane Doe',
      text: 'Is the API gateway section included?',
      likes: 12,
      timestamp: '2 days ago',
      replies: [
        { id: 'c1r1', author: 'Instructor', text: 'Yes, it is covered in section 3.', likes: 5, timestamp: '1 day ago', replies: [] },
      ],
    },
  ]);

  useEffect(() => {
    if (!id) return;
    api.get(`/courses/${id}`)
      .then(res => setCourse(res.data.data))
      .catch(() => toast.error('Failed to load course'));
    fetchReviews();
  }, [id]);

  const fetchReviews = async () => {
    if (!id) return;
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const res = await api.get(`/courses/${id}/reviews`);
      setReviews(res.data.data);
    } catch (err: any) {
      setReviewsError(err.response?.data?.message || 'Failed to load reviews');
    } finally {
      setReviewsLoading(false);
    }
  };

  const addReplyToTree = (nodes: CommentData[], parentId: string, newReply: CommentData): CommentData[] =>
    nodes.map(node => {
      if (node.id === parentId) return { ...node, replies: [...node.replies, newReply] };
      if (node.replies.length > 0) return { ...node, replies: addReplyToTree(node.replies, parentId, newReply) };
      return node;
    });

  const handleAddReply = (parentId: string, text: string) => {
    const newReply: CommentData = {
      id: Math.random().toString(),
      author: 'You (Instructor)',
      text,
      likes: 0,
      timestamp: 'Just now',
      replies: [],
    };
    setComments(prev => addReplyToTree(prev, parentId, newReply));
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  if (!course) return (
    <div className="p-8 space-y-4 animate-pulse">
      <div className="h-8 bg-muted rounded w-1/3" />
      <div className="h-40 bg-muted rounded-2xl" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
      <Link to="/courses" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      {/* Course Info Card */}
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
            <p className="text-2xl font-bold">${course.salePrice || course.price}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Enrolled</p>
            <p className="text-2xl font-bold">{course.enrolledCount} / {course.seats}</p>
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
            <p className="text-lg font-medium">{course.instructor?.name || 'Unknown'}</p>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Q&A Recursive Comments */}
        <div className="bg-card p-6 rounded-3xl border border-border">
          <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" /> Course Q&A
          </h2>
          <div className="space-y-2">
            {comments.map(comment => (
              <RecursiveComment key={comment.id} comment={comment} onReplyAdd={handleAddReply} />
            ))}
          </div>
        </div>

        {/* Student Reviews Panel (read-only for admin/instructor) */}
        <div className="bg-card p-6 rounded-3xl border border-border space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-display flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-amber-500" /> Student Reviews
            </h2>
            <button
              onClick={fetchReviews}
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Refresh reviews"
            >
              <RefreshCw className={`w-4 h-4 ${reviewsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Summary */}
          {reviews.length > 0 && (
            <div className="flex items-center gap-6 p-4 bg-background/60 rounded-2xl border border-border/50">
              <div className="text-center">
                <p className="text-4xl font-bold text-amber-500">{avgRating}</p>
                <StarRow rating={parseFloat(avgRating!)} size="sm" />
                <p className="text-xs text-muted-foreground mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex-1">
                <RatingBreakdown reviews={reviews} />
              </div>
            </div>
          )}

          {/* Error */}
          {reviewsError && (
            <div className="text-center py-6 text-destructive text-sm">
              {reviewsError}
              <button onClick={fetchReviews} className="ml-2 underline">Retry</button>
            </div>
          )}

          {/* Loading */}
          {reviewsLoading && !reviewsError && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex gap-3 p-3 rounded-xl bg-muted/40">
                  <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reviews list */}
          {!reviewsLoading && !reviewsError && reviews.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-semibold">No reviews yet</p>
              <p className="text-sm">Students can submit reviews from the mobile app</p>
            </div>
          )}

          {!reviewsLoading && reviews.length > 0 && (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {reviews.map((review: any, idx: number) => {
                const author = review.user?.name || 'Anonymous';
                const initials = author.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={review._id || idx} className="p-3 bg-background/60 rounded-2xl border border-border/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{author}</p>
                        <p className="text-xs text-muted-foreground">{review.user?.email || ''}</p>
                      </div>
                      <StarRow rating={review.rating} />
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground pl-10">{review.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground pl-10">
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
