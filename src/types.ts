export interface User {
  id: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  createdAt: string;
}

export interface WidgetSettings {
  autoplay: boolean;
  loop: boolean;
  controls: boolean;
  muted: boolean;
  accentColor: string; // Hex color or class
  borderRadius: string; // '0px' | '8px' | '16px' | '9999px'
  customTitle: string;
  aspectRatio: string; // 'auto' | '16/9' | '4/3' | '1/1'
  // Customization additions
  customWidth: string; // '100%' | '320px' | '480px' | '640px' | '800px'
  borderStyle: 'none' | 'thin' | 'neon' | 'retro' | 'polaroid';
  gradientBg: string; // Presets for panel wrapper
  mediaEffect: 'none' | 'grayscale' | 'sepia' | 'vintage' | 'blur-hover' | 'hover-scale';
}

export interface Widget {
  id: string;
  projectId: string;
  name: string;
  type: 'video' | 'image' | 'audio';
  url: string; // URL of the media file hosted on the server
  originalName: string;
  size: number;
  createdAt: string;
  settings: WidgetSettings;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: string;
  widgetsCount?: number;
}
