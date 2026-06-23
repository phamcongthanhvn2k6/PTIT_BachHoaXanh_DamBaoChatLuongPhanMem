import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import httpClient from '../../api/httpClient';
import { endpoints } from '../../api/endpoints';
import type { Branch } from '../../types';

const mk = (c: string, l?: string) => L.divIcon({ className: '', html: `<div style="background:${c};width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.3)"><span style="transform:rotate(45deg);font-size:13px;font-weight:900;color:#fff">${l||'📍'}</span></div>`, iconSize: [30,30], iconAnchor: [15,30], popupAnchor: [0,-30] });
const selIcon = mk('#C1121F'), defIcon = mk('#64748b'), editIcon = mk('#16a34a','＋');

const MapClick = ({cb}:{cb:(a:number,b:number)=>void}) => { useMapEvents({click:e=>cb(e.latlng.lat,e.latlng.lng)}); return null; };
const Fly = ({c,z}:{c:[number,number];z:number}) => { const m=useMap(); useEffect(()=>{m.flyTo(c,z,{duration:.5})},[c,z,m]); return null; };

interface Geo { display_name:string; lat:string; lon:string }
const geocode = async(q:string):Promise<Geo[]> => { const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=vn&q=${encodeURIComponent(q)}`); return r.ok?r.json():[]; };
const haversine = (a:number,b:number,c:number,d:number) => { const R=6371,dL=(c-a)*Math.PI/180,dN=(d-b)*Math.PI/180,x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dN/2)**2; return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); };

const EMPTY: Branch = { id:'', name:'', address:'', city:'', phone:'', operating_hours:'08:00 - 22:00', coverage_radius_km:5 };
type Mode = 'view'|'create'|'edit';

const AdminBranchLocations: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState('');
  const [mode, setMode] = useState<Mode>('view');
  const [form, setForm] = useState<Partial<Branch>>({});
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{t:'s'|'e';m:string}|null>(null);
  const [search, setSearch] = useState('');
  const [center, setCenter] = useState<[number,number]>([10.762622,106.660172]);
  const [zoom, setZoom] = useState(11);
  const [geoQ, setGeoQ] = useState('');
  const [geoR, setGeoR] = useState<Geo[]>([]);
  const [geoL, setGeoL] = useState(false);
  const [dupes, setDupes] = useState<any[]>([]);
  const [showRadius, setShowRadius] = useState(true);
  const gt = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = (t:'s'|'e',m:string) => { setToast({t,m}); setTimeout(()=>setToast(null),3500); };
  const bId = (b:Branch) => String(b.id||(b as any)._id||'');

  const fetch_ = useCallback(async()=>{ setLoading(true); try{ const r=await httpClient.get(endpoints.branches.list); const d=r?.data?.data||r?.data||[]; setBranches(Array.isArray(d)?d:[]); }catch{ show('e','Không tải được chi nhánh'); } finally{ setLoading(false); } },[]);
  useEffect(()=>{fetch_()},[fetch_]);

  const sel = useMemo(()=>branches.find(b=>bId(b)===selId)||null,[branches,selId]);
  const filt = useMemo(()=>branches.filter(b=>b.name.toLowerCase().includes(search.toLowerCase())||(b.address||'').toLowerCase().includes(search.toLowerCase())||(b.city||'').toLowerCase().includes(search.toLowerCase())),[branches,search]);

  // Select branch
  const doSelect = (id:string) => { if(mode!=='view') return; setSelId(id); };
  useEffect(()=>{
    if(mode!=='view'||!sel) { if(mode==='view'){setCoords(null);setGeoQ('');setGeoR([]);setDupes([]);} return; }
    if(sel.coordinates?.lat&&sel.coordinates?.lng){ setCoords({lat:sel.coordinates.lat,lng:sel.coordinates.lng}); setCenter([sel.coordinates.lat,sel.coordinates.lng]); setZoom(14); }
    else setCoords(null);
    setGeoQ([sel.address,sel.city].filter(Boolean).join(', ')||sel.name); setGeoR([]); setDupes([]);
  },[sel,mode]);

  // Geocode
  const doGeo = useCallback(async(q:string)=>{ if(q.trim().length<3){setGeoR([]);return;} setGeoL(true); try{ setGeoR(await geocode(q)); }catch{setGeoR([]);} finally{setGeoL(false);} },[]);
  const onGeoQ = (v:string)=>{ setGeoQ(v); clearTimeout(gt.current); gt.current=setTimeout(()=>doGeo(v),600); };
  const pickGeo = (r:Geo)=>{ const lat=+parseFloat(r.lat).toFixed(6),lng=+parseFloat(r.lon).toFixed(6); setCoords({lat,lng}); setCenter([lat,lng]); setZoom(16); setGeoR([]); setGeoQ(r.display_name); checkDupes(lat,lng); };

  // Duplicate check
  const checkDupes = async(lat:number,lng:number) => {
    const others = branches.filter(b=>b.coordinates?.lat&&b.coordinates?.lng&&bId(b)!==selId);
    const near = others.map(b=>({...b,dist:haversine(lat,lng,b.coordinates!.lat,b.coordinates!.lng)})).filter(b=>b.dist<=1).sort((a,b)=>a.dist-b.dist);
    setDupes(near);
  };

  const onMapClick = (lat:number,lng:number) => { if(mode==='view'&&!selId) return; setCoords({lat:+lat.toFixed(6),lng:+lng.toFixed(6)}); checkDupes(+lat.toFixed(6),+lng.toFixed(6)); };
  const onDrag = (e:L.DragEndEvent) => { const ll=e.target.getLatLng(); setCoords({lat:+ll.lat.toFixed(6),lng:+ll.lng.toFixed(6)}); checkDupes(+ll.lat.toFixed(6),+ll.lng.toFixed(6)); };

  // CRUD
  const startCreate = () => { setMode('create'); setSelId(''); setForm({...EMPTY}); setCoords(null); setGeoQ(''); setGeoR([]); setDupes([]); };
  const startEdit = () => { if(!sel) return; setMode('edit'); setForm({name:sel.name,address:sel.address,city:sel.city,phone:sel.phone,operating_hours:sel.operating_hours,coverage_radius_km:sel.coverage_radius_km||5,manager:sel.manager}); };
  const cancel = () => { setMode('view'); setForm({}); setGeoR([]); setDupes([]); };

  const handleSave = async() => {
    const name = (form.name||'').trim();
    if(!name){ show('e','Tên chi nhánh là bắt buộc'); return; }
    setSaving(true);
    const payload = { ...form, name, coordinates: coords||undefined, coverage_radius_km: form.coverage_radius_km||5 };
    try {
      if(mode==='create'){
        const r = await httpClient.post(endpoints.branches.create, payload);
        const nb = r?.data?.data||r?.data;
        setBranches(p=>[...p,nb]); setSelId(bId(nb)); show('s',`Đã tạo "${name}"`);
      } else {
        await httpClient.put(endpoints.branches.update(selId), payload);
        setBranches(p=>p.map(b=>bId(b)===selId?{...b,...payload}:b)); show('s',`Đã cập nhật "${name}"`);
      }
      setMode('view'); setForm({});
    } catch(e:any){ show('e',e?.message||'Lỗi lưu chi nhánh'); }
    finally{ setSaving(false); }
  };

  const handleSaveCoords = async() => {
    if(!selId||!coords) return; setSaving(true);
    try{ await httpClient.put(endpoints.branches.update(selId),{coordinates:coords}); setBranches(p=>p.map(b=>bId(b)===selId?{...b,coordinates:coords}:b)); show('s','Đã lưu tọa độ'); }
    catch{ show('e','Lỗi lưu tọa độ'); } finally{ setSaving(false); }
  };

  const handleDelete = async() => {
    if(!selId||!confirm(`Xóa chi nhánh "${sel?.name}"?`)) return; setSaving(true);
    try{ await httpClient.delete(endpoints.branches.delete(selId)); setBranches(p=>p.filter(b=>bId(b)!==selId)); setSelId(''); show('s','Đã xóa'); }
    catch{ show('e','Lỗi xóa chi nhánh'); } finally{ setSaving(false); }
  };

  const wc = branches.filter(b=>b.coordinates?.lat&&b.coordinates?.lng).length;
  const isEditing = mode==='create'||mode==='edit';
  const formField = (label:string,key:keyof Branch,ph:string,type='text') => (
    <div style={{marginBottom:10}}>
      <label style={{fontSize:11,fontWeight:700,color:'#475569',marginBottom:3,display:'block'}}>{label}</label>
      <input type={type} value={String(form[key]||'')} onChange={e=>setForm(p=>({...p,[key]:type==='number'?+e.target.value:e.target.value}))} placeholder={ph}
        style={{width:'100%',padding:'8px 12px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:13,outline:'none',boxSizing:'border-box'}} />
    </div>
  );

  return (
    <div style={{height:'calc(100vh - 64px)',display:'flex',flexDirection:'column',background:'#f8fafc'}}>
      {toast&&<div style={{position:'fixed',top:20,right:20,zIndex:10000,background:toast.t==='s'?'#16a34a':'#dc2626',color:'#fff',padding:'12px 24px',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,.2)',fontSize:14,fontWeight:600}}>{toast.t==='s'?'✅':'❌'} {toast.m}</div>}

      {/* Header */}
      <div style={{padding:'16px 24px',borderBottom:'1px solid #e2e8f0',background:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h1 style={{margin:0,fontSize:20,fontWeight:800,color:'#0f172a'}}><span className="material-symbols-outlined" style={{verticalAlign:'middle',marginRight:6,color:'#C1121F'}}>location_on</span>Quản lý chi nhánh</h1>
          <p style={{margin:'2px 0 0',fontSize:12,color:'#64748b'}}>CRUD + Geocoding + Duplicate Detection + Coverage Radius</p>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:12,background:'#f0fdf4',padding:'5px 12px',borderRadius:6,color:'#16a34a',fontWeight:700}}>📍{wc}</span>
          <span style={{fontSize:12,background:'#fef2f2',padding:'5px 12px',borderRadius:6,color:'#dc2626',fontWeight:700}}>⚠️{branches.length-wc}</span>
          <label style={{fontSize:11,display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}><input type="checkbox" checked={showRadius} onChange={e=>setShowRadius(e.target.checked)}/>Radius</label>
          <button onClick={startCreate} disabled={isEditing} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'#C1121F',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',opacity:isEditing?.5:1}}>＋ Thêm</button>
        </div>
      </div>

      <div style={{flex:1,display:'flex',overflow:'hidden'}}>
        {/* Left panel */}
        <div style={{width:340,flexShrink:0,display:'flex',flexDirection:'column',borderRight:'1px solid #e2e8f0',background:'#fff'}}>
          {!isEditing ? <>
            <div style={{padding:'10px 14px',borderBottom:'1px solid #f1f5f9'}}><input type="text" placeholder="🔍 Tìm..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'8px 12px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:13,outline:'none',boxSizing:'border-box'}}/></div>
            <div style={{flex:1,overflowY:'auto',padding:'6px 10px'}}>
              {loading?<div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Đang tải...</div>
              :filt.map(b=>{const id=bId(b),is=id===selId,has=b.coordinates?.lat&&b.coordinates?.lng;return(
                <div key={id} onClick={()=>doSelect(id)} style={{padding:'10px 12px',borderRadius:8,cursor:'pointer',marginBottom:4,background:is?'#fef2f2':'#fff',border:is?'2px solid #C1121F':'1px solid #f1f5f9'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                    <span style={{fontSize:13,fontWeight:is?800:600,color:is?'#C1121F':'#1e293b'}}>{b.name}</span>
                    <span style={{fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:4,background:has?'#dcfce7':'#fee2e2',color:has?'#16a34a':'#dc2626'}}>{has?'📍':'⚠️'}</span>
                  </div>
                  {b.address&&<div style={{fontSize:11,color:'#64748b'}}>{b.address}</div>}
                  {b.city&&<div style={{fontSize:10,color:'#94a3b8'}}>{b.city}</div>}
                </div>
              );})}
            </div>
          </> : /* Create/Edit form */
          <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
            <div style={{fontSize:15,fontWeight:800,color:'#C1121F',marginBottom:14}}>{mode==='create'?'＋ Tạo chi nhánh mới':'✏️ Sửa chi nhánh'}</div>
            {formField('Tên chi nhánh *','name','VD: Bách hóa XANH Gò Vấp')}
            {formField('Địa chỉ','address','VD: 242 Nguyễn Văn Lượng...')}
            {formField('Thành phố','city','VD: Hồ Chí Minh')}
            {formField('Điện thoại','phone','VD: 028 1234 5678')}
            {formField('Giờ mở cửa','operating_hours','VD: 08:00 - 22:00')}
            {formField('Quản lý','manager','VD: Nguyễn Văn A')}
            {formField('Bán kính phục vụ (km)','coverage_radius_km','5','number')}
            {coords&&<div style={{background:'#f0fdf4',padding:'8px 12px',borderRadius:7,fontSize:11,fontFamily:'monospace',marginBottom:10}}>Lat: <b>{coords.lat.toFixed(6)}</b> | Lng: <b>{coords.lng.toFixed(6)}</b></div>}
            {/* Duplicate warning */}
            {dupes.length>0&&<div style={{background:'#fefce8',border:'1px solid #fde047',borderRadius:8,padding:'10px 12px',marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:700,color:'#a16207',marginBottom:4}}>⚠️ Chi nhánh gần đây:</div>
              {dupes.map((d,i)=><div key={i} style={{fontSize:11,color:'#92400e'}}>• {d.name} — {(d.dist*1000).toFixed(0)}m</div>)}
            </div>}
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button onClick={cancel} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontWeight:600,fontSize:13,cursor:'pointer'}}>Hủy</button>
              <button onClick={handleSave} disabled={saving} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#C1121F',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>{saving?'⏳':'💾'} Lưu</button>
            </div>
          </div>}
        </div>

        {/* Right: Map */}
        <div style={{flex:1,display:'flex',flexDirection:'column'}}>
          {/* Geocode bar */}
          {(selId||isEditing)&&<div style={{padding:'10px 16px',borderBottom:'1px solid #e2e8f0',background:'#fff',position:'relative',zIndex:500}}>
            <div style={{display:'flex',gap:8}}>
              <div style={{flex:1,position:'relative'}}>
                <input type="text" value={geoQ} onChange={e=>onGeoQ(e.target.value)} placeholder="Tìm vị trí trên bản đồ..." style={{width:'100%',padding:'8px 12px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                {geoR.length>0&&<div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,marginTop:4,boxShadow:'0 8px 24px rgba(0,0,0,.12)',maxHeight:200,overflowY:'auto',zIndex:600}}>
                  {geoR.map((r,i)=><div key={i} onClick={()=>pickGeo(r)} style={{padding:'8px 12px',fontSize:12,cursor:'pointer',borderBottom:i<geoR.length-1?'1px solid #f1f5f9':'none'}} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>📍 {r.display_name}</div>)}
                </div>}
              </div>
              <button onClick={()=>doGeo(geoQ)} disabled={geoL||geoQ.trim().length<3} style={{padding:'8px 14px',borderRadius:7,border:'none',background:'#C1121F',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',whiteSpace:'nowrap'}}>{geoL?'⏳':'🔍'}</button>
            </div>
          </div>}

          {/* Map */}
          <div style={{flex:1,position:'relative'}}>
            <MapContainer center={center} zoom={zoom} style={{width:'100%',height:'100%'}} zoomControl>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"/>
              <Fly c={center} z={zoom}/><MapClick cb={onMapClick}/>
              {branches.map(b=>{if(!b.coordinates?.lat||!b.coordinates?.lng)return null;const id=bId(b);return(
                <React.Fragment key={id}>
                  <Marker position={[b.coordinates.lat,b.coordinates.lng]} icon={id===selId?selIcon:defIcon} eventHandlers={{click:()=>doSelect(id)}}>
                    <Popup><strong>{b.name}</strong><br/><span style={{fontSize:11}}>{b.address}</span></Popup>
                  </Marker>
                  {showRadius&&b.coverage_radius_km&&<Circle center={[b.coordinates.lat,b.coordinates.lng]} radius={(b.coverage_radius_km||5)*1000} pathOptions={{color:id===selId?'#C1121F':'#64748b',fillOpacity:.08,weight:1.5}}/>}
                </React.Fragment>
              );})}
              {coords&&<Marker position={[coords.lat,coords.lng]} icon={editIcon} draggable eventHandlers={{dragend:onDrag}}>
                <Popup><b>📌 Kéo để chỉnh</b><br/><span style={{fontSize:11}}>{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span></Popup>
              </Marker>}
            </MapContainer>
            {!selId&&!isEditing&&<div style={{position:'absolute',top:16,left:'50%',transform:'translateX(-50%)',zIndex:1000,background:'rgba(15,23,42,.85)',color:'#fff',padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:600}}>👈 Chọn hoặc tạo chi nhánh</div>}
          </div>

          {/* Bottom bar */}
          {sel&&mode==='view'&&<div style={{padding:'12px 20px',borderTop:'1px solid #e2e8f0',background:'#fff',display:'flex',alignItems:'center',gap:12,boxShadow:'0 -4px 12px rgba(0,0,0,.04)'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:800,color:'#C1121F'}}>{sel.name}</div>
              <div style={{fontSize:11,color:'#64748b'}}>{sel.address||'—'} {sel.city?`· ${sel.city}`:''} {sel.coverage_radius_km?`· R: ${sel.coverage_radius_km}km`:''}</div>
            </div>
            {coords&&<div style={{background:'#f8fafc',padding:'5px 12px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:10,fontFamily:'monospace'}}>
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </div>}
            <button onClick={startEdit} style={{padding:'8px 14px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',color:'#334155',fontWeight:600,fontSize:12,cursor:'pointer'}}>✏️ Sửa</button>
            <button onClick={handleSaveCoords} disabled={!coords||saving} style={{padding:'8px 14px',borderRadius:7,border:'none',background:coords?'#C1121F':'#94a3b8',color:'#fff',fontWeight:700,fontSize:12,cursor:coords?'pointer':'not-allowed'}}>{saving?'⏳':'💾'} Lưu tọa độ</button>
            <button onClick={handleDelete} disabled={saving} style={{padding:'8px 14px',borderRadius:7,border:'1px solid #fca5a5',background:'#fff1f2',color:'#dc2626',fontWeight:700,fontSize:12,cursor:'pointer'}}>🗑️ Xóa</button>
          </div>}
        </div>
      </div>
    </div>
  );
};
export default AdminBranchLocations;
