import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { popupAdService } from '../../services/popupAdService';

export const StorefrontPopupModal: React.FC = () => {
  const navigate = useNavigate();
  const authState = useAppSelector((state) => state.auth);
  const branchState = useAppSelector((state) => state.branch);

  const [activePopup, setActivePopup] = useState<any | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchAndFilterPopups = async () => {
      // 1. Fetch active popups
      const res = await popupAdService.getPopupAds({ status: 'active' });
      if (!res.success || !res.data || res.data.length === 0) return;

      const now = new Date();
      const isAuthenticated = authState.isAuthenticated;
      const user = authState.user;
      const currentBranchId = branchState.currentBranch
        ? String(branchState.currentBranch.id || (branchState.currentBranch as any)._id)
        : '';

      // 2. Filter based on scheduling, targeting, and localStorage rules
      const eligiblePopups = res.data.filter((ad: any) => {
        // Status check
        if (ad.status !== 'active') return false;

        // Date check
        if (ad.start_date && new Date(ad.start_date) > now) return false;
        if (ad.end_date && new Date(ad.end_date) < now) return false;

        // Branch check
        if (ad.target_branch && ad.target_branch !== 'all') {
          if (String(ad.target_branch) !== currentBranchId) return false;
        }

        // Audience check
        if (ad.target_audience === 'member' && !isAuthenticated) return false;
        if (ad.target_audience === 'new') {
          const hasOrders = user && ((user as any).has_orders || ((user as any).orders && (user as any).orders.length > 0));
          if (isAuthenticated && hasOrders) return false;
        }

        // show_once_per_day check
        if (ad.show_once_per_day) {
          const todayStr = now.toISOString().split('T')[0];
          const lastSeen = localStorage.getItem(`lotte_popup_seen_${ad._id || ad.id}`);
          if (lastSeen === todayStr) return false;
        }

        return true;
      });

      if (eligiblePopups.length === 0) return;

      // 3. Sort by priority descending
      eligiblePopups.sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));

      // 4. Select the highest priority popup
      setActivePopup(eligiblePopups[0]);
      setIsOpen(true);
    };

    // Delay showing the popup slightly for better user transition
    const timer = setTimeout(() => {
      fetchAndFilterPopups();
    }, 1200);

    return () => clearTimeout(timer);
  }, [authState.isAuthenticated, authState.user, branchState.currentBranch]);

  const handleClose = () => {
    if (activePopup) {
      if (activePopup.show_once_per_day) {
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem(`lotte_popup_seen_${activePopup._id || activePopup.id}`, todayStr);
      }
    }
    setIsOpen(false);
  };

  const handleCTA = () => {
    if (!activePopup) return;

    // Save seen status if once per day
    if (activePopup.show_once_per_day) {
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(`lotte_popup_seen_${activePopup._id || activePopup.id}`, todayStr);
    }

    setIsOpen(false);

    // Navigate to link
    const link = activePopup.cta_link || activePopup.link;
    if (link) {
      if (link.startsWith('http')) {
        window.open(link, '_blank', 'noreferrer');
      } else {
        navigate(link);
      }
    }
  };

  if (!isOpen || !activePopup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          type="button" 
          onClick={handleClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors z-10"
        >
          <span className="material-symbols-outlined text-sm font-black">close</span>
        </button>

        {/* Banner/Popup Image */}
        {activePopup.image_url ? (
          <div className="w-full h-56 relative overflow-hidden bg-slate-100">
            <img 
              src={activePopup.image_url} 
              alt={activePopup.title} 
              className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-5xl">campaign</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 text-center flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight leading-snug">
              {activePopup.title}
            </h3>
            
            {activePopup.subtitle && (
              <h4 className="text-sm font-bold text-red-600 mt-2 uppercase tracking-wider">
                {activePopup.subtitle}
              </h4>
            )}

            {activePopup.description && (
              <p className="text-sm text-slate-500 mt-3 leading-relaxed text-justify px-2 line-clamp-4">
                {activePopup.description}
              </p>
            )}
          </div>

          <div className="mt-8">
            <button 
              type="button" 
              onClick={handleCTA}
              className="w-full py-3 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black rounded-2xl text-sm transition-all shadow-lg shadow-red-500/20 active:transform active:scale-95"
            >
              {activePopup.cta_text || 'Khám Phá Ngay'}
            </button>

            {activePopup.show_once_per_day && (
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">
                Không hiển thị lại trong hôm nay
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorefrontPopupModal;
