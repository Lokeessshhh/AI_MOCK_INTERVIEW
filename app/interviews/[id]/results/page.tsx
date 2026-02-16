'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, ArrowLeft, Award, CheckCircle, XCircle, TrendingUp,
  Star, Sparkles, Target, Zap, RotateCcw, Trash2, 
  FileText, ShieldCheck, Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { interviewAPI } from '@/lib/api';

interface ResultsData {
  interview: {
    id: number;
    job_title: string;
    difficulty: string;
    status: string;
    overall_score: number;
    ai_final_score?: number;
    ai_review_generated_at?: string | null;
    ai_review?: any;
    created_at: string;
  };
  questions: Array<{
    id: number;
    question_text: string;
    question_type: string;
    order: number;
    answer: {
      answer_text: string;
      feedback: string;
      score: number;
    } | null;
    ai_answer?: string;
    strategy_to_improve?: string;
    improvements_needed?: string[];
    ai_score?: number;
  }>;
  summary: {
    total_questions: number;
    total_answered: number;
    average_score: number;
  };
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;
  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [cardDirection, setCardDirection] = useState<1 | -1>(1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (!pollRef.current) return;
    clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const data = await interviewAPI.results(interviewId);
        setResults(data);
        const review = data?.interview?.ai_review;
        if (review && (review.status === 'completed' || review.error)) {
          stopPolling();
          setAiReviewLoading(false);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  }, [interviewId, stopPolling]);

  const fetchResults = useCallback(async () => {
    try {
      const data = await interviewAPI.results(interviewId);
      setResults(data);

      const review = data?.interview?.ai_review;
      const isProcessing = review?.status === 'processing';
      const isCompleted = review?.status === 'completed';
      const hasError = review?.error;

      if (isCompleted || hasError) {
        setAiReviewLoading(false);
        stopPolling();
      } else if (isProcessing) {
        setAiReviewLoading(true);
        startPolling();
      }
    } catch (err) {
      console.error('Error fetching results:', err);
      setError('Failed to load performance data.');
    } finally {
      setLoading(false);
    }
  }, [interviewId, startPolling, stopPolling]);

  useEffect(() => {
    fetchResults();
    router.prefetch('/dashboard');
    router.prefetch(`/interviews/${interviewId}`);
    router.prefetch(`/interviews/${interviewId}/results`);
    return () => {
      stopPolling();
    };
  }, [fetchResults, interviewId, router, stopPolling]);

  useEffect(() => {
    if (results?.interview?.id) {
      setActiveCard(0);
      setCardDirection(1);
    }
  }, [results?.interview?.id]);

  const handleReattempt = useCallback(async () => {
    try {
      await interviewAPI.reattempt(interviewId);
      router.push(`/interviews/${interviewId}`);
    } catch (e) {
      console.error('Error reattempting interview:', e);
      setError('System could not reset simulation.');
    }
  }, [interviewId, router]);

  const handleDelete = useCallback(async () => {
    const ok = window.confirm('Delete this simulation record permanently?');
    if (!ok) return;
    try {
      await interviewAPI.delete(interviewId);
      router.push('/dashboard');
    } catch (e) {
      console.error('Error deleting interview:', e);
      setError('Failed to purge simulation record.');
    }
  }, [interviewId, router]);

  const handleGenerateAiReview = useCallback(async () => {
    try {
      setAiReviewLoading(true);
      setResults((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          interview: {
            ...prev.interview,
            ai_review: { status: 'processing' },
            ai_final_score: 0,
            ai_review_generated_at: null,
          },
        };
      });

      stopPolling();

      startPolling();
      await interviewAPI.evaluateInterview(interviewId, { force: true });
    } catch (e) {
      console.error('Error triggering AI review:', e);
      setAiReviewLoading(false);
      setError('Intelligence synthesis failed.');
    }
  }, [interviewId, startPolling, stopPolling]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-50 blur-[120px]" />
        <div className="text-center relative z-10">
          <div className="w-12 h-12 border-3 border-blue-600/10 border-t-blue-600 rounded-full animate-spin mx-auto mb-6 shadow-sm" />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Accessing Performance Records</h2>
          <p className="text-slate-400 text-xs font-medium mt-2">Retrieving intelligence data from secure servers...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-50 blur-[120px]" />
        <div className="text-center relative z-10">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Protocol Error</h2>
          <p className="text-slate-500 text-sm mt-2 mb-8">{error || 'Intelligence report is currently inaccessible.'}</p>
          <Link href="/dashboard">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl px-8 h-12 shadow-lg transition-all active:scale-95">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { interview, questions, summary } = results;
  
