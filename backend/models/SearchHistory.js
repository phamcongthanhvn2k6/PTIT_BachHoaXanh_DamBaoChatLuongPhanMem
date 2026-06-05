import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  query: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

searchHistorySchema.index({ user_id: 1, created_at: -1 });

export default mongoose.model('SearchHistory', searchHistorySchema);
