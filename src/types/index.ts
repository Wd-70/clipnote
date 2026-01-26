import { Types } from 'mongoose';

// User types
export interface IUser {
  email: string;
  name?: string;
  image?: string;
  points: number;
  role: 'FREE' | 'PRO';
  savedChannels: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Note/Clip types
export interface INote {
  startTime: number;
  endTime: number;
  text: string;
  timestamp: Date;
}

// Folder types
export interface IFolder {
  _id?: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  name: string;
  parentId?: string | null; // null = root level
  color?: string; // optional folder color for visual distinction
  icon?: string; // optional icon name (lucide icon)
  order: number; // for manual sorting
  depth: number; // 0 = root, max 2 (3 levels total)
  // Subscription feature: auto-collect from channel
  autoCollectChannelId?: string;
  autoCollectPlatform?: 'YOUTUBE' | 'CHZZK' | 'TWITCH';
  createdAt: Date;
  updatedAt: Date;
}

// Project types
export interface IProject {
  _id?: string | Types.ObjectId;
  userId: Types.ObjectId;
  folderId?: string | null; // null = uncategorized (root level)
  videoUrl: string;
  platform: 'YOUTUBE' | 'CHZZK' | 'TWITCH';
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
  notes: string | INote[]; // Support both string (raw text) and structured notes
  isAutoCollected: boolean;
  order?: number; // for manual sorting within folder
  createdAt: Date;
  updatedAt: Date;
}

// Analysis types
export interface IHighlight {
  start: number;
  end: number;
  reason: string;
  score: number;
}

export interface IAnalysisResult {
  summary: string;
  highlights: IHighlight[];
}

export interface IAnalysisCache {
  videoId: string;
  platform: 'YOUTUBE' | 'CHZZK' | 'TWITCH';
  duration: number;
  analysisResult: IAnalysisResult;
  cachedAt: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// Parsed clip from notes
export interface ParsedClip {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  duration: number;
}

// Video platform detection
export type VideoPlatform = 'YOUTUBE' | 'CHZZK' | 'TWITCH' | 'UNKNOWN';

export interface VideoInfo {
  platform: VideoPlatform;
  videoId: string;
  url: string;
}
