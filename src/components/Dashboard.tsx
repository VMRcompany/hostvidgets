import React, { useEffect, useState, useRef } from "react";
import { 
  Plus, Trash2, FolderPlus, Video, Image, FileText, Code, Settings, Copy, 
  Check, LogOut, Loader2, ArrowRight, Upload, X, Eye, HelpCircle, Sliders,
  User, ShieldAlert, Sparkles, Layers, Music
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Project, Widget, WidgetSettings } from "../types";

interface DashboardProps {
  token: string;
  user: { id: string; email?: string; phoneNumber?: string; photoURL?: string };
  onLogout: () => void;
}

export default function Dashboard({ token, user, onLogout }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  
  // Loading states
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectDetailLoading, setProjectDetailLoading] = useState(false);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Modals & form fields
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  
  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [customMediaName, setCustomMediaName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Widget Settings Overlay State
  const [activeSettingsWidget, setActiveSettingsWidget] = useState<Widget | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // User Profile Dropdown state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Custom non-blocking Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
    confirmText?: string;
  } | null>(null);

  // Close user profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleWipeAllProjects = async () => {
    setIsUserMenuOpen(false);
    setConfirmDialog({
      isOpen: true,
      title: "Очистить все проекты",
      message: "Внимание! Вы собираетесь очистить абсолютно все ваши проекты и виджеты. Это действие нельзя отменить. Продолжить?",
      isDanger: true,
      confirmText: "Да, удалить всё",
      onConfirm: async () => {
        try {
          for (const proj of projects) {
            await fetch(`/api/projects/${proj.id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` }
            });
          }
          setSelectedProjectId(null);
          fetchProjects();
          setConfirmDialog(null);
        } catch (e) {
          console.error("Error wiping projects", e);
        }
      }
    });
  };

  const handleWipeAccount = async () => {
    setIsUserMenuOpen(false);
    setConfirmDialog({
      isOpen: true,
      title: "Удалить Ваш аккаунт",
      message: "КРИТИЧЕСКОЕ ДЕЙСТВИЕ!\n\nВсе ваши медиафайлы, проекты и виджеты будут безвозвратно стерты, а вы будете вылогинены из системы.\n\nВы уверены на 100%?",
      isDanger: true,
      confirmText: "Да, полностью удалить аккаунт",
      onConfirm: async () => {
        try {
          for (const proj of projects) {
            await fetch(`/api/projects/${proj.id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` }
            });
          }
          setConfirmDialog(null);
          onLogout();
        } catch (err) {
          console.error("Error wiping account", err);
        }
      }
    });
  };

  // Load projects list
  const fetchProjects = async () => {
    try {
      setProjectsLoading(true);
      const res = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (err) {
      console.error("Error fetching projects", err);
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]);

  // Load single project details and widgets
  const fetchProjectDetail = async (projId: string) => {
    try {
      setProjectDetailLoading(true);
      const res = await fetch(`/api/projects/${projId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentProject(data.project);
        setWidgets(data.widgets);
      }
    } catch (err) {
      console.error("Error fetching project details", err);
    } finally {
      setProjectDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectDetail(selectedProjectId);
    } else {
      setCurrentProject(null);
      setWidgets([]);
    }
  }, [selectedProjectId]);

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      setSubmittingProject(true);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc })
      });

      if (res.ok) {
        const data = await res.json();
        setNewProjectName("");
        setNewProjectDesc("");
        setShowCreateProject(false);
        // Refresh & choose new project
        await fetchProjects();
        setSelectedProjectId(data.project.id);
      }
    } catch (err) {
      console.error("Error creating project", err);
    } finally {
      setSubmittingProject(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async (projId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: "Удалить проект",
      message: "Вы действительно хотите удалить проект и ВСЕ вложенные файлы? Это действие необратимо.",
      isDanger: true,
      confirmText: "Удалить проект",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/projects/${projId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });

          if (res.ok) {
            if (selectedProjectId === projId) {
              setSelectedProjectId(null);
            }
            fetchProjects();
          }
          setConfirmDialog(null);
        } catch (err) {
          console.error("Error deleting project", err);
        }
      }
    });
  };

  // Handle Drag Events for Upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle Files Upload
  const uploadFile = async (file: File) => {
    if (!currentProject) return;

    const maxSize = 3 * 1024 * 1024 * 1024; // 3GB maximum limit (increased to support very long videos as requested)
    if (file.size > maxSize) {
      alert("Максимальный размер файла для загрузки составляет 3 ГБ. Пожалуйста, сожмите видео или выберите файл меньшего размера.");
      return;
    }

    // Determine type
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/") || file.name.endsWith(".mp3") || file.name.endsWith(".wav");

    if (!isVideo && !isImage && !isAudio) {
      alert("Поддерживаются только графические (PNG/JPG/WEBP/GIF), видео (MP4/WebM/MOV) или аудио файлы (MP3/WAV).");
      return;
    }

    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", isVideo ? "video" : (isAudio ? "audio" : "image"));
      if (customMediaName.trim()) {
        formData.append("name", customMediaName.trim());
      } else {
        formData.append("name", file.name);
      }

      const res = await fetch(`/api/projects/${currentProject.id}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setCustomMediaName("");
        fetchProjectDetail(currentProject.id);
        fetchProjects(); // Update widgetsCount indicator
        // Automatically open the visual customization and code generation builder immediately!
        if (data.widget) {
          setActiveSettingsWidget(data.widget);
        }
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка загрузки файла");
      }
    } catch (err) {
      console.error("Error uploading file", err);
      alert("Ошибка сети при отправке файла");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  // Delete Individual Widget
  const handleDeleteWidget = async (widgetId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Удалить виджет",
      message: "Удалить этот виджет? Встроенные плееры на сторонних сайтах перестанут работать.",
      isDanger: true,
      confirmText: "Да, удалить",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/widgets/${widgetId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });

          if (res.ok) {
            if (currentProject) {
              fetchProjectDetail(currentProject.id);
            }
            if (activeSettingsWidget?.id === widgetId) {
              setActiveSettingsWidget(null);
            }
            fetchProjects();
          }
          setConfirmDialog(null);
        } catch (err) {
          console.error("Error deleting widget", err);
        }
      }
    });
  };

  // Update Widget Setting (from interactive playground modal)
  const handleUpdateWidgetSetting = async (key: keyof WidgetSettings, value: any) => {
    if (!activeSettingsWidget) return;

    let updatedSettings = {
      ...activeSettingsWidget.settings,
      [key]: value
    };

    // If autoplay is turned on, the video must start muted for autoplay to work.
    // If autoplay is turned off, the video should start with sound (not muted).
    if (key === "autoplay") {
      updatedSettings = {
        ...updatedSettings,
        muted: value
      };
    }

    // Optimistic UI state update
    const updatedWidget = {
      ...activeSettingsWidget,
      settings: updatedSettings
    };
    setActiveSettingsWidget(updatedWidget);

    // Update in local lists as well so it is synchronized
    setWidgets(widgets.map(w => w.id === updatedWidget.id ? updatedWidget : w));

    try {
      await fetch(`/api/widgets/${activeSettingsWidget.id}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ settings: updatedSettings })
      });
    } catch (err) {
      console.error("Error updating widget setting on server", err);
    }
  };

  // Copy code helper
  const copyCodeToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Layout formatting helpers
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const getAbsoluteMediaUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `${window.location.origin}${url}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Top Navbar Header */}
      <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between shadow-sm relative z-50">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900 block">HostVidgets</span>
            <span className="text-[9px] font-mono tracking-widest text-indigo-600 font-bold uppercase -mt-1 block">Консоль хостинга</span>
          </div>
        </div>

        {/* User Account Circle Profile with Framer Motion Dropdown */}
        <div className="relative" ref={userMenuRef}>
          {/* Circular Account Icon Avatar */}
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="h-9.5 w-9.5 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 text-white font-extrabold text-sm border-2 border-white ring-2 ring-indigo-100 flex items-center justify-center shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95 uppercase select-none overflow-hidden"
            title="Личный кабинет"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              user.email ? user.email.charAt(0) : (user.phoneNumber ? user.phoneNumber.substring(1, 3) : "U")
            )}
          </button>

          {/* AnimatePresence for account dropdown pop-up */}
          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 mt-3 w-80 bg-white rounded-2xl border border-slate-200/90 shadow-2xl py-4.5 px-4.5 z-50 flex flex-col origin-top-right text-left"
              >
                {/* Header Profile Summary */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-base font-extrabold uppercase shrink-0 overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      user.email ? user.email.charAt(0) : (user.phoneNumber ? user.phoneNumber.substring(1, 3) : "U")
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-[10px] font-extrabold tracking-wider text-slate-400 font-mono uppercase block">Ваш аккаунт</span>
                    <span className="text-sm font-extrabold text-slate-800 tracking-tight block truncate" title={user.email || user.phoneNumber || user.id}>
                      {user.email || user.phoneNumber || user.id}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5 uppercase">
                      <Sparkles className="h-2.5 w-2.5" />
                      Тариф: Безлимитный
                    </span>
                  </div>
                </div>

                {/* Account details card */}
                <div className="bg-slate-50 rounded-xl p-3 my-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Статистка использования</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-150 shadow-sm">
                      <span className="text-[10px] text-slate-400 block font-medium">Проекты</span>
                      <span className="font-extrabold text-slate-800 text-sm">{projects.length} / ∞</span>
                    </div>
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-150 shadow-sm">
                      <span className="text-[10px] text-slate-400 block font-medium">Хранилище</span>
                      <span className="font-extrabold text-emerald-600 text-sm">Облако</span>
                    </div>
                  </div>
                </div>

                {/* Important Admin Actions (Danger Zone) */}
                <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                  <div className="text-[10px] font-extrabold text-red-500 uppercase tracking-widest pl-1 mb-1">
                    Особо важные кнопки
                  </div>
                  
                  {/* Wipe Projects Button */}
                  <button
                    onClick={handleWipeAllProjects}
                    className="w-full text-left inline-flex items-center gap-2.5 p-2 rounded-xl border border-orange-100 bg-orange-50/50 hover:bg-orange-50 text-orange-700 transition-all cursor-pointer group"
                  >
                    <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0 group-hover:scale-105 transition-transform">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-orange-850 block">Очистить проекты</span>
                      <span className="text-[9px] text-orange-600 font-medium block -mt-0.5">Удалить все проекты и виджеты</span>
                    </div>
                  </button>

                  {/* Wipe Account Button */}
                  <button
                    onClick={handleWipeAccount}
                    className="w-full text-left inline-flex items-center gap-2.5 p-2 rounded-xl border border-red-105 bg-red-50/50 hover:bg-red-50 text-red-700 transition-all cursor-pointer group"
                  >
                    <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0 group-hover:scale-105 transition-transform">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-red-850 block">Удалить аккаунт</span>
                      <span className="text-[9px] text-red-500 font-medium block -mt-0.5">Стереть всё и уйти с платформы</span>
                    </div>
                  </button>
                </div>

                {/* Main Logout Action Button at the absolute bottom */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={onLogout}
                    className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer transform active:scale-98"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Выйти из аккаунта
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* LEFT PANEL: PROJECTS LIST */}
        <aside className="w-full md:w-80 bg-white/60 border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-150 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Проекты</span>
            <button
              onClick={() => setShowCreateProject(true)}
              className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200/85 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Добавить
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {projectsLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                <span className="text-xs">Загрузка проектов...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-xs text-slate-500 leading-normal mb-3 font-medium">У вас пока нет созданных проектов. Добавьте первый проект, чтобы загружать медиа!</p>
                <button
                  onClick={() => setShowCreateProject(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Создать сейчас →
                </button>
              </div>
            ) : (
              projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProjectId(proj.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 group relative ${
                    selectedProjectId === proj.id
                      ? "bg-indigo-50 border-indigo-250 text-slate-900 shadow-sm"
                      : "bg-white/80 border-slate-150 hover:border-slate-300 hover:bg-slate-50/65 text-slate-700 font-medium"
                  }`}
                >
                  <div className="overflow-hidden flex-1">
                    <h4 className="font-extrabold text-sm truncate pr-2 tracking-tight">{proj.name}</h4>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{proj.description || "Без описания"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-bold border border-slate-200">
                        {proj.widgetsCount || 0} виджетов
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteProject(proj.id, e)}
                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all cursor-pointer shrink-0 mt-0.5 rounded-lg"
                    title="Удалить проект"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* RIGHT PANEL: MAIN PROJECT DETAIL OR EMPTY PLACEHOLDER */}
        <main className="flex-1 bg-slate-50/25 flex flex-col overflow-y-auto">
          {!selectedProjectId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5 border border-indigo-150">
                <Code className="h-7 w-7 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Добро пожаловать в HostVidgets!</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                Это ваш персональный мини-хостинг виджетов. Выберите проект из левой панели или создайте новый, чтобы загрузить первые видео или фотографии и получить HTML-коды для встраивания.
              </p>
              <button
                onClick={() => setShowCreateProject(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Создать проект
              </button>
            </div>
          ) : projectDetailLoading ? (
            <div className="flex-grow flex flex-col items-center justify-center py-24 text-slate-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span className="text-sm">Загрузка виджетов проекта...</span>
            </div>
          ) : !currentProject ? (
            <div className="p-8 text-center text-slate-500">Проект не найден.</div>
          ) : (
            <div className="p-4 sm:p-8 space-y-8 max-w-5xl w-full mx-auto">
              {/* Project Header details */}
              <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{currentProject.name}</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">{currentProject.description || "У этого проекта нет описания"}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-2">ID: {currentProject.id} • Создан: {formatDate(currentProject.createdAt)}</p>
                </div>
              </div>

              {/* UPLOAD CONTAINER SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* File Upload card */}
                <div className="md:col-span-1 bg-white border border-slate-250 p-5 flex flex-col rounded-2xl shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4.5">Загрузить медиафайл</h3>
                  
                  {/* Filename modifier */}
                  <div className="mb-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Кастомное имя виджета</label>
                    <input
                      type="text"
                      placeholder="Например, Промо-видео 1"
                      value={customMediaName}
                      onChange={(e) => setCustomMediaName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Drag-and-drop Area */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 min-h-[160px] border-2 border-dashed rounded-xl p-4 text-center flex flex-col items-center justify-center group cursor-pointer transition-all ${
                      dragActive
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-slate-200 bg-slate-50 hover:border-slate-350 hover:bg-slate-100/60"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept="video/*,image/*,audio/*"
                      disabled={uploadingFile}
                    />

                    {uploadingFile ? (
                      <div className="space-y-2 flex flex-col items-center">
                        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">Файл отправляется...</span>
                        <span className="text-[10px] text-slate-500">Дождитесь сохранения на хостинг</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-7 w-7 text-slate-400 group-hover:text-indigo-600 group-hover:scale-105 transition-all mb-2.5" />
                        <span className="block text-xs font-semibold text-slate-800">Перетащите сюда файл</span>
                        <span className="block text-[10px] text-slate-550 mt-1 font-medium">или нажмите для выбора</span>
                        <span className="block text-[9px] font-mono text-indigo-700 mt-3.5 bg-indigo-50 px-2.5 py-1 rounded font-bold border border-indigo-100">
                          MEDIA до 3 ГБ
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Widgets Gallery List */}
                <div className="md:col-span-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4.5">Файлы на хостинге ({widgets.length})</h3>
                  
                  {widgets.length === 0 ? (
                    <div className="border border-slate-200 rounded-2xl py-14 px-8 text-center bg-white shadow-sm">
                      <FileText className="h-9 w-9 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-600">В этом проекте ещё нет медиафайлов</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Воспользуйтесь панелью загрузки слева, чтобы залить первое фото или видео ролики.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {widgets.map((widg) => (
                        <div
                          key={widg.id}
                          className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 hover:border-slate-300 transition-colors flex flex-col justify-between shadow-sm"
                        >
                          {/* Info */}
                          <div>
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="font-extrabold text-sm tracking-tight text-slate-900 pr-2 break-all line-clamp-1">{widg.name}</div>
                              <span className={`text-[9px] font-bold tracking-widest font-mono uppercase px-1.5 py-0.5 rounded leading-none shrink-0 ${
                                widg.type === "video" 
                                  ? "bg-violet-50 text-violet-750 border border-violet-100" 
                                  : widg.type === "audio"
                                    ? "bg-sky-50 text-sky-750 border border-sky-100"
                                    : "bg-emerald-50 text-emerald-750 border border-emerald-100"
                              }`}>
                                {widg.type}
                              </span>
                            </div>

                            <div className="flex flex-col gap-0.5 mt-2.5 text-[10px] text-slate-550 font-mono font-medium">
                              <span>Размер: {formatBytes(widg.size)}</span>
                              <span>Файл: {widg.url.split('/').pop()}</span>
                              <span>Загружен: {formatDate(widg.createdAt)}</span>
                            </div>
                          </div>

                          {/* Thumbnail preview aspect */}
                          <div className="w-full aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-250 flex items-center justify-center relative group">
                            {widg.type === "image" ? (
                              <img
                                src={widg.url}
                                alt={widg.name}
                                className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
                                referrerPolicy="no-referrer"
                              />
                            ) : widg.type === "audio" ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                                <Music className="h-7 w-7 text-sky-450 group-hover:scale-110 transition-transform animate-pulse" />
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                                <Video className="h-7 w-7 text-indigo-400 group-hover:scale-110 transition-transform animate-pulse" />
                              </div>
                            )}

                            {/* Hover Trigger Details overlay */}
                            <button
                              onClick={() => setActiveSettingsWidget(widg)}
                              className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-semibold text-white cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                              Просмотр и Настройка
                            </button>
                          </div>

                          {/* Control Row actions */}
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-150">
                            <button
                              onClick={() => setActiveSettingsWidget(widg)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-white hover:bg-slate-50 hover:text-slate-900 text-slate-750 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer shadow-sm transition-colors"
                            >
                              <Code className="h-3.5 w-3.5 text-slate-500" />
                              Получить код
                            </button>
                            <a
                              href={`${window.location.origin}/embed/${widg.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg cursor-pointer transition-colors border border-indigo-100 shrink-0 flex items-center justify-center"
                              title="Открыть секретную страничку плеера на хостинге"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteWidget(widg.id)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg cursor-pointer transition-colors border border-red-100 shrink-0"
                              title="Удалить файл с хостинга"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==========================================
          MODAL: CREATE PROJECT DIALOG
          ========================================== */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6.5 max-w-md w-full shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setShowCreateProject(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 hover:bg-slate-50 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-2">Создать новый проект</h3>
            <p className="text-xs text-slate-500 font-medium mb-5">Проекты помогают группировать ваши медиафайлы по сайтам, блокам или назначению.</p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Название проекта*</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Блог на Творческом сайте"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Описание проекта (необязательно)</label>
                <textarea
                  placeholder="Комментарий или ссылка на сайт..."
                  value={newProjectDesc}
                  rows={3}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>

              <div className="flex gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProject(false)}
                  className="flex-1 py-3 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submittingProject}
                  className="flex-1 py-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm cursor-pointer disabled:opacity-55 transition-all text-center"
                >
                  {submittingProject ? "Создание..." : "Запустить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          OVERLAY MODAL: EMBED CONFIG & COPY CODES (The heart of our widget tool!)
          ========================================== */}
      {activeSettingsWidget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
            
            {/* Header / Title */}
            <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sliders className="h-4 w-4 text-indigo-600" />
                  Код виджета & Кастомизация плеера
                </h3>
                <p className="text-[10px] text-slate-550 font-medium">Конфигурируйте поведение, стили, эффекты и копируйте готовый HTML</p>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={`${window.location.origin}/embed/${activeSettingsWidget.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all shrink-0"
                  title="Открыть секретную страницу плеера на хостинге"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Открыть в новой вкладке</span>
                </a>
                <button 
                  onClick={() => setActiveSettingsWidget(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"
                  title="Закрыть"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* PLAYGROUND PARAMETERS PANEL (Left) */}
              <div className="lg:col-span-12 xl:col-span-5 space-y-5">
                <h4 className="text-[10px] font-bold tracking-widest text-slate-800 uppercase border-b border-slate-200 pb-2">Параметры Виджета</h4>

                {/* Overlaid Title */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-2">Название плашки overlay</label>
                  <input
                    type="text"
                    value={activeSettingsWidget.settings.customTitle || ""}
                    onChange={(e) => handleUpdateWidgetSetting("customTitle", e.target.value)}
                    placeholder="Например: Наш промо-товар"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[9px] text-slate-400 font-medium mt-1">Верхняя всплывающая наклейка на медиафайле</p>
                </div>

                {/* Accent Color Picker */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Цветовой Акцент</label>
                  <div className="flex items-center gap-2 mb-2 bg-slate-50 p-2 border border-slate-200 rounded-xl">
                    {[
                      { hex: "#6366f1", label: "Синий" },
                      { hex: "#ec4899", label: "Розовый" },
                      { hex: "#10b981", label: "Зеленый" },
                      { hex: "#f59e0b", label: "Золотой" },
                      { hex: "#ef4444", label: "Красный" },
                      { hex: "#06b6d4", label: "Бирюза" }
                    ].map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => handleUpdateWidgetSetting("accentColor", col.hex)}
                        className={`h-6 w-6 rounded-full border cursor-pointer transition-all ${
                          activeSettingsWidget.settings.accentColor === col.hex
                            ? "scale-110 ring-2 ring-indigo-500 ring-offset-1"
                            : "opacity-80 hover:opacity-100 hover:scale-105"
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.label}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    value={activeSettingsWidget.settings.accentColor}
                    onChange={(e) => handleUpdateWidgetSetting("accentColor", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-905 rounded-lg px-2.5 py-1.5 text-[11px] font-mono focus:bg-white focus:outline-none"
                    placeholder="#6366f1"
                  />
                </div>

                {/* Custom Width Select */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ширина виджета на сайте</label>
                  <select
                    value={activeSettingsWidget.settings.customWidth || "100%"}
                    onChange={(e) => handleUpdateWidgetSetting("customWidth", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="100%">100% (Растягивать во весь контейнер)</option>
                    <option value="320px">320px (Мини плеер)</option>
                    <option value="480px">480px (Средний промо-блок)</option>
                    <option value="640px">640px (Широкий плеер)</option>
                    <option value="800px">800px (Extra-Wide)</option>
                  </select>
                </div>

                {/* Border and Frame Styles */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Стиль рамки / Оформление</label>
                  <select
                    value={activeSettingsWidget.settings.borderStyle || "none"}
                    onChange={(e) => handleUpdateWidgetSetting("borderStyle", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none font-semibold"
                  >
                    <option value="none">Без Рамки (Стандарт)</option>
                    <option value="thin">Тонкая Классическая</option>
                    <option value="neon">Неоновое Свечение плеера (Glow)</option>
                    <option value="retro">Ретро Операционная Система (Win 95)</option>
                    <option value="polaroid">Полароид снимок с подписью (Polaroid)</option>
                  </select>
                </div>

                {/* Filters and FX */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-2">Фильтры и Интерактивные Эффекты</label>
                  <select
                    value={activeSettingsWidget.settings.mediaEffect || "none"}
                    onChange={(e) => handleUpdateWidgetSetting("mediaEffect", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="none">Оригинал (Без эффектов)</option>
                    <option value="grayscale">Черно-белое фото/фильм (Grayscale)</option>
                    <option value="sepia">Эффект Сепия (Warm Vintage)</option>
                    <option value="vintage">Винтажный пленочный тон</option>
                    <option value="blur-hover">Размытие (Четкость только при наведении!)</option>
                    <option value="hover-scale">Зум при наведении (Interactive Scale-Up)</option>
                  </select>
                </div>

                {/* Corner Rounding Select */}
                {activeSettingsWidget.settings.borderStyle !== "retro" && activeSettingsWidget.settings.borderStyle !== "polaroid" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Угол Скругления Края</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { radius: "0px", label: "Острый" },
                        { radius: "8px", label: "Легкий" },
                        { radius: "16px", label: "Округлый" },
                        { radius: "9999px", label: "Круг" }
                      ].map((rad) => (
                        <button
                          key={rad.radius}
                          type="button"
                          onClick={() => handleUpdateWidgetSetting("borderRadius", rad.radius)}
                          className={`py-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer transition-all ${
                            activeSettingsWidget.settings.borderRadius === rad.radius
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold"
                              : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-750"
                          }`}
                        >
                          {rad.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video controls checkboxes */}
                {activeSettingsWidget.type === "video" && (
                  <div className="space-y-3 bg-slate-50 p-4 border border-slate-150 rounded-xl">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={activeSettingsWidget.settings.autoplay}
                        onChange={(e) => handleUpdateWidgetSetting("autoplay", e.target.checked)}
                        className="rounded border-slate-300 bg-white text-indigo-605 focus:ring-indigo-500/20"
                      />
                      <div>
                        <span className="block font-bold text-slate-700">Автовоспроизведение</span>
                        <span className="text-[9px] text-slate-500 font-medium">Запуск при открытии iFrame</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={activeSettingsWidget.settings.loop}
                        onChange={(e) => handleUpdateWidgetSetting("loop", e.target.checked)}
                        className="rounded border-slate-300 bg-white text-indigo-605 focus:ring-indigo-500/20"
                      />
                      <div>
                        <span className="block font-bold text-slate-700">Зацикливание</span>
                        <span className="text-[9px] text-slate-500 font-medium">Бесконечный повтор видео</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={activeSettingsWidget.settings.controls}
                        onChange={(e) => handleUpdateWidgetSetting("controls", e.target.checked)}
                        className="rounded border-slate-300 bg-white text-indigo-605 focus:ring-indigo-500/20"
                      />
                      <div>
                        <span className="block font-bold text-slate-700">Показ�                       {activeSettingsWidget.settings.borderStyle === "polaroid" ? (
                        /* POLAROID TEMPLATE */
                        <div className="bg-white p-3 pb-6 border border-slate-200 shadow-md flex flex-col items-center">
                          <div className={`w-full aspect-video bg-slate-900 overflow-hidden relative shadow-inner`}>
                            {activeSettingsWidget.type === "image" ? (
                              <img
                                src={activeSettingsWidget.url}
                                alt="preview"
                                className={`w-full h-full object-cover transition-all duration-300 ${
                                  activeSettingsWidget.settings.mediaEffect === "grayscale" ? "grayscale hover:grayscale-0" :
                                  activeSettingsWidget.settings.mediaEffect === "sepia" ? "sepia hover:sepia-0" :
                                  activeSettingsWidget.settings.mediaEffect === "vintage" ? "contrast-125 brightness-95 saturate-75 sepia-[20%]" :
                                  activeSettingsWidget.settings.mediaEffect === "blur-hover" ? "blur-sm hover:blur-none" :
                                  activeSettingsWidget.settings.mediaEffect === "hover-scale" ? "hover:scale-105" : ""
                                }`}
                                referrerPolicy="no-referrer"
                              />
                            ) : activeSettingsWidget.type === "audio" ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 select-none relative">
                                <div className="flex items-center justify-center gap-4">
                                  <div className="h-10 w-10 rounded-full flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                    <Music className="h-5 w-5 animate-pulse" style={{ color: activeSettingsWidget.settings.accentColor || '#6366f1' }} />
                                  </div>
                                  <div>
                                    <div className="text-[10px] font-bold text-slate-155 line-clamp-1 max-w-[150px]">{activeSettingsWidget.settings.customTitle || activeSettingsWidget.name}</div>
                                    <div className="text-[8px] text-slate-500 font-medium">Аудио-трек</div>
                                  </div>
                                </div>
                                {activeSettingsWidget.settings.controls && (
                                  <audio
                                    src={activeSettingsWidget.url}
                                    controls
                                    className="mt-3 w-full h-8 opacity-90 scale-90"
                                    style={{ filter: "invert(1) hue-rotate(180deg)" }}
                                  />
                                )}
                              </div>
                            ) : (
                              <video
                                src={activeSettingsWidget.url}
                                autoPlay={activeSettingsWidget.settings.autoplay}
                                loop={activeSettingsWidget.settings.loop}
                                controls={activeSettingsWidget.settings.controls}
                                muted={activeSettingsWidget.settings.muted}
                                playsInline
                                className={`w-full h-full object-contain transition-all duration-300 ${
                                  activeSettingsWidget.settings.mediaEffect === "grayscale" ? "grayscale hover:grayscale-0" :
                                  activeSettingsWidget.settings.mediaEffect === "sepia" ? "sepia hover:sepia-0" :
                                  activeSettingsWidget.settings.mediaEffect === "vintage" ? "contrast-125 brightness-95 saturate-75 sepia-[20%]" :
                                  activeSettingsWidget.settings.mediaEffect === "blur-hover" ? "blur-sm hover:blur-none" :
                                  activeSettingsWidget.settings.mediaEffect === "hover-scale" ? "hover:scale-105" : ""
                                }`}
                              />
                            )}
                          </div>= "polaroid" ? (
                        /* POLAROID TEMPLATE */
                        <div className="bg-white p-3 pb-6 border border-slate-200 shadow-md flex flex-col items-center">
                          <div className={`w-full aspect-video bg-slate-900 overflow-hidden relative shadow-inner`}>
                            {activeSettingsWidget.type === "image" ? (
                              <img
                                src={activeSettingsWidget.url}
                                alt="preview"
                                className={`w-full h-full object-cover transition-all duration-300 ${
                                  activeSettingsWidget.settings.mediaEffect === "grayscale" ? "grayscale hover:grayscale-0" :
                                  activeSettingsWidget.settings.mediaEffect === "sepia" ? "sepia hover:sepia-0" :
                                  activeSettingsWidget.settings.mediaEffect === "vintage" ? "contrast-125 brightness-95 saturate-75 sepia-[20%]" :
                                  activeSettingsWidget.settings.mediaEffect === "blur-hover" ? "blur-sm hover:blur-none" :
                                  activeSettingsWidget.settings.mediaEffect === "hover-scale" ? "hover:scale-105" : ""
                                }`}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <video
                                src={activeSettingsWidget.url}
                                autoPlay={activeSettingsWidget.settings.autoplay}
                                loop={activeSettingsWidget.settings.loop}
                                controls={activeSettingsWidget.settings.controls}
                                muted={activeSettingsWidget.settings.muted}
                                playsInline
                                className={`w-full h-full object-contain transition-all duration-300 ${
                                  activeSettingsWidget.settings.mediaEffect === "grayscale" ? "grayscale hover:grayscale-0" :
                                  activeSettingsWidget.settings.mediaEffect === "sepia" ? "sepia hover:sepia-0" :
                                  activeSettingsWidget.settings.mediaEffect === "vintage" ? "contrast-125 brightness-95 saturate-75 sepia-[20%]" :
                                  activeSettingsWidget.settings.mediaEffect === "blur-hover" ? "blur-sm hover:blur-none" :
                                  activeSettingsWidget.settings.mediaEffect === "hover-scale" ? "hover:scale-105" : ""
                                }`}
                              />
                            )}
                          </div>
                          <div className="mt-3 text-slate-800 font-mono font-bold text-xs tracking-wide select-none text-center truncate w-full px-2">
                            ✏️ {activeSettingsWidget.settings.customTitle || "Снимок " + activeSettingsWidget.name}
                          </div>
                        </div>

                      ) : activeSettingsWidget.settings.borderStyle === "retro" ? (
                        /* RETRO OS TEMPLATE */
                        <div className="border-[3px] border-t-white border-l-white border-r-slate-450 border-b-slate-450 bg-slate-200 p-1.5 shadow-[2px_2px_5px_rgba(0,0,0,0.25)] select-none">
                          <div 
                            className="px-2 py-1 text-[10px] text-white font-mono font-bold flex items-center justify-between mb-1.5"
                            style={{ backgroundColor: activeSettingsWidget.settings.accentColor || "#000080" }}
                          >
                            <span>💿 MS_WIDGET_PLAYER.EXE</span>
                            <div className="flex gap-0.5">
                              <button type="button" className="bg-slate-200 text-slate-900 border border-t-white border-l-white border-r-slate-400 border-b-slate-400 text-[8px] px-1 h-3.5 flex items-center">_</button>
                              <button type="button" className="bg-slate-200 text-slate-900 border border-t-white border-l-white border-r-slate-400 border-b-slate-400 text-[8px] px-1 h-3.5 flex items-center">🗖</button>
                              <button type="button" className="bg-slate-200 text-slate-900 border border-t-white border-l-white border-r-slate-400 border-b-slate-400 text-[8px] px-1 h-3.5 flex items-center">✕</button>
                            </div>
                          </div>
                          <div className="w-full aspect-video bg-black overflow-hidden relative border-2 border-t-slate-400 border-l-slate-400 border-r-white border-b-white">
                            {activeSettingsWidget.type === "image" ? (
                              <img
                                src={activeSettingsWidget.url}
                                alt="preview"
                                className={`w-full h-full object-cover transition-all duration-300 ${
                                  activeSettingsWidget.settings.mediaEffect === "grayscale" ? "grayscale hover:grayscale-0" :
                                  activeSettingsWidget.settings.mediaEffect === "sepia" ? "sepia hover:sepia-0" :
                                  activeSettingsWidget.settings.mediaEffect === "vintage" ? "contrast-125 brightness-95 saturate-75 sepia-[20%]" :
                                  activeSettingsWidget.settings.mediaEffect === "blur-hover" ? "blur-sm hover:blur-none" :
                                  activeSettingsWidget.settings.mediaEffect === "hover-scale" ? "hover:scale-105" : ""
                                }`}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <video
                                src={activeSettingsWidget.url}
                                autoPlay={activeSettingsWidget.settings.autoplay}
                                loop={activeSettingsWidget.settings.loop}
                                controls={activeSettingsWidget.settings.controls}
                                muted={activeSettingsWidget.settings.muted}
                                playsInline
                                className={`w-full h-full object-contain transition-all duration-300 ${
                                  activeSettingsWidget.settings.mediaEffect === "grayscale" ? "grayscale hover:grayscale-0" :
                                  activeSettingsWidget.settings.mediaEffect === "sepia" ? "sepia hover:sepia-0" :
                                  activeSettingsWidget.settings.mediaEffect === "vintage" ? "contrast-125 brightness-95 saturate-75 sepia-[20%]" :
                                  activeSettingsWidget.settings.mediaEffect === "blur-hover" ? "blur-sm hover:blur-none" :
                                  activeSettingsWidget.settings.mediaEffect === "hover-scale" ? "hover:scale-105" : ""
                                }`}
                              />
                            )}
                          </div>
                        </div>

                      ) : (
                        /* CLASSIC FLAT, NEON GLOW, OR SLIGHTLY THIN BORDERS */
                        <div 
                          className="w-full aspect-video bg-slate-950 overflow-hidden flex items-center justify-center relative transition-all duration-350"
                          style={{
                            borderRadius: activeSettingsWidget.settings.borderRadius,
                            borderWidth: activeSettingsWidget.settings.borderStyle === "neon" ? "3px" : activeSettingsWidget.settings.borderStyle === "thin" ? "1px" : "0px",
                            borderColor: activeSettingsWidget.settings.borderStyle === "neon" ? activeSettingsWidget.settings.accentColor : activeSettingsWidget.settings.borderStyle === "thin" ? "#e2e8f0" : "transparent",
                            boxShadow: activeSettingsWidget.settings.borderStyle === "neon" ? `0 0 16px ${activeSettingsWidget.settings.accentColor}` : "none",
                          }}
                        >
                          {activeSettingsWidget.type === "image" ? (
                            <div className="w-full h-full relative">
                              <img
                                src={activeSettingsWidget.url}
                                alt="preview"
                                className={`w-full h-full object-cover transition-all duration-300 ${
                                  activeSettingsWidget.settings.mediaEffect === "grayscale" ? "grayscale hover:grayscale-0" :
                                  activeSettingsWidget.settings.mediaEffect === "sepia" ? "sepia hover:sepia-0" :
                                  activeSettingsWidget.settings.mediaEffect === "vintage" ? "contrast-125 brightness-95 saturate-75 sepia-[20%]" :
                                  activeSettingsWidget.settings.mediaEffect === "blur-hover" ? "blur-sm hover:blur-none" :
                                  activeSettingsWidget.settings.mediaEffect === "hover-scale" ? "hover:scale-105" : ""
                                }`}
                                referrerPolicy="no-referrer"
                              />
                              {activeSettingsWidget.settings.customTitle && (
                                <div className="absolute top-2.5 left-2.5 rounded bg-slate-900/80 px-2.5 py-1 text-[10px] text-white font-medium" style={{ borderLeft: `3px solid ${activeSettingsWidget.settings.accentColor}` }}>
                                  {activeSettingsWidget.settings.customTitle}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-full relative">
                              <video
                                src={activeSettingsWidget.url}
                                autoPlay={activeSettingsWidget.settings.autoplay}
                                loop={activeSettingsWidget.settings.loop}
                                controls={activeSettingsWidget.settings.controls}
                                muted={activeSettingsWidget.settings.muted}
                                playsInline
                                className={`w-full h-full object-contain transition-all duration-305 ${
                                  activeSettingsWidget.settings.mediaEffect === "grayscale" ? "grayscale hover:grayscale-0" :
                                  activeSettingsWidget.settings.mediaEffect === "sepia" ? "sepia hover:sepia-0" :
                                  activeSettingsWidget.settings.mediaEffect === "vintage" ? "contrast-125 brightness-95 saturate-75 sepia-[20%]" :
                                  activeSettingsWidget.settings.mediaEffect === "blur-hover" ? "blur-sm hover:blur-none" :
                                  activeSettingsWidget.settings.mediaEffect === "hover-scale" ? "hover:scale-105" : ""
                                }`}
                              />
                              {activeSettingsWidget.settings.customTitle && (
                                <div className="absolute top-2.5 left-2.5 rounded bg-slate-900/80 px-2.5 py-1 text-[10px] text-white z-10 font-medium" style={{ borderLeft: `3px solid ${activeSettingsWidget.settings.accentColor}` }}>
                                  {activeSettingsWidget.settings.customTitle}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* EMBD CODES COPIER SECTIONS (Our main goal!) */}
                <div className="space-y-5">
                  <div className="border-t border-slate-200/60 pt-4">
                    <h5 className="text-[11px] font-black tracking-widest text-indigo-700 uppercase mb-3 flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5" />
                      Интеграция виджета на Ваш сайт
                    </h5>
                  </div>

                  {/* 1. SECRET DIRECT PLAYER LINK */}
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">
                        Секретная ссылка плеера
                      </label>
                      <button
                        onClick={() => {
                          const secretLink = `${window.location.origin}/embed/${activeSettingsWidget.id}`;
                          copyCodeToClipboard(secretLink, "secretSec");
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedType === "secretSec" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedType === "secretSec" ? "Скопировано! ✓" : "Скопировать ссылку"}
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono text-indigo-950 bg-slate-100/75 p-3 rounded-xl border border-slate-200 overflow-x-auto select-all leading-relaxed font-semibold">
                      {`${window.location.origin}/embed/${activeSettingsWidget.id}`}
                    </pre>
                  </div>

                  {/* DIRECT TAG EMBED - NOW PRIMARY INTEGRATION WEB-CODE */}
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">
                        HTML Код для вставки на сайт
                      </label>
                      <button
                        onClick={() => {
                          const mediaUrl = getAbsoluteMediaUrl(activeSettingsWidget.url);
                          const radius = activeSettingsWidget.settings.borderRadius || '8px';
                          const width = activeSettingsWidget.settings.customWidth || '100%';
                          const isNeon = activeSettingsWidget.settings.borderStyle === 'neon';
                          const accent = activeSettingsWidget.settings.accentColor || '#6366f1';
                          const inlineCode = activeSettingsWidget.type === "video" 
                            ? `<div style="position: relative; width: 100%; max-width: ${width}; border-radius: ${radius}; overflow: hidden; border: ${isNeon ? '2px solid ' + accent : 'none'}; box-shadow: ${isNeon ? '0 0 15px ' + accent : 'none'}; box-sizing: border-box; background: #000;">
  <video src="${mediaUrl}" controls ${activeSettingsWidget.settings.autoplay ? 'autoplay' : ''} ${activeSettingsWidget.settings.loop ? 'loop' : ''} ${activeSettingsWidget.settings.muted ? 'muted' : ''} style="width: 100%; display: block; border-radius: ${radius}; pointer-events: auto; outline: none;"></video>
</div>`
                            : `<div style="position: relative; width: 100%; max-width: ${width}; border-radius: ${radius}; overflow: hidden; border: ${isNeon ? '2px solid ' + accent : 'none'}; box-shadow: ${isNeon ? '0 0 15px ' + accent : 'none'}; box-sizing: border-box; background: #000;">
  <img src="${mediaUrl}" alt="${activeSettingsWidget.name}" style="width: 100%; display: block; border-radius: ${radius}; object-fit: cover; outline: none;" />
</div>`;
                          copyCodeToClipboard(inlineCode, "inline");
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedType === "inline" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedType === "inline" ? "Скопировано! ✓" : "Скопировать тег"}
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono text-indigo-950 bg-slate-100/75 p-3 rounded-xl border border-slate-200 overflow-x-auto select-all leading-relaxed font-semibold">
                      {activeSettingsWidget.type === "video" 
                        ? `<div style="position: relative; width: 100%; max-width: ${activeSettingsWidget.settings.customWidth || '100%'}; border-radius: ${activeSettingsWidget.settings.borderRadius || '8px'}; overflow: hidden; border: ${activeSettingsWidget.settings.borderStyle === 'neon' ? '2px solid ' + activeSettingsWidget.settings.accentColor : 'none'}; box-shadow: ${activeSettingsWidget.settings.borderStyle === 'neon' ? '0 0 15px ' + activeSettingsWidget.settings.accentColor : 'none'}; box-sizing: border-box; background: #000;">
  <video src="${getAbsoluteMediaUrl(activeSettingsWidget.url)}" controls ${activeSettingsWidget.settings.autoplay ? 'autoplay' : ''} ${activeSettingsWidget.settings.loop ? 'loop' : ''} ${activeSettingsWidget.settings.muted ? 'muted' : ''} style="width: 100%; display: block; border-radius: ${activeSettingsWidget.settings.borderRadius || '8px'}; pointer-events: auto; outline: none;"></video>
</div>`
                        : `<div style="position: relative; width: 100%; max-width: ${activeSettingsWidget.settings.customWidth || '100%'}; border-radius: ${activeSettingsWidget.settings.borderRadius || '8px'}; overflow: hidden; border: ${activeSettingsWidget.settings.borderStyle === 'neon' ? '2px solid ' + activeSettingsWidget.settings.accentColor : 'none'}; box-shadow: ${activeSettingsWidget.settings.borderStyle === 'neon' ? '0 0 15px ' + activeSettingsWidget.settings.accentColor : 'none'}; box-sizing: border-box; background: #000;">
  <img src="${getAbsoluteMediaUrl(activeSettingsWidget.url)}" alt="${activeSettingsWidget.name}" style="width: 100%; display: block; border-radius: ${activeSettingsWidget.settings.borderRadius || '8px'}; object-fit: cover; outline: none;" />
</div>`
                      }
                    </pre>
                  </div>

                </div>
              </div>

            </div>

            {/* Footer Modal actions */}
            <div className="p-4 border-t border-slate-150 bg-slate-50/80 text-right">
              <button
                onClick={() => setActiveSettingsWidget(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer transition-colors"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog Modal */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200/80"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 text-red-650 mb-3 border-b border-slate-100 pb-3">
                  <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                    <ShieldAlert className="h-5.5 w-5.5 text-red-600" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide font-sans">
                    {confirmDialog.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-650 leading-relaxed font-semibold whitespace-pre-line px-1">
                  {confirmDialog.message}
                </p>
              </div>
              <div className="bg-slate-50/90 px-6 py-4.5 flex items-center justify-end gap-2.5 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer transition-all active:scale-95"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className={`px-4.5 py-2 rounded-xl text-xs font-black text-white hover:shadow-md cursor-pointer transition-all active:scale-95 ${
                    confirmDialog.isDanger ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {confirmDialog.confirmText || "Подтвердить"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
