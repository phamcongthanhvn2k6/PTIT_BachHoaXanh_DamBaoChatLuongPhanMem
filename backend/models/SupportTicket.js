import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  ticket_code: { type: String, unique: true },
  user_id: { type: mongoose.Schema.Types.Mixed, required: true },
  user_name: { type: String, default: '' },
  user_email: { type: String, default: '' },
  user_avatar: { type: String, default: null },
  branch_id: { type: mongoose.Schema.Types.Mixed, default: null },
  branch_name: { type: String, default: '' },
  order_id: { type: mongoose.Schema.Types.Mixed, default: null },
  category: { type: String, default: 'general' },
  priority: { type: String, default: 'medium', enum: ['low', 'medium', 'high', 'urgent'] },
  status: { type: String, default: 'open', enum: ['open', 'pending', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled'] },
  subject: { type: String, required: true },
  message: { type: String, default: '' }, // Initial message
  attachments: [String],
  thread: [{
    sender_type: { type: String, default: 'user', enum: ['user', 'agent', 'admin', 'system'] },
    sender_role: { type: String, default: 'customer' },
    sender_id: { type: mongoose.Schema.Types.Mixed, default: null },
    sender_name: { type: String, default: '' },
    content: { type: String, required: true },
    message: { type: String, default: '' },
    attachments: [String],
    created_at: { type: Date, default: Date.now },
  }],
  messages: [{ // fallback for backward compatibility
    sender: { type: String, default: 'user' },
    sender_name: { type: String, default: '' },
    content: { type: String, required: true },
    attachments: [String],
    created_at: { type: Date, default: Date.now },
  }],
  internal_notes: [{
    author_name: { type: String, default: '' },
    content: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
  }],
  assigned_agent_id: { type: mongoose.Schema.Types.Mixed, default: null },
  assigned_agent_name: { type: String, default: '' },
  assigned_to: { type: mongoose.Schema.Types.Mixed, default: null }, // fallback
  sla_due_at: { type: Date, default: null },
  first_response_at: { type: Date, default: null },
  resolved_at: { type: Date, default: null },
  closed_at: { type: Date, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

ticketSchema.index({ status: 1, created_at: -1 });

export default mongoose.model('SupportTicket', ticketSchema);
