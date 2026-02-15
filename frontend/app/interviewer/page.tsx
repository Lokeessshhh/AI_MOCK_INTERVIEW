'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { shareLinkAPI } from '@/lib/api';
import { Copy, Link2, RefreshCw, Sparkles, Trash2, Users, Target, ChevronRight } from 'lucide-react';

type ShareLink = {
  id: number;
  token: string;
  role: string;
  job_description: string;
  experience: string;
  difficulty: string;
  expires_at: string | null;
  is_active: boolean;
  is_expired?: boolean;
  attempts_total?: number;
  attempts_completed?: number;
  attempts_pending?: number;
  created_at: string;
};

export default function InterviewerDashboardPage() {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const [createdByEmail, setCreatedByEmail] = useState('');
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await shareLinkAPI.list({
        clerk_user_id: isSignedIn ? (user?.id || '') : undefined,
        created_by_email: !isSignedIn ? createdByEmail.trim() : undefined,
      });
      setLinks(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load interviewer links.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!isSignedIn) return;
    setMutatingId(id);
    setError('');
    try {
      await shareLinkAPI.delete(id, user?.id || '');
      await fetchLinks();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete link.');
    } finally {
      setMutatingId(null);
    }
  };

  const onRegenerate = async (id: number) => {
    if (!isSignedIn) return;
    setMutatingId(id);
    setError('');
    try {
      await shareLinkAPI.regenerate(id, { clerk_user_id: user?.id || '' });
      await fetchLinks();
    } catch (e: any) {
      setError(e?.message || 'Failed to regenerate link.');
    } finally {
      setMutatingId(null);
    }
  };

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/sign-in?redirect_url=%2Finterviewer');
      return;
    }

    void fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, user?.id]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-slate-900 selection:bg-blue-100 font-sans pb-20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-50/50 blur-[100px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-indigo-50/50 blur-[100px]" />
      </div>

      <header className="h-16 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">PrepAI</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/interviewer/create">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-full px-5 h-9 transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                Create Link
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-2 text-center lg:text-left items-center lg:items-end">
          <div>
            <Badge variant="outline" className="bg-blue-50 border-blue-100 text-blue-600 font-bold uppercase tracking-[0.3em] text-[9px] sm:text-[10px] px-4 py-1.5 mb-6 rounded-full mx-auto lg:mx-0">
              Interviewer Console
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">Recruitment <span className="text-blue-600">Intelligence.</span></h1>
            <p className="text-slate-500 text-xs sm:text-sm font-medium mt-2 max-w-2xl mx-auto lg:mx-0">
              Deploy hyper-realistic AI screening protocols and analyze candidate performance with structured data.
            </p>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4 bg-white p-2 sm:p-3 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200/60 shadow-sm w-fit">
            <div className="flex items-center gap-2 sm:gap-3 px-1 sm:px-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Links</p>
                <p className="text-xs sm:text-sm font-black text-slate-900">{links.length}</p>
              </div>
            </div>
            <div className="w-px h-6 sm:h-8 bg-slate-100" />
            <div className="flex items-center gap-2 sm:gap-3 px-1 sm:px-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Attempts</p>
                <p className="text-xs sm:text-sm font-black text-slate-900">
                  {links.reduce((acc, l) => acc + (l.attempts_total || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3"
          >
            <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
              <Trash2 className="w-3 h-3" />
            </div>
            {error}
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Protocol Inventory</h2>
            <div className="h-px w-12 bg-slate-200 hidden sm:block" />
          </div>
          {isSignedIn && (
            <Button variant="ghost" size="sm" onClick={fetchLinks} className="text-slate-500 hover:text-slate-900 text-[10px] font-bold uppercase tracking-widest group">
              <RefreshCw className="w-3.5 h-3.5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
              Refresh Node
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
            <div className="w-10 h-10 border-3 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading links...</p>
          </div>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <Link2 className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm font-bold text-slate-900">No links yet</p>
            <p className="text-xs text-slate-500 font-medium mt-1 mb-6">Create your first AI interview link for students.</p>
            <Link href="/interviewer/create">
              <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-[0.18em] text-[10px] px-6 h-11 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all">
                Create Link
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {links.map((l) => {
              const shareUrl = baseUrl ? `${baseUrl}/i/${l.token}` : `/i/${l.token}`;
              const expired = Boolean(l.is_expired) || (l.expires_at ? new Date(l.expires_at).getTime() <= Date.now() : false);
              const statusLabel = !l.is_active ? 'Disabled' : expired ? 'Expired' : 'Active';
              const statusClass = !l.is_active ? 'bg-slate-100 text-slate-500' : expired ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600';
              const attemptsTotal = typeof l.attempts_total === 'number' ? l.attempts_total : 0;
              const attemptsCompleted = typeof l.attempts_completed === 'number' ? l.attempts_completed : 0;
              const attemptsPending = typeof l.attempts_pending === 'number' ? l.attempts_pending : 0;

              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                >
                  <Card className="p-5 sm:p-8 border-slate-200/60 shadow-sm hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] transition-all bg-white/80 backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-10 transition-opacity pointer-events-none">
                      <Link2 className="w-24 h-24 sm:w-32 sm:h-32 rotate-12" />
                    </div>
                    
                    <div className="flex items-start justify-between gap-4 relative z-10 mb-6 sm:mb-8">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Position</p>
                          <Badge className={`rounded-full border-0 text-[7px] sm:text-[8px] font-black uppercase tracking-widest px-1.5 sm:px-2 ${statusClass}`}>
                            {statusLabel}
                          </Badge>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate group-hover:text-blue-600 transition-colors">{l.role}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-bold mt-1">
                          {l.experience || 'Flexible Experience'}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRegenerate(l.id)}
                          disabled={mutatingId === l.id}
                          className="h-8 w-8 sm:h-10 sm:w-10 p-0 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${mutatingId === l.id ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(l.id)}
                          disabled={mutatingId === l.id}
                          className="h-8 w-8 sm:h-10 sm:w-10 p-0 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-5 sm:space-y-6 relative z-10">
                      <div>
                        <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 sm:mb-3">Public Protocol URL</p>
                        <div className="flex items-center gap-2 group/link">
                          <div className="flex-1 min-w-0 px-3 sm:px-4 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 group-hover/link:border-blue-200 transition-colors flex items-center text-[10px] sm:text-xs font-bold text-slate-600 truncate tabular-nums">
                            {shareUrl}
                          </div>
                          <Button
                            onClick={() => copy(shareUrl)}
                            className="w-10 h-10 sm:w-12 sm:h-12 p-0 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-blue-600 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-slate-900/10 hover:shadow-blue-600/20 shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {[
                          { label: 'Total', value: attemptsTotal, bg: 'bg-slate-50', text: 'text-slate-600' },
                          { label: 'Passed', value: attemptsCompleted, bg: 'bg-emerald-50', text: 'text-emerald-600' },
                          { label: 'Idle', value: attemptsPending, bg: 'bg-amber-50', text: 'text-amber-600' }
                        ].map((stat, idx) => (
                          <div key={idx} className={`${stat.bg} rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-transparent hover:border-slate-200 transition-all text-center sm:text-left`}>
                            <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5 sm:mb-1">{stat.label}</p>
                            <p className="text-base sm:text-lg font-black text-slate-900">{stat.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {l.expires_at ? `Exp: ${new Date(l.expires_at).toLocaleDateString()}` : 'No Expiry'}
                        </p>
                        <Link href={`/interviewer/${l.id}`} className="shrink-0">
                          <Button className="rounded-xl h-8 sm:h-10 px-4 sm:px-6 bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 font-bold text-[8px] sm:text-[10px] uppercase tracking-widest shadow-sm">
                            View Analytics
                            <ChevronRight className="w-3 h-3 ml-1.5 sm:ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
