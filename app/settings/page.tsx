'use client';

import { useUser, useClerk } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { 
  Brain, ArrowLeft, Shield, User, Bell, CreditCard, 
  Settings as SettingsIcon, Zap, ShieldCheck, Key, 
  Trash2, Globe2, ChevronRight, Save
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [activeSection, setActiveSection] = useState("profile");

  const sections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "billing", label: "Subscription", icon: CreditCard },
    { id: "notifications", label: "Alerts", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 overflow-x-hidden relative flex flex-col font-sans">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-50 blur-[120px]" />
      </div>

      <nav className="fixed top-0 w-full z-50 glass-nav h-14">
        <div className="max-w-6xl mx-auto px-6 h-full flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg blue-gradient flex items-center justify-center shadow-md">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">Settings</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-900 px-4 text-[10px] font-bold uppercase tracking-widest">
              <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Back
            </Button>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex-1 pt-24 pb-20 px-6 max-w-5xl mx-auto w-full">
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[8px] font-bold uppercase tracking-widest mb-4">
            <SettingsIcon className="w-2.5 h-2.5" />
            <span>Preferences</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 uppercase tracking-tight italic mb-2">
            System <span className="text-blue-600">Config</span>
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                  activeSection === section.id 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                    : 'hover:bg-slate-50 text-slate-500 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <section.icon className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{section.label}</span>
                </div>
                <ChevronRight className={`w-3 h-3 transition-transform ${activeSection === section.id ? 'translate-x-0' : '-translate-x-2 opacity-0'}`} />
              </button>
            ))}
            <div className="pt-6">
              <button onClick={() => signOut()} className="w-full flex items-center gap-3 p-4 rounded-xl text-rose-500 hover:bg-rose-50 transition-all">
                <Trash2 className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Sign Out</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-8">
            <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
              {activeSection === 'profile' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <img src={user?.imageUrl} alt="Subject" className="w-16 h-16 rounded-xl border border-slate-200" />
                    <div>
                      <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">Subject Metadata</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {user?.id.slice(-8)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                      <Input value={user?.fullName || ""} readOnly className="rounded-lg border-slate-200 text-xs font-bold py-5 px-4 opacity-60" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Email Link</label>
                      <Input value={user?.primaryEmailAddress?.emailAddress || ""} readOnly className="rounded-lg border-slate-200 text-xs font-bold py-5 px-4 opacity-60" />
                    </div>
                  </div>
                  <div className="pt-6 border-t border-slate-100">
                    <Button className="blue-gradient text-white px-8 py-5 h-auto rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/10">Commit Changes</Button>
                  </div>
                </div>
              )}
              {activeSection !== 'profile' && (
                <div className="py-12 text-center">
                  <SettingsIcon className="w-8 h-8 text-slate-200 mx-auto mb-4" />
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sub-system integration pending...</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
