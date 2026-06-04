import React, { useState } from "react";
import { Layers, ArrowLeft, ShieldCheck, AlertCircle, Phone, Key } from "lucide-react";
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  ConfirmationResult,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth } from "../lib/firebase";

interface AuthPageProps {
  initialMode: "login" | "register";
  onBackToLanding: () => void;
  onAuthSuccess: (token: string, user: { id: string; email?: string; phoneNumber?: string }) => void;
}

export default function AuthPage({ initialMode, onBackToLanding, onAuthSuccess }: AuthPageProps) {
  const [authType, setAuthType] = useState<"google" | "phone">("google");
  
  // Phone states
  const [phoneNumber, setPhoneNumber] = useState("+7");
  const [smsCode, setSmsCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [smsSent, setSmsSent] = useState(false);

  // Common states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      setSuccess("Вход выполнен успешно через Google! Синхронизация...");

      const syncResponse = await fetch("/api/auth/firebase-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email || undefined,
          phoneNumber: firebaseUser.phoneNumber || undefined,
          photoURL: firebaseUser.photoURL || undefined
        })
      });

      const syncData = await syncResponse.json();
      if (!syncResponse.ok) {
        throw new Error(syncData.error || "Ошибка синхронизации сессии");
      }

      setTimeout(() => {
        onAuthSuccess(syncData.token, syncData.user);
      }, 800);

    } catch (err: any) {
      console.error("Google login error:", err);
      let errMsg = "Ошибка при авторизации через Google. Попробуйте еще раз.";
      if (err.code === "auth/popup-blocked") {
        errMsg = "Окно авторизации заблокировано браузером. Пожалуйста, разрешите всплывающие окна.";
      } else if (err.code === "auth/cancelled-popup-request") {
        errMsg = "Запрос авторизации был отменен.";
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const checkNum = phoneNumber.trim();
    if (!checkNum || checkNum.length < 9) {
      setError("Пожалуйста, введите корректный номер телефона (например, +79998887766)");
      return;
    }

    setLoading(true);

    try {
      let container = document.getElementById("recaptcha-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "recaptcha-container";
        document.body.appendChild(container);
      } else {
        container.innerHTML = "";
      }

      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {}
      });

      const confirmation = await signInWithPhoneNumber(auth, checkNum, verifier);
      setConfirmationResult(confirmation);
      setSmsSent(true);
      setSuccess("SMS-код успешно отправлен на ваш телефон!");
    } catch (err: any) {
      console.error("SMS Sending error:", err);
      let errMsg = "Ошибка отправки SMS. Пожалуйста, проверьте формат номера.";
      if (err.code === "auth/captcha-check-failed") {
        errMsg = "Проверка reCAPTCHA не пройдена. Пожалуйста, обновите страницу.";
      } else if (err.code === "auth/too-many-requests") {
        errMsg = "Слишком много попыток отправки SMS. Пожалуйста, подождите или разблокируйте лимиты.";
      } else if (err.code === "auth/operation-not-allowed") {
        errMsg = "Авторизация через СМС (Phone Provider) не включена в настройках Firebase Authentication! Включите провайдер 'Phone' в Консоли Firebase проекта. Для тестирования вы также можете добавить тестовые телефоны и коды прямо в консоли Firebase.";
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySMS = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!smsCode || smsCode.length < 6) {
      setError("Длина кода подтверждения должна быть 6 цифр");
      return;
    }

    if (!confirmationResult) {
      setError("Сессия подтверждения истекла, попробуйте отправить код заново");
      return;
    }

    setLoading(true);

    try {
      const result = await confirmationResult.confirm(smsCode);
      const firebaseUser = result.user;

      setSuccess("Вход через SMS подтвержден! Синхронизация...");

      const syncResponse = await fetch("/api/auth/firebase-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          phoneNumber: firebaseUser.phoneNumber || undefined,
          email: firebaseUser.email || undefined
        })
      });

      const syncData = await syncResponse.json();
      if (!syncResponse.ok) {
        throw new Error(syncData.error || "Ошибка синхронизации сессии");
      }

      setTimeout(() => {
        onAuthSuccess(syncData.token, syncData.user);
      }, 800);

    } catch (err: any) {
      console.error("SMS validation error:", err);
      setError("Неверный одноразовый код. Пожалуйста, введите корректный код из СМС.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Invisible ReCaptcha Container required for phoneauth */}
      <div id="recaptcha-container"></div>

      {/* Decorative background blur */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      {/* Back button to landing */}
      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-sm text-slate-650 hover:text-slate-900 transition-colors cursor-pointer group px-3 py-1.5 rounded-lg hover:bg-slate-100 font-medium"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Назад на главную
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-md mx-auto">
          <Layers className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
          Войти в личный кабинет
        </h2>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          Выберите удобный способ авторизации на платформе
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white border border-slate-205 shadow-md rounded-2xl py-8 px-6 sm:px-10">
          
          {/* Tabs for Google / SMS */}
          <div className="flex border-b border-slate-200 mb-6 font-semibold bg-slate-50 p-1.5 rounded-xl gap-1">
            <button
              onClick={() => {
                setAuthType("google");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 text-xs text-center rounded-lg transition-all cursor-pointer ${
                authType === "google"
                  ? "bg-white text-slate-900 shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Вход через Google
            </button>
            <button
              onClick={() => {
                setAuthType("phone");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 text-xs text-center rounded-lg transition-all cursor-pointer ${
                authType === "phone"
                  ? "bg-white text-slate-900 shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              SMS-код на Телефон
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-sm font-medium animate-fade-in">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-sm font-medium animate-pulse">
              <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {authType === "google" ? (
            /* GOOGLE SIGN IN BUTTON AREA */
            <div className="space-y-4">
              <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed">
                Быстрый и защищенный доступ к вашим медиа-виджетам. Мы используем безопасную авторизацию от Google.
              </p>
              
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 text-sm font-bold shadow-sm hover:border-slate-350 active:scale-[98%] transition-all cursor-pointer text-slate-800 disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                ) : (
                  <>
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Войти через Google</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* PHONE AUTH SMS FLOW */
            <div className="space-y-4">
              {!smsSent ? (
                /* SEND CODE */
                <form onSubmit={handleSendSMS} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-650 uppercase tracking-widest mb-2">
                      Номер телефона (в международном формате)
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                        <Phone className="h-4.5 w-4.5 text-blue-600" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        placeholder="+79998887766"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium mt-1.5 block leading-normal">
                      Код отправится на указанный номер абсолютно бесплатно. Например, +7 (999) 888-77-66.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all focus:outline-none cursor-pointer disabled:opacity-55 transform active:scale-98"
                  >
                    {loading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      "Выслать SMS-код"
                    )}
                  </button>
                </form>
              ) : (
                /* VERIFY SMS CODE */
                <form onSubmit={handleVerifySMS} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-650 uppercase tracking-widest mb-2">
                      Введите 6-разрядный код подтверждения
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-450">
                        <Key className="h-4.5 w-4.5 text-blue-600" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ""))}
                        className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-bold tracking-[0.8em] text-center text-lg transition-all"
                        placeholder="••••••"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-slate-450 font-semibold uppercase">Код выслан на {phoneNumber}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSmsSent(false);
                          setSmsCode("");
                          setSuccess(null);
                          setError(null);
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
                      >
                        Изменить номер
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all focus:outline-none cursor-pointer disabled:opacity-55 transform active:scale-98"
                  >
                    {loading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      "Подтвердить код и продолжить"
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
