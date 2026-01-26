import fs from 'fs';
import path from 'path';

// JSON DB storage path
const DB_PATH = path.join(process.cwd(), '.dev-db');
const USERS_FILE = path.join(DB_PATH, 'users.json');
const PROJECTS_FILE = path.join(DB_PATH, 'projects.json');
const FOLDERS_FILE = path.join(DB_PATH, 'folders.json');
const ANALYSIS_CACHE_FILE = path.join(DB_PATH, 'analysis-cache.json');
const SHARED_PROJECTS_FILE = path.join(DB_PATH, 'shared-projects.json');

// Ensure DB directory exists
function ensureDbDir() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
  }
}

// Read JSON file
function readJsonFile<T>(filePath: string): T[] {
  ensureDbDir();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

// Write JSON file
function writeJsonFile<T>(filePath: string, data: T[]) {
  ensureDbDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Generic CRUD operations
class JsonCollection<T extends { _id?: string }> {
  constructor(private filePath: string) {}

  find(query?: Partial<T>): T[] {
    const items = readJsonFile<T>(this.filePath);
    if (!query) return items;

    return items.filter((item) => {
      return Object.entries(query).every(([key, value]) => {
        const itemValue = item[key as keyof T];
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(itemValue) === JSON.stringify(value);
        }
        return itemValue === value;
      });
    });
  }

  findOne(query: Partial<T>): T | null {
    const results = this.find(query);
    return results.length > 0 ? results[0] : null;
  }

  findById(id: string): T | null {
    return this.findOne({ _id: id } as Partial<T>);
  }

  create(data: Omit<T, '_id'>): T {
    const items = readJsonFile<T>(this.filePath);
    const newItem = {
      ...data,
      _id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as T;
    items.push(newItem);
    writeJsonFile(this.filePath, items);
    return newItem;
  }

  findByIdAndUpdate(id: string, update: Partial<T> | { $set?: Partial<T>; $inc?: Partial<Record<keyof T, number>> }): T | null {
    const items = readJsonFile<T>(this.filePath);
    const index = items.findIndex((item) => item._id === id);
    
    if (index === -1) return null;

    let updatedItem = { ...items[index] };

    // Check if update uses MongoDB operators
    const hasOperators = '$set' in update || '$inc' in update;
    
    if (hasOperators) {
      const mongoUpdate = update as { $set?: Partial<T>; $inc?: Partial<Record<keyof T, number>> };
      
      // Handle $set
      if (mongoUpdate.$set) {
        updatedItem = { ...updatedItem, ...mongoUpdate.$set };
      }

      // Handle $inc
      if (mongoUpdate.$inc) {
        Object.entries(mongoUpdate.$inc).forEach(([key, value]) => {
          const currentValue = updatedItem[key as keyof T];
          if (typeof currentValue === 'number' && typeof value === 'number') {
            (updatedItem[key as keyof T] as unknown as number) = currentValue + value;
          }
        });
      }
    } else {
      // Direct update (merge fields)
      updatedItem = {
        ...updatedItem,
        ...(update as Partial<T>),
        _id: items[index]._id, // Preserve original ID
      };
    }

    (updatedItem as { updatedAt?: string }).updatedAt = new Date().toISOString();
    items[index] = updatedItem;
    writeJsonFile(this.filePath, items);
    return updatedItem;
  }

  findOneAndUpdate(query: Partial<T>, update: Partial<T> | { $set?: Partial<T>; $inc?: Partial<Record<keyof T, number>> }): T | null {
    const item = this.findOne(query);
    if (!item || !item._id) return null;
    return this.findByIdAndUpdate(item._id, update);
  }

  updateOne(query: Partial<T>, update: { $set?: Partial<T>; $inc?: Partial<Record<keyof T, number>> }): boolean {
    const item = this.findOne(query);
    if (!item || !item._id) return false;

    const items = readJsonFile<T>(this.filePath);
    const index = items.findIndex((i) => i._id === item._id);
    
    if (index === -1) return false;

    let updatedItem = { ...items[index] };

    // Handle $set
    if (update.$set) {
      updatedItem = { ...updatedItem, ...update.$set };
    }

    // Handle $inc
    if (update.$inc) {
      Object.entries(update.$inc).forEach(([key, value]) => {
        const currentValue = updatedItem[key as keyof T];
        if (typeof currentValue === 'number' && typeof value === 'number') {
          (updatedItem[key as keyof T] as unknown as number) = currentValue + value;
        }
      });
    }

    (updatedItem as { updatedAt?: string }).updatedAt = new Date().toISOString();
    items[index] = updatedItem;
    writeJsonFile(this.filePath, items);
    return true;
  }

  findByIdAndDelete(id: string): T | null {
    const items = readJsonFile<T>(this.filePath);
    const index = items.findIndex((item) => item._id === id);
    
    if (index === -1) return null;

    const deletedItem = items[index];
    items.splice(index, 1);
    writeJsonFile(this.filePath, items);
    return deletedItem;
  }

  findOneAndDelete(query: Partial<T>): T | null {
    const item = this.findOne(query);
    if (!item || !item._id) return null;
    return this.findByIdAndDelete(item._id);
  }

  deleteMany(query: Partial<T>): number {
    const items = readJsonFile<T>(this.filePath);
    const toDelete = this.find(query);
    const idsToDelete = new Set(toDelete.map((item) => item._id));
    const remaining = items.filter((item) => !idsToDelete.has(item._id));
    writeJsonFile(this.filePath, remaining);
    return toDelete.length;
  }

  countDocuments(query?: Partial<T>): number {
    return this.find(query).length;
  }

  // Mongoose-like chainable methods
  sort(sortFn: (a: T, b: T) => number): T[] {
    return this.find().sort(sortFn);
  }

  lean(): T[] {
    return this.find();
  }
}

// Type definitions
interface JsonUser {
  _id?: string;
  email: string;
  name?: string;
  image?: string;
  points: number;
  role: 'FREE' | 'PRO';
  savedChannels: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface JsonProject {
  _id?: string;
  userId: string;
  folderId?: string | null; // null = uncategorized (root level)
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
  order?: number; // for manual sorting within folder
  createdAt?: string;
  updatedAt?: string;
}

interface JsonFolder {
  _id?: string;
  userId: string;
  name: string;
  parentId?: string | null; // null = root level
  color?: string;
  icon?: string;
  order: number;
  depth: number; // 0 = root, max 2 (3 levels total)
  autoCollectChannelId?: string;
  autoCollectPlatform?: 'YOUTUBE' | 'CHZZK' | 'TWITCH';
  createdAt?: string;
  updatedAt?: string;
}

interface JsonAnalysisCache {
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
  cachedAt?: string;
}

interface JsonSharedProject {
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
  createdAt?: string;
  expiresAt?: string;
}

// Export collections
export const JsonDB = {
  User: new JsonCollection<JsonUser>(USERS_FILE),
  Project: new JsonCollection<JsonProject>(PROJECTS_FILE),
  Folder: new JsonCollection<JsonFolder>(FOLDERS_FILE),
  AnalysisCache: new JsonCollection<JsonAnalysisCache>(ANALYSIS_CACHE_FILE),
  SharedProject: new JsonCollection<JsonSharedProject>(SHARED_PROJECTS_FILE),
};

// Initialize dev user if not exists
export function initializeDevUser() {
  const existingUser = JsonDB.User.findOne({ email: 'dev@clipnote.local' });
  if (!existingUser) {
    const items = readJsonFile<JsonUser>(USERS_FILE);
    const newUser = {
      _id: 'dev-user-id', // Fixed ID for development
      email: 'dev@clipnote.local',
      name: 'Development User',
      points: 10000,
      role: 'PRO' as const,
      savedChannels: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items.push(newUser);
    writeJsonFile(USERS_FILE, items);
    console.log('[JSON-DB] Development user created with 10000 points');
  }
}

// Auto-initialize on import in development
if (process.env.NODE_ENV === 'development') {
  initializeDevUser();
}
