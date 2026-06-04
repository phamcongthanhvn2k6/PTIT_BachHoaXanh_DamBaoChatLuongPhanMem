import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { dataService } from '../../services/dataService';
import httpClient from '../../api/httpClient';
import { useTranslation } from 'react-i18next';

/** Apply a favicon URL to the browser tab immediately, with cache-busting */
const applyFaviconToDom = (url: string) => {
  // Strip any existing query params, then add a fresh cache-buster
  const clean = url.split('?')[0];
  const bustUrl = `${clean}?v=${Date.now()}`;
  // Remove ALL existing favicon links so the browser cannot serve a stale icon
  document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']").forEach(el => el.remove());
  const link = document.createElement('link');
  link.id = 'dynamic-favicon';
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = bustUrl;
  document.head.appendChild(link);
};

const AdminSystemSettings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [settings, setSettings] = useState<any>({});
  const settingsRef = useRef<any>({});
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [isDraggingFavicon, setIsDraggingFavicon] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Keep ref in sync so async callbacks always read the latest value
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // ── Favicon upload handler ────────────────────────────────────
  const handleFaviconUpload = async (file: File) => {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!ALLOWED.includes(file.type) && !file.name.endsWith('.ico')) {
      toast.error(t('adminSettings.faviconInvalidType'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('adminSettings.faviconTooLarge'));
      return;
    }
    try {
      setUploadingFavicon(true);
      const formData = new FormData();
      formData.append('logo', file);
      const res = await httpClient.post('/uploads/brand-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url: string = res?.data?.data?.url || res?.data?.url || '';
      if (!url) { toast.error(t('adminSettings.faviconNoUrl')); return; }

      // Normalise: store only the relative path so it works behind any proxy
      const relativeUrl = url.includes('/uploads/') ? url.substring(url.indexOf('/uploads/')) : url;

      // 1. Update state (marks hasChanges)
      handleSettingChange('favicon_url', relativeUrl);

      // 2. Apply to the browser tab RIGHT NOW
      applyFaviconToDom(relativeUrl);

      // 3. Auto-persist so the user doesn't need to remember to click Save
      //    Use settingsRef.current to avoid stale-closure issues with React state
      try {
        await dataService.updateAdminSettings({ ...settingsRef.current, favicon_url: relativeUrl });
        setHasChanges(false); // auto-save succeeded — clear dirty flag
      } catch { /* non-critical — Save button still available */ }

      toast.success(t('adminSettings.faviconUploadSuccess'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || t('adminSettings.faviconUploadError'));
    } finally {
      setUploadingFavicon(false);
      if (faviconInputRef.current) faviconInputRef.current.value = '';
    }
  };

  // ── Data loading ──────────────────────────────────────────────
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await dataService.getAdminSettings();
      setSettings(res || {});
      setHasChanges(false);
    } catch (err) {
      toast.error(t('adminSettings.loadError') + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSettingChange = (name: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };

  const handleMaintenanceToggle = async () => {
    if (togglingMaintenance) return;
    const nextVal = !settings.maintenance_mode;
    
    const confirmMsg = nextVal 
      ? t('adminSettings.confirmMaintenanceOn') || 'Xác nhận BẬT chế độ bảo trì? Hệ thống sẽ ngừng nhận đơn hàng từ khách hàng.'
      : t('adminSettings.confirmMaintenanceOff') || 'Xác nhận TẮT chế độ bảo trì? Khách hàng có thể mua sắm bình thường.';
      
    if (!window.confirm(confirmMsg)) return;

    try {
      setTogglingMaintenance(true);
      
      const payload: Record<string, any> = { 
        maintenance_mode: nextVal 
      };
      
      if (nextVal) {
        payload.maintenance_mode_start_at = new Date().toISOString();
        payload.maintenance_mode_reason = 'Scheduled system upgrade';
        payload.maintenance_mode_message = 'Hệ thống đang bảo trì định kỳ để nâng cấp. Vui lòng quay lại sau.';
      }
      
      await dataService.updateAdminSettings(payload);
      
      setSettings((prev: any) => ({ 
        ...prev, 
        maintenance_mode: nextVal,
        ...(nextVal ? {
          maintenance_mode_start_at: payload.maintenance_mode_start_at,
          maintenance_mode_reason: payload.maintenance_mode_reason,
          maintenance_mode_message: payload.maintenance_mode_message
        } : {})
      }));
      
      toast.success(nextVal 
        ? t('adminSettings.maintenanceOnSuccess') || 'Đã kích hoạt chế độ bảo trì thành công!'
        : t('adminSettings.maintenanceOffSuccess') || 'Đã tắt chế độ bảo trì thành công!'
      );
    } catch (err: any) {
      toast.error((t('adminSettings.maintenanceToggleError') || 'Không thể thay đổi chế độ bảo trì: ') + (err?.response?.data?.message || err.message));
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const saveSettings = async () => {
    if (!hasChanges) return;
    if (settings.vat_rate < 0 || settings.vat_rate > 100) return toast.error(t('adminSettings.vatInvalid'));
    if (settings.default_shipping_fee < 0) return toast.error(t('adminSettings.shippingInvalid'));
    try {
      setIsSaving(true);
      if (!window.confirm(t('adminSettings.confirmSave'))) return;
      await dataService.updateAdminSettings(settings);
      // Re-apply favicon after save in case it changed
      if (settings.favicon_url) applyFaviconToDom(settings.favicon_url);
      toast.success(t('adminSettings.saveSuccess'));
      setHasChanges(false);
    } catch (err) {
      toast.error(t('adminSettings.saveError') + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetChanges = () => {
    if (window.confirm(t('adminSettings.confirmReset'))) loadData();
  };

  if (loading) {
    return <div className="p-8"><div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-primary animate-spin mx-auto mt-20"></div></div>;
  }

  // ── Input field helper ────────────────────────────────────────
  const inputCls = "w-full bg-surface-container-low border border-transparent rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all";

  return (
    <div className="p-8 bg-surface min-h-screen text-on-surface">
      <div className="max-w-6xl mx-auto space-y-8 pb-32">
        {/* Page Header */}
        <div className="mb-10">
          <nav className="flex text-[10px] uppercase tracking-widest text-secondary font-bold mb-2 gap-2">
            <span>{t('adminSettings.breadcrumbAdmin')}</span>
            <span className="text-outline">/</span>
            <span className="text-primary">{t('adminSettings.breadcrumbSettings')}</span>
          </nav>
          <h2 className="text-[2.75rem] font-black tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-on-surface to-slate-500">
            {t('adminSettings.pageTitle')}
          </h2>
          <p className="mt-2 text-secondary font-medium text-sm">{t('adminSettings.pageSubtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-surface-container-low p-2 rounded-2xl mb-8 w-fit shadow-inner">
          {[
            { id: 'general', icon: 'tune', label: t('adminSettings.tabGeneral') },
            { id: 'orders', icon: 'local_shipping', label: t('adminSettings.tabOrders') },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 font-bold rounded-xl text-sm transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-surface-container-lowest text-primary shadow-sm ring-1 ring-slate-200'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container-lowest/50'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${activeTab === tab.id ? 'font-black' : ''}`}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8 space-y-8">

            {activeTab === 'general' && (
              <>
                <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                    <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                    <h3 className="text-xl font-bold uppercase tracking-tight">{t('adminSettings.sectionBranding')}</h3>
                  </div>

                  {/* ── Favicon Upload ── */}
                  <div
                    className={`rounded-xl border-2 transition-all overflow-hidden ${
                      isDraggingFavicon ? 'border-blue-500 bg-blue-50/30 shadow-lg shadow-blue-500/10' : 'border-slate-200/80 bg-gradient-to-br from-slate-50/80 to-white hover:border-slate-300'
                    }`}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDraggingFavicon(true); }}
                    onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setIsDraggingFavicon(false); }}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); setIsDraggingFavicon(false); const f = e.dataTransfer.files?.[0]; if (f) handleFaviconUpload(f); }}
                  >
                    {/* Section header */}
                    <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                          <span className="material-symbols-outlined text-white text-[18px]">public</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-on-surface">{t('adminSettings.faviconLabel')}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">{t('adminSettings.faviconDesc')}</p>
                        </div>
                      </div>
                      {settings.favicon_url && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          {t('adminSettings.faviconUploaded')}
                        </span>
                      )}
                    </div>

                    {/* Content area */}
                    <div className="px-6 pb-5">
                      <div className="flex items-stretch gap-5">
                        {/* Left: Browser tab mockup + preview */}
                        <div className="flex flex-col items-center gap-3 flex-shrink-0">
                          {/* Browser tab mockup */}
                          <div className="w-[180px] rounded-t-xl overflow-hidden shadow-md border border-slate-200/60">
                            {/* Tab bar */}
                            <div className="bg-slate-100 px-3 py-1.5 flex items-center gap-2 border-b border-slate-200/60">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-400/70"></span>
                                <span className="w-2 h-2 rounded-full bg-amber-400/70"></span>
                                <span className="w-2 h-2 rounded-full bg-green-400/70"></span>
                              </div>
                              <div className="flex-1 bg-white rounded px-2 py-0.5 flex items-center gap-1.5 min-w-0">
                                {settings.favicon_url ? (
                                  <img src={`${settings.favicon_url}?v=${Date.now()}`} alt="" className="w-3.5 h-3.5 object-contain flex-shrink-0" />
                                ) : (
                                  <span className="material-symbols-outlined text-slate-300 text-[14px] flex-shrink-0">language</span>
                                )}
                                <span className="text-[9px] text-slate-500 font-medium truncate">LOTTE Mart</span>
                              </div>
                            </div>
                            {/* Page area */}
                            <div className="bg-white h-14 flex items-center justify-center">
                              {settings.favicon_url ? (
                                <img src={`${settings.favicon_url}?v=${Date.now()}`} alt="Favicon" className="w-10 h-10 object-contain" />
                              ) : (
                                <span className="text-[10px] text-slate-300 font-medium">No icon</span>
                              )}
                            </div>
                          </div>

                          {/* Upload / Change button */}
                          <button
                            type="button"
                            onClick={() => faviconInputRef.current?.click()}
                            disabled={uploadingFavicon}
                            className="w-[180px] flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                          >
                            {uploadingFavicon ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <span>{t('adminSettings.saving')}</span>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[16px] group-hover:text-blue-500 transition-colors">
                                  {settings.favicon_url ? 'swap_horiz' : 'cloud_upload'}
                                </span>
                                <span>{settings.favicon_url ? t('adminSettings.changeFavicon') : t('adminSettings.upload')}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Right: Info + actions */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div className="space-y-3">
                            <div className="flex items-start gap-2 text-[11px] text-slate-500">
                              <span className="material-symbols-outlined text-[14px] text-slate-400 mt-px flex-shrink-0">info</span>
                              <span>{t('adminSettings.faviconFormats')}</span>
                            </div>
                            {settings.favicon_url && (
                              <div className="bg-slate-50/80 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[14px] text-slate-400">link</span>
                                  <code className="text-[10px] text-slate-500 font-mono truncate block">{settings.favicon_url}</code>
                                </div>
                              </div>
                            )}
                          </div>

                          {settings.favicon_url && (
                            <button
                              type="button"
                              onClick={() => { handleSettingChange('favicon_url', ''); applyFaviconToDom('/favicon.ico'); }}
                              className="self-start flex items-center gap-1.5 text-[11px] text-rose-400 hover:text-rose-600 font-medium transition-colors mt-2 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete_outline</span>
                              {t('adminSettings.removeFavicon')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <input ref={faviconInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon,.ico" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFaviconUpload(f); }} />
                  </div>

                  {/* ── Text fields ── */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 md:col-span-1 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-secondary">{t('adminSettings.systemName')}</label>
                      <input className={inputCls} type="text" placeholder="VD: Lotte Mart Online" value={settings.system_name || ''} onChange={e => handleSettingChange('system_name', e.target.value)} />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-secondary">{t('adminSettings.brandName')}</label>
                      <input className={inputCls} placeholder="VD: LOTTE Mart" value={settings.brand_name || ''} onChange={e => handleSettingChange('brand_name', e.target.value)} />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-secondary">{t('adminSettings.headerLogoText')}</label>
                      <input className={inputCls} placeholder="VD: LOTTE Mart" value={settings.header_logo_text || ''} onChange={e => handleSettingChange('header_logo_text', e.target.value)} />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-secondary">{t('adminSettings.supportEmail')}</label>
                      <input className={inputCls} type="email" placeholder="VD: support@lottemart.vn" value={settings.support_email || ''} onChange={e => handleSettingChange('support_email', e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-secondary">{t('adminSettings.hotline')}</label>
                      <input className={inputCls} type="text" placeholder="VD: 1800 599 907" value={settings.support_phone || ''} onChange={e => handleSettingChange('support_phone', e.target.value)} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'orders' && (
              <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                  <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
                  <h3 className="text-xl font-bold uppercase tracking-tight">{t('adminSettings.sectionOrders')}</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-secondary">{t('adminSettings.shippingFee')}</label>
                    <input className={inputCls} type="number" value={settings.default_shipping_fee || 0} onChange={e => handleSettingChange('default_shipping_fee', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-secondary">{t('adminSettings.freeShipThreshold')}</label>
                    <input className={inputCls} type="number" value={settings.free_shipping_threshold || 0} onChange={e => handleSettingChange('free_shipping_threshold', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-secondary">{t('adminSettings.vatRate')}</label>
                    <input className={inputCls} type="number" value={settings.vat_rate || 0} onChange={e => handleSettingChange('vat_rate', Number(e.target.value))} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Sidebar ── */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Maintenance Toggle */}
            <div className={`p-6 rounded-2xl border transition-all duration-300 ${togglingMaintenance ? 'opacity-70 scale-[0.98]' : ''} ${settings.maintenance_mode ? 'bg-orange-50 border-orange-200 shadow-lg shadow-orange-500/10' : 'bg-surface-container-high/50 border-transparent'}`}>
              <div className="flex items-center gap-3 mb-5">
                <span className={`material-symbols-outlined text-2xl ${togglingMaintenance ? 'animate-spin text-orange-500' : settings.maintenance_mode ? 'text-orange-500' : 'text-slate-400'}`}>
                  {togglingMaintenance ? 'progress_activity' : 'construction'}
                </span>
                <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-on-surface opacity-60">{t('adminSettings.maintenanceMode')}</h4>
              </div>
              <div className={`flex items-center justify-between ${togglingMaintenance ? 'cursor-not-allowed' : 'cursor-pointer'}`} onClick={handleMaintenanceToggle}>
                <div>
                  <p className={`text-sm font-bold ${settings.maintenance_mode ? 'text-orange-900' : 'text-on-surface'}`}>{t('adminSettings.maintenanceToggle')}</p>
                  <p className="text-[10px] text-secondary mt-1 max-w-[200px] leading-relaxed">{t('adminSettings.maintenanceDesc')}</p>
                </div>
                <div className="relative inline-flex items-center flex-shrink-0">
                  <div className={`w-11 h-6 rounded-full transition-colors ${settings.maintenance_mode ? 'bg-orange-500' : 'bg-surface-variant'}`}></div>
                  <div className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full shadow transition-transform ${settings.maintenance_mode ? 'translate-x-5' : ''}`}></div>
                </div>
              </div>
            </div>

            {/* System Info Card */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200/80">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block"></span>
                  </div>
                  <span className="text-white/80 text-xs font-bold tracking-wide">Lotte Mart Core</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2.5 py-1 rounded-full tracking-wide flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  ONLINE
                </span>
              </div>
              <div className="bg-slate-950 divide-y divide-slate-800/60">
                {[
                  { label: t('adminSettings.infoVersion'), value: 'v3.0.0', cls: 'text-violet-400' },
                  { label: t('adminSettings.infoEnv'), value: 'PRODUCTION', cls: 'text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded' },
                  { label: t('adminSettings.infoDb'), value: '2.4 GB', cls: 'text-emerald-400' },
                  { label: t('adminSettings.infoBackup'), value: t('adminSettings.infoBackupValue'), cls: 'text-slate-300' },
                  { label: t('adminSettings.infoApi'), value: 'Healthy', cls: 'text-emerald-400' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-slate-500 text-[11px] font-medium">{r.label}</span>
                    <span className={`text-[11px] font-bold font-mono ${r.cls}`}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-900/70 px-5 py-3">
                <p className="text-[10px] text-slate-500 leading-relaxed">{t('adminSettings.infoNote')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Bar */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 p-5 z-30 flex justify-between items-center shadow-2xl animate-slide-up">
          <div className="flex items-center gap-4 ml-6 lg:ml-[280px]">
            <span className="material-symbols-outlined text-orange-500 animate-pulse text-3xl">info</span>
            <p className="text-sm font-bold text-on-surface">{t('adminSettings.unsavedChanges')}</p>
          </div>
          <div className="flex items-center gap-3 pr-8">
            <button onClick={resetChanges} disabled={isSaving} className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98] border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed">{t('adminSettings.revert')}</button>
            <button onClick={saveSettings} disabled={isSaving} className="inline-flex items-center justify-center gap-2 h-10 px-10 bg-green-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-green-600/15 hover:bg-green-700 hover:-translate-y-0.5 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
              {isSaving ? t('adminSettings.saving') : t('adminSettings.saveAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystemSettings;