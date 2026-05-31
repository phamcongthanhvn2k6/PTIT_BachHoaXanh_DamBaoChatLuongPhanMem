import mongoose from 'mongoose';

const eventPostSchema = new mongoose.Schema({
  title: String,
  slug: { type: String, unique: true, required: true },
  category_id: Number,
  thumbnail: String,
  thumbnail_alt: String,
  excerpt: String,
  author_name: String,
  author_avatar: String,
  published_at: Date,
  read_time: Number,
  views: Number,
  likes: { type: Number, default: 0 },
  liked_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tags: [String],
  start_date: Date,
  end_date: Date,
  is_featured: Boolean,
  is_published: Boolean,
  related_post_ids: [Number],
  content_blocks: [mongoose.Schema.Types.Mixed],
  status: String,
  created_by: Number,
  branch: { type: String, default: null },
  banner: { type: String, default: null },
  promotion_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion', default: null },
  summary: { type: String, default: '' },
  description: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'event_posts' });

export const EventPost = mongoose.model('EventPost', eventPostSchema);
