'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { fileParseAPI, shareLinkAPI } from '@/lib/api';
import { ArrowLeft, CalendarClock, Copy, Rocket, ShieldCheck, Sparkles } from 'lucide-react';

type ExpiryPreset = '1h' | '24h' | '7d' | 'custom' | 'none';

function addDurationToNow(preset: Exclude<ExpiryPreset, 'custom' | 'none'>): string {
  const now = new Date();
  if (preset === '1h') now.setHours(now.getHours() + 1);
  if (preset === '24h') now.setHours(now.getHours() + 24);
  if (preset === '7d') now.setDate(now.getDate() + 7);
  return now.toISOString();
}

export default function InterviewerCreateLinkPage() {
  const { user, isSignedIn } = useUser();
  const router = useRouter();

  const [form, setForm] = useState({
    role: '',
    experience: '',
    job_description: '',
    difficulty: 'intermediate',
    created_by_email: '',
  });

  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>('24h');
  const [customExpiryLocal, setCustomExpiryLocal] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [error, setError] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  if (!isSignedIn) {
    router.push('/sign-in?redirect_url=%2Finterviewer%2Fcreate');
    return null;
  }

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  const computedExpiresAt = useMemo(() => {
    if (expiryPreset === 'none') return null;
    if (expiryPreset === 'custom') {
      if (!customExpiryLocal) return null;
      const d = new Date(customExpiryLocal);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString();
    }
    return addDurationToNow(expiryPreset);
  }, [customExpiryLocal, expiryPreset]);

  const canSubmit = () => {
    if (!form.role.trim()) return false;
    if (!isSignedIn && !form.created_by_email.trim()) return false;
    if (expiryPreset === 'custom' && !computedExpiresAt) return false;
    return true;
  };

  const handlePdf = async (file: File | null) => {
    if (!file) return;
    setIsParsingPdf(true);
    setError('');
    try {
      const res = await fileParseAPI.parsePdfToText(file);
      const text = (res as any)?.text || '';
      setForm((prev) => ({ ...prev, job_description: text }));
    } catch (err: any) {
      setError(err?.message || 'Failed to parse PDF.');
    } finally {
      setIsParsingPdf(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) return;

    setIsSubmitting(true);
    setError('');
    setCreatedToken(null);

    try {
      const payload = {
        created_by_clerk_user_id: isSignedIn ? (user?.id || '') : undefined,
        created_by_email: !isSignedIn ? form.created_by_email.trim() : (user?.primaryEmailAddress?.emailAddress || ''),
        role: form.role.trim(),
        experience: form.experience.trim(),
        job_description: form.job_description.trim(),
        difficulty: form.difficulty,
        expires_at: computedExpiresAt,
        is_active: true,
      };

      const res = await shareLinkAPI.create(payload);
      const token = (res as any)?.token as string | undefined;
      if (!token) throw new Error('Link created but token was missing.');
      setCreatedToken(token);
    } catch (err: any) {
      setError(err?.message || 'Failed to create share link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareUrl = createdToken ? `${baseUrl}/i/${createdToken}` : '';

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-slate-900 selection:bg-blue-100 relative flex flex-col font-sans pb-20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-50/50 blur-[100px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] rounded-full bg-indigo-50/50 blur-[100px]" />
      </div>

      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 h-16">
        <div className="max-w-7xl mx-auto px-6 h-full flex justify-between items-center">
          <Link href="/interviewer" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Interviewer</span>
          </Link>
          <Link href="/interviewer">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 font-semibold text-xs tracking-tight transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex-1 pt-28 px-6 max-w-3xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <Badge variant="outline" className="bg-blue-50 border-blue-100 text-blue-600 font-bold uppercase tracking-widest text-[10px] px-3 py-1 mb-4 rounded-full">
            Create Public Link
          </Badge>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Share an AI interview with students</h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Configure the role, description and experience tier. Choose an expiry time and generate a link.
          </p>
        </motion.div>

        {error && (
          <div className="mb-6 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl p-4">
            {error}
          </div>
        )}

        <Card className="bg-white rounded-3xl p-8 border-slate-200/60 shadow-xl shadow-blue-500/5">
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">Job description (PDF)</p>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => void handlePdf(e.target.files?.[0] || null)}
                  className="rounded-2xl border-slate-200 h-12 text-sm font-semibold px-5 focus:ring-4 focus:ring-blue-500/5 transition-all file:mr-4 file:py-0 file:h-8 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:transition-colors cursor-pointer flex items-center"
                />
                <div className="h-12 px-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  {isParsingPdf ? 'Parsing…' : 'Optional'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">Role</p>
              <Input
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                placeholder="e.g. Frontend Developer"
                className="rounded-2xl border-slate-200 h-12 text-sm font-semibold px-5 focus:ring-4 focus:ring-blue-500/5 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">Experience</p>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1">Experience</label>
              <Input
                value={form.experience}
                onChange={(e) => setForm((p) => ({ ...p, experience: e.target.value }))}
                placeholder="e.g. 0-1 years / 2-3 years / Fresher"
                className="rounded-2xl border-slate-200 h-12 text-sm font-semibold px-5 focus:ring-4 focus:ring-blue-500/5 transition-all"
              />
            </div>

            {!isSignedIn && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1">Your email (for management)</label>
                <Input
                  value={form.created_by_email}
                  onChange={(e) => setForm((p) => ({ ...p, created_by_email: e.target.value }))}
                  placeholder="you@company.com"
                  className="rounded-2xl border-slate-200 h-12 text-sm font-semibold px-5 focus:ring-4 focus:ring-blue-500/5 transition-all"
                  required
                />
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1">Job Description</label>
              <textarea
                value={form.job_description}
                onChange={(e) => setForm((p) => ({ ...p, job_description: e.target.value }))}
                placeholder="Paste your JD here (optional but recommended)..."
                className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all min-h-[140px] resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Difficulty
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['beginner', 'intermediate', 'advanced'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, difficulty: l }))}
                    className={`py-3 rounded-2xl border text-[10px] font-bold uppercase tracking-[0.15em] transition-all ${
                      form.difficulty === l
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                <CalendarClock className="w-3.5 h-3.5" /> Expiry
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {([
                  { k: '1h', label: '1 hour' },
                  { k: '24h', label: '24 hours' },
                  { k: '7d', label: '7 days' },
                  { k: 'custom', label: 'Custom' },
                  { k: 'none', label: 'No expiry' },
                ] as const).map((p) => (
                  <button
                    key={p.k}
                    type="button"
                    onClick={() => setExpiryPreset(p.k)}
                    className={`h-10 rounded-2xl border text-[10px] font-bold uppercase tracking-[0.15em] transition-all ${
                      expiryPreset === p.k
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {expiryPreset === 'custom' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">Choose a date & time</p>
                  <Input
                    type="datetime-local"
                    value={customExpiryLocal}
                    onChange={(e) => setCustomExpiryLocal(e.target.value)}
                    className="rounded-2xl border-slate-200 h-12 text-sm font-semibold px-5 focus:ring-4 focus:ring-blue-500/5 transition-all"
                    required
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-500 font-medium">
                {computedExpiresAt ? `Expires at: ${new Date(computedExpiresAt).toLocaleString()}` : 'Expires at: Never'}
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/interviewer')}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest px-6 h-11 rounded-xl transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit() || isSubmitting}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold uppercase tracking-[0.2em] text-[10px] px-8 h-11 shadow-2xl shadow-blue-500/30 active:scale-[0.97] transition-all flex items-center gap-3 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <span className="relative z-10">Generate Link</span>
                <Rocket className="w-3.5 h-3.5 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </Button>
            </div>
          </form>
        </Card>

        {createdToken && (
          <Card className="mt-6 p-6 border-slate-200/60 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Your link</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 px-4 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center text-xs font-semibold text-slate-700 truncate">
                {shareUrl}
              </div>
              <Button
                onClick={() => copy(shareUrl)}
                className="w-11 h-11 p-0 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center"
                title="Copy"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
