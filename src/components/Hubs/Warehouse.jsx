// src/pages/Warehouse.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../Auth/AuthContext";
import { watchHubs, watchInventory, setInventoryStatus, transferBetweenHubs, watchShipments } from "../../firebase";

export default function Warehouse(){
  const { profile, user } = useAuth();
  const companyId = profile?.companyId || "default";
  const [hubs, setHubs] = useState([]);
  const [hubId, setHubId] = useState(null);
  const [inv, setInv] = useState([]);
  const [shipments, setShipments] = useState([]);

  useEffect(()=>{ 
    const off1 = watchHubs(companyId,(r)=>{setHubs(r); if(!hubId && r.length) setHubId(r[0].id);}); 
    const off2 = watchShipments(setShipments); 
    return ()=>{off1&&off1(); off2&&off2();}; 
  },[companyId]);

  useEffect(()=>{ if(!hubId) return; const off=watchInventory(companyId, hubId, setInv); return ()=>off&&off(); },[companyId,hubId]);

  const mapShip = useMemo(()=>{ const m=new Map(); shipments.forEach(s=>m.set(s.id,s)); return m; },[shipments]);
  const byStatus = useMemo(()=>{ const g={OUT_FOR_DELIVERY:[], RETURNED_TO_HUB:[], AT_HUB:[], OTHER:[]};
    inv.forEach(i=>{ const s=mapShip.get(i.shipmentId); const row={...i,s};
      if(i.status==="OUT_FOR_DELIVERY") g.OUT_FOR_DELIVERY.push(row);
      else if(i.status==="RETURNED_TO_HUB") g.RETURNED_TO_HUB.push(row);
      else if(i.status==="AT_HUB") g.AT_HUB.push(row);
      else g.OTHER.push(row);
    }); return g; },[inv,mapShip]);

  async function markOutForDelivery(id){ await setInventoryStatus(companyId, hubId, id, "OUT_FOR_DELIVERY", user); }
  async function markReturned(id){ await setInventoryStatus(companyId, hubId, id, "RETURNED_TO_HUB", user); }
  async function setSlot(id){ const slot=prompt("أدخل رقم الرف/المكان (مثال A-12):"); if(slot!=null) await setInventoryStatus(companyId, hubId, id, "AT_HUB", user, { slot }); }
  async function transfer(id){ const to=prompt("أدخل hubId الهدف للنقل:"); if(to) await transferBetweenHubs(companyId, hubId, to, id, user); }

  return (
    <div className="page">
      <h2>المخزن</h2>

      <div className="card" style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
        <span>اختر المخزن:</span>
        <select value={hubId||""} onChange={e=>setHubId(e.target.value)}>
          {hubs.map(h=><option key={h.id} value={h.id}>{h.name} ({h.id.slice(0,6)})</option>)}
        </select>
      </div>

      <div className="grid gap-3" style={{gridTemplateColumns:"1fr 1fr"}}>
        <div className="card">
          <h3>شحنات قيد التسليم</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>المرجع</th><th>العميل</th><th>المستلم</th><th>رف</th><th>إجراءات</th></tr></thead>
              <tbody>
                {byStatus.OUT_FOR_DELIVERY.map(r=>(
                  <tr key={r.shipmentId}>
                    <td>{r.s?.reference || r.shipmentId}</td>
                    <td>{r.s?.pickup?.name || "-"}</td>
                    <td>{r.s?.dropoff?.name || "-"}</td>
                    <td>{r.slot || "-"}</td>
                    <td style={{display:"flex",gap:8}}>
                      <button className="btn-ghost" onClick={()=>setSlot(r.shipmentId)}>تحديد رف</button>
                      <button className="btn-warning" onClick={()=>markReturned(r.shipmentId)}>تعليم كمرتجعة</button>
                    </td>
                  </tr>
                ))}
                {!byStatus.OUT_FOR_DELIVERY.length && <tr><td colSpan="5">لا توجد شحنات.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>شحنات مرتجعة</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>المرجع</th><th>ملاحظة</th><th>رف</th><th>إجراءات</th></tr></thead>
              <tbody>
                {byStatus.RETURNED_TO_HUB.map(r=>(
                  <tr key={r.shipmentId}>
                    <td>{r.s?.reference || r.shipmentId}</td>
                    <td>{r.note || "-"}</td>
                    <td>{r.slot || "-"}</td>
                    <td style={{display:"flex",gap:8}}>
                      <button className="btn-ghost" onClick={()=>setSlot(r.shipmentId)}>تحديد رف</button>
                      <button className="btn-ghost" onClick={()=>transfer(r.shipmentId)}>نقل لمخزن آخر</button>
                    </td>
                  </tr>
                ))}
                {!byStatus.RETURNED_TO_HUB.length && <tr><td colSpan="4">لا توجد شحنات.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{gridColumn:"1/-1"}}>
          <h3>الشحنات داخل المخزن</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>المرجع</th><th>من → إلى</th><th>رف</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {byStatus.AT_HUB.map(r=>(
                  <tr key={r.shipmentId}>
                    <td>{r.s?.reference || r.shipmentId}</td>
                    <td>{r.s?.pickup?.zone || "-"} → {r.s?.dropoff?.zone || "-"}</td>
                    <td>{r.slot || "-"}</td>
                    <td>{r.status}</td>
                    <td style={{display:"flex",gap:8}}>
                      <button className="btn" onClick={()=>markOutForDelivery(r.shipmentId)}>إخراج للتسليم</button>
                      <button className="btn-ghost" onClick={()=>setSlot(r.shipmentId)}>تحديد رف</button>
                    </td>
                  </tr>
                ))}
                {!byStatus.AT_HUB.length && <tr><td colSpan="5">لا توجد شحنات.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
