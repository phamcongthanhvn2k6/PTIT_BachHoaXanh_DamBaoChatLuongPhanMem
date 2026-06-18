import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '../store';
import { socket } from '../services/socket';
import { toast } from '../components/Toast/toastEvent';
import { useBranchData } from '../hooks/useBranchData';

interface FamilyCartItem { 
  id: string; 
  name: string; 
  image: string; 
  price: number; 
  qty: number; 
  category: string;
  addedBy: string; 
  addedAt: string; 
  votes: string[];
  wants: string[];
}

interface FamilyMember { 
  userId: string; 
  name: string; 
  joinedAt: string; 
  role: string;
  avatar?: string | null;
  avatarUrl?: string | null;
}

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  checkedBy: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

interface ActivityItem {
  id: string;
  text: string;
  timestamp: string;
}

const SharedFamilyCart: React.FC = () => {
  const { user } = useAppSelector(s => s.auth);
  const { availableProducts } = useBranchData();

  // Room identification state
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('family_room_code') || '');
  const [joined, setJoined] = useState(() => localStorage.getItem('family_room_joined') === 'true');
  
  // Collaborative Room state (Hydrated from Socket.IO DB)
  const [roomName, setRoomName] = useState('Weekend Grocery Shopping');
  const [shoppingGoal, setShoppingGoal] = useState('Đi Chợ Cuối Tuần');
  const [budgetLimit, setBudgetLimit] = useState(2000000);
  const [createdBy, setCreatedBy] = useState('');
  const [items, setItems] = useState<FamilyCartItem[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [approvals, setApprovals] = useState<string[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Form input states
  const [createName, setCreateName] = useState('');
  const [createGoal, setCreateGoal] = useState('');
  const [createBudget, setCreateBudget] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  
  // Realtime panel states
  const [searchQ, setSearchQ] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [checklistInput, setChecklistInput] = useState('');
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const [copied, setCopied] = useState(false);

  const userName = user?.full_name || user?.email || 'Guest';
  const userId = String(user?.id || user?._id || 'guest-' + Date.now());

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Avatar lookup and resolution helper
  const resolveAvatar = (member: FamilyMember) => {
    const av = member.avatar || member.avatarUrl;
    if (av && (av.startsWith('http') || av.startsWith('/') || av.startsWith('data:'))) {
      return av;
    }
    const term = String(member.name || '').toLowerCase();
    if (term.includes('mẹ') || term.includes('mom')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuDutjzWaEIpU0Chk0r3K9_qS2TD1zfKSmvsabmiwFe7eOJMYcIT4hEj4sB9AlybPGZn7D4tck9XUty8SV6yme9t17tgRWQrqLNna6LqY0-6SqQPBku8S8GwLAae8D7h9USO6BylawHeHqTQyn7BhnEjKpdyoi6icflyQqOo1doNTUnKRwGgGjbeFGtSABKQxT6OzqOAa1t4wratuOnTNzeT6B444Ezvf8IAlGq58dUFK9kP3v76z1D8X5iP0nD8GABa2rIY89fzGPU';
    }
    if (term.includes('bố') || term.includes('dad') || term.includes('ba')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrQevGzi3vgAhvtpgPg5xLA35yER8g-KQWXlrFZSoxB1QinizbERNQt1ZuVoPCc28KhO3--_9rnud6AK2s8FOyGhAy6z60ih_njjKqbTvIYBlPUnPuDv74JCbrsio7DymQUzJFVjezzKMBfrwEcXVB5ezr9rds30S1MuvImvu-NbnLIrn9TQ843oDzzhuVKwo4XuD0Fx3R3_6j368zXJ4ZUbMnA7cKHoCYujzxxNWOX8J6bNV1Nj-5UAktYqmGzfjetzKkwOVmRBo';
    }
    if (term.includes('minh') || term.includes('con trai')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuBI_T5Tz1vTejG6t2_0qtWFvV39bzDPa5gG46pYlhOu5A1nrH6Qpx14FS_4Rz2fqOkRpL2oeoCJpRkYdnespPMGDYTM0rPDOD34qBoqfjqUJN2sd2FkdbTwhlFwIWT4LH9ImtkKchIkyhXWns88o5_38O1AQL3EZJQX9aKOdbpA-eo7mgExcYydrn9azF_JfR0E62gs8VLun3recUyEm4z4UNP3jFlch8ELMo6TuKrHK34LAKJASGGMiBcI8GwsOIA2U_gPmRXy_bc';
    }
    if (term.includes('ông') || term.includes('bà') || term.includes('ngoại') || term.includes('nội')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuAYJ-BOGgDr19e-X7ig9xeba1_PaIdYQcoYPnS1-vprv6PtwY33MuSvDW7j8L_VjhJplKddqoPO4bYbwwJM5AzmGmbUrG_wMGmjob-P_Q7e_RQX-jNjnDxuS31dq8_7MAV2VL4wsLbh7InQeOcNQYe_9r9-2X8UrSyhm7OTeDi9PyYEJqo3QXCzHBX__4WspVG6dQFEMLjrpK_t8cEKfFwyrsQ7uapYSO0aBRZ2SOWaiWp_hXKNoHihjvfOIJFmauQjY9ErdUT4wYQ';
    }
    if (term.includes('con gái') || term.includes('vy') || term.includes('hoa')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-yOntw729I3mP_qsoT8e5JWbvFAQWra1HnE2NwWNB-Le0V-PsCjeTL84g30-j_5onGOy04oHRcw1gwxSJ3so2dCFTA9Ay_5dz9mvIYyOx_gnEk2mm74ZJYegtyhnUJfZSKXK7VLOjm6CrnEm7X33pW3CwgCidoPkH-106FER4FyeIyaD-gJ2rbut6rdf0gG-jICPuhHo-0N-68Q9517FE1BSpE5w16-tXnOZaIjeSgxQodqHkzEWCvI-Cv8rep2CCfA_puG7QBp8';
    }
    return null;
  };

  const getAvatarUrl = (nameOrRole: string) => {
    const term = String(nameOrRole || '').toLowerCase();
    if (term.includes('mẹ') || term.includes('mom')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuDutjzWaEIpU0Chk0r3K9_qS2TD1zfKSmvsabmiwFe7eOJMYcIT4hEj4sB9AlybPGZn7D4tck9XUty8SV6yme9t17tgRWQrqLNna6LqY0-6SqQPBku8S8GwLAae8D7h9USO6BylawHeHqTQyn7BhnEjKpdyoi6icflyQqOo1doNTUnKRwGgGjbeFGtSABKQxT6OzqOAa1t4wratuOnTNzeT6B444Ezvf8IAlGq58dUFK9kP3v76z1D8X5iP0nD8GABa2rIY89fzGPU';
    }
    if (term.includes('bố') || term.includes('dad') || term.includes('ba')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrQevGzi3vgAhvtpgPg5xLA35yER8g-KQWXlrFZSoxB1QinizbERNQt1ZuVoPCc28KhO3--_9rnud6AK2s8FOyGhAy6z60ih_njjKqbTvIYBlPUnPuDv74JCbrsio7DymQUzJFVjezzKMBfrwEcXVB5ezr9rds30S1MuvImvu-NbnLIrn9TQ843oDzzhuVKwo4XuD0Fx3R3_6j368zXJ4ZUbMnA7cKHoCYujzxxNWOX8J6bNV1Nj-5UAktYqmGzfjetzKkwOVmRBo';
    }
    if (term.includes('minh') || term.includes('con trai')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuBI_T5Tz1vTejG6t2_0qtWFvV39bzDPa5gG46pYlhOu5A1nrH6Qpx14FS_4Rz2fqOkRpL2oeoCJpRkYdnespPMGDYTM0rPDOD34qBoqfjqUJN2sd2FkdbTwhlFwIWT4LH9ImtkKchIkyhXWns88o5_38O1AQL3EZJQX9aKOdbpA-eo7mgExcYydrn9azF_JfR0E62gs8VLun3recUyEm4z4UNP3jFlch8ELMo6TuKrHK34LAKJASGGMiBcI8GwsOIA2U_gPmRXy_bc';
    }
    if (term.includes('ông') || term.includes('bà') || term.includes('ngoại') || term.includes('nội')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuAYJ-BOGgDr19e-X7ig9xeba1_PaIdYQcoYPnS1-vprv6PtwY33MuSvDW7j8L_VjhJplKddqoPO4bYbwwJM5AzmGmbUrG_wMGmjob-P_Q7e_RQX-jNjnDxuS31dq8_7MAV2VL4wsLbh7InQeOcNQYe_9r9-2X8UrSyhm7OTeDi9PyYEJqo3QXCzHBX__4WspVG6dQFEMLjrpK_t8cEKfFwyrsQ7uapYSO0aBRZ2SOWaiWp_hXKNoHihjvfOIJFmauQjY9ErdUT4wYQ';
    }
    if (term.includes('con gái') || term.includes('vy') || term.includes('hoa')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-yOntw729I3mP_qsoT8e5JWbvFAQWra1HnE2NwWNB-Le0V-PsCjeTL84g30-j_5onGOy04oHRcw1gwxSJ3so2dCFTA9Ay_5dz9mvIYyOx_gnEk2mm74ZJYegtyhnUJfZSKXK7VLOjm6CrnEm7X33pW3CwgCidoPkH-106FER4FyeIyaD-gJ2rbut6rdf0gG-jICPuhHo-0N-68Q9517FE1BSpE5w16-tXnOZaIjeSgxQodqHkzEWCvI-Cv8rep2CCfA_puG7QBp8';
    }
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuOFYmyn5FGJFo6Izmv02mTrvusFbXwptoEfIYDpBH9BmO2UAOTX7HtizKxuv5z_9OUHGSdU3JNhDzBXiUd7OyeaWlwyRNv41Ncikoyh5qHgVM-TfK_aXWMQfgPZK5xyHut1Cy1jYGFGPdrecmLGsofDqS683gGGC1YxKfQm6M2BEIiaKVAE7C5J6zyI9g2OJELSgj4RCgjuO_NGWevTkGy7ojrG_oaOeaZufRNbWeuRrj_pMXN3bwwaSHkkdAYl1Ja1gPqq9ACZ4';
  };

  const getChatMessageAvatar = (msg: ChatMessage) => {
    const m = members.find(member => member.userId === msg.senderId);
    if (m) {
      const avatar = resolveAvatar(m);
      if (avatar) return avatar;
    }
    return getAvatarUrl(msg.senderName);
  };

  // Socket connect indicators
  useEffect(() => {
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // Socket database synchronization
  useEffect(() => {
    if (!joined || !roomCode) return;

    const handleReconnect = () => {
      socket.emit('family_cart_join', { roomCode, userId, userName, avatar: user?.avatar, avatarUrl: user?.avatar });
    };

    socket.on('connect', handleReconnect);

    // Sync all states from database
    const onSync = (data: any) => {
      if (data.roomCode === roomCode) {
        setRoomName(data.roomName || 'Weekend Grocery Shopping');
        setShoppingGoal(data.shoppingGoal || 'Đi Chợ Cuối Tuần');
        setBudgetLimit(data.budgetLimit || 2000000);
        setCreatedBy(data.createdBy || '');
        setItems(data.items || []);
        setMembers(data.members || []);
        setChecklist(data.checklist || []);
        setChatMessages(data.chatMessages || []);
        setApprovals(data.approvals || []);
        setActivities(data.activities || []);
      }
    };

    socket.on('family_cart_sync', onSync);

    return () => {
      socket.off('connect', handleReconnect);
      socket.off('family_cart_sync', onSync);
    };
  }, [joined, roomCode, userId, userName]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Re-emit join if page refreshed but localStorage exists
  useEffect(() => {
    if (joined && roomCode) {
      socket.emit('family_cart_join', { roomCode, userId, userName, avatar: user?.avatar, avatarUrl: user?.avatar });
    }
  }, []);

  // Room actions
  const handleCreateRoom = () => {
    const code = `LOTTE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const budgetNum = Number(createBudget.replace(/[^0-9]/g, '')) || 2000000;
    
    if (!socket.connected) socket.connect();
    
    socket.emit('family_cart_join', {
      roomCode: code,
      userId,
      userName,
      roomName: createName || 'Weekend Grocery Shopping',
      goal: createGoal || 'Đi Chợ Cuối Tuần',
      budget: budgetNum,
      role: 'Owner',
      avatar: user?.avatar,
      avatarUrl: user?.avatar
    });

    setJoined(true);
    setRoomCode(code);
    localStorage.setItem('family_room_code', code);
    localStorage.setItem('family_room_joined', 'true');
    toast.success(`Đã tạo phòng mua sắm: ${code}`);
  };

  const handleJoinRoom = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    if (!socket.connected) socket.connect();

    socket.emit('family_cart_join', {
      roomCode: cleanCode,
      userId,
      userName,
      role: 'Family Member',
      avatar: user?.avatar,
      avatarUrl: user?.avatar
    });

    setJoined(true);
    setRoomCode(cleanCode);
    localStorage.setItem('family_room_code', cleanCode);
    localStorage.setItem('family_room_joined', 'true');
  };

  const handleLeaveRoom = () => {
    if (roomCode) {
      socket.emit('family_cart_leave', { roomCode, userId });
    }
    setJoined(false);
    setRoomCode('');
    setItems([]);
    setMembers([]);
    setChecklist([]);
    setChatMessages([]);
    setApprovals([]);
    setActivities([]);
    localStorage.removeItem('family_room_code');
    localStorage.removeItem('family_room_joined');
    toast.success('Đã rời phòng mua sắm gia đình');
  };

  const handleAddItem = (product: any) => {
    if (!roomCode) return;
    const item = {
      id: String(product?.branch_product_id || product?.id || product?._id || Date.now()),
      name: product?.name || 'Sản phẩm',
      image: product?.image || product?.thumbnail || '',
      price: Number(product?.price || 0),
      category: product?.category || 'Essentials',
      addedBy: userName
    };
    socket.emit('family_cart_add_item', { roomCode, item });
    toast.success(`Đã thêm ${item.name}`);
  };

  const handleUpdateQty = (id: string, newQty: number) => {
    if (!roomCode) return;
    if (newQty < 1) {
      handleRemoveItem(id);
      return;
    }
    socket.emit('family_cart_update_qty', { roomCode, id, qty: newQty, userName });
  };

  const handleRemoveItem = (id: string) => {
    if (!roomCode) return;
    socket.emit('family_cart_remove_item', { roomCode, id, removedBy: userName });
  };

  const handleVoteItem = (id: string, voteType: 'need' | 'want') => {
    if (!roomCode) return;
    socket.emit('family_cart_vote_item', { roomCode, id, userId, voteType, userName });
  };

  const handleToggleChecklist = (itemId: string, checked: boolean) => {
    if (!roomCode) return;
    socket.emit('family_cart_checklist_toggle', { roomCode, itemId, checked, userName });
  };

  const handleAddChecklist = () => {
    if (!roomCode || !checklistInput.trim()) return;
    socket.emit('family_cart_checklist_add', { roomCode, text: checklistInput.trim(), userName });
    setChecklistInput('');
  };

  const handleSendChat = () => {
    if (!roomCode || !chatInput.trim()) return;
    socket.emit('family_cart_send_chat', { roomCode, text: chatInput.trim(), userId, userName });
    setChatInput('');
  };

  const handleToggleApproval = () => {
    if (!roomCode) return;
    const isApproved = approvals.includes(userId);
    socket.emit('family_cart_approve_checkout', { roomCode, userId, approve: !isApproved, userName });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Đã sao chép mã phòng vào clipboard!');
  };

  const totalSpent = items.reduce((s, i) => s + i.price * i.qty, 0);
  const remainingBudget = budgetLimit - totalSpent;
  const budgetPercentage = Math.min(100, (totalSpent / budgetLimit) * 100);

  const fmt = (n: number) => n.toLocaleString('vi-VN');

  // Filter available products to browse
  const filteredProducts = (availableProducts || []).filter((p: any) =>
    searchQ.trim() ? p?.name?.toLowerCase().includes(searchQ.toLowerCase()) : true
  ).slice(0, 12);

  // Time Formatter for timeline
  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'vừa xong';
    }
  };

  // NOT JOINED SCREEN
  if (!joined) {
    return (
      <main className="max-w-[1440px] mx-auto px-6 py-8 space-y-12">
        {/* Hero Banner Section */}
        <section className="relative h-[380px] rounded-[2rem] overflow-hidden group">
          <div className="absolute inset-0 z-0">
            <img 
              className="w-full h-full object-cover" 
              alt="Asian family shopping in Lotte Mart" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8l-g_ri6-NiuChzKzu5KhjMVkc0ISm470pKOA03hfKyX2gyD7QXqo7-z1KYuEYbk6G5CqV8_ILhtIl6TpJp3z7J07ummpa35bXzX6WnNFTdYeVA6Gx9VrsaIXcZb2QgKXb0qmcmw5-T5Q_M0WK2pa9HX6LFhhGfyTII3PZGBtAK0ZSMSAPzFH33qMNYBRVFo7bm93tdkcbtbHp4fWbfm_vpPJt0kzqj-INT6Vmaa1N2nrTlEx9bU_0CutdyAmKqI0HIVqgZrpel4"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent"></div>
          </div>
          <div className="relative z-10 h-full flex flex-col justify-center px-12 text-white max-w-2xl">
            <h1 className="text-5xl font-extrabold mb-4 leading-tight italic font-serif" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Family Shopping Cart
            </h1>
            <p className="text-lg opacity-90 font-light mb-8">
              Hợp tác mua sắm thời gian thực cùng cả gia đình. Gắn kết yêu thương qua từng bữa ăn ngon.
            </p>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center bg-white/10 backdrop-blur-md border border-white/20">
                <span className="text-2xl font-bold">12</span>
                <span className="text-[10px] uppercase tracking-wider opacity-85">Phòng Active</span>
              </div>
              <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center bg-white/10 backdrop-blur-md border border-white/20">
                <span className="text-2xl font-bold">04</span>
                <span className="text-[10px] uppercase tracking-wider opacity-85">Online</span>
              </div>
              <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center bg-white/10 backdrop-blur-md border border-white/20">
                <span className="text-2xl font-bold">85</span>
                <span className="text-[10px] uppercase tracking-wider opacity-85">Sản phẩm</span>
              </div>
              <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center bg-white/10 backdrop-blur-md border border-white/20">
                <span className="text-2xl font-bold">210</span>
                <span className="text-[10px] uppercase tracking-wider opacity-85">Đơn hàng</span>
              </div>
            </div>
          </div>
        </section>

        {/* Action Panel: Create & Join */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create room card */}
          <div className="bg-slate-50 dark:bg-slate-850 p-8 rounded-[1.5rem] border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between gap-6 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Tạo Giỏ Hàng Mới
              </h2>
              <p className="text-slate-500 text-sm">Bắt đầu hành trình mua sắm gia đình bạn.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Tên Phòng</label>
                <input 
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  className="w-full bg-slate-200/60 dark:bg-slate-900 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/40 text-slate-800 dark:text-white"
                  placeholder="Ví dụ: Đi Chợ Cuối Tuần" 
                  type="text"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Mục Tiêu</label>
                  <input 
                    value={createGoal}
                    onChange={e => setCreateGoal(e.target.value)}
                    className="w-full bg-slate-200/60 dark:bg-slate-900 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/40 text-slate-800 dark:text-white"
                    placeholder="Nấu lẩu cua" 
                    type="text"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Ngân Sách</label>
                  <input 
                    value={createBudget}
                    onChange={e => setCreateBudget(e.target.value)}
                    className="w-full bg-slate-200/60 dark:bg-slate-900 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/40 text-slate-800 dark:text-white"
                    placeholder="2.000.000₫" 
                    type="text"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleCreateRoom}
              className="w-full py-4 text-white rounded-full font-bold shadow-lg shadow-rose-600/20 hover:scale-[1.01] active:scale-98 transition-all"
              style={{ background: 'linear-gradient(135deg, #970012 0%, #c1121f 100%)' }}
            >
              Tạo Family Cart
            </button>
          </div>

          {/* Join room card */}
          <div className="bg-slate-50 dark:bg-slate-850 p-8 rounded-[1.5rem] border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between gap-6 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Tham Gia Nhóm
              </h2>
              <p className="text-slate-500 text-sm">Nhập mã để tham gia cùng người thân.</p>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center block">Mã Phòng</label>
                <input 
                  value={joinCodeInput}
                  onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="LOTTE-XYZ123"
                  className="w-full text-center text-3xl font-black tracking-widest bg-slate-200/60 dark:bg-slate-900 border-0 rounded-xl py-5 text-rose-700 focus:ring-2 focus:ring-rose-500/40" 
                  type="text"
                />
              </div>
            </div>

            <button 
              onClick={() => handleJoinRoom(joinCodeInput)}
              className="w-full py-4 rounded-full font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 active:scale-98 transition-all"
            >
              Tham Gia Ngay
            </button>
          </div>
        </section>
      </main>
    );
  }

  // ACTIVE ROOM SCREEN
  return (
    <main className="max-w-[1440px] mx-auto px-6 py-8 space-y-8">
      <section className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-md border border-slate-100 dark:border-slate-705 overflow-hidden">
        {/* Dashboard Top Header */}
        <div className="bg-slate-50 dark:bg-slate-900 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm border border-rose-100/30">
              <span className="material-symbols-outlined text-4xl">weekend</span>
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight animate-fade-in" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  {roomName}
                </h2>
                <span className="text-xs text-slate-600 dark:text-slate-350 font-medium bg-slate-200/60 dark:bg-slate-900/80 px-3 py-1 rounded-full border border-slate-300/20">
                  Mục tiêu: {shoppingGoal}
                </span>
                {createdBy === userId && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">Trưởng phòng</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                {/* Room Code Pill */}
                <div className="inline-flex items-center bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-full pl-3.5 pr-2 py-1 gap-2 select-all group shadow-sm hover:border-rose-200 transition-all duration-200">
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono tracking-wider">{roomCode}</span>
                  <button 
                    onClick={copyCode}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 hover:bg-rose-100 dark:hover:bg-rose-950/80 text-rose-500 transition-colors shadow-sm"
                    title="Sao chép mã phòng"
                  >
                    <span className="material-symbols-outlined text-[14px]">{copied ? 'done' : 'content_copy'}</span>
                  </button>
                  {copied && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold animate-fade-in pr-1.5">Copied!</span>
                  )}
                </div>

                <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                
                {/* Active Members Stack */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center -space-x-2">
                    {members.map(m => {
                      const avatarSrc = resolveAvatar(m);
                      return (
                        <div 
                          key={m.userId} 
                          className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-rose-50 dark:bg-rose-950 overflow-hidden relative group cursor-pointer animate-fade-in flex items-center justify-center shadow-sm hover:z-10 transition-all duration-200"
                          title={`${m.name} (${m.role})`}
                        >
                          {avatarSrc ? (
                            <img className="w-full h-full object-cover" src={avatarSrc} alt={m.name}/>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-350">
                              {m.name.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"></div>
                        </div>
                      );
                    })}
                    {members.length === 0 && (
                      <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">{userName.charAt(0)}</div>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-450 font-medium">{members.length} Đang trực tuyến</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Sync Badge */}
            <div className={`flex items-center gap-2 border rounded-full px-3.5 py-1.5 shadow-sm ${
              socketConnected 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40' 
                : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100/40 dark:border-rose-900/40'
            }`}>
              <span className="relative flex h-2 w-2">
                {socketConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${socketConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${socketConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {socketConnected ? 'Đồng Bộ Realtime' : 'Mất Kết Nối'}
              </span>
            </div>

            <button 
              onClick={handleLeaveRoom}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-600/10 text-white rounded-full text-xs font-bold transition-all duration-200 active:scale-95 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Rời Phòng
            </button>
          </div>
        </div>

        {/* Dashboard Grid Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          
          {/* LEFT PANEL: Cart items, Product grid, Checklist */}
          <div className="lg:col-span-8 p-8 border-r border-slate-100 dark:border-slate-700/50 space-y-10">
            
            {/* Budget Tracker Widget */}
            <div className="bg-slate-50/50 dark:bg-slate-900/20 p-6 rounded-2xl border border-slate-200/40 dark:border-slate-700/30">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ngân Sách Gia Đình</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">{fmt(totalSpent)}₫</span>
                    <span className="text-slate-400 font-medium">/ {fmt(budgetLimit)}₫</span>
                  </div>
                </div>
                <span className={`font-bold text-sm ${remainingBudget < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  {remainingBudget < 0 ? `Vượt ngân sách ${fmt(Math.abs(remainingBudget))}₫` : `Còn lại ${fmt(remainingBudget)}₫`}
                </span>
              </div>
              <div className="w-full h-4 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    budgetPercentage >= 100 ? 'bg-rose-600' : budgetPercentage >= 85 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${budgetPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Shopping List Header */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Giỏ Hàng Chung ({items.length})
                </h3>
                <div className="flex gap-2">
                  <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-rose-600/10 text-rose-600">Tất cả</span>
                  <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400">Mua chung</span>
                </div>
              </div>

              {/* Shared Products Grid */}
              {items.length === 0 ? (
                <div className="p-16 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                  <span className="material-symbols-outlined text-4xl block opacity-40">shopping_cart</span>
                  <p className="text-sm">Chưa có sản phẩm nào trong giỏ hàng gia đình.</p>
                  <p className="text-xs text-slate-500">Tìm kiếm sản phẩm bên dưới để thêm.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {items.map(item => {
                    const hasConsensus = item.votes.length >= Math.max(1, Math.ceil(members.length / 2));
                    const userVotedNeed = item.votes.includes(userId);
                    const userVotedWant = item.wants.includes(userId);

                    return (
                      <div key={item.id} className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl flex flex-col gap-4 border border-slate-100 dark:border-slate-800 hover:shadow-md transition">
                        <div className="flex gap-4">
                          <div className="w-20 h-20 bg-white rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center p-1 border border-slate-100 dark:border-slate-800">
                            <img className="w-full h-full object-contain" src={item.image || 'https://via.placeholder.com/80'} alt={item.name}/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] font-black text-rose-600 uppercase tracking-wider bg-rose-100/70 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                                {item.category || 'Essentials'}
                              </span>
                              {hasConsensus && (
                                <div className="flex items-center gap-1 text-emerald-600">
                                  <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                                  <span className="text-[9px] font-bold uppercase tracking-wider">Consensus</span>
                                </div>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-800 dark:text-white mt-1.5 text-sm line-clamp-1" title={item.name}>{item.name}</h4>
                            <p className="text-rose-600 font-extrabold text-sm mt-0.5">{fmt(item.price)}₫</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3.5 border-t border-slate-200/50 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <img className="w-6 h-6 rounded-full object-cover" src={getAvatarUrl(item.addedBy)} alt={item.addedBy}/>
                            <span className="text-[10px] text-slate-500">
                              Added by <strong className="text-slate-750 dark:text-white">{item.addedBy}</strong>
                            </span>
                          </div>
                          
                          {/* Quantity adjustments */}
                          <div className="flex items-center bg-slate-200/70 dark:bg-slate-900 rounded-full p-1">
                            <button 
                              onClick={() => handleUpdateQty(item.id, item.qty - 1)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors text-xs text-slate-600 dark:text-slate-300 font-extrabold"
                            >
                              -
                            </button>
                            <span className="px-3 text-xs font-bold text-slate-800 dark:text-white">{item.qty}</span>
                            <button 
                              onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors text-xs text-slate-600 dark:text-slate-300 font-extrabold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Collaborative Voting Controls */}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleVoteItem(item.id, 'need')}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                              userVotedNeed ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/10' : 'bg-rose-50/50 hover:bg-rose-100/50 text-rose-600 dark:bg-rose-950/20'
                            }`}
                          >
                            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>thumb_up</span>
                            Need It ({item.votes.length})
                          </button>
                          <button 
                            onClick={() => handleVoteItem(item.id, 'want')}
                            className={`px-3.5 py-2 rounded-lg transition ${
                              userVotedWant ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-200/60 hover:bg-slate-300/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                            title="Want It"
                          >
                            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: userVotedWant ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                          </button>
                          <button 
                            onClick={() => handleRemoveItem(item.id)}
                            className="px-3.5 py-2 bg-slate-200/60 hover:bg-rose-100 hover:text-rose-600 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition"
                            title="Xóa"
                          >
                            <span className="material-symbols-outlined text-xs">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Shopping Checklist Widget */}
            <div className="bg-slate-50 dark:bg-slate-900/10 p-6 rounded-2xl border border-slate-100 dark:border-slate-850">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="font-bold text-lg text-slate-800 dark:text-white" style={{ fontFamily: 'Nunito, sans-serif' }}>Danh sách cần mua</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Phác thảo danh sách đồ cần mua để cả nhóm cùng theo dõi</p>
                </div>
                <span className="text-xs text-rose-600 font-bold">
                  {checklist.filter(c => c.checked).length}/{checklist.length} đã hoàn thành
                </span>
              </div>
              
              {checklist.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  Danh sách cần mua đang trống. Hãy thêm món đồ cần thiết!
                </div>
              ) : (
                <div className="space-y-3">
                  {checklist.map(item => (
                    <label 
                      key={item.id} 
                      className="flex items-center gap-3.5 p-3.5 bg-white dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-rose-50/20 dark:hover:bg-slate-750 transition-colors group border border-slate-100 dark:border-slate-750"
                    >
                      <input 
                        checked={item.checked} 
                        onChange={e => handleToggleChecklist(item.id, e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500/20" 
                        type="checkbox"
                      />
                      <span className={`text-sm ${item.checked ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white font-medium'}`}>
                        {item.text}
                      </span>
                      {item.checked && (
                        <span className="ml-auto text-[9px] font-extrabold uppercase py-1 px-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full">
                          Xong bởi {item.checkedBy}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              {/* Add Checklist Item input */}
              <div className="flex gap-2 mt-4">
                <input 
                  value={checklistInput}
                  onChange={e => setChecklistInput(e.target.value)}
                  placeholder="Thêm món đồ cần mua..." 
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-slate-850 dark:text-white"
                  type="text"
                  onKeyDown={e => e.key === 'Enter' && handleAddChecklist()}
                />
                <button 
                  onClick={handleAddChecklist}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-slate-100 dark:text-slate-900 text-white rounded-xl text-xs font-bold transition active:scale-95 shrink-0"
                >
                  Thêm
                </button>
              </div>
            </div>

            {/* Product Browser Section */}
            <div className="bg-slate-50 dark:bg-slate-900/10 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-4">
              <div>
                <h3 className="font-bold text-lg text-slate-850 dark:text-white" style={{ fontFamily: 'Nunito, sans-serif' }}>Thêm sản phẩm nhanh</h3>
                <p className="text-xs text-slate-400 mt-0.5">Tìm kiếm nhanh sản phẩm tại Lotte Mart để cho vào giỏ hàng chung</p>
              </div>
              <div className="relative">
                <input 
                  value={searchQ} 
                  onChange={e => setSearchQ(e.target.value)} 
                  placeholder="🔍 Nhập tên sản phẩm để tìm kiếm..." 
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-slate-850 dark:text-white"
                />
                <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-sm">search</span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Không tìm thấy sản phẩm nào tại chi nhánh.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredProducts.map((p: any) => (
                    <div key={p.id} className="bg-white dark:bg-slate-800 hover:bg-rose-50/10 rounded-2xl border border-slate-200/50 dark:border-slate-750 p-3 flex items-center gap-3 transition">
                      <img 
                        src={p?.image || p?.thumbnail || ''} 
                        alt={p?.name} 
                        className="w-12 h-12 rounded-xl object-cover border border-slate-150 bg-white"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{p?.name}</p>
                        <p className="text-xs text-rose-600 font-extrabold mt-0.5">{fmt(Number(p?.price || 0))}₫</p>
                      </div>
                      <button 
                        onClick={() => handleAddItem(p)} 
                        className="w-8 h-8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center transition active:scale-95 font-extrabold text-base shrink-0"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDEBAR: Chat, timeline, checkout approval */}
          <div className="lg:col-span-4 bg-slate-50/40 dark:bg-slate-900/10 flex flex-col justify-between">
            
            {/* Activity Timeline */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-850">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-450 dark:text-slate-500 mb-6">
                Hoạt động mới nhất
              </h4>
              <div className="space-y-6 relative before:absolute before:left-3 before:top-2.5 before:bottom-2.5 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                {activities.slice(0, 5).map(act => (
                  <div key={act.id} className="relative pl-8 text-left">
                    <div className="absolute left-0 top-0.5 w-6 h-6 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      <span className="material-symbols-outlined text-[12px] text-rose-600">notifications</span>
                    </div>
                    <p className="text-xs text-slate-750 dark:text-slate-300 leading-normal font-medium">{act.text}</p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatTime(act.timestamp)}</span>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-xs text-slate-400 italic">Chưa có hoạt động nào trong phòng.</div>
                )}
              </div>
            </div>

            {/* Chat discussion panel */}
            <div className="flex-1 flex flex-col min-h-[350px]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-450 dark:text-slate-500">
                  Gia đình thảo luận
                </h4>
                <span className="bg-emerald-500 w-2.5 h-2.5 rounded-full animate-pulse"></span>
              </div>

              {/* Chat bubble list */}
              <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto max-h-[320px] hide-scrollbar bg-slate-50/20 dark:bg-slate-900/5 flex flex-col justify-end">
                {chatMessages.length === 0 ? (
                  <div className="my-auto flex flex-col items-center justify-center text-center text-slate-400 space-y-2 py-8">
                    <span className="material-symbols-outlined text-3xl opacity-30">forum</span>
                    <p className="text-xs">Chưa có tin nhắn nào. Bắt đầu cuộc trò chuyện!</p>
                  </div>
                ) : (
                  <div className="space-y-4 w-full">
                    {chatMessages.map(msg => {
                      const isMe = msg.senderId === userId;
                      return (
                        <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <img 
                            className="w-8 h-8 rounded-full object-cover shrink-0" 
                            src={getChatMessageAvatar(msg)} 
                            alt={msg.senderName}
                          />
                          <div className="max-w-[75%]">
                            <div className={`text-[9px] text-slate-400 dark:text-slate-500 mb-0.5 px-1 ${isMe ? 'text-right' : ''}`}>
                              {msg.senderName}
                            </div>
                            <div className={`p-3 rounded-2xl shadow-2xs ${
                              isMe ? 'bg-rose-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-tl-none border border-slate-100 dark:border-slate-700/50'
                            }`}>
                              <p className="text-xs font-medium leading-relaxed">{msg.text}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input section */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-850">
                <div className="relative flex items-center">
                  <input 
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Gửi tin nhắn..." 
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-5 py-3 pr-12 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-slate-800 dark:text-white"
                    type="text"
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                  />
                  <button 
                    onClick={handleSendChat}
                    className="absolute right-2.5 top-2.5 w-7 h-7 bg-rose-600 text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-xs">send</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Order Checkout Approval Panel */}
            <div className="p-8 bg-slate-100/70 dark:bg-slate-850 mt-auto border-t border-slate-200/40 dark:border-slate-750">
              <div className="mb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Xác nhận đơn hàng</h4>
                  <span className="text-xs font-black text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-full">
                    {approvals.length} / {members.length} Duyệt
                  </span>
                </div>
                
                {/* Approval Avatars */}
                <div className="flex -space-x-2">
                  {members.map(m => {
                    const approved = approvals.includes(m.userId);
                    const avatarSrc = resolveAvatar(m);
                    return (
                      <div 
                        key={m.userId}
                        className={`w-8 h-8 rounded-full border-2 border-slate-100 dark:border-slate-800 bg-rose-50 dark:bg-rose-950 overflow-hidden relative shrink-0 flex items-center justify-center ${
                          approved ? 'ring-2 ring-emerald-500 opacity-100' : 'opacity-50'
                        }`}
                        title={`${m.name} (${approved ? 'Đã duyệt' : 'Chưa duyệt'})`}
                      >
                        {avatarSrc ? (
                          <img className="w-full h-full object-cover" src={avatarSrc} alt={m.name}/>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-350">
                            {m.name.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                  * Khuyến nghị đầy đủ thành viên duyệt trước khi thanh toán.
                </p>
              </div>

              {/* Action checkout approval trigger */}
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleToggleApproval}
                  className={`w-full py-3.5 rounded-full font-bold flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-98 transition ${
                    approvals.includes(userId) 
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10' 
                      : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {approvals.includes(userId) ? 'check_circle' : 'verified'}
                  </span>
                  {approvals.includes(userId) ? 'Hủy phê duyệt đơn hàng' : 'Phê duyệt đơn hàng'}
                </button>

                <button 
                  onClick={() => toast.info('Tính năng thanh toán nhóm Lotte Mart đã được chuẩn bị!')}
                  className="w-full py-3.5 text-white rounded-full font-bold flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-98 transition shadow-lg shadow-rose-600/10"
                  style={{ background: 'linear-gradient(135deg, #970012 0%, #c1121f 100%)' }}
                >
                  <span className="material-symbols-outlined text-sm">shopping_bag</span>
                  Duyệt và Thanh Toán
                </button>
              </div>
            </div>

          </div>

        </div>

      </section>
    </main>
  );
};

export default SharedFamilyCart;
