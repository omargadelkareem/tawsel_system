// src/components/CourierCreate.jsx (أو نفس مسارك)
import { useState } from "react";
import { useAuth } from "../Auth/AuthContext";
import { createCourier } from "../../firebase";

export default function CourierCreate(){
  const { user, profile } = useAuth();
  const companyId = profile?.companyId || "default";

  const [f, setF] = useState({
    uid: "",
    name: "",
    phone: "",
    zone: "",
    vehiclePlate: "",
    vehicleType: "",
    online: true
  });
  const [busy, setBusy] = useState(false);

  async function submit(e){
    e.preventDefault();
    if (!f.uid) {
      return alert("من فضلك أدخل UID حساب المندوب (هو نفس UID الموجود تحت users)");
    }
    try {
      setBusy(true);
      await createCourier({
        uid: f.uid.trim(),
        name: f.name,
        phone: f.phone,
        zone: f.zone,
        vehiclePlate: f.vehiclePlate,
        vehicleType: f.vehicleType,
        online: f.online,
        companyId
      }, user);
      alert("تم إضافة المندوب");
      setF({
        uid: "",
        name: "",
        phone: "",
        zone: "",
        vehiclePlate: "",
        vehicleType: "",
        online: true
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h2>إضافة مندوب</h2>
      <form onSubmit={submit} className="card form-grid form-3 gap-3" style={{ maxWidth: 900 }}>
        <div>
          <label>UID المندوب</label>
          <input
            placeholder="مثال: Qnf0YBVMGbMvz..."
            value={f.uid}
            onChange={e=>setF(s=>({...s, uid: e.target.value}))}
          />
          <div className="small" style={{opacity:.8}}>
            يجب أن يطابق UID حسابه في users.
          </div>
        </div>

        <div>
          <label>الاسم</label>
          <input
            placeholder="الاسم"
            value={f.name}
            onChange={e=>setF(s=>({...s, name: e.target.value}))}
          />
        </div>

        <div>
          <label>الهاتف</label>
          <input
            placeholder="الهاتف"
            value={f.phone}
            onChange={e=>setF(s=>({...s, phone: e.target.value}))}
          />
        </div>

        <div>
          <label>المنطقة</label>
          <input
            placeholder="مثال: Cairo"
            value={f.zone}
            onChange={e=>setF(s=>({...s, zone: e.target.value}))}
          />
        </div>

        <div>
          <label>رقم اللوحة</label>
          <input
            placeholder="ABC-123"
            value={f.vehiclePlate}
            onChange={e=>setF(s=>({...s, vehiclePlate: e.target.value}))}
          />
        </div>

        <div>
          <label>نوع المركبة</label>
          <input
            placeholder="Bike / Car / Van ..."
            value={f.vehicleType}
            onChange={e=>setF(s=>({...s, vehicleType: e.target.value}))}
          />
        </div>

        <div>
          <label>الحالة</label><br/>
          <input
            type="checkbox"
            checked={f.online}
            onChange={e=>setF(s=>({...s, online: e.target.checked}))}
          />{" "}
          أونلاين
        </div>

        <div style={{gridColumn:"1/-1"}}>
          <button className="btn" disabled={busy}>
            {busy ? "جارٍ الحفظ..." : "حفظ"}
          </button>
        </div>
      </form>
    </div>
  );
}