  const scoreColor = (score: number) => {
    if (score >= 7.5) return 'text-emerald-600';
    if (score >= 5) return 'text-blue-600';
    if (score >= 2.5) return 'text-amber-600';
    return 'text-rose-600';
  };

  const scoreBg = (score: number) => {
    if (score >= 7.5) return 'bg-emerald-50 border-emerald-100';
    if (score >= 5) return 'bg-blue-50 border-blue-100';
    if (score >= 2.5) return 'bg-amber-50 border-amber-100';
    return 'bg-rose-50 border-rose-100';
  };

  const overallGrade = () => {
    const avg = typeof interview?.ai_review?.final?.final_score === 'number' ? interview.ai_review.final.final_score : summary.average_score;
    if (avg >= 7.5) return { label: 'Exceptional', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: Award };
    if (avg >= 5) return { label: 'Proficient', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', icon: Target };
    if (avg >= 2.5) return { label: 'Developing', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', icon: TrendingUp };
    return { label: 'Under Review', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100', icon: ShieldCheck };
  };

  const grade = overallGrade();
  const final = interview?.ai_review?.final;
  const sessionScore = (typeof final?.final_score === 'number' ? final.final_score : summary.average_score);
  const sessionLabel = (interview?.ai_review?.status === 'completed' ? 'Review Complete' : grade.label);

  const totalCards = 1 + (questions?.length || 0);
  const isStrategyCard = activeCard === 0;
  const currentQuestion = !isStrategyCard && questions ? questions[activeCard - 1] : null;

  const goNext = () => {
    setCardDirection(1);
    setActiveCard((p) => Math.min(totalCards - 1, p + 1));
  };

  const goPrev = () => {
    setCardDirection(-1);
    setActiveCard((p) => Math.max(0, p - 1));
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-slate-900 selection:bg-blue-100 relative flex flex-col font-sans overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-50/50 blur-[100px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] rounded-full bg-indigo-50/50 blur-[100px]" />
      </div>

      <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">PrepAI</span>
          </Link>
          
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 font-semibold text-[10px] sm:text-xs tracking-tight transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              <span className="hidden xs:inline">Back to Dashboard</span>
              <span className="xs:hidden">Dashboard</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 pt-24 sm:pt-28 pb-12 sm:pb-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <div className="lg:col-span-4 space-y-6 sm:space-y-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="mb-6 sm:mb-8 text-center lg:text-left">
                <Badge variant="outline" className="bg-blue-50 border-blue-100 text-blue-600 font-bold uppercase tracking-[0.2em] text-[9px] sm:text-[10px] px-3 py-1 mb-4 rounded-full">
                  Intelligence Report
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">{interview.job_title}</h1>
                <p className="text-slate-500 text-xs sm:text-sm font-medium mt-2">Performance synthesis for your recent simulation.</p>
              </div>

              <Card className="bg-white rounded-[2rem] p-6 sm:p-8 border-slate-200/60 shadow-sm text-center relative overflow-hidden group">
                <div className={`w-16 h-20 sm:w-20 sm:h-24 rounded-[1.5rem] sm:rounded-[2rem] ${grade.bg} border flex items-center justify-center mx-auto mb-6 shadow-sm relative z-10`}>
                  <grade.icon className={`w-8 h-8 sm:w-10 sm:h-10 ${grade.color}`} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter mb-1">{sessionScore.toFixed(1)}<span className="text-sm text-slate-300 ml-1">/10</span></h2>
                <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] ${grade.color} mb-6`}>{sessionLabel}</p>
                
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-8">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${s <= Math.round(sessionScore/2) ? 'fill-blue-500 text-blue-500' : 'text-slate-200'}`} />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 text-left">
                  <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-100/50">
                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Answered</p>
                    <p className="text-lg sm:text-xl font-black text-slate-900">{summary.total_answered}<span className="text-[10px] text-slate-300 ml-1">/{summary.total_questions}</span></p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-100/50">
                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Difficulty</p>
                    <p className="text-lg sm:text-xl font-black text-slate-900 capitalize">{interview.difficulty.slice(0, 3)}</p>
                  </div>
                </div>
              </Card>

              <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
                <Button
                  onClick={handleGenerateAiReview}
                  disabled={aiReviewLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] sm:text-xs uppercase tracking-widest h-12 sm:h-14 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
                >
                  {aiReviewLoading ? (
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                      <span>Synthesizing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Generate Full Analysis</span>
                    </div>
                  )}
                </Button>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <Button
                    onClick={handleReattempt}
                    variant="outline"
                    className="rounded-xl sm:rounded-2xl h-10 sm:h-12 border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 gap-2 flex items-center justify-center"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="leading-none">Reattempt</span>
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="outline"
                    className="rounded-xl sm:rounded-2xl h-10 sm:h-12 border-rose-200 text-rose-600 font-semibold text-xs sm:text-sm hover:bg-rose-50 gap-2 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="leading-none">Delete</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 px-2 sm:px-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <h2 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400">Review Cards</h2>
                  <div className="h-px w-8 sm:w-16 bg-slate-200/60" />
                </div>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 tabular-nums">
                  {Math.min(activeCard + 1, totalCards)} / {totalCards}
                </p>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isStrategyCard ? 'strategy' : `q-${currentQuestion?.id}`}
                  initial={{ opacity: 0, x: 20 * cardDirection }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 * cardDirection }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  {isStrategyCard ? (
                    <Card className="bg-white rounded-[2rem] border-slate-200/60 p-6 sm:p-8 shadow-sm overflow-hidden relative min-h-[400px] flex flex-col">
                      <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-5 pointer-events-none">
                        <Brain className="w-24 h-24 sm:w-32 sm:h-32 text-blue-600" />
                      </div>

                      <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8 border-b border-slate-100 pb-5 sm:pb-6">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                          Strategic Overview
                        </h2>
                        {typeof final?.final_score === 'number' && (
                          <Badge className={`text-[9px] sm:text-xs font-bold uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 ${scoreBg(final.final_score)} ${scoreColor(final.final_score)} border`}>
                            Score: {final.final_score.toFixed(1)}
                          </Badge>
                        )}
                      </div>

                      {final?.overall_review ? (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
                          <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3 flex items-center gap-2">
                            <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Executive Summary
                          </p>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">{final.overall_review}</p>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
                          <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Overview</p>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                            Full analysis is not available yet. Use the action panel to generate it.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 flex-1">
                        {Array.isArray(final?.key_strengths) && final.key_strengths.length > 0 && (
                          <div className="space-y-3 sm:space-y-4">
                            <p className="text-[8px] sm:text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2 px-1">
                              <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Key Assets
                            </p>
                            <div className="space-y-2">
                              {final.key_strengths.map((s: string, i: number) => (
                                <div key={i} className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-3 flex items-start gap-2.5">
                                  <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                  <span className="text-[10px] sm:text-xs text-slate-600 font-semibold leading-snug">{s}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {Array.isArray(final?.key_gaps) && final.key_gaps.length > 0 && (
                          <div className="space-y-3 sm:space-y-4">
                            <p className="text-[8px] sm:text-[9px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2 px-1">
                              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Growth Gaps
                            </p>
                            <div className="space-y-2">
                              {final.key_gaps.map((g: string, i: number) => (
                                <div key={i} className="bg-amber-50/50 border border-amber-100/50 rounded-xl p-3 flex items-start gap-2.5">
                                  <div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                  <span className="text-[10px] sm:text-xs text-slate-600 font-semibold leading-snug">{g}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : currentQuestion ? (
                    <Card className="bg-white rounded-[2rem] border-slate-200/60 p-6 sm:p-8 shadow-sm min-h-[400px] flex flex-col group">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 mb-6 sm:mb-8 border-b border-slate-50 pb-5 sm:pb-6">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg sm:text-xl font-bold text-slate-300 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all shrink-0">
                          {activeCard}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 border-transparent">
                              {currentQuestion.question_type}
                            </Badge>
                            {typeof currentQuestion.ai_score === 'number' && currentQuestion.answer?.answer_text?.trim() ? (
                              <Badge className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 border ${scoreBg(currentQuestion.ai_score)} ${scoreColor(currentQuestion.ai_score)}`}>
                                Evaluation: {currentQuestion.ai_score.toFixed(1)}
                              </Badge>
                            ) : null}
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight tracking-tight">{currentQuestion.question_text}</h3>
                        </div>
                      </div>

                      <div className="space-y-5 sm:space-y-6 flex-1">
                        <div className="bg-slate-50/50 rounded-2xl p-4 sm:p-6 border border-slate-100">
                          <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3 flex items-center gap-2">
                            <FileText className="w-3 h-3 text-slate-300" /> Subject Response
                          </p>
                          <p className="text-xs sm:text-sm text-slate-600 font-medium italic leading-relaxed">
                            {currentQuestion.answer?.answer_text ? `"${currentQuestion.answer.answer_text}"` : 'No response captured for this sequence.'}
                          </p>
                        </div>

                        {currentQuestion.answer?.answer_text?.trim() && currentQuestion.ai_answer && (
                          <div className="bg-blue-50/30 rounded-2xl p-4 sm:p-6 border border-blue-100/50 relative overflow-hidden">
                            <div className="absolute -top-4 -right-4 opacity-[0.03] pointer-events-none">
                              <Lightbulb className="w-20 h-20 sm:w-24 sm:h-24 text-blue-600" />
                            </div>
                            <p className="text-[8px] sm:text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-2 sm:mb-3 flex items-center gap-2">
                              <Brain className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> AI Solution Path
                            </p>
                            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium relative z-10">{currentQuestion.ai_answer}</p>
                          </div>
                        )}

                        {currentQuestion.answer?.answer_text?.trim() && (currentQuestion.strategy_to_improve || (currentQuestion.improvements_needed && currentQuestion.improvements_needed.length > 0)) ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            {currentQuestion.strategy_to_improve ? (
                              <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                                <p className="text-[8px] sm:text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-2 sm:mb-3 flex items-center gap-2">
                                  <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Strategy
                                </p>
                                <p className="text-[10px] sm:text-xs text-slate-500 font-semibold leading-relaxed">{currentQuestion.strategy_to_improve}</p>
                              </div>
                            ) : null}
                            
                            {currentQuestion.improvements_needed && currentQuestion.improvements_needed.length > 0 ? (
                              <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                                <p className="text-[8px] sm:text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-2 sm:mb-3 flex items-center gap-2">
                                  <Lightbulb className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Tips
                                </p>
                                <div className="space-y-1.5 sm:space-y-2">
                                  {currentQuestion.improvements_needed.map((im, i) => (
                                    <div key={i} className="text-[10px] sm:text-xs text-slate-500 flex items-start gap-2 font-semibold">
                                      <div className="w-1 h-1 rounded-full bg-amber-200 mt-1.5 shrink-0" />
                                      <span>{im}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </Card>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between gap-4 px-1 sm:px-2 pt-2">
                <Button
                  onClick={goPrev}
                  disabled={activeCard === 0}
                  variant="outline"
                  className="rounded-xl sm:rounded-2xl h-10 sm:h-11 px-4 sm:px-5 text-[9px] sm:text-xs font-bold uppercase tracking-[0.15em] sm:tracking-[0.18em]"
                >
                  Back
                </Button>

                <Button
                  onClick={goNext}
                  disabled={activeCard >= totalCards - 1}
                  className="rounded-xl sm:rounded-2xl h-10 sm:h-11 px-5 sm:px-6 text-[9px] sm:text-xs font-bold uppercase tracking-[0.15em] sm:tracking-[0.18em] bg-slate-900 hover:bg-slate-800 text-white"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 sm:py-12 border-t border-slate-200/60 mt-auto text-center px-4">
        <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">PrepAI Performance Intelligence &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
