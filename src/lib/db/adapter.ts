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
  videoUrl: string;
  platform: 'YOUTUBE' | 'CHZZK';
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
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface DBAnalysisCache {
  _id?: string;
  videoId: string;
  platform: 'YOUTUBE' | 'CHZZK';
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

// Export appropriate database based on environment
export const db = USE_MONGODB 
  ? (async () => {
      const connectMongo = (await import('./mongodb')).default;
      await connectMongo();
      const { User } = await import('@/models/User');
      const { Project } = await import('@/models/Project');
      const { AnalysisCache } = await import('@/models/AnalysisCache');
      return { User, Project, AnalysisCache };
    })()
  : Promise.resolve({
      User: JsonDB.User,
      Project: JsonDB.Project,
      AnalysisCache: JsonDB.AnalysisCache,
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
