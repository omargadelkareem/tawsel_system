import { useEffect, useState } from "react";
import { useAuth } from "../Auth/AuthContext";
import {
  createShipment,
  watchCompanySettings,
  watchZones,
  priceShipmentLocal,
  autoAssignCourierAdvanced,
  bumpCourierLoad,
  updateShipment
} from "../../firebase";

export default function ShipmentCreate() {
  const { user, profile } = useAuth();
  const companyId = profile?.companyId || "default";

  const [settings, setSettings] = useState(null);
  const [zones, setZones] = useState([]);
  const [f, setF] = useState({
    pickupName:"", pickupAddress:"", pickupZone:"",
    dropoffName:"", dropoffAddress:"", dropoffZone:"",
    weightKg:"", distanceKm:"", isCOD:false, codAmount:""
  });
  const [quote, setQuote] = useState(null);
  const [autoAssign, setAutoAssign] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const off1 = watchCompanySettings(companyId, setSettings);
    const off2 = watchZones(companyId, setZones);
    return () => { off1 && off1(); off2 && off2(); };
  }, [companyId]);

  useEffect(() => {
    if (!settings) return;
    const q = priceShipmentLocal({
      settings,
      pickupZone: f.pickupZone || null,
      dropoffZone: f.dropoffZone || null,
      zones,
      weightKg: Number(f.weightKg || 0),
      distanceKm: Number(f.distanceKm || 0),
      isCOD: !!f.isCOD,
      codAmount: Number(f.codAmount || 0)
    });
    setQuote(q);
  }, [f, settings, zones]);

  async function submit(e){
    e.preventDefault();
    if (!user) return;
    try {
      setBusy(true);

      const payload = {
        companyId,
        pickup: { name: f.pickupName, address: f.pickupAddress, zone: f.pickupZone || null },
        dropoff:{ name: f.dropoffName, address: f.dropoffAddress, zone: f.dropoffZone || null },
        parcels:[{ weightKg: Number(f.weightKg || 0) }],
        distanceKm: Number(f.distanceKm || 0),
        cod: f.isCOD ? { isCOD: true, amount: Number(f.codAmount || 0), currency: settings?.pricing?.currency || "USD", settled: false } : { isCOD:false },
        charges: quote ? { breakdown: quote.breakdown, total: quote.total, currency: quote.currency } : null
      };

      const id = await createShipment(payload, user);

      if (autoAssign) {
        const preferred = f.dropoffZone || f.pickupZone || null;
        const driverId = await autoAssignCourierAdvanced(companyId, preferred);
        if (driverId) {
          await updateShipment(id, { assignedDriverId: driverId, status: "ASSIGNED" }, user);
          await bumpCourierLoad(driverId, +1);
        }
      }

      setF({ pickupName:"", pickupAddress:"", pickupZone:"", dropoffName:"", dropoffAddress:"", dropoffZone:"", weightKg:"", distanceKm:"", isCOD:false, codAmount:"" });
      setQuote(null);
      alert("تمت إضافة الشحنة" + (autoAssign ? " وتعيين مندوب" : ""));
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h2>إضافة شحنة</h2>

      <form onSubmit={submit} className="card form-grid gap-3" style={{maxWidth: 960}}>
        <div className="form-grid form-3 gap-3">
          <div>
            <label>اسم المُرسل</label>
            <input value={f.pickupName} onChange={e=>setF(s=>({...s,pickupName:e.target.value}))}/>
          </div>
          <div>
            <label>عنوان الاستلام</label>
            <input value={f.pickupAddress} onChange={e=>setF(s=>({...s,pickupAddress:e.target.value}))}/>
          </div>
          <div>
            <label>منطقة الاستلام</label>
            <select value={f.pickupZone} onChange={e=>setF(s=>({...s,pickupZone:e.target.value}))}>
              <option value="">— اختر —</option>
              {zones.map(z=> <option key={z.id} value={z.name}>{z.name}</option>)}
            </select>
          </div>

          <div>
            <label>اسم المستلم</label>
            <input value={f.dropoffName} onChange={e=>setF(s=>({...s,dropoffName:e.target.value}))}/>
          </div>
          <div>
            <label>عنوان التسليم</label>
            <input value={f.dropoffAddress} onChange={e=>setF(s=>({...s,dropoffAddress:e.target.value}))}/>
          </div>
          <div>
            <label>منطقة التسليم</label>
            <select value={f.dropoffZone} onChange={e=>setF(s=>({...s,dropoffZone:e.target.value}))}>
              <option value="">— اختر —</option>
              {zones.map(z=> <option key={z.id} value={z.name}>{z.name}</option>)}
            </select>
          </div>

          <div>
            <label>الوزن (كجم)</label>
            <input type="number" step="0.01" value={f.weightKg} onChange={e=>setF(s=>({...s,weightKg:e.target.value}))}/>
          </div>
          <div>
            <label>المسافة (كم) — مؤقتًا</label>
            <input type="number" step="0.1" value={f.distanceKm} onChange={e=>setF(s=>({...s,distanceKm:e.target.value}))}/>
          </div>
          <div>
            <label>تعيين تلقائي للمندوب</label><br/>
            <input type="checkbox" checked={autoAssign} onChange={e=>setAutoAssign(e.target.checked)} /> نعم
          </div>

          <div>
            <label>COD (تحصيل عند التسليم)</label><br/>
            <input type="checkbox" checked={f.isCOD} onChange={e=>setF(s=>({...s,isCOD:e.target.checked}))} /> مفعّل
          </div>
          <div>
            <label>قيمة COD</label>
            <input type="number" step="0.01" value={f.codAmount} disabled={!f.isCOD} onChange={e=>setF(s=>({...s,codAmount:e.target.value}))}/>
          </div>
        </div>

        {quote && (
          <div className="card" style={{display:"grid", gap:8}}>
            <b>تسعير تقديري:</b>
            <div>إجمالي: {quote.total} {quote.currency}</div>
            <div className="small">
              الوزن: {quote.breakdown.weight?.toFixed?.(2)} — المسافة: {quote.breakdown.distance?.toFixed?.(2)} — المنطقة: {quote.breakdown.zone?.toFixed?.(2)} — وقود: {quote.breakdown.fuel?.toFixed?.(2)} — COD: {quote.breakdown.codFee?.toFixed?.(2)}
            </div>
          </div>
        )}

        <div style={{display:"flex", gap:10}}>
          <button className="btn" disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ"}</button>
          <button type="button" className="btn-ghost" onClick={()=>window.history.back()}>إلغاء</button>
        </div>
      </form>
    </div>
  );
}
