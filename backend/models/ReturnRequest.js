import mongoose from 'mongoose';

const returnRequestSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  order_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  branch_id: { type: mongoose.Schema.Types.Mixed, default: null, index: true },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected', 'picked_up', 'refunded', 'closed', 'cancelled'],
    index: true,
  },
  reason: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  refund_method: { type: String, default: 'original_payment' },
  contact_phone: { type: String, default: '' },
  amount_requested: { type: Number, default: 0 },
  evidence_images: { type: [String], default: [] },
  items: [{
    product_id: { type: mongoose.Schema.Types.Mixed, default: null },
    branch_product_id: { type: mongoose.Schema.Types.Mixed, default: null },
    product_name: { type: String, default: '' },
    product_image: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    reason_detail: { type: String, default: '' },
  }],
  admin_note: { type: String, default: '' },
  resolved_by: { type: mongoose.Schema.Types.Mixed, default: null },
  resolved_at: { type: Date, default: null },
  is_returned_to_stock: { type: Boolean, default: false },
  timeline: [{
    status: { type: String, required: true },
    note: { type: String, default: '' },
    by: { type: mongoose.Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: Date.now },
  }],
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

returnRequestSchema.index({ user_id: 1, order_id: 1, status: 1 });

export default mongoose.model('ReturnRequest', returnRequestSchema);
