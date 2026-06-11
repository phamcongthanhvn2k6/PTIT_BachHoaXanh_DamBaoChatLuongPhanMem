import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store';
import { socket } from '../services/socket';
import { toast } from '../components/Toast/toastEvent';
import { useBranchData } from '../hooks/useBranchData';

interface FamilyCartItem { id:string; name:string; image:string; price:number; qty:number; addedBy:string; addedAt:string; }
interface FamilyMember { userId:string; name:string; joinedAt:string; }

const SharedFamilyCart: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAppSelector(s => s.auth);
  useBranchData();
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [items, setItems] = useState<FamilyCartItem[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [inputCode, setInputCode] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const { availableProducts } = useBranchData();

  const userName = user?.full_name || user?.email || 'Guest';
  const userId = String(user?.id || user?._id || Date.now());

  // Generate room code
  const generateCode = () => {
    const code = `LOTTE-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
    setRoomCode(code);
    joinRoom(code);
  };

  const joinRoom = useCallback((code: string) => {
    socket.emit('family_cart_join', { roomCode: code, userId, userName });
    setJoined(true);
    setRoomCode(code);
    toast.success(`Đã tham gia giỏ hàng gia đình: ${code}`);
  }, [userId, userName]);

  // Socket listeners
  useEffect(() => {
    if (!joined) return;

    const onSync = (data: { items: FamilyCartItem[]; members: FamilyMember[] }) => {
      setItems(data.items || []);
      setMembers(data.members || []);
    };
    const onAdd = (item: FamilyCartItem) => {
      setItems(p => [...p, item]);
      if (item.addedBy !== userName) toast.success(`${item.addedBy} thêm ${item.name}`);
    };
    const onRemove = (data: { id: string; removedBy: string }) => {
      setItems(p => p.filter(i => i.id !== data.id));
    };
    const onMemberJoin = (member: FamilyMember) => {
      setMembers(p => [...p.filter(m => m.userId !== member.userId), member]);
      toast.success(`${member.name} đã tham gia!`);
    };
    const onMemberLeave = (data: { userId: string }) => {
      setMembers(p => p.filter(m => m.userId !== data.userId));
    };

    socket.on('family_cart_sync', onSync);
    socket.on('family_cart_item_added', onAdd);
    socket.on('family_cart_item_removed', onRemove);
    socket.on('family_cart_member_joined', onMemberJoin);
    socket.on('family_cart_member_left', onMemberLeave);

    return () => {
      socket.off('family_cart_sync', onSync);
      socket.off('family_cart_item_added', onAdd);
      socket.off('family_cart_item_removed', onRemove);
      socket.off('family_cart_member_joined', onMemberJoin);
      socket.off('family_cart_member_left', onMemberLeave);
    };
  }, [joined, userName]);

  // Simulate: since backend may not have family_cart events yet, use local state as fallback
  const addItemLocal = (product: any) => {
    const item: FamilyCartItem = {
      id: String(product?.branch_product_id || product?.id || product?._id || Date.now()),
      name: product?.name || 'Sản phẩm',
      image: product?.image || product?.thumbnail || '',
      price: Number(product?.price || 0),
      qty: 1,
      addedBy: userName,
      addedAt: new Date().toISOString(),
    };
    socket.emit('family_cart_add_item', { roomCode, item });
    // Optimistic local update
    setItems(p => [...p, item]);
    toast.success(`Đã thêm ${item.name}`);
  };

  const removeItemLocal = (id: string) => {
    socket.emit('family_cart_remove_item', { roomCode, id, removedBy: userName });
    setItems(p => p.filter(i => i.id !== id));
  };

  const leaveRoom = () => {
    socket.emit('family_cart_leave', { roomCode, userId });
    setJoined(false); setRoomCode(''); setItems([]); setMembers([]);
    toast.success('Đã rời giỏ hàng gia đình');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success('Đã copy mã phòng!');
  };

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const fmt = (n: number) => n.toLocaleString('vi-VN');

  const filteredProducts = (availableProducts || []).filter((p: any) =>
    searchQ.trim() ? p?.name?.toLowerCase().includes(searchQ.toLowerCase()) : true
  ).slice(0, 12);

  // Not joined UI
  if (!joined) return (
    <main className="max-w-3xl mx-auto px-4 py-12 mb-20">
      <div className="text-center mb-10">
        <span className="material-symbols-outlined !text-6xl text-indigo-500 mb-3 block">family_restroom</span>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">{t('familyCart.title')}</h1>
        <p className="text-slate-500 mt-2">{t('familyCart.desc')}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg border border-slate-100 text-center">
          <span className="material-symbols-outlined !text-5xl text-green-500 mb-3 block">add_circle</span>
          <h3 className="text-lg font-black mb-2">{t('familyCart.createNew')}</h3>
          <p className="text-sm text-slate-400 mb-6">{t('familyCart.createDesc')}</p>
          <button onClick={generateCode} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">{t('familyCart.createCart')}</button>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg border border-slate-100 text-center">
          <span className="material-symbols-outlined !text-5xl text-blue-500 mb-3 block">group_add</span>
          <h3 className="text-lg font-black mb-2">{t('familyCart.joinRoom')}</h3>
          <p className="text-sm text-slate-400 mb-4">{t('familyCart.joinDesc')}</p>
          <input value={inputCode} onChange={e => setInputCode(e.target.value.toUpperCase())} placeholder="VD: LOTTE-ABC123" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center font-mono font-bold text-lg mb-4 outline-none focus:border-indigo-400"/>
          <button onClick={() => inputCode && joinRoom(inputCode)} disabled={!inputCode} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-40">Tham gia</button>
        </div>
      </div>
    </main>
  );

  // Joined UI
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 mb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 text-white mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><span className="material-symbols-outlined">family_restroom</span>{t('familyCart.title')}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="bg-white/20 px-3 py-1 rounded-lg font-mono font-bold text-sm">{roomCode}</span>
            <button onClick={copyCode} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-sm font-bold transition-colors">📋 Copy</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {members.map((m, i) => (
              <div key={i} className="w-9 h-9 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-sm font-bold" title={m.name}>
                {m.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {members.length === 0 && <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-sm font-bold">{userName.charAt(0).toUpperCase()}</div>}
          </div>
          <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-lg">{Math.max(members.length, 1)} thành viên</span>
          <button onClick={leaveRoom} className="bg-red-500/80 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-bold transition-colors">{t('familyCart.leaveRoom')}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart items */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-lg">{items.length} sản phẩm · {fmt(total)}₫</h2>
            </div>
            {items.length === 0 ? (
              <div className="p-12 text-center text-slate-400"><span className="text-4xl block mb-2">🛒</span>{t('familyCart.emptyCart')}</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                    <img src={item.image || 'https://via.placeholder.com/60'} alt={item.name} className="w-14 h-14 rounded-xl object-cover"/>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[9px] font-bold">{item.addedBy.charAt(0)}</span>
                        {item.addedBy}
                      </p>
                    </div>
                    <span className="font-black text-rose-600">{fmt(item.price)}₫</span>
                    <button onClick={() => removeItemLocal(item.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                      <span className="material-symbols-outlined !text-sm">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Browse products */}
          <div className="mt-6">
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="🔍 Tìm sản phẩm để thêm..." className="w-full px-4 py-3 border border-slate-200 rounded-xl mb-4 outline-none focus:border-indigo-400 text-sm"/>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((p: any, i: number) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 p-3 flex items-center gap-3">
                  <img src={p?.image || p?.thumbnail || ''} alt={p?.name} className="w-10 h-10 rounded-lg object-cover"/>
                  <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{p?.name}</p><p className="text-xs text-rose-600 font-bold">{fmt(Number(p?.price||0))}₫</p></div>
                  <button onClick={() => addItemLocal(p)} className="w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 text-xs">+</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: members */}
        <div>
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-100 p-5">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-indigo-500">group</span>{t('familyCart.members')}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">{userName.charAt(0).toUpperCase()}</div>
                <div><p className="font-bold text-sm">{userName}</p><p className="text-xs text-slate-400">{t('familyCart.you')}</p></div>
              </div>
              {members.filter(m => m.userId !== userId).map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">{m.name.charAt(0).toUpperCase()}</div>
                  <div><p className="font-bold text-sm">{m.name}</p><p className="text-xs text-green-500">Online</p></div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-slate-50 rounded-xl text-center">
              <p className="text-xs text-slate-500 mb-2">{t('familyCart.shareCode')}</p>
              <p className="font-mono font-black text-xl text-indigo-600">{roomCode}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
export default SharedFamilyCart;
