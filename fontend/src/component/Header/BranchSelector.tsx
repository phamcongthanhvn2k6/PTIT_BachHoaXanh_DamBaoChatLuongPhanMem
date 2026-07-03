import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store';
import { setCurrentBranch, loadBranches } from '../../slices/branchSlice';
import { clearCart } from '../../slices/cartSlice';
import type { Branch } from '../../types';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Custom SVG Marker Icons to guarantee visibility
const createMarkerIcon = (color: string) => L.divIcon({
  className: 'custom-leaflet-marker',
  html: `<div style="
    background-color: ${color};
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  ">
    <div style="transform: rotate(45deg); font-size: 16px;">🏪</div>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

const DefaultIcon = createMarkerIcon('#666666'); // Dark gray for unselected
const SelectedIcon = createMarkerIcon('#008848'); // Brand green for selected
L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map centering
const MapUpdater = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.5 });
  }, [center, zoom, map]);
  return null;
};

// Distance calculation
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper to remove Vietnamese tones for accent-insensitive search
const removeVietnameseTones = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const DEFAULT_CENTER: [number, number] = [10.762622, 106.660172]; // Ho Chi Minh City

const BranchSelector: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { branches, currentBranch, status } = useAppSelector((state) => state.branch);
  const { itemsByBranch } = useAppSelector((state) => state.cart);
  
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingBranch, setPendingBranch] = useState<Branch | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(12);

  const ref = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(loadBranches());
    }
  }, [dispatch, status]);

  // Center map on current branch initially if open
  useEffect(() => {
    if (open && currentBranch?.coordinates) {
      setMapCenter([currentBranch.coordinates.lat, currentBranch.coordinates.lng]);
      setMapZoom(15);
    }
  }, [open, currentBranch]);

  // Handle click outside to close dropdown/modal
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (showConfirm) return;
      if (ref.current && ref.current.contains(e.target as Node)) return;
      if (modalRef.current && modalRef.current.contains(e.target as Node)) return;
      
      // Prevent closing if clicking on leaflet elements (sometimes they render outside)
      const target = e.target as HTMLElement;
      if (target.closest('.leaflet-container') || target.closest('.leaflet-popup')) return;
      
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showConfirm]);

  const handleSelectBranch = (branch: Branch) => {
    const currentId = String(currentBranch?.id || (currentBranch as any)?._id || '');
    const newId = String(branch.id || (branch as any)?._id || '');

    if (branch.coordinates) {
      setMapCenter([branch.coordinates.lat, branch.coordinates.lng]);
      setMapZoom(16);
    }

    if (currentId === newId) {
      return;
    }

    const currentItems = currentId ? (itemsByBranch[currentId] || []) : [];
    const cartHasItems = currentItems.length > 0;
    
    if (cartHasItems) {
      setPendingBranch(branch);
      setShowConfirm(true);
    } else {
      dispatch(setCurrentBranch(branch));
    }
  };

  const confirmBranchChange = () => {
    if (pendingBranch) {
      dispatch(clearCart());
      dispatch(setCurrentBranch(pendingBranch));
    }
    setShowConfirm(false);
    setPendingBranch(null);
  };

  const cancelBranchChange = () => {
    setShowConfirm(false);
    setPendingBranch(null);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Trình duyệt không hỗ trợ định vị");
      return;
    }
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLoc(coords);
        setMapCenter(coords);
        setMapZoom(13);
      },
      () => {
        setLocError("Từ chối quyền truy cập vị trí");
      }
    );
  };

  const branchName = currentBranch?.name || t('branch.selectBranch');

  // Process branches for map and list
  const processedBranches = useMemo(() => {
    return branches
      .filter((b) => b.is_active !== false)
      .map(b => {
        let distance = null;
        if (userLoc && b.coordinates) {
          distance = getDistance(userLoc[0], userLoc[1], b.coordinates.lat, b.coordinates.lng);
        }
        return { ...b, distance };
      })
      .filter(b => {
        const query = removeVietnameseTones(searchQuery.toLowerCase());
        const nameNorm = removeVietnameseTones(b.name.toLowerCase());
        const addrNorm = b.address ? removeVietnameseTones(b.address.toLowerCase()) : '';
        return nameNorm.includes(query) || addrNorm.includes(query);
      })
      .sort((a, b) => {
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [branches, userLoc, searchQuery]);

  return (
    <>
      <div ref={ref} style={{ position: 'relative' }}>
        {/* Trigger Button inside Header */}
        <button
          onClick={() => setOpen(!open)}
          id="branch-selector-btn"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: 0
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#FFD400' }}>location_on</span>
          <span style={{ whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {branchName}
          </span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
        </button>
      </div>

      {/* Main Map + List Modal */}
      {open && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            ref={modalRef}
            style={{
              background: 'white',
              borderRadius: 16,
              width: '90vw',
              maxWidth: isMobile ? 600 : 1000,
              height: '85vh',
              maxHeight: 700,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              animation: 'scaleIn 0.2s ease',
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fff',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#008848' }}>
                  {t('branch.selectBranch')}
                </h2>
                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                  {t('branch.currentBranch')}: <strong style={{ color: '#333' }}>{branchName}</strong>
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)}
                style={{
                  background: '#f5f5f5', border: 'none', width: 32, height: 32, 
                  borderRadius: '50%', cursor: 'pointer', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Map and List */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row-reverse', flex: 1, overflow: 'hidden' }}>
              
              {/* Map Panel */}
              <div style={{ 
                flex: isMobile ? 'none' : 1,
                width: isMobile ? '100%' : 'auto',
                height: isMobile ? '60%' : '100%', 
                position: 'relative',
                background: '#f8f9fa',
                borderBottom: isMobile ? '1px solid #eee' : 'none'
              }}>
                <MapContainer 
                  center={mapCenter} 
                  zoom={mapZoom} 
                  style={{ width: '100%', height: '100%' }}
                  zoomControl={true}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />
                  <MapUpdater center={mapCenter} zoom={mapZoom} />
                  
                  {userLoc && (
                    <Marker position={userLoc}>
                      <Popup>📍 Vị trí của bạn</Popup>
                    </Marker>
                  )}

                  {processedBranches.map(b => {
                    if (!b.coordinates) return null;
                    const bId = String(b.id || (b as any)._id);
                    const isSelected = bId === String(currentBranch?.id || (currentBranch as any)?._id);
                    return (
                      <React.Fragment key={bId}>
                        <Marker 
                          position={[b.coordinates.lat, b.coordinates.lng]}
                          icon={isSelected ? SelectedIcon : DefaultIcon}
                          eventHandlers={{
                            click: () => handleSelectBranch(b)
                          }}
                        >
                          <Popup>
                            <div style={{ padding: '4px 0', minWidth: 150 }}>
                              <strong style={{ display: 'block', fontSize: 14, color: '#008848', marginBottom: 4 }}>
                                {b.name}
                              </strong>
                              <div style={{ fontSize: 12, color: '#555', marginBottom: 8, lineHeight: 1.3 }}>
                                {b.address}
                              </div>
                              <button
                                onClick={() => handleSelectBranch(b)}
                                style={{
                                  background: isSelected ? '#4CAF50' : '#008848',
                                  color: 'white', border: 'none', padding: '6px 12px',
                                  borderRadius: 6, cursor: 'pointer', width: '100%', fontWeight: 600
                                }}
                              >
                                {isSelected ? '✓ Đang chọn' : 'Chọn siêu thị này'}
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                        {b.coverage_radius_km && (
                          <Circle center={[b.coordinates.lat, b.coordinates.lng]} radius={b.coverage_radius_km * 1000}
                            pathOptions={{ color: isSelected ? '#008848' : '#94a3b8', fillOpacity: isSelected ? 0.08 : 0.04, weight: isSelected ? 2 : 1 }} />
                        )}
                        {isSelected && userLoc && (
                          <Polyline positions={[userLoc, [b.coordinates.lat, b.coordinates.lng]]}
                            pathOptions={{ color: '#008848', weight: 3, dashArray: '8 8', opacity: 0.7 }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </MapContainer>
              </div>

              {/* List Panel */}
              <div style={{ 
                width: isMobile ? '100%' : '360px',
                height: isMobile ? '40%' : '100%', 
                display: 'flex', flexDirection: 'column', 
                background: 'white',
                borderRight: isMobile ? 'none' : '1px solid #eee',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  padding: isMobile ? '10px 20px' : '12px 16px', 
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  flexDirection: isMobile ? 'row' : 'column',
                  alignItems: isMobile ? 'center' : 'stretch',
                  justifyContent: 'space-between',
                  gap: 12,
                  background: 'white',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 4 }}>
                    <input
                      type="text"
                      placeholder="Tìm theo tên hoặc địa chỉ..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        borderRadius: 20,
                        border: '1px solid #ddd',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {locError && (
                      <span style={{ fontSize: 11, color: '#d32f2f', marginTop: 2 }}>⚠️ {locError}</span>
                    )}
                  </div>

                  <button
                    onClick={requestLocation}
                    style={{
                      background: 'white',
                      border: '1px solid #008848',
                      padding: '8px 14px',
                      borderRadius: 20,
                      boxShadow: '0 2px 6px rgba(0,136,72,0.1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#008848',
                      width: isMobile ? 'auto' : '100%',
                    }}
                  >
                    🧭 Tìm gần tôi
                  </button>
                </div>

                <div style={{ 
                  flex: 1, 
                  overflowX: isMobile ? 'auto' : 'hidden',
                  overflowY: isMobile ? 'hidden' : 'auto',
                  display: 'flex', 
                  flexDirection: isMobile ? 'row' : 'column',
                  gap: 12, 
                  padding: isMobile ? '12px 20px' : '16px',
                  alignItems: 'stretch',
                  background: '#f9fbf9'
                }}>
                  {status === 'loading' ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: '#999' }}>Đang tải...</div>
                  ) : processedBranches.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: '#999', fontSize: 14 }}>
                      Không tìm thấy siêu thị phù hợp
                    </div>
                  ) : (
                    processedBranches.map((branch) => {
                      const bId = String(branch.id || (branch as any)?._id || '');
                      const cId = String(currentBranch?.id || (currentBranch as any)?._id || '');
                      const isActive = bId === cId;

                      return (
                        <div
                          key={bId}
                          onClick={() => {
                            if (branch.coordinates) {
                              setMapCenter([branch.coordinates.lat, branch.coordinates.lng]);
                              setMapZoom(16);
                            }
                            handleSelectBranch(branch);
                          }}
                          style={{
                            display: 'flex',
                            gap: 12,
                            padding: '12px 16px',
                            background: isActive ? '#E8F5E9' : 'white',
                            border: isActive ? '2px solid #008848' : '1px solid #e0e0e0',
                            borderRadius: 12,
                            cursor: 'pointer',
                            width: isMobile ? 300 : '100%',
                            flexShrink: 0,
                            boxSizing: 'border-box',
                            boxShadow: isActive ? '0 4px 12px rgba(0,136,72,0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s ease',
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                          }}
                        >
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: isActive ? '#008848' : '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: 16,
                            color: isActive ? 'white' : '#666',
                          }}>
                            🏪
                          </div>
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ 
                                fontSize: 13, 
                                fontWeight: isActive ? 800 : 600, 
                                color: isActive ? '#008848' : '#333', 
                                marginBottom: 4,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {branch.name}
                              </div>
                              {branch.address && (
                                <div style={{ 
                                  fontSize: 11, 
                                  color: '#666', 
                                  lineHeight: 1.3, 
                                  marginBottom: 6,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  height: 28
                                }}>
                                  {branch.address}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', alignItems: 'center', fontSize: 10, color: '#888', marginTop: 'auto' }}>
                              {branch.operating_hours && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>🕐 {branch.operating_hours}</span>
                              )}
                              {branch.distance !== null ? (
                                <span style={{ color: '#008848', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                                  📍 {branch.distance.toFixed(1)} km
                                </span>
                              ) : !branch.coordinates && (
                                <span style={{ color: '#d32f2f', fontWeight: 600 }}>
                                  📍 Không vị trí
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal (Cart Clear) */}
      {showConfirm && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10000, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={cancelBranchChange}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 20, padding: '28px 32px',
              maxWidth: 440, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#FFF5F5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px', fontSize: 28,
              }}>
                ⚠️
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#333', marginBottom: 8 }}>
                {t('cart.branchChangeTitle')}
              </h3>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>
                {t('cart.branchWarning')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={cancelBranchChange}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  border: '2px solid #e0e0e0', background: 'white',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#555'
                }}
              >
                {t('cart.cancel')}
              </button>
              <button
                onClick={confirmBranchChange}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                  background: '#008848', color: 'white', fontWeight: 700,
                  fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,136,72,0.3)',
                }}
              >
                {t('cart.confirm')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default BranchSelector;
