import mongoose from 'mongoose';

const familyCartItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  image: { type: String, default: '' },
  price: { type: Number, required: true, default: 0 },
  qty: { type: Number, required: true, default: 1, min: 1 },
  category: { type: String, default: 'Essentials' },
  addedBy: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
  votes: { type: [String], default: [] }, // Array of userIds who voted "Need It"
  wants: { type: [String], default: [] }  // Array of userIds who voted "Want It"
});

const familyMemberSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  avatar: { type: String, default: null },
  avatarUrl: { type: String, default: null },
  joinedAt: { type: Date, default: Date.now },
  role: { type: String, default: 'Family Member' } // 'Owner', 'Parent', 'Family Member', 'Guest'
});

const checklistItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  checked: { type: Boolean, default: false },
  checkedBy: { type: String, default: '' }
});

const chatMessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const activitySchema = new mongoose.Schema({
  id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const familyCartSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true, index: true },
  roomName: { type: String, default: 'Giỏ Hàng Gia Đình' },
  shoppingGoal: { type: String, default: 'Mua sắm gia đình' },
  budgetLimit: { type: Number, default: 2000000 },
  createdBy: { type: String, required: true },
  members: [familyMemberSchema],
  items: [familyCartItemSchema],
  checklist: [checklistItemSchema],
  chatMessages: [chatMessageSchema],
  approvals: { type: [String], default: [] }, // UserIds who approved checkout
  activities: [activitySchema]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default mongoose.model('FamilyCart', familyCartSchema);
