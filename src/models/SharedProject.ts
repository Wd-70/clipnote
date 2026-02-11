import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISharedClip {
  startTime: number;
  endTime: number;
  text: string;
}

export interface ISharedProject {
  shareId: string;
  projectId: string | mongoose.Types.ObjectId;
  userId: string | mongoose.Types.ObjectId;
  title: string;
  videoUrl: string;
  platform: 'YOUTUBE' | 'CHZZK';
  videoId: string;
  thumbnailUrl?: string;
  clips: ISharedClip[];
  viewCount: number;
  createdAt: Date;
  expiresAt?: Date;
}

export interface SharedProjectDocument extends ISharedProject, Document {
  _id: mongoose.Types.ObjectId;
}

const SharedClipSchema = new Schema<ISharedClip>(
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
  },
  { _id: false }
);

const SharedProjectSchema = new Schema<SharedProjectDocument>(
  {
    shareId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    projectId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
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
    },
    thumbnailUrl: String,
    clips: {
      type: [SharedClipSchema],
      default: [],
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    expiresAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
SharedProjectSchema.index({ shareId: 1 });
SharedProjectSchema.index({ userId: 1, createdAt: -1 });

export const SharedProject: Model<SharedProjectDocument> =
  mongoose.models.SharedProject || mongoose.model<SharedProjectDocument>('SharedProject', SharedProjectSchema);
