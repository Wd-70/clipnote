import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IUser } from '@/types';

export interface UserDocument extends IUser, Document {
  _id: mongoose.Types.ObjectId;
}

interface UserModel extends Model<UserDocument> {
  findByEmail(email: string): Promise<UserDocument | null>;
}

const UserSchema = new Schema<UserDocument, UserModel>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: String,
    image: String,
    points: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      enum: ['FREE', 'PRO', 'ADMIN'],
      default: 'FREE',
    },
    savedChannels: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Static method
UserSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email });
};

if (process.env.NODE_ENV !== 'production') {
  delete mongoose.models.User;
}

export const User: UserModel =
  (mongoose.models.User as UserModel) ||
  mongoose.model<UserDocument, UserModel>('User', UserSchema);
