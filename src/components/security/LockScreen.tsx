import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Fingerprint, Delete, Shield, CheckCircle2, Lock, Clock, Info, LogOut } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { isBiometricsSupported, authenticateWithBiometrics } from '../../utils/biometrics';
import { normalizeArabicNumerals } from '../../utils/calculations';
import { useBackHandler } from '../../hooks/useBackHandler';
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
  const [showForgotSecurityNotice, setShowForgotSecurityNotice] = useState(false);
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
      } else if (res.error === 'unsupported') {
        setStatusMessage(
          language === 'ar'
            ? 'البصمة غير مدعومة في هذا الجهاز'
            : 'Biometrics not supported on this device'
        );
      } else if (res.error === 'cancelled_or_denied') {
        setStatusMessage(
          lockoutSecondsLeft > 0
            ? (language === 'ar' ? `المحاولات مقفلة. انتظر ${lockoutSecondsLeft} ثانية أو اضغط البصمة` : `Locked. Wait ${lockoutSecondsLeft}s or tap biometrics`)
            : (pinEnabled 
                ? (language === 'ar' ? 'تم إلغاء البصمة، استخدم الرمز (6 أرقام)' : 'Biometric cancelled, enter 6-digit PIN')
                : (language === 'ar' ? 'تم إلغاء البصمة، اضغط على زر البصمة لإعادة المحاولة' : 'Biometric cancelled, tap button to retry'))
        );
      } else {
        triggerHaptic('error');
        setErrorShake(true);
        setStatusMessage(
          pinEnabled
            ? (language === 'ar' ? 'فشلت مطابقة البصمة، استخدم الرمز' : 'Biometric failed, use PIN')
            : (language === 'ar' ? 'فشلت مطابقة البصمة، اضغط للمحاولة مرة أخرى' : 'Biometric failed, tap to retry')
        );
        setTimeout(() => setErrorShake(false), 500);
      }
    } catch {
      setIsBiometricChecking(false);
    }
  }, [handleUnlockSuccess, isSuccess, language, lockoutSecondsLeft, pinEnabled]);

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
              ? `محاولات خاطئة كثيرة. انتظر ${lockoutTime} ثانية أو استخدم البصمة`
              : `Too many wrong attempts. Wait ${lockoutTime}s or use biometrics`
          );
        } else {
          const remaining = 5 - nextFails;
          setStatusMessage(
            language === 'ar'
              ? `رمز المرور غير صحيح (${remaining} محاولات متبقية)`
              : `Incorrect passcode (${remaining} attempts left)`
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

  const handleForgotPinClick = () => {
    setShowForgotSecurityNotice(true);
  };

  useBackHandler(showForgotSecurityNotice, () => setShowForgotSecurityNotice(false), 'lock-forgot-notice');

  const isKeypadDisabled = lockoutSecondsLeft > 0 || isSuccess;

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
          <h1 className="text-xl font-black tracking-tight text-white">
            {language === 'ar' ? 'مصروفي محمي' : 'Masrofy is Locked'}
          </h1>
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

      {/* Biometric-Only Dedicated View (When PIN is NOT enabled) */}
      {!pinEnabled && biometricEnabled && (
        <div className="flex-1 flex flex-col items-center justify-center py-6 w-full max-w-xs text-center animate-in fade-in duration-300 space-y-4">
          <div className="relative my-4">
            <button
              type="button"
              onClick={handleBiometricAuth}
              disabled={isBiometricChecking || isSuccess}
              className={`p-8 rounded-full border transition-all cursor-pointer ${
                isBiometricChecking 
                  ? 'bg-blue-600/30 border-blue-500 scale-105 ring-4 ring-blue-500/30 shadow-2xl shadow-blue-500/40' 
                  : 'bg-zinc-900 hover:bg-zinc-850 active:scale-95 border-zinc-800 shadow-2xl'
              }`}
            >
              <Fingerprint size={72} className={`text-blue-400 ${isBiometricChecking ? 'animate-pulse text-blue-300' : ''}`} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleBiometricAuth}
            disabled={isBiometricChecking || isSuccess}
            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Fingerprint size={18} />
            <span>
              {isBiometricChecking 
                ? (language === 'ar' ? 'جارٍ فحص البصمة...' : 'Scanning...') 
                : (language === 'ar' ? 'المصادقة بالبصمة لفتح التطبيق' : 'Authenticate with Biometrics')}
            </span>
          </button>

          {/* Direct Exit App Button */}
          <button
            type="button"
            onClick={handleExitApp}
            className="w-full py-3.5 px-6 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 active:scale-98 border border-zinc-800 text-rose-400 hover:text-rose-300 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
          >
            <LogOut size={18} />
            <span>{language === 'ar' ? 'الخروج من التطبيق' : 'Exit App'}</span>
          </button>
        </div>
      )}

      {/* Center Biometric Button (When PIN is enabled alongside biometrics) */}
      {pinEnabled && biometricEnabled && (
        <div className="py-1 flex flex-col items-center">
          <button
            type="button"
            onClick={handleBiometricAuth}
            disabled={isBiometricChecking || isSuccess}
            className={`p-3.5 rounded-3xl border text-blue-400 flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
              isBiometricChecking 
                ? 'bg-blue-600/25 border-blue-500/60 scale-105 ring-2 ring-blue-500/40' 
                : 'bg-zinc-900 hover:bg-zinc-850 active:scale-95 border-zinc-800 shadow-lg'
            }`}
          >
            <Fingerprint size={38} className={isBiometricChecking ? 'animate-pulse text-blue-300' : ''} />
            <span className="text-[11px] font-bold text-zinc-300">
              {isBiometricChecking 
                ? (language === 'ar' ? 'جارٍ الفحص...' : 'Scanning...') 
                : (language === 'ar' ? 'اضغط للمصادقة بالبصمة' : 'Tap for Biometrics')}
            </span>
          </button>
        </div>
      )}

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
          
          {/* Bottom Row: Fingerprint Shortcut, 0, Backspace */}
          <button
            type="button"
            onClick={handleBiometricAuth}
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

        {/* Secure Forgot PIN Guidance */}
        <div className="text-center pt-1" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <button
            type="button"
            onClick={handleForgotPinClick}
            className="text-[11px] text-zinc-400 hover:text-blue-400 underline cursor-pointer transition-colors"
          >
            {language === 'ar' ? 'نسيت رمز المرور؟' : 'Forgot Passcode?'}
          </button>
        </div>

        {/* Direct Exit App Button for PIN View */}
        <div className="pt-1.5 flex justify-center" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <button
            type="button"
            onClick={handleExitApp}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-rose-400 hover:text-rose-300 text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-md"
          >
            <LogOut size={14} />
            <span>{language === 'ar' ? 'الخروج من التطبيق' : 'Exit App'}</span>
          </button>
        </div>
      </div>
      )}

      {/* Secure Forgot PIN Modal (No Wipe, Biometric Recovery Only) */}
      {showForgotSecurityNotice && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {language === 'ar' ? 'استعادة الوصول بأمان' : 'Secure Access Recovery'}
              </h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed text-start">
                {language === 'ar' 
                  ? 'لحماية خصوصيتك ومنع أي شخص متطفل من الاطلاع على بياناتك أو العبث بها، لا يمكن فتح التطبيق إلا عبر رمز المرور أو بصمة الإصبع.\n\nإذا نسيت رمز المرور، يرجى المصادقة ببصمة الإصبع لتأكيد هويتك كمالك للجهاز وفتح التطبيق فوراً.' 
                  : 'To protect your privacy and ensure no unauthorized person can view or tamper with your records, the app requires your PIN or biometric verification.\n\nIf you forgot your PIN, please authenticate using your registered fingerprint.'}
              </p>
            </div>

            {/* Security Explanation Box */}
            <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-800 text-[11px] text-zinc-400 text-start flex items-start gap-2">
              <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <span>
                {language === 'ar'
                  ? 'ملاحظة لحماية أمانك: لا توجد أي خيارات لمسح البيانات من شاشة القفل لمنع ضياع سجلاتك إذا وقع الهاتف في يد شخص آخر.'
                  : 'Security policy: No data wipe option exists on the lock screen to prevent accidental or malicious data loss.'}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {biometricEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotSecurityNotice(false);
                    handleBiometricAuth();
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Fingerprint size={16} />
                  <span>{language === 'ar' ? 'فتح التطبيق ببصمة الإصبع' : 'Unlock with Biometrics'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowForgotSecurityNotice(false)}
                className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                {language === 'ar' ? 'العودة ومحاولة إدخال الرمز' : 'Try Passcode Again'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
