/**
 * Database Adapter - Switches between MongoDB and JSON-DB
 *
 * MONGODB_URI present → MongoDB (Mongoose)
 * MONGODB_URI absent  → JSON-DB (local files)
 *
 * NODE_ENV is irrelevant for switching.
 */

import { JsonDB } from './json-db';

const USE_MONGODB = !!process.env.MONGODB_URI;

// Common interface types for DB records
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

// The shape returned by getDB()
export interface DB {
  User: any;
  Project: any;
  Folder: any;
  AnalysisCache: any;
  SharedProject: any;
}

// Cached promise so Mongoose models are only loaded once
let _dbPromise: Promise<DB> | null = null;

function getDBPromise(): Promise<DB> {
  if (_dbPromise) return _dbPromise;

  if (USE_MONGODB) {
    _dbPromise = (async () => {
      const connectMongo = (await import('./mongodb')).default;
      const conn = await connectMongo();
      console.log(`[DB Adapter] MongoDB connected: ${conn.host}/${conn.name}`);
      const { User } = await import('@/models/User');
      const { Project } = await import('@/models/Project');
      const { Folder } = await import('@/models/Folder');
      const { AnalysisCache } = await import('@/models/AnalysisCache');
      const { SharedProject } = await import('@/models/SharedProject');
      return { User, Project, Folder, AnalysisCache, SharedProject };
    })();
  } else {
    _dbPromise = Promise.resolve({
      User: JsonDB.User,
      Project: JsonDB.Project,
      Folder: JsonDB.Folder,
      AnalysisCache: JsonDB.AnalysisCache,
      SharedProject: JsonDB.SharedProject,
    });
  }

  return _dbPromise;
}

/**
 * Get database instance.
 * Always returns a Promise so callers use `const db = await getDB()`.
 * Both Mongoose models and JsonDB collections expose the same method names
 * (find, findOne, findById, create, findByIdAndUpdate, findOneAndUpdate, etc.)
 */
export async function getDB(): Promise<DB> {
  return getDBPromise();
}

/**
 * Ensure DB connection is established (no-op for JSON-DB).
 */
export async function connectDB() {
  if (USE_MONGODB) {
    const connectMongo = (await import('./mongodb')).default;
    await connectMongo();
  }
}

// Log which database is being used (once at startup)
if (typeof process !== 'undefined') {
  console.log(`[DB Adapter] Using ${USE_MONGODB ? 'MongoDB' : 'JSON-DB (local files)'}`);
}
