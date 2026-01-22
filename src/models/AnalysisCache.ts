import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IAnalysisCache, IHighlight, IAnalysisResult } from '@/types';

export interface AnalysisCacheDocument extends IAnalysisCache, Document {
  _id: mongoose.Types.ObjectId;
}

const HighlightSchema = new Schema<IHighlight>(
  {
    start: {
      type: Number,
      required: true,
    },
    end: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const AnalysisResultSchema = new Schema<IAnalysisResult>(
  {
    summary: {
      type: String,
      required: true,
    },
    highlights: {
      type: [HighlightSchema],
      default: [],
    },
  },
  { _id: false }
);

const AnalysisCacheSchema = new Schema<AnalysisCacheDocument>(
  {
    videoId: {
      type: String,
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['YOUTUBE', 'CHZZK'],
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    analysisResult: {
      type: AnalysisResultSchema,
      required: true,
    },
    cachedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Unique compound index for videoId + platform
AnalysisCacheSchema.index({ videoId: 1, platform: 1 }, { unique: true });

export const AnalysisCache: Model<AnalysisCacheDocument> =
  mongoose.models.AnalysisCache ||
  mongoose.model<AnalysisCacheDocument>('AnalysisCache', AnalysisCacheSchema);
