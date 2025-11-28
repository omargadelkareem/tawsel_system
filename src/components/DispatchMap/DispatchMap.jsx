import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import { watchAllCouriers, watchDriverTrack } from "../../firebase";

const icon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize:[25,41], iconAnchor:[12,41], popupAnchor:[1,-34], shadowSize:[41,41]
});

export default function DispatchMap(){
  const [couriers, setCouriers] = useState([]);
  const [activeDriver, setActiveDriver] = useState(null);
  const [track, setTrack] = useState([]);

  useEffect(() => {
    const off = watchAllCouriers(setCouriers);
    return () => off && off();
  }, []);

  useEffect(() => {
    if (!activeDriver) { setTrack([]); return; }
    const off = watchDriverTrack(activeDriver, setTrack);
    return () => off && off();
  }, [activeDriver]);

  const center = useMemo(() => {
    const c = couriers.find(c => c.lastLoc?.lat && c.lastLoc?.lng);
    return c ? [c.lastLoc.lat, c.lastLoc.lng] : [30.0444, 31.2357]; // القاهرة
  }, [couriers]);

  return (
    <div className="page">
      <h2>خريطة التوزيع — المندوبون</h2>

      <div className="card" style={{marginBottom:12, display:"flex", flexWrap:"wrap", gap:8}}>
        {couriers.map(c => (
          <button key={c.id} className="btn-ghost" onClick={()=>setActiveDriver(c.id)}>
            {c.name || c.id} {activeDriver===c.id && "✓"}
          </button>
        ))}
        <span className="small">اختر مندوبًا لعرض خط سيره.</span>
      </div>

      <div className="card" style={{padding:0, overflow:"hidden"}}>
        <MapContainer center={center} zoom={12} style={{height: "65vh", width:"100%"}}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {couriers.map(c => (c.lastLoc?.lat && c.lastLoc?.lng) && (
            <Marker key={c.id} position={[c.lastLoc.lat, c.lastLoc.lng]} icon={icon}>
              <Popup>
                <b>{c.name || c.id}</b><br/>
                {c.online ? "متصل" : "غير متصل"}<br/>
                آخر تحديث: {c.lastLoc?.at ? new Date(c.lastLoc.at).toLocaleString() : "-"}
              </Popup>
            </Marker>
          ))}
          {activeDriver && track.length > 1 && (
            <Polyline positions={track.map(p => [p.lat, p.lng])} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
