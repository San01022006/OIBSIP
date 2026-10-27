import mongoose from 'mongoose';
import { TOKEN_PURPOSE } from '../config/constants.js';

const tokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    type: { type: String, enum: Object.values(TOKEN_TYPE), required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ user: 1, purpose: 1 });

tokenSchema.methods.isUsable = function isUsable() {
  return !this.usedAt && this.expiresAt.getTime() > Date.now();
};

export const Token = mongoose.model('Token', tokenSchema);
export default Token;
