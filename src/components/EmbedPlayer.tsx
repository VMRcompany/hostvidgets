import { useEffect, useState } from "react";
import { Widget } from "../types";
import { Play, Volume2, VolumeX, RotateCcw, Music } from "lucide-react";

interface EmbedPlayerProps {
  widgetId: string;
}

export default function EmbedPlayer({ widgetId }: EmbedPlayerProps) {
  const [widget, setWidget] = useState<Widget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/embed-widget/${widgetId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Виджет не найден или был удален владельцем");
        }
        return res.json();
      })
      .then((data) => {
        setWidget(data.widget);
        setIsMuted(data.widget.settings.muted);
        if (data.widget.type === "audio") {
          setAspectRatio(2.3);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Ошибка загрузки виджета");
        setLoading(false);
      });
  }, [widgetId]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-550 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !widget) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-300">
        <p className="text-sm font-medium tracking-tight text-red-400">⚠️ {error || "Ошибка загрузки"}</p>
        <p className="mt-1 text-xs text-slate-500">Мини-хостинг медиа-виджетов</p>
      </div>
    );
  }

  const { settings } = widget;

  const getBorderRadiusClass = (radius: string) => {
    switch (radius) {
      case "0px": return "rounded-none";
      case "8px": return "rounded-lg";
      case "16px": return "rounded-2xl";
      case "9999px": return "rounded-full";
      default: return "rounded-lg";
    }
  };

  const roundedClass = getBorderRadiusClass(settings.borderRadius || "8px");

  const getMediaEffectClass = (effect: string) => {
    switch (effect) {
      case "grayscale": return "grayscale hover:grayscale-0";
      case "sepia": return "sepia hover:sepia-0";
      case "vintage": return "contrast-125 brightness-95 saturate-75 sepia-[20%]";
      case "blur-hover": return "blur-sm hover:blur-none";
      case "hover-scale": return "hover:scale-105";
      default: return "";
    }
  };

  const effectClass = getMediaEffectClass(settings.mediaEffect || "none");

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-transparent p-2">
      <div 
        className="w-full max-w-full transition-all duration-350"
        style={aspectRatio ? { maxWidth: `calc((100vh - 16px) * ${aspectRatio})` } : undefined}
      >
        {settings.borderStyle === "polaroid" ? (
          /* POLAROID FRAME */
          <div className="bg-white p-3 pb-6 border border-slate-200 shadow-md flex flex-col items-center w-full max-w-full rounded-sm">
            <div 
              className="w-full bg-slate-900 overflow-hidden relative shadow-inner"
              style={{ aspectRatio: aspectRatio ? `${aspectRatio}` : "1.7777777778" }}
            >
              {widget.type === "image" ? (
                <img
                  src={widget.url}
                  alt={widget.name}
                  className={`w-full h-full object-cover transition-all duration-300 ${effectClass}`}
                  referrerPolicy="no-referrer"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setAspectRatio(img.naturalWidth / img.naturalHeight);
                    }
                  }}
                />
              ) : widget.type === "audio" ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 select-none relative">
                  <div className="flex items-center justify-center gap-4">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <Music className="h-6 w-6 animate-pulse" style={{ color: settings.accentColor || '#6366f1' }} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 line-clamp-1 max-w-[200px]">{settings.customTitle || widget.name}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Аудио-трек</div>
                    </div>
                  </div>
                  {settings.controls ? (
                    <audio
                      src={widget.url}
                      autoPlay={settings.autoplay}
                      loop={settings.loop}
                      controls
                      className="mt-5 w-full h-9 opacity-95 scale-95"
                      style={{ filter: "invert(1) hue-rotate(180deg)" }}
                    />
                  ) : (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <audio
                        src={widget.url}
                        autoPlay={settings.autoplay}
                        loop={settings.loop}
                        id={`audio-${widget.id}`}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        className="hidden"
                      />
                      <button
                        onClick={() => {
                          const aud = document.getElementById(`audio-${widget.id}`) as HTMLAudioElement;
                          if (aud) {
                            if (isPlaying) {
                              aud.pause();
                            } else {
                              aud.play();
                            }
                          }
                        }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold font-sans transition-all active:scale-95 cursor-pointer"
                        style={{
                          backgroundColor: settings.accentColor || "#6366f1",
                          color: "#fff"
                        }}
                      >
                        {isPlaying ? "Пауза" : "Воспроизвести"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full relative">
                  <video
                    src={widget.url}
                    autoPlay={settings.autoplay}
                    loop={settings.loop}
                    controls={settings.controls}
                    muted={isMuted}
                    playsInline
                    className={`w-full h-full object-contain transition-all duration-300 ${effectClass}`}
                    id={`video-${widget.id}`}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      if (video.videoWidth && video.videoHeight) {
                        setAspectRatio(video.videoWidth / video.videoHeight);
                      }
                    }}
                  />
                  {!settings.controls && (
                    <button
                      onClick={() => {
                        const vid = document.getElementById(`video-${widget.id}`) as HTMLVideoElement;
                        if (vid) {
                          vid.muted = !vid.muted;
                          setIsMuted(vid.muted);
                        }
                      }}
                      className="absolute bottom-3 right-3 rounded-full bg-slate-950/80 p-2 text-white hover:bg-slate-900 transition-colors z-20 cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="mt-3 text-slate-800 font-mono font-bold text-xs tracking-wide select-none text-center truncate w-full px-2">
              ✏️ {settings.customTitle || "Снимок " + widget.name}
            </div>
          </div>

        ) : settings.borderStyle === "retro" ? (
          /* RETRO WINDOW OS STYLE */
          <div className="border-[3px] border-t-white border-l-white border-r-slate-400 border-b-slate-400 bg-slate-200 p-1.5 shadow-[2px_2px_5px_rgba(0,0,0,0.25)] select-none w-full max-w-full">
            <div 
              className="px-2 py-1 text-[10px] text-white font-mono font-bold flex items-center justify-between mb-1.5"
              style={{ backgroundColor: settings.accentColor || "#000080" }}
            >
              <span className="truncate">💿 MS_WIDGET_PLAYER.EXE</span>
              <div className="flex gap-0.5 shrink-0">
                <button type="button" className="bg-slate-200 text-slate-900 border border-t-white border-l-white border-r-slate-400 border-b-slate-400 text-[8px] px-1 h-3.5 flex items-center">_</button>
                <button type="button" className="bg-slate-200 text-slate-900 border border-t-white border-l-white border-r-slate-400 border-b-slate-400 text-[8px] px-1 h-3.5 flex items-center">🗖</button>
                <button type="button" className="bg-slate-200 text-slate-900 border border-t-white border-l-white border-r-slate-400 border-b-slate-400 text-[8px] px-1 h-3.5 flex items-center">✕</button>
              </div>
            </div>
            <div 
              className="w-full bg-black overflow-hidden relative border-2 border-t-slate-400 border-l-slate-400 border-r-white border-b-white"
              style={{ aspectRatio: aspectRatio ? `${aspectRatio}` : "1.7777777778" }}
            >
              {widget.type === "image" ? (
                <img
                  src={widget.url}
                  alt={widget.name}
                  className={`w-full h-full object-cover transition-all duration-300 ${effectClass}`}
                  referrerPolicy="no-referrer"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setAspectRatio(img.naturalWidth / img.naturalHeight);
                    }
                  }}
                />
              ) : widget.type === "audio" ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 select-none relative">
                  <div className="flex items-center justify-center gap-4">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-405">
                      <Music className="h-6 w-6 animate-pulse" style={{ color: settings.accentColor || '#6366f1' }} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 line-clamp-1 max-w-[200px]">{settings.customTitle || widget.name}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Аудио-трек</div>
                    </div>
                  </div>
                  {settings.controls ? (
                    <audio
                      src={widget.url}
                      autoPlay={settings.autoplay}
                      loop={settings.loop}
                      controls
                      className="mt-5 w-full h-9 opacity-95 scale-95"
                      style={{ filter: "invert(1) hue-rotate(180deg)" }}
                    />
                  ) : (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <audio
                        src={widget.url}
                        autoPlay={settings.autoplay}
                        loop={settings.loop}
                        id={`audio-${widget.id}`}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        className="hidden"
                      />
                      <button
                        onClick={() => {
                          const aud = document.getElementById(`audio-${widget.id}`) as HTMLAudioElement;
                          if (aud) {
                            if (isPlaying) {
                              aud.pause();
                            } else {
                              aud.play();
                            }
                          }
                        }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold font-sans transition-all active:scale-95 cursor-pointer"
                        style={{
                          backgroundColor: settings.accentColor || "#6366f1",
                          color: "#fff"
                        }}
                      >
                        {isPlaying ? "Пауза" : "Воспроизвести"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full relative">
                  <video
                    src={widget.url}
                    autoPlay={settings.autoplay}
                    loop={settings.loop}
                    controls={settings.controls}
                    muted={isMuted}
                    playsInline
                    className={`w-full h-full object-contain transition-all duration-300 ${effectClass}`}
                    id={`video-${widget.id}`}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      if (video.videoWidth && video.videoHeight) {
                        setAspectRatio(video.videoWidth / video.videoHeight);
                      }
                    }}
                  />
                  {!settings.controls && (
                    <button
                      onClick={() => {
                        const vid = document.getElementById(`video-${widget.id}`) as HTMLVideoElement;
                        if (vid) {
                          vid.muted = !vid.muted;
                          setIsMuted(vid.muted);
                        }
                      }}
                      className="absolute bottom-3 right-3 rounded-full bg-slate-950/80 p-2 text-white hover:bg-slate-900 transition-colors z-20 cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-white" />}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

        ) : (
          /* STANDARD, THIN, OR NEON GLOW STANDARD SHAPES */
          <div 
            className="w-full bg-slate-950 overflow-hidden flex items-center justify-center relative transition-all duration-350"
            style={{
              aspectRatio: aspectRatio ? `${aspectRatio}` : "1.7777777778",
              borderRadius: settings.borderRadius || "8px",
              borderWidth: settings.borderStyle === "neon" ? "3px" : settings.borderStyle === "thin" ? "1px" : "0px",
              borderColor: settings.borderStyle === "neon" ? settings.accentColor : settings.borderStyle === "thin" ? "#e2e8f0" : "transparent",
              boxShadow: settings.borderStyle === "neon" ? `0 0 16px ${settings.accentColor}` : "none",
            }}
          >
            {widget.type === "image" ? (
              <div className="w-full h-full relative">
                <img
                  src={widget.url}
                  alt={widget.name}
                  className={`w-full h-full object-cover transition-all duration-300 ${effectClass}`}
                  referrerPolicy="no-referrer"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setAspectRatio(img.naturalWidth / img.naturalHeight);
                    }
                  }}
                />
                {settings.customTitle && (
                  <div className="absolute top-2.5 left-2.5 rounded bg-slate-900/80 px-2.5 py-1 text-[10px] text-white font-medium z-10" style={{ borderLeft: `3px solid ${settings.accentColor || '#6366f1'}` }}>
                    {settings.customTitle}
                  </div>
                )}
              </div>
            ) : widget.type === "audio" ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 select-none relative">
                <div className="flex items-center justify-center gap-4">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Music className="h-6 w-6 animate-pulse" style={{ color: settings.accentColor || '#6366f1' }} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100 line-clamp-1 max-w-[200px]">{settings.customTitle || widget.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Аудио-трек</div>
                  </div>
                </div>
                {settings.controls ? (
                  <audio
                    src={widget.url}
                    autoPlay={settings.autoplay}
                    loop={settings.loop}
                    controls
                    className="mt-5 w-full h-9 opacity-95 scale-95"
                    style={{ filter: "invert(1) hue-rotate(180deg)" }}
                  />
                ) : (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <audio
                      src={widget.url}
                      autoPlay={settings.autoplay}
                      loop={settings.loop}
                      id={`audio-${widget.id}`}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      className="hidden"
                    />
                    <button
                      onClick={() => {
                        const aud = document.getElementById(`audio-${widget.id}`) as HTMLAudioElement;
                        if (aud) {
                          if (isPlaying) {
                            aud.pause();
                          } else {
                            aud.play();
                          }
                        }
                      }}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold font-sans transition-all active:scale-95 cursor-pointer"
                      style={{
                        backgroundColor: settings.accentColor || "#6366f1",
                        color: "#fff"
                      }}
                    >
                      {isPlaying ? "Пауза" : "Воспроизвести"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full relative">
                <video
                  src={widget.url}
                  autoPlay={settings.autoplay}
                  loop={settings.loop}
                  controls={settings.controls}
                  muted={isMuted}
                  playsInline
                  className={`w-full h-full object-contain transition-all duration-300 ${effectClass}`}
                  id={`video-${widget.id}`}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget;
                    if (video.videoWidth && video.videoHeight) {
                      setAspectRatio(video.videoWidth / video.videoHeight);
                    }
                  }}
                />
                {settings.customTitle && (
                  <div className="absolute top-2.5 left-2.5 rounded bg-slate-900/80 px-2.5 py-1 text-[10px] text-white z-10 font-medium" style={{ borderLeft: `3px solid ${settings.accentColor || '#6366f1'}` }}>
                    {settings.customTitle}
                  </div>
                )}
                {!settings.controls && (
                  <button
                    onClick={() => {
                      const vid = document.getElementById(`video-${widget.id}`) as HTMLVideoElement;
                      if (vid) {
                        vid.muted = !vid.muted;
                        setIsMuted(vid.muted);
                      }
                    }}
                    className="absolute bottom-3 right-3 rounded-full bg-slate-950/80 p-2 text-white hover:bg-slate-900 transition-colors z-20 cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
