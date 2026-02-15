import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

export function Card({ children, className, gradient = false }: CardProps) {
  if (gradient) {
    return (
      <div className="gradient-border">
        <div className={cn('p-6', className)}>{children}</div>
      </div>
    );
  }
  
  return (
    <div
      className={cn(
        'bg-white rounded-2xl shadow-lg shadow-slate-200/50',
        'border border-slate-200',
        className
      )}
    >
      {children}
    </div>
  );
}
