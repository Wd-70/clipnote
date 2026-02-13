import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IProject, INote } from '@/types';

export interface ProjectDocument extends IProject, Document {
  _id: mongoose.Types.ObjectId;
}

const NoteSchema = new Schema<INote>(
  {
    startTime: {
      type: Number,
      required: true,
    },
    endTime: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ProjectSchema = new Schema<ProjectDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    folderId: {
      type: String,
      default: null,
      index: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      enum: ['YOUTUBE', 'CHZZK', 'TWITCH'],
      required: true,
    },
    videoId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Untitled Project',
    },
    thumbnailUrl: String,
    duration: Number,
    channelId: String,
    channelName: String,
    notes: {
      type: Schema.Types.Mixed,
      default: '',
    },
    isAutoCollected: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
    shareId: {
      type: String,
      default: null,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    shareViewCount: {
      type: Number,
      default: 0,
    },
    isLive: {
      type: Boolean,
      default: false,
    },
    liveChannelId: String,
    liveOpenDate: String,
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
ProjectSchema.index({ userId: 1, createdAt: -1 });
ProjectSchema.index({ userId: 1, folderId: 1, order: 1 });
ProjectSchema.index({ videoId: 1, platform: 1 });
ProjectSchema.index({ shareId: 1 }, { unique: true, sparse: true });

// In development, delete cached model to pick up schema changes on hot reload
if (process.env.NODE_ENV !== 'production') {
  delete mongoose.models.Project;
}

export const Project: Model<ProjectDocument> =
  mongoose.models.Project || mongoose.model<ProjectDocument>('Project', ProjectSchema);
