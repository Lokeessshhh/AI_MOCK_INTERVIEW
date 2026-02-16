'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { shareLinkAPI } from '@/lib/api';
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, Sparkles } from 'lucide-react';

type Attempt = {
  id: number;
  clerk_user_id: string;
  job_title: string;
  difficulty: string;
  status: 'pending' | 'in_progress' | 'completed' | string;
  overall_score: number;
  ai_final_score: number;
  ai_review_generated_at?: string | null;
  created_at: string;
};

export default function InterviewerShareLinkAttemptsPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn } = useUser();

  const shareLinkId = params.id as string;

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const counts = useMemo(() => {
    const total = attempts.length;
    const completed = attempts.filter((a) => a.status === 'completed').length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [attempts]);

  useEffect(() => {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(`/interviewer/${shareLinkId}`)}`);
      return;
    }

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await shareLinkAPI.attempts(shareLinkId);
        setAttempts(Array.isArray(data) ? (data as any) : []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load attempts.');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [isSignedIn, router, shareLinkId]);

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-slate-900 selection:bg-blue-100 font-sans pb-20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-50/50 blur-[100px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-indigo-50/50 blur-[100px]" />
      </div>

      <header className="h-16 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/interviewer" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">PrepAI</span>
          </Link>

          <Link href="/interviewer">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 font-semibold text-xs tracking-tight transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Badge variant="outline" className="bg-blue-50 border-blue-100 text-blue-600 font-bold uppercase tracking-widest text-[10px] px-3 py-1 mb-4 rounded-full">
            Attempts
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight">Share Link #{shareLinkId}</h1>
          <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-slate-600">
            <span className="px-3 h-8 rounded-2xl bg-slate-50 border border-slate-200 flex items-center">Attempts: {counts.total}</span>
            <span className="px-3 h-8 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center">Completed: {counts.completed}</span>
            <span className="px-3 h-8 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 flex items-center">Pending: {counts.pending}</span>
          </div>
        </motion.div>

        {error && (
          <div className="mb-6 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl p-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
            <div className="w-10 h-10 border-3 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading attempts...</p>
          </div>
        ) : attempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm font-bold text-slate-900">No attempts yet</p>
            <p className="text-xs text-slate-500 font-medium mt-1">When students start interviews, they will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {attempts.map((a) => {
              const completed = a.status === 'completed';
              const statusLabel = completed ? 'Completed' : 'Pending';
              const statusClass = completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700';
              const score = typeof a.ai_final_score === 'number' && a.ai_final_score > 0 ? a.ai_final_score : a.overall_score;

              return (
                <Card key={a.id} className="p-6 border-slate-200/60 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Attempt</p>
                      <p className="text-lg font-bold text-slate-900 tracking-tight">#{a.id}</p>
                      <p className="text-xs text-slate-500 font-medium mt-1">Started: {new Date(a.created_at).toLocaleString()}</p>
                    </div>
                    <Badge className={`rounded-full border-0 ${statusClass}`}>{statusLabel}</Badge>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Difficulty</p>
                      <p className="text-sm font-bold text-slate-900 mt-1 uppercase">{a.difficulty}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Score</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">{completed ? score.toFixed(2) : '-'}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <Link href={`/interviews/${a.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full rounded-2xl h-10 px-4 text-xs font-bold uppercase tracking-[0.18em]">
                        Open Session
                      </Button>
                    </Link>

                    <Link href={`/interviews/${a.id}/results`} className="flex-1">
                      <Button
                        disabled={!completed}
                        size="sm"
                        className="w-full rounded-2xl h-10 px-4 text-xs font-bold uppercase tracking-[0.18em] bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Full Results
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>

                  {completed && (
                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Completed
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
