import mongoose from 'mongoose';

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: String, default: '' },
  unit: { type: String, default: '' },
  note: { type: String, default: '' }
}, { _id: false });

const StepSchema = new mongoose.Schema({
  step: { type: Number, required: true },
  title: { type: String, default: '' },
  description: { type: String, required: true },
  duration: { type: String, default: '' }
}, { _id: false });

const RecipeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  normalized_name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  ingredients: [IngredientSchema],
  steps: [StepSchema],
  prep_time: { type: String, default: '' },
  cook_time: { type: String, default: '' },
  servings: { type: Number, default: 2 },
  difficulty: { type: String, default: 'Trung bình' },
  tips: [{ type: String }],
  notes: [{ type: String }],
  tags: [{ type: String }],
  image_url: { type: String, default: '' },
  source_type: { type: String, enum: ['ai_generated', 'user_submitted', 'admin'], default: 'ai_generated' },
  ai_generated: { type: Boolean, default: false },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'active' },
  access_count: { type: Number, default: 0 },
  last_accessed_at: { type: Date, default: Date.now },
  canonical_key: { type: String },
  aliases: [{ type: String }],
  completeness_status: { type: String, enum: ['complete', 'incomplete'], default: 'complete' },
  last_checked_at: { type: Date, default: Date.now },
  source_product_ids: [{ type: String }]
}, { timestamps: true });

RecipeSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.normalized_name) {
    this.normalized_name = this.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

const Recipe = mongoose.model('Recipe', RecipeSchema);
export default Recipe;
