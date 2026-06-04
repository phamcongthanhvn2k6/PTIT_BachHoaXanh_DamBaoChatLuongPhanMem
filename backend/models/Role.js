import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  role_id: { type: Number, default: null },
  level: { type: Number, default: 99 }, // hierarchy: 0=super_admin, 10=admin, 20=manager, 30=staff, 99=customer
  permissions: { type: [String], default: [] },
  is_system: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

roleSchema.index({ role_id: 1 });

const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

export default Role;
