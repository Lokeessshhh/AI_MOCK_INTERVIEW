'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, FileText, Upload, Check, Loader2, Brain, 
  ArrowLeft, Sparkles, Target, Zap, ShieldCheck, 
  ChevronRight, Info, AlertCircle, Settings2, Database, Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { interviewAPI } from '@/lib/api';

type Method = 'job-details' | 'resume';

export default function NewInterviewPage() {
  const [method, setMethod] = useState<Method | null>(null);
  const [formData, setFormData] = useState({
    jobTitle: '',
    jobDescription: '',
    skills: '',
    difficulty: 'intermediate',
    resume: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const router = useRouter();
  const { userId } = useAuth();

  const [parsedResume, setParsedResume] = useState<string | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);

  const handleResumeUpload = async (file: File) => {
    setIsParsingResume(true);
    setError('');
    try {
      const result = await interviewAPI.parseResume(file);
      setParsedResume(result.text);
    } catch (err) {
      console.error('Error parsing resume:', err);
      setError('System encountered an error parsing the resume stream.');
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError('Subject identification required for initialization.');
      return;
    }
    setIsSubmitting(true);
    setProgress(0);
    setError('');

    try {
      setProgress(30);
      const interviewData: Parameters<typeof interviewAPI.create>[0] = {
        job_title: formData.jobTitle || 'Standard Evaluation Session',
        difficulty: formData.difficulty,
        clerk_user_id: userId,
      };

      if (method === 'resume' && parsedResume) {
        interviewData.resume_text = parsedResume;
      } else {
        interviewData.job_description = formData.jobDescription;
        interviewData.skills = formData.skills;
      }

      setProgress(60);
      const result = await interviewAPI.create(interviewData);
      setProgress(100);
      router.push(`/interviews/${result.id}`);
    } catch (err) {
      console.error('Error creating interview:', err);
      setError('Simulation protocol initialization failed.');
      setIsSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-slate-900 selection:bg-blue-100 relative flex flex-col font-sans">
      {/* Background Intelligence Accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-50/50 blur-[100px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] rounded-full bg-indigo-50/50 blur-[100px]" />
      </div>

      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 h-16">
        <div className="max-w-7xl mx-auto px-6 h-full flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">PrepAI</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 font-semibold text-xs tracking-tight transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel Setup
            </Button>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex-1 pt-32 pb-20 px-6 max-w-4xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <Badge variant="outline" className="bg-blue-50 border-blue-100 text-blue-600 font-bold uppercase tracking-widest text-[10px] px-3 py-1 mb-4 rounded-full">
            Simulation Setup
          </Badge>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight leading-tight">
            Configure <span className="text-blue-600">Interview</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">Select your preferred initialization method to start the simulation.</p>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-8 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-semibold flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0" /> {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!method ? (
            <motion.div key="methods" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid md:grid-cols-2 gap-6">
              <div onClick={() => setMethod('job-details')} className="cursor-pointer">
                <Card className="group p-10 border-slate-200/60 hover:border-blue-400/50 transition-all shadow-sm hover:shadow-xl hover:shadow-blue-500/5 relative overflow-hidden bg-white h-full">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform">
                    <Settings2 className="w-24 h-24 text-slate-900" />
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-8 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                    <Briefcase className="w-7 h-7 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Manual Configuration</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">Input job title, description, and key skills to build a tailored simulation.</p>
                  <div className="mt-8 flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    Initialize Protocol <ChevronRight className="w-3 h-3" />
                  </div>
                </Card>
              </div>

              <div onClick={() => setMethod('resume')} className="cursor-pointer">
                <Card className="group p-10 border-slate-200/60 hover:border-blue-400/50 transition-all shadow-sm hover:shadow-xl hover:shadow-blue-500/5 relative overflow-hidden bg-white h-full">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform">
                    <Database className="w-24 h-24 text-slate-900" />
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-8 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                    <Upload className="w-7 h-7 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Resume Synchronization</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">Upload your professional resume to generate questions based on your background.</p>
                  <div className="mt-8 flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    Sync Data <ChevronRight className="w-3 h-3" />
                  </div>
                </Card>
              </div>
            </motion.div>
          ) : isSubmitting ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-blue-500/5 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-50">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-blue-600" />
              </div>
              <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
                <Rocket className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Initializing Protocol</h2>
              <p className="text-slate-400 text-sm font-medium">Calibrating simulation parameters... {progress}%</p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="bg-white rounded-3xl p-10 border-slate-200/60 shadow-xl shadow-blue-500/5">
                <form onSubmit={handleSubmit} className="space-y-10">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" /> Targeted Role
                      </label>
                      <Input 
                        placeholder="e.g. Senior Machine Learning Engineer" 
                        value={formData.jobTitle} 
                        onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })} 
                        className="rounded-2xl border-slate-200 h-14 text-sm font-semibold px-6 focus:ring-4 focus:ring-blue-500/5 transition-all" 
                        required 
                      />
                    </div>

                    {method === 'job-details' ? (
                      <>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" /> Role Context
                          </label>
                          <textarea 
                            placeholder="Describe the role's responsibilities and requirements..." 
                            value={formData.jobDescription} 
                            onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })} 
                            className="w-full bg-white border border-slate-200 rounded-2xl p-6 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 transition-all min-h-[140px] resize-none leading-relaxed" 
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5" /> Core Competencies
                          </label>
                          <Input 
                            placeholder="e.g. Python, PyTorch, SQL, RAG (Comma separated)" 
                            value={formData.skills} 
                            onChange={(e) => setFormData({ ...formData, skills: e.target.value })} 
                            className="rounded-2xl border-slate-200 h-14 text-sm font-semibold px-6 focus:ring-4 focus:ring-blue-500/5 transition-all" 
                            required 
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                          <Database className="w-3.5 h-3.5" /> Data Source
                        </label>
                        <div onClick={() => !isParsingResume && document.getElementById('res')?.click()} className={`border-2 border-dashed rounded-3xl py-16 text-center cursor-pointer transition-all relative group overflow-hidden ${formData.resume ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50/50 border-slate-200 hover:border-blue-400/50'}`}>
                          {isParsingResume && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Parsing Stream...</p>
                            </div>
                          )}
                          <div className={`w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center transition-all ${formData.resume ? 'bg-emerald-100' : 'bg-white shadow-sm'}`}>
                            <Upload className={`w-8 h-8 transition-colors ${formData.resume ? 'text-emerald-600' : 'text-slate-300 group-hover:text-blue-500'}`} />
                          </div>
                          <p className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-2">{formData.resume ? formData.resume.name : 'Click to upload PDF resume'}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Intelligence will be extracted automatically.</p>
                          <input id="res" type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFormData({...formData, resume: f}); handleResumeUpload(f); } }} />
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5" /> Complexity Tier
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {['beginner', 'intermediate', 'advanced'].map(l => (
                          <button 
                            key={l} 
                            type="button" 
                            onClick={() => setFormData({...formData, difficulty: l})} 
                            className={`py-4 rounded-2xl border text-[10px] font-bold uppercase tracking-[0.15em] transition-all ${
                              formData.difficulty === l 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-slate-100 flex justify-between items-center">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setMethod(null)} 
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest px-6 h-12 rounded-xl transition-colors"
                    >
                      Revert Method
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={method === 'resume' && (!parsedResume || isParsingResume)} 
                      className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold uppercase tracking-[0.2em] text-[10px] px-8 h-12 shadow-2xl shadow-blue-500/30 active:scale-[0.97] transition-all flex items-center gap-3 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      <span className="relative z-10">Initialize Simulation</span>
                      <Rocket className="w-3.5 h-3.5 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
