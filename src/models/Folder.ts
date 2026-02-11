import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IFolder } from '@/types';

export interface FolderDocument extends IFolder, Document {
  _id: mongoose.Types.ObjectId;
}

const FolderSchema = new Schema<FolderDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    parentId: {
      type: String,
      default: null,
      index: true,
    },
    color: {
      type: String,
      default: null,
    },
    icon: {
      type: String,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
    depth: {
      type: Number,
      default: 0,
      min: 0,
      max: 2, // Maximum 3 levels (0, 1, 2)
    },
    // Subscription feature: auto-collect from channel
    autoCollectChannelId: {
      type: String,
      default: null,
    },
    autoCollectPlatform: {
      type: String,
      enum: ['YOUTUBE', 'CHZZK', 'TWITCH', null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
FolderSchema.index({ userId: 1, parentId: 1, order: 1 });
FolderSchema.index({ userId: 1, depth: 1 });

// Virtual for getting children count (useful for UI)
FolderSchema.virtual('hasChildren', {
  ref: 'Folder',
  localField: '_id',
  foreignField: 'parentId',
  count: true,
});

export const Folder: Model<FolderDocument> =
  mongoose.models.Folder || mongoose.model<FolderDocument>('Folder', FolderSchema);
