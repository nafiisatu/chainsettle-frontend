'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  PackagePlus,
  Lock,
  CheckCircle2,
  FileCheck,
  Coins,
  Truck,
  ShieldAlert,
  Gavel,
} from 'lucide-react';
import { useAuthStore } from '@/lib/hooks/use-auth-store';

export function getTourKey(address: string, role?: string): string {
  const normRole = (role || 'buyer').toLowerCase();
  return `chainsettle_tour_completed_${address}_${normRole}`;
}

export function resetTour(address: string, role?: string) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(getTourKey(address, role));
  }
}

interface StepItem {
  icon: typeof Compass;
  titleKey: string;
  descKey: string;
}

const ROLE_STEPS: Record<string, StepItem[]> = {
  buyer: [
    { icon: PackagePlus, titleKey: 'buyer.step1Title', descKey: 'buyer.step1Desc' },
    { icon: Lock, titleKey: 'buyer.step2Title', descKey: 'buyer.step2Desc' },
    { icon: CheckCircle2, titleKey: 'buyer.step3Title', descKey: 'buyer.step3Desc' },
  ],
  supplier: [
    { icon: FileCheck, titleKey: 'supplier.step1Title', descKey: 'supplier.step1Desc' },
    { icon: Lock, titleKey: 'supplier.step2Title', descKey: 'supplier.step2Desc' },
    { icon: Coins, titleKey: 'supplier.step3Title', descKey: 'supplier.step3Desc' },
  ],
  logistics: [
    { icon: Truck, titleKey: 'logistics.step1Title', descKey: 'logistics.step1Desc' },
    { icon: FileCheck, titleKey: 'logistics.step2Title', descKey: 'logistics.step2Desc' },
    { icon: CheckCircle2, titleKey: 'logistics.step3Title', descKey: 'logistics.step3Desc' },
  ],
  arbiter: [
    { icon: ShieldAlert, titleKey: 'arbiter.step1Title', descKey: 'arbiter.step1Desc' },
    { icon: FileCheck, titleKey: 'arbiter.step2Title', descKey: 'arbiter.step2Desc' },
    { icon: Gavel, titleKey: 'arbiter.step3Title', descKey: 'arbiter.step3Desc' },
  ],
};

export function TourGuide() {
  const t = useTranslations('tour');
  const { address, user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const dialogRef = useRef<HTMLDivElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  const rawRole = (user?.role || 'buyer').toLowerCase();
  const role = ['buyer', 'supplier', 'logistics', 'arbiter'].includes(rawRole)
    ? rawRole
    : 'buyer';

  const steps = ROLE_STEPS[role] || ROLE_STEPS.buyer;
  const totalSteps = steps.length;

  const markTourCompleted = useCallback(() => {
    if (address && typeof window !== 'undefined') {
      localStorage.setItem(getTourKey(address, role), 'true');
    }
    setIsOpen(false);
  }, [address, role]);

  const checkAutoStart = useCallback(() => {
    if (!address || typeof window === 'undefined') return;
    const completed = localStorage.getItem(getTourKey(address, role));
    if (!completed) {
      setCurrentStep(0);
      setIsOpen(true);
    }
  }, [address, role]);

  useEffect(() => {
    checkAutoStart();

    const handleReplay = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };

    window.addEventListener('chainsettle:replay-tour', handleReplay);
    return () => window.removeEventListener('chainsettle:replay-tour', handleReplay);
  }, [checkAutoStart]);

  // Trap focus and support keyboard shortcuts (Escape, ArrowLeft, ArrowRight)
  useEffect(() => {
    if (!isOpen) return;

    // Focus the primary button when step opens
    nextBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        markTourCompleted();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (e.target instanceof HTMLButtonElement) return; // Allow natural button click
        e.preventDefault();
        if (currentStep < totalSteps - 1) {
          setCurrentStep((s) => s + 1);
        } else {
          markTourCompleted();
        }
      } else if (e.key === 'ArrowLeft') {
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        if (currentStep > 0) {
          setCurrentStep((s) => s - 1);
        }
      } else if (e.key === 'Tab') {
        // Simple focus trap
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, totalSteps, markTourCompleted]);

  if (!isOpen) return null;

  const current = steps[currentStep];
  const StepIcon = current.icon;
  const isLast = currentStep === totalSteps - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-step-title"
      aria-describedby="tour-step-desc"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-scale-up"
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand-200" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-100">
              {role.toUpperCase()} WALKTHROUGH
            </span>
          </div>
          <button
            type="button"
            onClick={markTourCompleted}
            className="p-1 rounded-lg text-brand-200 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={t('skip')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 flex-shrink-0">
              <StepIcon className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <p
                className="text-xs font-semibold text-brand-600 mb-0.5"
                aria-live="polite"
              >
                {t('stepCount', { current: currentStep + 1, total: totalSteps })}
              </p>
              <h2
                id="tour-step-title"
                className="text-lg font-bold text-gray-900 leading-snug"
              >
                {t(current.titleKey)}
              </h2>
            </div>
          </div>

          <p
            id="tour-step-desc"
            className="text-sm text-gray-600 leading-relaxed min-h-[4.5rem]"
          >
            {t(current.descKey)}
          </p>

          {/* Stepper Dots */}
          <div
            className="flex items-center justify-center gap-1.5 py-3"
            aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
          >
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'w-6 bg-brand-600'
                    : 'w-1.5 bg-gray-200'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
            <button
              type="button"
              onClick={markTourCompleted}
              className="text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors py-2 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              {t('skip')}
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((s) => s - 1)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  {t('back')}
                </button>
              )}

              <button
                ref={nextBtnRef}
                type="button"
                onClick={() => {
                  if (isLast) {
                    markTourCompleted();
                  } else {
                    setCurrentStep((s) => s + 1);
                  }
                }}
                className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
              >
                <span>{isLast ? t('finish') : t('next')}</span>
                {isLast ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
