# AGENTS.md - ClipNote Development Guide

> AI & Metadata-based Video Clipping Helper Service
> "Write notes, get clips" - Virtual editing without touching original video files

## Project Overview

ClipNote is a Next.js 14+ web service that enables video editing through text-based timeline notes.
Core philosophy: lightweight web editing via `seekTo()` control instead of heavy video editors.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: MongoDB Atlas with Mongoose ODM
- **Auth**: NextAuth.js (Google/Naver OAuth + MongoDB adapter)
- **Video**: hls.js, react-player (frontend), FFmpeg + yt-dlp (backend)
- **AI**: Google Gemini 1.5 Flash (multimodal audio/video analysis)
- **Payments**: Portone API (credit system)

---

## Build / Lint / Test Commands

```bash
# Development
npm run dev           # Start dev server (default: localhost:3000)

# Build
npm run build         # Production build
npm run start         # Start production server

# Linting & Formatting
npm run lint          # ESLint check
npm run lint:fix      # ESLint auto-fix
npm run format        # Prettier format (if configured)

# Type Checking
npm run typecheck     # or: npx tsc --noEmit

# Testing
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test -- path/to/file.test.ts    # Single test file
npm run test -- -t "test name"          # Run specific test by name
```

---

## Code Style Guidelines

### File & Folder Structure

```
app/
├── api/                 # API Routes (Route Handlers)
│   ├── analyze/route.ts
│   ├── projects/[id]/route.ts
│   ├── points/charge/route.ts
│   └── chzzk/chat/route.ts
├── (auth)/              # Auth-related pages (grouped)
├── dashboard/           # Main dashboard
└── layout.tsx
components/
├── ui/                  # Primitive UI components
├── video/               # Video player components
└── editor/              # Editor-related components
lib/
├── db/                  # Database connection & utilities
├── ai/                  # Gemini API integration
└── utils/               # Shared utilities
models/                  # Mongoose schemas
├── User.ts
├── Project.ts
└── AnalysisCache.ts
```

### Imports

Order imports consistently:

```typescript
// 1. React/Next.js core
import { useState, useEffect } from 'react';
import { NextRequest, NextResponse } from 'next/server';

// 2. Third-party libraries
import mongoose from 'mongoose';

// 3. Internal modules (absolute paths preferred)
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';

// 4. Types (if separate)
import type { UserDocument } from '@/types';

// 5. Styles (if any)
import styles from './Component.module.css';
```

### TypeScript

- **Strict mode enabled** - no `any`, `@ts-ignore`, or `@ts-expect-error`
- Define explicit types for API responses and database documents
- Use Mongoose typed schemas:

```typescript
// models/User.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser {
  email: string;
  name?: string;
  points: number;
  role: 'FREE' | 'PRO';
  savedChannels: string[];
  createdAt: Date;
}

export interface UserDocument extends IUser, Document {}

const UserSchema = new Schema<UserDocument>({
  email: { type: String, required: true, unique: true },
  name: String,
  points: { type: Number, default: 0 },
  role: { type: String, enum: ['FREE', 'PRO'], default: 'FREE' },
  savedChannels: [String],
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `VideoPlayer.tsx` |
| Hooks | camelCase with `use` prefix | `useVideoSync.ts` |
| Utilities | camelCase | `parseTimestamp.ts` |
| API Routes | lowercase route.ts | `app/api/analyze/route.ts` |
| Types/Interfaces | PascalCase with `I` prefix for interfaces | `IUser`, `UserDocument` |
| Constants | SCREAMING_SNAKE_CASE | `POINTS_PER_MINUTE` |
| Database fields | camelCase | `videoId`, `startTime` |

### Error Handling

API Routes pattern:

```typescript
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    
    // Validate required fields
    if (!body.videoId) {
      return NextResponse.json(
        { error: 'videoId is required' },
        { status: 400 }
      );
    }
    
    // Business logic...
    
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[API /analyze]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Key Business Logic

**Points System**: 1 point = 1 minute of analysis = 5 KRW

```typescript
// Calculate points needed for video analysis
const pointsRequired = Math.ceil(videoDurationMinutes);

// Check cache before AI call (cost optimization)
const cached = await AnalysisCache.findOne({ videoId, platform });
if (cached) {
  // Use cached result - 100% profit margin
  return cached.analysisResult;
}

// Deduct points before expensive AI call
await User.updateOne({ _id: userId }, { $inc: { points: -pointsRequired } });
```

**Virtual Editing**: Control playback via `seekTo()`, monitor `currentTime`:

```typescript
// Watch currentTime at 100ms intervals
// When reaching clip endTime, seekTo next clip's startTime
if (currentTime >= currentClip.endTime) {
  playerRef.current?.seekTo(nextClip.startTime, 'seconds');
}
```

**Timestamp Parsing**: Parse `01:20.5 - 01:35.0` format to seconds:

```typescript
// Regex pattern: MM:SS.d - MM:SS.d
const timestampRegex = /(\d{1,2}):(\d{2})(?:\.(\d+))?\s*-\s*(\d{1,2}):(\d{2})(?:\.(\d+))?/;
```

---

## AI Analysis Cost Optimization

1. **Audio-First**: Extract audio stream only → Gemini Flash analysis
2. **Selective Multimodal**: Only analyze AI-flagged segments (~5-10% of video)
3. **Global Caching**: Store results in `AnalysisCache` collection
   - First requester: ~210 KRW/hour cost
   - Subsequent requesters: 0 cost, 300 KRW revenue

---

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Analyze video (cache check → AI → save) |
| GET | `/api/projects` | List user's projects |
| PATCH | `/api/projects/[id]` | Update project notes |
| POST | `/api/points/charge` | Credit points after Portone payment |
| GET | `/api/chzzk/chat` | Extract chat logs for VOD |

---

## Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://...

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...

# AI
GEMINI_API_KEY=...

# Payments
PORTONE_API_KEY=...
PORTONE_API_SECRET=...
```

---

## Development Notes

- Always check `AnalysisCache` before calling Gemini API
- Deduct points BEFORE making AI calls (prevent abuse)
- Use `index: true` on frequently queried fields (`videoId`)
- Platform enum: `'YOUTUBE' | 'CHZZK'`
- Video export: Free tier gets FFmpeg command, Pro tier gets server-side processing
