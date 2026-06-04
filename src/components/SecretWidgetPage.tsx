import { useEffect, useState } from "react";
import { Widget } from "../types";
import { 
  Eye, 
  Download, 
  Share2, 
  Clock, 
  HardDrive, 
  ArrowLeft, 
  ShieldCheck, 
  Video, 
  Image as ImageIcon,
  Check,
  Copy,
  ExternalLink
} from "lucide-react";
import { motion } from "motion/react";
import EmbedPlayer from "./EmbedPlayer";

interface SecretWidgetPageProps {
  widgetId: string;
}

export default function SecretWidgetPage({ widgetId }: SecretWidgetPageProps) {
  const [widget, setWidget] = useState<Widget & { views?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // When the page opens, it increments views automatically
    fetch(`/api/embed-widget/${widgetId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Секретная страница не найдена или виджет был удален");
        }
        return res.json();
      })
      .then((data) => {
        setWidget(data.widget);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Ошибка загрузки страницы");
        setLoading(false);
      });
  }, [widgetId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-550 border-t-transparent"></div>
          <span className="text-sm font-semibold tracking-tight">Открытие защищенного виджета...</span>
        </div>
      </div>
    );
  }

  if (error || !widget) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-300">
        <div className="rounded-full bg-red-950/40 p-4 font-mono text-red-500 border border-red-900/30 mb-4 animate-pulse">
          ⚠️ {error || "Ошибка доступа"}
        </div>
        <p className="mt-1 text-sm text-slate-400">Эта ссылка может быть устаревшей или неправильной.</p>
        <a href="/" className="mt-6 px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-xs font-bold rounded-xl border border-slate-800 text-slate-305 transition-colors">
          Вернуться на главную
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background radial spotlights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-emerald-900/5 rounded-full blur-[80px]" />
      </div>

      {/* Header bar on top */}
      <header className="relative z-10 p-4 border-b border-slate-900/60 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 font-sans">
              MEDIA HOSTING
            </span>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Secure Page
            </span>
          </div>

          <a 
            href={window.location.origin}
            className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            Создать свой плеер <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* Main player area */}
      <main className="relative z-10 max-w-4xl w-full mx-auto p-4 md:py-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Column 1: The Interactive Player stage */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              <div className="rounded-3xl bg-slate-900/40 p-3 border border-slate-800/80 shadow-2xl backdrop-blur-sm relative">
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-slate-950 text-[10px] font-mono font-black px-2 py-0.5 rounded shadow-lg flex items-center gap-1 z-30">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-950 animate-ping"></span>
                  Active Node
                </div>
                {/* Embed the rich styled player */}
                <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-950">
                  <EmbedPlayer widgetId={widget.id} />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Column 2: Dashboard/Info area */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex flex-col gap-6"
            >
              {/* Main Badge / Title info */}
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 mb-2 uppercase tracking-widest font-sans">
                  {widget.type === "video" ? <Video className="h-3.5 w-3.5 text-indigo-400" /> : <ImageIcon className="h-3.5 w-3.5 text-indigo-400" />}
                  {widget.type === "video" ? "Видео Виджет" : "Изображение Виджет"}
                </span>
                
                <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight leading-tight uppercase font-sans break-words mb-2">
                  {widget.settings.customTitle || widget.name}
                </h1>
                
                <p className="text-xs text-slate-400 font-mono flex items-center gap-1 italic break-all">
                  📁 {widget.originalName}
                </p>
              </div>

              {/* Status and statistics board */}
              <div className="grid grid-cols-2 gap-3 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                    Просмотры виджета
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Eye className="h-4.5 w-4.5 animate-pulse" />
                    </div>
                    <span className="text-lg font-black text-slate-100 font-mono tracking-tight">
                      {widget.views || 1}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                    Безопасность
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <ShieldCheck className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-bold text-emerald-400 font-sans tracking-wide">
                      SSL Защита
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata Details List */}
              <div className="space-y-3 bg-slate-900/20 p-4 rounded-2xl border border-slate-900/80 text-xs font-semibold">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-500 font-sans flex items-center gap-1.5"><HardDrive className="h-3.5 w-3.5 text-slate-500" /> Вес файла:</span>
                  <span className="text-slate-200 font-mono">{formatSize(widget.size)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-sans flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-500" /> Загружено:</span>
                  <span className="text-slate-200 font-sans">{formatDate(widget.createdAt)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <a 
                  href={widget.url} 
                  download={widget.originalName} 
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-slate-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all font-sans"
                >
                  <Download className="h-4 w-4" />
                  Скачать оригинал
                </a>

                <button 
                  onClick={handleCopyLink}
                  className="px-5 py-3.5 bg-slate-900 hover:bg-slate-850 active:scale-98 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all font-sans"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Ссылка скопирована!" : "Скопировать ссылку"}
                </button>
              </div>

            </motion.div>
          </div>

        </div>
      </main>

      {/* Footer credits and details */}
      <footer className="relative z-10 p-6 border-t border-slate-900 text-center bg-slate-950/40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
          <p>© {new Date().getFullYear()} Секретная страница медиа-ресурса.</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-600">ID: {widgetId}</span>
            <div className="h-4 w-[1px] bg-slate-900"></div>
            <a href={window.location.origin} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              Мини-хостинг виджетов ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
