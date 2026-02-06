/**
 * Database Adapter - Switches between MongoDB and JSON-DB based on environment
 * 
 * In development: Uses JSON files (.dev-db/)
 * In production: Uses MongoDB
 */

import { JsonDB } from './json-db';

// Check if MongoDB is available
const USE_MONGODB = process.env.MONGODB_URI && process.env.NODE_ENV === 'production';

// Common interface for database operations
export interface DBUser {
  _id?: string;
  email: string;
  name?: string;
  image?: string;
  points: number;
  role: 'FREE' | 'PRO';
  savedChannels: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface DBProject {
  _id?: string;
  userId: string;
  folderId?: string | null;
  videoUrl: string;
  platform: 'YOUTUBE' | 'CHZZK' | 'TWITCH';
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
  notes: Array<{
    startTime: number;
    endTime: number;
    text: string;
    timestamp: string;
  }>;
  isAutoCollected: boolean;
  order?: number;
  // Share settings
  shareId?: string;
  isShared?: boolean;
  shareViewCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface DBFolder {
  _id?: string;
  userId: string;
  name: string;
  parentId?: string | null;
  color?: string;
  icon?: string;
  order: number;
  depth: number;
  autoCollectChannelId?: string;
  autoCollectPlatform?: 'YOUTUBE' | 'CHZZK' | 'TWITCH';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface DBAnalysisCache {
  _id?: string;
  videoId: string;
  platform: 'YOUTUBE' | 'CHZZK' | 'TWITCH';
  duration: number;
  analysisResult: {
    summary: string;
    highlights: Array<{
      start: number;
      end: number;
      reason: string;
      score: number;
    }>;
  };
  cachedAt?: Date | string;
}

export interface DBSharedProject {
  _id?: string;
  shareId: string;
  projectId: string;
  userId: string;
  title: string;
  videoUrl: string;
  platform: 'YOUTUBE' | 'CHZZK' | 'TWITCH';
  videoId: string;
  thumbnailUrl?: string;
  clips: Array<{
    startTime: number;
    endTime: number;
    text: string;
  }>;
  viewCount: number;
  createdAt?: Date | string;
  expiresAt?: Date | string;
}

// Export appropriate database based on environment
export const db = USE_MONGODB 
  ? (async () => {
      const connectMongo = (await import('./mongodb')).default;
      await connectMongo();
      const { User } = await import('@/models/User');
      const { Project } = await import('@/models/Project');
      const { Folder } = await import('@/models/Folder');
      const { AnalysisCache } = await import('@/models/AnalysisCache');
      const { SharedProject } = await import('@/models/SharedProject');
      return { User, Project, Folder, AnalysisCache, SharedProject };
    })()
  : Promise.resolve({
      User: JsonDB.User,
      Project: JsonDB.Project,
      Folder: JsonDB.Folder,
      AnalysisCache: JsonDB.AnalysisCache,
      SharedProject: JsonDB.SharedProject,
    });

// Helper function to get database instance
export async function getDB() {
  return db;
}

// Connection helper (no-op for JSON-DB)
export async function connectDB() {
  if (USE_MONGODB) {
    const connectMongo = (await import('./mongodb')).default;
    await connectMongo();
  }
  // JSON-DB doesn't need connection
}

// Log which database is being used
if (process.env.NODE_ENV === 'development') {
  console.log(`[DB Adapter] Using ${USE_MONGODB ? 'MongoDB' : 'JSON-DB (local files)'}`);
}
