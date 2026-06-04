import { Play, Image, Layers, Code, ShieldCheck, Zap, ArrowRight, Video, HelpCircle, Cpu } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";

interface LandingPageProps {
  onStartAuth: (mode: "login" | "register") => void;
}

export default function LandingPage({ onStartAuth }: LandingPageProps) {
  // Playground state for visitors to explore options before sign up!
  const [playAutoplay, setPlayAutoplay] = useState(false);
  const [playLoop, setPlayLoop] = useState(true);
  const [playRadius, setPlayRadius] = useState("8px");
  const [playAccent, setPlayAccent] = useState("#6366f1");
  const [copiedDemo, setCopiedDemo] = useState(false);

  const demoEmbedCode = `<iframe src="https://hostvidgets.app/embed/demo-sample"
  width="100%" 
  style="aspect-ratio: 16/9; border-radius: ${playRadius}; border: none;"
  allow="autoplay; encrypted-media" 
  allowfullscreen>
</iframe>`;

  const copyDemoCode = () => {
    navigator.clipboard.writeText(demoEmbedCode);
    setCopiedDemo(true);
    setTimeout(() => setCopiedDemo(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Decorative ambient soft radial gradients */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-50/70 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 h-[600px] w-[600px] rounded-full bg-slate-100/40 blur-[130px] pointer-events-none" />

      {/* Grid background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Navigation Header */}
      <nav id="landing-navbar" className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
            <Layers className="h-5.5 w-5.5 text-white" />
          </div>
          <div>
            <span className="font-sans font-extrabold text-xl tracking-tight text-slate-900">HostVidgets</span>
            <span className="block text-[10px] font-mono tracking-widest text-indigo-600 font-semibold uppercase">Widget Engine</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => onStartAuth("login")}
            className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer px-3 py-1.5"
          >
            Войти
          </button>
          <button
            onClick={() => onStartAuth("register")}
            className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4.5 py-2 shadow-sm transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Создать аккаунт
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header id="landing-hero" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-indigo-600 shadow-sm mb-8"
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="font-medium">Персональный медиа-хостинг виджетов</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-4xl mx-auto font-sans font-extrabold text-4xl sm:text-6xl tracking-tight text-slate-905 leading-[1.15] mb-6"
        >
          Встраивайте видео и фото на любой сайт <br />
          <span className="text-indigo-600">
            за пару секунд без лишней нагрузки
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto text-base sm:text-lg text-slate-650 mb-10"
        >
          Загружайте ваши медиафайлы, кастомизируйте дизайн плееров, копируйте готовый HTML-код (iframe или inline) и размещайте встраиваемые виджеты на Tilda, WordPress, Webflow или самописных страницах.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
        >
          <button
            onClick={() => onStartAuth("register")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-7 py-4 shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            Начать пользоваться бесплатно
            <ArrowRight className="h-5 w-5" />
          </button>
          <a
            href="#demo-section"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl px-7 py-4 hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
          >
            Посмотреть песочницу
          </a>
        </motion.div>
      </header>

      {/* Feature Bento Grid */}
      <section id="features-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 border-t border-slate-200/60 pt-16">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold tracking-widest text-indigo-600 uppercase">Основные Особенности</h2>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 mb-4">Всё необходимое для виджетных вставок</p>
          <p className="max-w-xl mx-auto text-sm text-slate-500 font-medium">Управляйте контентом гибко, настраивайте вид под свой бренд и встраивайте за два шага.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white border border-slate-250/60 rounded-xl p-6.5 shadow-sm hover:border-indigo-300 transition-colors">
            <div className="h-11 w-11 rounded-lg bg-indigo-50 flex items-center justify-center mb-6">
              <Zap className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Мгновенный Хостинг за пару кликов</h3>
            <p className="text-sm leading-relaxed text-slate-550 font-medium">Забудьте о сложных FTP или костыльных облачных дисках. Прямая загрузка видео и фото с мгновенной генерацией прямой ссылки.</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-250/60 rounded-xl p-6.5 shadow-sm hover:border-indigo-300 transition-colors">
            <div className="h-11 w-11 rounded-lg bg-indigo-50 flex items-center justify-center mb-6">
              <Play className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Собственный Видеоплеер</h3>
            <p className="text-sm leading-relaxed text-slate-550 font-medium">Скрывайте оригинальные элементы управления видео, настраивайте автовоспроизведение, циклы, беззвучный старт, закругление углов и заменяйте акцентные цвета.</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-250/60 rounded-xl p-6.5 shadow-sm hover:border-indigo-300 transition-colors">
            <div className="h-11 w-11 rounded-lg bg-indigo-50 flex items-center justify-center mb-6">
              <Code className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Два типа Embed-кодов</h3>
            <p className="text-sm leading-relaxed text-slate-550 font-medium">Копируйте либо быстрый Iframe-плеер с встроенными фичами кастомизации, либо чистый Inline HTML код со ссылкой на наш CDN для прямой врезки картинок и видео.</p>
          </div>
        </div>
      </section>

      {/* Demo Sandbox Area */}
      <section id="demo-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-10">
        <div className="bg-white border border-slate-250/80 rounded-2xl p-6.5 sm:p-11 relative overflow-hidden shadow-md">
          {/* Subtle decorations */}
          <div className="absolute top-0 right-0 h-44 w-44 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Design Controls */}
            <div>
              <span className="text-xs font-bold tracking-widest text-indigo-600 font-semibold uppercase">ПЕСОЧНИЦА ОНЛАЙН</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-4">Нажмите курок и посмотрите на результат в коде</h2>
              <p className="text-sm text-slate-500 font-medium mb-8 sm:max-w-md">Каждый загруженный виджет гибко настраивается. Попробуйте поменять параметры интерактивного виджета ниже:</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">Масштаб Скругления Углов</label>
                  <div className="flex gap-2">
                    {["0px", "8px", "16px", "9999px"].map((radius) => (
                      <button
                        key={radius}
                        type="button"
                        onClick={() => setPlayRadius(radius)}
                        className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                          playRadius === radius
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold"
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        }`}
                      >
                        {radius === "0px" ? "Острый" : radius === "9999px" ? "Круг" : radius}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">Цветовые Акценты</label>
                  <div className="flex gap-2.5">
                    {[
                      { hex: "#6366f1", label: "Синий Индиго" },
                      { hex: "#8b5cf6", label: "Фиолетовый" },
                      { hex: "#ec4899", label: "Розовый" },
                      { hex: "#10b981", label: "Изумруд" },
                      { hex: "#f59e0b", label: "Янтарный" }
                    ].map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setPlayAccent(col.hex)}
                        className={`h-7 w-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                          playAccent === col.hex ? "border-slate-800 scale-110" : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-150 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={playAutoplay}
                      onChange={(e) => setPlayAutoplay(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-850">Автозапуск</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Без клика</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-150 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={playLoop}
                      onChange={(e) => setPlayLoop(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-850">Цикл</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Бесконечно</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Simulated Live Frame & Generated Embed Code */}
            <div className="flex flex-col gap-6">
              {/* Responsive App Frame Preview */}
              <div className="border border-slate-200 rounded-2xl bg-white p-4.5 relative shadow-sm">
                <div className="flex items-center space-x-1.5 mb-3.5 border-b border-slate-100 pb-3">
                  <span className="h-3 w-3 rounded-full bg-red-400 block"></span>
                  <span className="h-3 w-3 rounded-full bg-yellow-400 block"></span>
                  <span className="h-3 w-3 rounded-full bg-green-400 block"></span>
                  <span className="text-xs font-mono text-slate-400 pl-2">Твой_сайт_клиента.html</span>
                </div>

                {/* Simulated Embed player area */}
                <div
                  className="w-full aspect-video bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden group shadow-md"
                  style={{
                    borderRadius: playRadius,
                  }}
                >
                  {/* Neon frame color */}
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{ backgroundColor: playAccent }}
                  />

                  <Video className="h-10 w-10 text-slate-300 group-hover:scale-110 transition-transform mb-2 z-10 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-200 z-10">Твой встраиваемый видео-виджет</span>
                  
                  <span className="absolute bottom-3 left-4 text-[9px] font-mono tracking-wider text-slate-400 z-10 bg-slate-950/80 px-2 py-0.5 rounded">
                    {playAutoplay ? "AUTOPLAY ENABLED" : "PAUSED ON LAUNCH"}
                  </span>

                  <span className="absolute bottom-3 right-4 h-3 w-3 rounded-full z-10 animate-ping" style={{ backgroundColor: playAccent }} />
                </div>
              </div>

              {/* Code Snippet */}
              <div className="rounded-xl border border-slate-200/85 bg-slate-50 p-4.5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500">HTML Код для вставки в сторонний конструктор</span>
                  <button
                    onClick={copyDemoCode}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                  >
                    {copiedDemo ? "Успешно скопировано! ✓" : "Скопировать"}
                  </button>
                </div>
                <pre className="text-xs font-mono text-indigo-200 whitespace-pre-wrap break-all bg-slate-950 p-3 rounded-lg max-h-36 overflow-y-auto selection:bg-indigo-500 selection:text-white">
                  {demoEmbedCode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Allocated Server Protection Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 rounded-2xl p-6 sm:p-10 text-white relative overflow-hidden shadow-xl border border-indigo-950/45">
          {/* Decorative network grid glow */}
          <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-[60px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-blue-500/10 blur-[50px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 sm:gap-8">
            <div className="h-16 w-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <Cpu className="h-9 w-9 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-2 font-sans flex items-center gap-2">
                Выделенная инфраструктура хранения
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-normal max-w-3xl">
                Все ваши файлы расположены на специально выделенных для вас серверах и очень надежно защищены.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Stats section */}
      <section className="text-center pb-24 max-w-5xl mx-auto px-4 sm:px-6">
        <h3 className="text-xs/relaxed font-mono font-bold tracking-widest text-slate-450 uppercase mb-5 justify-center">БЫСТРО • АДАПТИВНО • НАДЕЖНО</h3>
        <p className="text-xl text-slate-700 font-semibold mb-8 max-w-xl mx-auto">Создайте свой проект за секунды, чтобы освободить хостинг от тяжелых файлов!</p>
        <button
          onClick={() => onStartAuth("register")}
          className="inline-flex items-center gap-2 bg-indigo-50 hover:bg-slate-100 text-indigo-700 border border-indigo-200 rounded-xl px-5.5 py-3 text-sm font-semibold transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Зарегистрироваться и создать первый проект
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      {/* Transparent Footer */}
      <footer className="border-t border-slate-200/80 py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center sm:flex sm:items-center sm:justify-between text-slate-450 text-xs font-medium">
          <p>© 2026 HostVidgets. Все права защищены. Мини-хостинг виджетов для вашего сайта.</p>
          <p className="mt-2 sm:mt-0">Разработано для бесшовной интеграции плееров.</p>
        </div>
      </footer>
    </div>
  );
}
