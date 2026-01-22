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

// Project types
export interface IProject {
  _id?: string | Types.ObjectId;
  userId: Types.ObjectId;
  videoUrl: string;
  platform: 'YOUTUBE' | 'CHZZK';
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
  notes: string | INote[]; // Support both string (raw text) and structured notes
  isAutoCollected: boolean;
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
  platform: 'YOUTUBE' | 'CHZZK';
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
export type VideoPlatform = 'YOUTUBE' | 'CHZZK' | 'UNKNOWN';

export interface VideoInfo {
  platform: VideoPlatform;
  videoId: string;
  url: string;
}
