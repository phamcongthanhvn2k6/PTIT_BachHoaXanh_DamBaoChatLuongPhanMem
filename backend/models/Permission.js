import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  label: { type: String, default: '' },
  group: { type: String, default: 'general' },
  description: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

permissionSchema.index({ group: 1, key: 1 });

const Permission = mongoose.models.Permission || mongoose.model('Permission', permissionSchema);

export default Permission;
