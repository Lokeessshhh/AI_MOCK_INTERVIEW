'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { shareLinkAPI } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Clock, ShieldCheck, Sparkles } from 'lucide-react';

type ShareLinkPublic = {
  token: string;
  role: string;
  job_description: string;
  experience: string;
  difficulty: string;
  expires_at: string | null;
  is_active: boolean;
  is_expired?: boolean;
};

export default function PublicInterviewLinkPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isSignedIn } = useUser();

  const token = (params.token as string) || '';

  const [link, setLink] = useState<ShareLinkPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const expiresText = useMemo(() => {
    if (!link?.expires_at) return 'No expiry';
    const d = new Date(link.expires_at);
    if (Number.isNaN(d.getTime())) return 'No expiry';
    return d.toLocaleString();
  }, [link?.expires_at]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await shareLinkAPI.publicGet(token);
        setLink(res as any);
      } catch (e: any) {
        setError(e?.message || 'Link not found or expired.');
        setLink(null);
      } finally {
        setLoading(false);
      }
    };

    if (token) void run();
  }, [token]);

  const start = async () => {
    if (!token) return;

    if (!isSignedIn) {
      const returnUrl = `/i/${token}`;
      router.push(`/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setStarting(true);
    setError('');

    try {
      const payload = { clerk_user_id: user?.id || '' };
      const res = await shareLinkAPI.publicStart(token, payload);
      const interviewId = (res as any)?.interview_id;
      if (!interviewId) throw new Error('Failed to start interview.');
      router.push(`/interviews/${interviewId}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to start interview.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-50/70 blur-[120px]" />
        <div className="text-center relative z-10">
          <div className="w-12 h-12 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Loading Interview</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-2">Validating link...</p>
        </div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center p-6 font-sans">
        <Card className="w-full max-w-md p-8 rounded-3xl border-slate-200/60 shadow-xl shadow-blue-500/5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-6 h-6 text-slate-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Link unavailable</h1>
          <p className="text-sm text-slate-500 font-medium mt-2">{error || 'This interview link is invalid, disabled, or expired.'}</p>
          <div className="mt-6">
            <Link href="/">
              <Button className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-[0.18em] text-[10px] px-6 h-11">
                Go Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-slate-900 selection:bg-blue-100 font-sans pb-20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-50/60 blur-[100px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-indigo-50/60 blur-[100px]" />
      </div>

      <header className="h-16 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">PrepAI</span>
          </Link>
          <Badge variant="outline" className="bg-blue-50 border-blue-100 text-blue-600 font-bold uppercase tracking-widest text-[10px] px-3 py-1 rounded-full">
            Public Interview
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-12 relative z-10">
        {error && (
          <div className="mb-6 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl p-4">
            {error}
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-[10px] px-3 py-1 mb-4 rounded-full">
            Ready
          </Badge>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{link.role}</h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            {link.experience ? `Experience: ${link.experience}` : 'Experience: Not specified'}
          </p>
        </motion.div>

        <Card className="p-8 rounded-3xl border-slate-200/60 shadow-xl shadow-blue-500/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Difficulty</p>
              <p className="text-sm font-bold text-slate-900 mt-1 uppercase">{link.difficulty}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Expiry</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{expiresText}</p>
            </div>
          </div>

          {link.job_description && (
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Job description</p>
              <div className="p-5 rounded-2xl bg-white border border-slate-200 text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                {link.job_description}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-700">This is a simulated AI interview.</p>
              <p className="text-[11px] text-slate-500 font-medium">Keep your camera/mic ready when asked.</p>
            </div>
          </div>

          <div className="mt-8">
            <Button
              onClick={start}
              disabled={starting}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold uppercase tracking-[0.2em] text-[10px] h-12 shadow-2xl shadow-blue-500/30 active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
            >
              Start Interview
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
