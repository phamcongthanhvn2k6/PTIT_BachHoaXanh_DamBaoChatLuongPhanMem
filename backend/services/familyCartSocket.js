import FamilyCart from '../models/FamilyCart.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

export const handleFamilyCartSocket = (io, socket) => {
  // Helper to send sync update to all room sockets
  const broadcastSync = async (roomCode) => {
    try {
      const cart = await FamilyCart.findOne({ roomCode });
      if (cart) {
        io.to(roomCode).emit('family_cart_sync', {
          roomCode: cart.roomCode,
          roomName: cart.roomName,
          shoppingGoal: cart.shoppingGoal,
          budgetLimit: cart.budgetLimit,
          createdBy: cart.createdBy,
          members: cart.members,
          items: cart.items,
          checklist: cart.checklist,
          chatMessages: cart.chatMessages,
          approvals: cart.approvals,
          activities: cart.activities
        });
      }
    } catch (err) {
      console.error('[FamilyCart] Broadcast sync error:', err);
    }
  };

  // Helper to record activity
  const recordActivity = async (roomCode, text) => {
    try {
      await FamilyCart.updateOne(
        { roomCode },
        { 
          $push: { 
            activities: { 
              $each: [{ text, timestamp: new Date() }],
              $position: 0 // Keep latest activity first
            } 
          } 
        }
      );
    } catch (err) {
      console.error('[FamilyCart] Record activity error:', err);
    }
  };

  // 1. Join room
  socket.on('family_cart_join', async ({ roomCode, userId, userName, roomName, goal, budget, role, avatar, avatarUrl }) => {
    if (!roomCode) return;
    try {
      console.log(`[FamilyCart] Socket ${socket.id} (User: ${userName}) joining room ${roomCode}`);
      socket.join(roomCode);

      let userAvatar = avatar || avatarUrl || null;
      try {
        if (!userAvatar && userId && mongoose.Types.ObjectId.isValid(userId)) {
          const u = await User.findById(userId);
          if (u) {
            userAvatar = u.avatar;
          }
        }
      } catch (e) {
        console.error('[FamilyCart] User lookup failed:', e);
      }

      let cart = await FamilyCart.findOne({ roomCode });
      const memberRole = role || (cart ? 'Family Member' : 'Owner');

      if (!cart) {
        // Create new room if it doesn't exist
        cart = new FamilyCart({
          roomCode,
          roomName: roomName || 'Weekend Grocery Shopping',
          shoppingGoal: goal || 'Đi Chợ Cuối Tuần',
          budgetLimit: budget ? Number(budget) : 2000000,
          createdBy: userId,
          members: [{ 
            userId, 
            name: userName, 
            role: memberRole, 
            avatar: userAvatar, 
            avatarUrl: userAvatar, 
            joinedAt: new Date() 
          }],
          items: [],
          checklist: [],
          chatMessages: [],
          activities: [
            { text: `${userName} đã tạo phòng mua sắm ${roomName || 'Weekend Grocery Shopping'}` }
          ]
        });
      } else {
        // Add member if not already present
        const memberIdx = cart.members.findIndex(m => m.userId === userId);
        if (memberIdx === -1) {
          cart.members.push({ 
            userId, 
            name: userName, 
            role: memberRole, 
            avatar: userAvatar, 
            avatarUrl: userAvatar, 
            joinedAt: new Date() 
          });
          await cart.save();
          await recordActivity(roomCode, `${userName} đã tham gia phòng mua sắm`);
        } else {
          // If already joined but avatar or username might have updated, sync it
          let updated = false;
          if (cart.members[memberIdx].avatar !== userAvatar) {
            cart.members[memberIdx].avatar = userAvatar;
            cart.members[memberIdx].avatarUrl = userAvatar;
            updated = true;
          }
          if (cart.members[memberIdx].name !== userName) {
            cart.members[memberIdx].name = userName;
            updated = true;
          }
          if (updated) {
            await cart.save();
          }
        }
      }
      await cart.save();

      // Broadcast new state
      await broadcastSync(roomCode);
      console.log(`[FamilyCart] Room ${roomCode} synced. Members count: ${cart.members.length}`);
    } catch (err) {
      console.error('[FamilyCart] Join room error:', err);
    }
  });

  // 2. Add Item
  socket.on('family_cart_add_item', async ({ roomCode, item }) => {
    if (!roomCode || !item) return;
    try {
      console.log(`[FamilyCart] Adding item to room ${roomCode}:`, item.name);
      let cart = await FamilyCart.findOne({ roomCode });
      if (cart) {
        const existingItem = cart.items.find(i => i.id === item.id);
        if (existingItem) {
          existingItem.qty += 1;
        } else {
          cart.items.push({
            id: item.id,
            name: item.name,
            image: item.image,
            price: item.price,
            qty: 1,
            category: item.category || 'Essentials',
            addedBy: item.addedBy,
            addedAt: new Date()
          });
        }
        await cart.save();
        await recordActivity(roomCode, `${item.addedBy} đã thêm ${item.name} vào giỏ hàng`);
        await broadcastSync(roomCode);
      }
    } catch (err) {
      console.error('[FamilyCart] Add item error:', err);
    }
  });

  // 3. Update Qty
  socket.on('family_cart_update_qty', async ({ roomCode, id, qty, userName }) => {
    if (!roomCode || !id) return;
    try {
      console.log(`[FamilyCart] Updating item ${id} qty to ${qty} in room ${roomCode}`);
      let cart = await FamilyCart.findOne({ roomCode });
      if (cart) {
        const item = cart.items.find(i => i.id === id);
        if (item) {
          const oldQty = item.qty;
          item.qty = Math.max(1, qty);
          await cart.save();
          if (qty !== oldQty) {
            await recordActivity(roomCode, `${userName || 'Thành viên'} đã thay đổi số lượng ${item.name} thành ${qty}`);
          }
          await broadcastSync(roomCode);
        }
      }
    } catch (err) {
      console.error('[FamilyCart] Update qty error:', err);
    }
  });

  // 4. Remove Item
  socket.on('family_cart_remove_item', async ({ roomCode, id, removedBy }) => {
    if (!roomCode || !id) return;
    try {
      console.log(`[FamilyCart] Removing item ${id} from room ${roomCode}`);
      let cart = await FamilyCart.findOne({ roomCode });
      if (cart) {
        const item = cart.items.find(i => i.id === id);
        const name = item ? item.name : 'sản phẩm';
        cart.items = cart.items.filter(i => i.id !== id);
        await cart.save();
        await recordActivity(roomCode, `${removedBy || 'Thành viên'} đã xóa ${name} khỏi giỏ hàng`);
        await broadcastSync(roomCode);
      }
    } catch (err) {
      console.error('[FamilyCart] Remove item error:', err);
    }
  });

  // 5. Vote Item ("Need It" / "Want It")
  socket.on('family_cart_vote_item', async ({ roomCode, id, userId, voteType, userName }) => {
    if (!roomCode || !id || !userId) return;
    try {
      console.log(`[FamilyCart] Vote item ${id} in room ${roomCode} type ${voteType}`);
      let cart = await FamilyCart.findOne({ roomCode });
      if (cart) {
        const item = cart.items.find(i => i.id === id);
        if (item) {
          if (voteType === 'need') {
            const index = item.votes.indexOf(userId);
            if (index > -1) {
              item.votes.splice(index, 1);
            } else {
              item.votes.push(userId);
              // Remove from wants if voted need
              const wIndex = item.wants.indexOf(userId);
              if (wIndex > -1) item.wants.splice(wIndex, 1);
            }
          } else if (voteType === 'want') {
            const index = item.wants.indexOf(userId);
            if (index > -1) {
              item.wants.splice(index, 1);
            } else {
              item.wants.push(userId);
              // Remove from needs if voted want
              const vIndex = item.votes.indexOf(userId);
              if (vIndex > -1) item.votes.splice(vIndex, 1);
            }
          }
          await cart.save();
          await broadcastSync(roomCode);
        }
      }
    } catch (err) {
      console.error('[FamilyCart] Vote item error:', err);
    }
  });

  // 6. Checklist Toggle
  socket.on('family_cart_checklist_toggle', async ({ roomCode, itemId, checked, userName }) => {
    if (!roomCode || !itemId) return;
    try {
      console.log(`[FamilyCart] Checklist item ${itemId} checked status ${checked} by ${userName}`);
      let cart = await FamilyCart.findOne({ roomCode });
      if (cart) {
        const checkItem = cart.checklist.find(c => c.id === itemId);
        if (checkItem) {
          checkItem.checked = checked;
          checkItem.checkedBy = checked ? userName : '';
          await cart.save();
          await recordActivity(roomCode, `${userName} đã ${checked ? 'đánh dấu hoàn thành' : 'bỏ đánh dấu'} "${checkItem.text}"`);
          await broadcastSync(roomCode);
        }
      }
    } catch (err) {
      console.error('[FamilyCart] Checklist toggle error:', err);
    }
  });

  // 7. Add checklist item
  socket.on('family_cart_checklist_add', async ({ roomCode, text, userName }) => {
    if (!roomCode || !text) return;
    try {
      let cart = await FamilyCart.findOne({ roomCode });
      if (cart) {
        const newItem = {
          id: 'chk_' + Date.now(),
          text,
          checked: false,
          checkedBy: ''
        };
        cart.checklist.push(newItem);
        await cart.save();
        await recordActivity(roomCode, `${userName} đã thêm "${text}" vào danh sách cần mua`);
        await broadcastSync(roomCode);
      }
    } catch (err) {
      console.error('[FamilyCart] Checklist add error:', err);
    }
  });

  // 8. Chat message
  socket.on('family_cart_send_chat', async ({ roomCode, text, userId, userName }) => {
    if (!roomCode || !text) return;
    try {
      let cart = await FamilyCart.findOne({ roomCode });
      if (cart) {
        cart.chatMessages.push({
          id: 'msg_' + Date.now(),
          senderId: userId,
          senderName: userName,
          text,
          timestamp: new Date()
        });
        await cart.save();
        await broadcastSync(roomCode);
      }
    } catch (err) {
      console.error('[FamilyCart] Send chat error:', err);
    }
  });

  // 9. Order approval toggle
  socket.on('family_cart_approve_checkout', async ({ roomCode, userId, approve, userName }) => {
    if (!roomCode || !userId) return;
    try {
      let cart = await FamilyCart.findOne({ roomCode });
      if (cart) {
        const index = cart.approvals.indexOf(userId);
        if (approve) {
          if (index === -1) {
            cart.approvals.push(userId);
            await recordActivity(roomCode, `${userName} đã duyệt đơn hàng`);
          }
        } else {
          if (index > -1) {
            cart.approvals.splice(index, 1);
            await recordActivity(roomCode, `${userName} đã hủy duyệt đơn hàng`);
          }
        }
        await cart.save();
        await broadcastSync(roomCode);
      }
    } catch (err) {
      console.error('[FamilyCart] Approve checkout error:', err);
    }
  });

  // 10. Leave room
  socket.on('family_cart_leave', async ({ roomCode, userId }) => {
    if (!roomCode || !userId) return;
    try {
      console.log(`[FamilyCart] User ${userId} leaving room ${roomCode}`);
      let cart = await FamilyCart.findOne({ roomCode });
      if (cart) {
        const leavingMember = cart.members.find(m => m.userId === userId);
        const name = leavingMember ? leavingMember.name : 'Thành viên';
        
        cart.members = cart.members.filter(m => m.userId !== userId);
        if (cart.members.length === 0) {
          await FamilyCart.deleteOne({ roomCode });
          console.log(`[FamilyCart] Room ${roomCode} has no members left. Deleted.`);
        } else {
          // Remove their approvals
          cart.approvals = cart.approvals.filter(id => id !== userId);
          await cart.save();
          await recordActivity(roomCode, `${name} đã rời phòng mua sắm`);
          await broadcastSync(roomCode);
        }
      }
      socket.leave(roomCode);
    } catch (err) {
      console.error('[FamilyCart] Leave room error:', err);
    }
  });
};
