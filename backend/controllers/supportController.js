import SupportTicket from '../models/SupportTicket.js';

// GET /api/support/tickets
export const list = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, category, priority, assigned_to } = req.query;
    const filter = {};
    if (req.user?.role_id !== 3 && req.query.user_id) filter.user_id = req.query.user_id;
    else if (req.user?.role_id === 3) filter.user_id = req.userId;
    
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (assigned_to) {
      filter.assigned_agent_id = assigned_to === 'unassigned' ? null : assigned_to;
    }
    
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { ticket_code: { $regex: search, $options: 'i' } },
        { user_email: { $regex: search, $options: 'i' } },
        { user_name: { $regex: search, $options: 'i' } }
      ];
    }
    
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    // Sort logic
    const sort = {};
    sort[req.query.sortBy || 'created_at'] = req.query.sortOrder === 'asc' ? 1 : -1;

    const total = await SupportTicket.countDocuments(filter);
    const data = await SupportTicket.find(filter).sort(sort).skip((p - 1) * l).limit(l);
    
    // Add paginate handler
    return res.json({ success: true, data, meta: { total, page: p, limit: l, pages: Math.ceil(total / l) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/support/tickets/stats
export const stats = async (req, res) => {
  try {
    const open = await SupportTicket.countDocuments({ status: { $in: ['open', 'pending', 'in_progress', 'waiting_customer'] } });
    const resolved = await SupportTicket.countDocuments({ status: 'resolved' });
    const closed = await SupportTicket.countDocuments({ status: 'closed' });
    const unassigned = await SupportTicket.countDocuments({ assigned_agent_id: null, status: { $in: ['open', 'pending', 'in_progress'] } });
    const high_priority = await SupportTicket.countDocuments({ priority: { $in: ['high', 'urgent'] }, status: { $ne: 'closed' } });
    
    return res.json({ success: true, data: { open, resolved, closed, unassigned, high_priority } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/support/tickets
export const create = async (req, res) => {
  try {
    console.log('[DEBUG] POST /api/support/tickets payload:', req.body);
    console.log('[DEBUG] req.user:', req.user);
    const userId = (req.user?.role_id !== 3 && req.body.user_id) ? req.body.user_id : req.userId;
    
    if (!req.body.subject) {
       return res.status(400).json({ success: false, message: 'Subject is required' });
    }

    const initialContent = req.body.message || req.body.content || 'Khởi tạo phiếu hỗ trợ';
    const userName = req.body.user_name || req.user?.username || 'Customer';

    const ticket = await SupportTicket.create({
      ...req.body,
      ticket_code: req.body.ticket_code || `SP${Date.now().toString().slice(-6)}${Math.floor(Math.random()*100)}`,
      user_id: userId,
      user_name: userName,
      message: initialContent,
      thread: [{ 
         sender_type: 'user', 
         sender_role: req.user?.role_key || (req.user?.role_id === 1 ? 'super_admin' : req.user?.role_id === 2 ? 'admin' : req.user?.role_id === 3 ? 'customer' : 'customer'),
         sender_id: userId,
         sender_name: userName, 
         content: initialContent,
         message: initialContent,
         attachments: req.body.attachments || []
      }],
      messages: [{ 
         sender: 'user', 
         sender_name: userName, 
         content: initialContent,
         attachments: req.body.attachments || []
      }],
    });
    return res.status(201).json({ success: true, data: ticket, message: 'Đã tạo ticket hỗ trợ' });
  } catch (err) {
    console.error('[DEBUG] POST /api/support/tickets ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/support/tickets/:id
export const detail = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (req.user?.role_id === 3 && String(ticket.user_id) !== String(req.userId)) return res.status(403).json({ success: false, message: 'Forbidden' });
    return res.json({ success: true, data: ticket });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/support/tickets/:id/messages
export const messages = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (req.user?.role_id === 3 && String(ticket.user_id) !== String(req.userId)) return res.status(403).json({ success: false, message: 'Forbidden' });
    return res.json({ success: true, data: ticket.thread });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/support/tickets/:id/messages
export const sendMessage = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (req.user?.role_id === 3 && String(ticket.user_id) !== String(req.userId)) return res.status(403).json({ success: false, message: 'Forbidden' });
    
    const isUser = req.user?.role_id === 3;
    const content = req.body.content || req.body.message || '';
    const roleKey = req.user?.role_key || (req.user?.role_id === 1 ? 'super_admin' : req.user?.role_id === 2 ? 'admin' : req.user?.role_id === 3 ? 'customer' : 'agent');
    
    const msg = { 
      sender_type: isUser ? 'user' : 'agent', 
      sender_role: roleKey,
      sender_id: req.userId,
      sender_name: req.body.sender_name || req.user?.username || (isUser ? 'User' : 'Agent'), 
      content: content,
      message: content,
      attachments: req.body.attachments || []
    };
    
    ticket.thread.push(msg);
    ticket.messages.push({ sender: msg.sender_type, sender_name: msg.sender_name, content: msg.content, message: msg.content, attachments: msg.attachments }); // Legacy fallback
    
    // Auto status transition
    if (isUser && ticket.status === 'waiting_customer') ticket.status = 'open';
    else if (!isUser && ticket.status === 'open') ticket.status = 'in_progress';
    
    await ticket.save();
    
    // Socket.IO Emit
    const io = req.app.get('io');
    if (io) {
      const savedMsg = ticket.thread[ticket.thread.length - 1];
      io.to(String(ticket._id)).emit('new_message', Object.assign({}, savedMsg.toObject ? savedMsg.toObject() : savedMsg, { ticket_id: ticket._id }));
    }

    return res.json({ success: true, data: ticket, message: 'Đã gửi tin nhắn' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/support/tickets/:id/status
export const updateStatus = async (req, res) => {
  try {
    const updatePayload = { status: req.body.status };
    if (req.body.priority) updatePayload.priority = req.body.priority;
    if (req.body.category) updatePayload.category = req.body.category;
    
    if (req.body.status === 'resolved' && req.body.status !== 'closed') updatePayload.resolved_at = new Date();
    if (req.body.status === 'closed') updatePayload.closed_at = new Date();
    
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    return res.json({ success: true, data: ticket, message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/support/tickets/:id/assign
export const assignAgent = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    ticket.assigned_agent_id = req.body.assigned_agent_id || req.userId;
    ticket.assigned_agent_name = req.body.assigned_agent_name || req.user?.username || 'Agent';
    ticket.assigned_to = ticket.assigned_agent_id; // backward compatible
    if (ticket.status === 'open') ticket.status = 'pending';
    await ticket.save();
    return res.json({ success: true, data: ticket, message: 'Gán xử lý thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/support/tickets/:id/internal-note
export const internalNote = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    ticket.internal_notes.push({
      author_name: req.body.author_name || req.user?.username || 'Admin',
      content: req.body.content
    });
    await ticket.save();
    return res.json({ success: true, data: ticket, message: 'Đã thêm ghi chú nội bộ' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
