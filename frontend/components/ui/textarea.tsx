import React from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          'w-full px-4 py-3 rounded-xl border-2 border-slate-200',
          'bg-white text-slate-900',
          'focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20',
          'transition-all duration-300 resize-none',
          error && 'border-red-500 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
