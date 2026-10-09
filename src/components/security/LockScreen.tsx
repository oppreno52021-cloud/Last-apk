import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Fingerprint, Delete, CheckCircle2, Lock, Clock, LogOut } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { isBiometricsSupported, authenticateWithBiometrics } from '../../utils/biometrics';
import { normalizeArabicNumerals } from '../../utils/calculations';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

interface LockScreenProps {
  onUnlock: () => void;
  savedPasscode?: string;
  biometricEnabled?: boolean;
  pinEnabled?: boolean;
  language?: 'en' | 'ar';
}

export const LockScreen: React.FC<LockScreenProps> = ({
  onUnlock,
  savedPasscode = '123456',
  biometricEnabled = true,
  pinEnabled = true,
  language = 'ar',
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorShake, setErrorShake] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isBiometricChecking, setIsBiometricChecking] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>(() => {
    if (!pinEnabled && biometricEnabled) {
      return language === 'ar' ? 'المس مستشعر البصمة لفتح التطبيق' : 'Touch fingerprint sensor to unlock';
    }
    if (biometricEnabled) {
      return language === 'ar' ? 'أدخل رمز المرور (6 أرقام) أو استخدم البصمة' : 'Enter 6-digit passcode or use biometrics';
    }
    return language === 'ar' ? 'أدخل رمز المرور (6 أرقام) لفتح التطبيق' : 'Enter 6-digit passcode to unlock';
  });

  const hasAutoPromptedRef = useRef(false);
  const targetPasscode = savedPasscode || '123456';

  const handleExitApp = useCallback(() => {
    try {
      if (Capacitor.isNativePlatform()) {
        CapacitorApp.exitApp();
      } else {
        window.close();
      }
    } catch {
      // ignore
    }
  }, []);

  // Countdown timer for brute-force rate-limiting
  useEffect(() => {
    if (lockoutSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setLockoutSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatusMessage(
            biometricEnabled
              ? (language === 'ar' ? 'يمكنك الآن إدخال رمز المرور أو استخدام البصمة' : 'You can now enter passcode or use biometrics')
              : (language === 'ar' ? 'يمكنك الآن إدخال رمز المرور' : 'You can now enter passcode')
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSecondsLeft, biometricEnabled, language]);

  const handleUnlockSuccess = useCallback(() => {
    setIsSuccess(true);
    triggerHaptic('success');
    setFailedAttempts(0);
    setLockoutSecondsLeft(0);
    setStatusMessage(language === 'ar' ? 'تم تأكيد الهوية بنجاح' : 'Authenticated successfully');
    setTimeout(() => {
      onUnlock();
    }, 300);
  }, [language, onUnlock]);

  const [showPinFallback, setShowPinFallback] = useState(false);

  const handleBiometricAuth = useCallback(async () => {
    if (isSuccess) return;
    triggerHaptic('medium');
    setIsBiometricChecking(true);
    setStatusMessage(language === 'ar' ? 'جارٍ المسح بالبصمة...' : 'Scanning biometrics...');

    try {
      const res = await authenticateWithBiometrics();
      setIsBiometricChecking(false);

      if (res.success) {
        handleUnlockSuccess();
      } else if (res.error === 'cancelled_or_denied') {
        // User cancelled or dismissed biometric prompt -> exit app immediately
        triggerHaptic('error');
        handleExitApp();
      } else {
        // Biometric failed or not matched -> exit app immediately
        triggerHaptic('error');
        setTimeout(() => {
          handleExitApp();
        }, 200);
      }
    } catch {
      setIsBiometricChecking(false);
      handleExitApp();
    }
  }, [handleExitApp, handleUnlockSuccess, isSuccess, language]);

  // Auto-prompt biometrics once on mount if enabled
  useEffect(() => {
    if (!biometricEnabled || hasAutoPromptedRef.current) return;
    hasAutoPromptedRef.current = true;

    const timer = setTimeout(() => {
      isBiometricsSupported().then(supported => {
        if (supported) {
          handleBiometricAuth();
        }
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [biometricEnabled, handleBiometricAuth]);

  const handleKeyPress = (digit: string) => {
    if (lockoutSecondsLeft > 0) {
      triggerHaptic('error');
      return;
    }
    if (pin.length >= 6 || isSuccess) return;
    triggerHaptic('light');
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 6) {
      if (newPin === targetPasscode) {
        handleUnlockSuccess();
      } else {
        triggerHaptic('error');
        setErrorShake(true);
        const nextFails = failedAttempts + 1;
        setFailedAttempts(nextFails);

        if (nextFails >= 5) {
          const lockoutTime = nextFails >= 10 ? 300 : 60;
          setLockoutSecondsLeft(lockoutTime);
          setStatusMessage(
            language === 'ar'
              ? `يرجى الانتظار ${lockoutTime} ثانية`
              : `Please wait ${lockoutTime}s`
          );
        } else {
          setStatusMessage(
            language === 'ar'
              ? 'رمز المرور غير صحيح'
              : 'Incorrect passcode'
          );
        }

        setTimeout(() => {
          setPin('');
          setErrorShake(false);
        }, 500);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSuccess || lockoutSecondsLeft > 0) return;
      const normalizedKey = normalizeArabicNumerals(e.key);
      if (/^[0-9]$/.test(normalizedKey)) {
        handleKeyPress(normalizedKey);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isSuccess, targetPasscode, lockoutSecondsLeft]);

  const handleDelete = () => {
    if (lockoutSecondsLeft > 0) return;
    if (pin.length === 0 || isSuccess) return;
    triggerHaptic('light');
    setPin(prev => prev.slice(0, -1));
  };

  const isKeypadDisabled = lockoutSecondsLeft > 0 || isSuccess;

  // Strict Biometric Minimal Mode (Black screen with only App Icon, auto-prompt, exit if not authenticated)
  if (biometricEnabled && !showPinFallback) {
    return (
      <div 
        onClick={() => {
          if (!isBiometricChecking && !isSuccess) {
            handleBiometricAuth();
          }
        }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black text-white select-none cursor-pointer animate-in fade-in duration-150"
      >
        {/* Center: App Icon only with sleek breathing ambient glow */}
        <div className="flex flex-col items-center justify-center -mt-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-blue-500/20 rounded-3xl blur-2xl opacity-60 animate-pulse pointer-events-none" />
            
            <img 
              src="/app-icon.png" 
              alt="Masrofy" 
              className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl shadow-2xl transition-all duration-300 ${
                isSuccess 
                  ? 'scale-105 ring-4 ring-emerald-500/60 shadow-emerald-500/40' 
                  : isBiometricChecking 
                    ? 'scale-100 ring-2 ring-blue-500/40 animate-pulse' 
                    : 'scale-95'
              }`}
            />
          </div>
        </div>

        {/* Bottom Actions: Optional PIN Fallback & Direct Exit Button */}
        <div className="absolute bottom-8 flex flex-col items-center gap-3">
          {pinEnabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPinFallback(true);
              }}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors py-1 px-3 cursor-pointer"
            >
              {language === 'ar' ? 'استخدام رمز المرور (PIN)' : 'Use PIN Passcode'}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleExitApp();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 text-zinc-400 hover:text-rose-400 text-xs font-semibold border border-zinc-800 transition-all cursor-pointer shadow-lg"
          >
            <LogOut size={13} />
            <span>{language === 'ar' ? 'الخروج من التطبيق' : 'Exit App'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-black text-white select-none animate-in fade-in duration-200">
      {/* Top Header & Lock Badge */}
      <div className="w-full pt-6 sm:pt-8 flex flex-col items-center text-center space-y-3">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xl ${
          isSuccess 
            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 scale-105' 
            : lockoutSecondsLeft > 0
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 animate-pulse'
              : 'bg-zinc-900 border border-zinc-800 text-blue-400'
        }`}>
          {isSuccess ? (
            <CheckCircle2 size={32} className="text-emerald-400" />
          ) : lockoutSecondsLeft > 0 ? (
            <Clock size={30} className="text-amber-400" />
          ) : (
            <Lock size={30} />
          )}
        </div>

        <div>
          <p className="text-xs text-zinc-400 mt-1 min-h-[1.25rem] px-2 font-medium">
            {statusMessage}
          </p>
        </div>

        {/* 6-digit PIN Dots or Lockout Badge (Only when PIN lock is enabled) */}
        {pinEnabled && (
          lockoutSecondsLeft > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold animate-in fade-in">
              <Clock size={14} />
              <span>
                {language === 'ar' ? `متبقي ${lockoutSecondsLeft} ثانية` : `${lockoutSecondsLeft}s remaining`}
              </span>
            </div>
          ) : (
            <div className={`flex items-center gap-3 pt-2 ${errorShake ? 'animate-shake' : ''}`}>
              {[0, 1, 2, 3, 4, 5].map(idx => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                    pin.length > idx
                      ? (isSuccess 
                          ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-sm shadow-emerald-400/50' 
                          : errorShake 
                            ? 'bg-rose-500 border-rose-500' 
                            : 'bg-blue-500 border-blue-500 scale-110 shadow-sm shadow-blue-500/50')
                      : 'border-zinc-800 bg-zinc-900/60'
                  }`}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Numeric Keypad (Only when PIN is enabled) */}
      {pinEnabled && (
        <div className="w-full max-w-xs pb-4 space-y-2.5" dir="ltr">
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
            <button
              key={digit}
              type="button"
              disabled={isKeypadDisabled}
              onClick={() => handleKeyPress(digit)}
              className={`h-13 rounded-2xl text-xl font-mono font-bold flex items-center justify-center transition-all select-none border shadow-2xs ${
                isKeypadDisabled
                  ? 'bg-zinc-900/40 text-zinc-600 border-zinc-900 cursor-not-allowed opacity-50'
                  : 'bg-zinc-900 hover:bg-zinc-850 active:bg-blue-600/30 text-white cursor-pointer border-zinc-800 active:scale-95'
              }`}
            >
              {digit}
            </button>
          ))}
          
          {/* Bottom Row: Return to Biometric Icon if available, 0, Backspace */}
          <button
            type="button"
            onClick={() => {
              if (biometricEnabled) {
                setShowPinFallback(false);
                handleBiometricAuth();
              }
            }}
            disabled={!biometricEnabled || isSuccess}
            className={`h-13 rounded-2xl flex items-center justify-center transition-all cursor-pointer border select-none active:scale-95 ${
              biometricEnabled 
                ? 'bg-zinc-900 hover:bg-zinc-850 text-blue-400 border-zinc-800' 
                : 'opacity-20 cursor-not-allowed border-transparent'
            }`}
            title="Biometrics"
          >
            <Fingerprint size={22} />
          </button>

          <button
            type="button"
            disabled={isKeypadDisabled}
            onClick={() => handleKeyPress('0')}
            className={`h-13 rounded-2xl text-xl font-mono font-bold flex items-center justify-center transition-all select-none border shadow-2xs ${
              isKeypadDisabled
                ? 'bg-zinc-900/40 text-zinc-600 border-zinc-900 cursor-not-allowed opacity-50'
                : 'bg-zinc-900 hover:bg-zinc-850 active:bg-blue-600/30 text-white cursor-pointer border-zinc-800 active:scale-95'
            }`}
          >
            0
          </button>

          <button
            type="button"
            disabled={isKeypadDisabled}
            onClick={handleDelete}
            className={`h-13 rounded-2xl flex items-center justify-center transition-all select-none border ${
              isKeypadDisabled
                ? 'bg-zinc-900/40 text-zinc-600 border-zinc-900 cursor-not-allowed opacity-50'
                : 'bg-zinc-900 hover:bg-zinc-850 active:scale-95 text-zinc-300 cursor-pointer border-zinc-800'
            }`}
            title="Delete"
          >
            <Delete size={20} />
          </button>
        </div>
      </div>
      )}
    </div>
  );
};
