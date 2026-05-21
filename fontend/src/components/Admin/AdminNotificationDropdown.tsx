import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import enterpriseService from '../../admin/services/enterpriseService';

export const AdminNotificationDropdown: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await enterpriseService.getAuditLogs({ limit: 5 });
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load activities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && logs.length === 0) {
      fetchActivities();
    }
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setOpen(!open)} 
        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 relative transition-colors"
        title={t('admin.notifications', { defaultValue: 'Notifications & Activity' })}
      >
        <span className="material-symbols-outlined leading-none block">notifications</span>
        {/* We keep the dot to indicate active monitoring */}
        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">history</span>
              {t('admin.recentActivity', { defaultValue: 'Recent Activity' })}
            </h3>
            <button onClick={() => { setOpen(false); fetchActivities(); }} className="text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[16px] block">refresh</span>
            </button>
          </div>
          
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="p-6 flex justify-center">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                <span className="material-symbols-outlined block text-2xl text-slate-300 mb-2">inbox</span>
                {t('admin.noNotifications', { defaultValue: 'No notifications at this time.' })}
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {logs.map((log) => {
                  const isError = log.details?.status === 'FAILURE';
                  const isSuspicious = log.details?.status === 'SUSPICIOUS';
                  
                  return (
                    <div key={String(log._id)} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center ${
                        isError ? 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400' :
                        isSuspicious ? 'bg-orange-50 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">
                          {isError ? 'error' : isSuspicious ? 'warning' : 'check_circle'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={log.action}>
                          {log.action}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5" title={log.details?.message || log.entity}>
                          {log.details?.message || log.entity || t('admin.systemEvent', { defaultValue: 'System event' })}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1">
                          {(log.user_name || log.user_id || 'System')} • {new Date(log.created_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <button 
              onClick={() => { setOpen(false); navigate('/admin/settings'); }}
              className="w-full text-center text-xs font-bold text-primary hover:text-primary-container hover:underline"
            >
              {t('admin.viewAllLogs', { defaultValue: 'View all logs' })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
