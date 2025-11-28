// src/pages/Settings.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../Auth/AuthContext";
import { watchCompanySettings, saveCompanySettings } from "../../firebase";

export default function Settings() {
  const { user, profile } = useAuth();
  const companyId = profile?.companyId || "default";

  const [f, setF] = useState({
    name: "",
    address: "",
    phone: "",
    currency: "USD",
    basePerKg: 1.5,
    basePerKm: 0.4,
    surcharge: 0,
    expiresAt: null, // نعرضه ونفعل به
    plan: "PRO",
    seats: 20,
    status: ""
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [months, setMonths] = useState(1); // تمديد مخصص

  useEffect(() => {
    const off = watchCompanySettings(companyId, (conf) => {
      if (conf) {
        setF({
          name: conf.name || "",
          address: conf.address || "",
          phone: conf.phone || "",
          currency: conf.pricing?.currency || "USD",
          basePerKg: Number(conf.pricing?.basePerKg ?? 1.5),
          basePerKm: Number(conf.pricing?.basePerKm ?? 0.4),
          surcharge: Number(conf.pricing?.surcharge ?? 0),
          expiresAt: conf.expiresAt || null,
          plan: conf.plan || "PRO",
          seats: conf.seats ?? 20,
          status: conf.status || ""
        });
      } else {
        setF((s) => ({ ...s, expiresAt: null, status: "" }));
      }
      setLoading(false);
    });
    return () => off && off();
  }, [companyId]);

  const active = useMemo(() => {
    return f.expiresAt && Number(f.expiresAt) > Date.now();
  }, [f.expiresAt]);

  function fmtDate(ms) {
    if (!ms) return "-";
    try {
      return new Date(ms).toLocaleString();
    } catch {
      return String(ms);
    }
  }

  async function save(e) {
    e.preventDefault();
    try {
      setBusy(true);
      const payload = {
        name: f.name,
        address: f.address,
        phone: f.phone,
        plan: f.plan,
        seats: Number(f.seats || 0),
        status: active ? "ACTIVE" : "EXPIRED",
        pricing: {
          currency: f.currency,
          basePerKg: Number(f.basePerKg),
          basePerKm: Number(f.basePerKm),
          surcharge: Number(f.surcharge)
        }
      };
      await saveCompanySettings(companyId, payload, user);
      alert("تم حفظ الإعدادات");
    } catch (e2) {
      alert(e2.message);
    } finally {
      setBusy(false);
    }
  }

  // تفعيل/تمديد بسرعة: يضبط expiresAt للمستقبل
  async function extendByDays(days = 30) {
    try {
      setBusy(true);
      const base = active ? Number(f.expiresAt) : Date.now();
      const newExp = base + days * 24 * 60 * 60 * 1000;
      await saveCompanySettings(companyId, { expiresAt: newExp, status: "ACTIVE" }, user);
      alert(`تم التمديد حتى: ${fmtDate(newExp)}`);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function extendByMonths(m = 1) {
    const monthsNum = Number(m) || 1;
    const daysApprox = monthsNum * 30; // تبسيط
    await extendByDays(daysApprox);
  }

  if (loading) return <div className="page center">جاري التحميل…</div>;

  return (
    <div className="page">
      <h2>الإعدادات — الشركة: {companyId}</h2>

      {/* حالة الاشتراك */}
      <div className="card" style={{ display:"grid", gap:10, maxWidth:640, borderInlineStart: `4px solid ${active ? "#16a34a" : "#ef4444"}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:600, fontSize:18 }}>
              حالة الاشتراك:{" "}
              <span style={{ color: active ? "#16a34a" : "#ef4444" }}>
                {active ? "ACTIVE" : "EXPIRED"}
              </span>
            </div>
            <div className="small">ينتهي في: <b>{fmtDate(f.expiresAt)}</b></div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button className="btn" disabled={busy} onClick={()=>extendByDays(30)}>
              {busy ? "..." : "تفعيل/تمديد 30 يوم"}
            </button>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <input
                type="number"
                min="1"
                value={months}
                onChange={(e)=>setMonths(e.target.value)}
                style={{ width:80 }}
                aria-label="عدد الشهور"
              />
              <button className="btn-ghost" disabled={busy} onClick={()=>extendByMonths(months)}>
                {busy ? "..." : "تمديد (شهور)"}
              </button>
            </div>
          </div>
        </div>
        <div className="small" style={{ opacity:.8 }}>
          ملاحظة: لو عندك قواعد تجعل تعديل الشركة مقتصرًا على SUPER_ADMIN، لازم تستخدم صفحة تفعيل أكواد أو حساب SUPER_ADMIN.
        </div>
      </div>

      {/* بيانات عامة + التسعير */}
      <form onSubmit={save} className="card" style={{ display:"grid", gap:12, maxWidth:640, marginTop:12 }}>
        <div className="grid" style={{ gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div>
            <label>اسم الشركة</label>
            <input value={f.name} onChange={e=>setF(s=>({...s,name:e.target.value}))} />
          </div>
          <div>
            <label>الهاتف</label>
            <input value={f.phone} onChange={e=>setF(s=>({...s,phone:e.target.value}))} />
          </div>
        </div>

        <div>
          <label>العنوان</label>
          <input value={f.address} onChange={e=>setF(s=>({...s,address:e.target.value}))} />
        </div>

        <div className="grid" style={{ gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div>
            <label>الخطة</label>
            <input value={f.plan} onChange={e=>setF(s=>({...s,plan:e.target.value}))} />
          </div>
          <div>
            <label>عدد المقاعد</label>
            <input type="number" value={f.seats} onChange={e=>setF(s=>({...s,seats:e.target.value}))} />
          </div>
        </div>

        <fieldset className="card" style={{ display:"grid", gap:10 }}>
          <legend>التسعير</legend>
          <div className="grid" style={{ gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            <div>
              <label>العملة</label>
              <input value={f.currency} onChange={e=>setF(s=>({...s,currency:e.target.value}))} />
            </div>
            <div>
              <label>سعر/كجم</label>
              <input type="number" step="0.01" value={f.basePerKg} onChange={e=>setF(s=>({...s,basePerKg:e.target.value}))} />
            </div>
            <div>
              <label>سعر/كم</label>
              <input type="number" step="0.01" value={f.basePerKm} onChange={e=>setF(s=>({...s,basePerKm:e.target.value}))} />
            </div>
            <div>
              <label>رسوم إضافية</label>
              <input type="number" step="0.01" value={f.surcharge} onChange={e=>setF(s=>({...s,surcharge:e.target.value}))} />
            </div>
          </div>
        </fieldset>

        <div>
          <button className="btn" type="submit" disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ"}</button>
        </div>
      </form>

      {/* نموذج توضيحي */}
      <div className="card" style={{ marginTop:12 }}>
        <h3>نموذج البيانات في RTDB</h3>
        <pre style={{ whiteSpace:"pre-wrap" }}>
{`companies/${companyId}:
{
  "name": "${f.name}",
  "address": "${f.address}",
  "phone": "${f.phone}",
  "plan": "${f.plan}",
  "seats": ${f.seats},
  "expiresAt": ${f.expiresAt || "null"},
  "status": "${active ? "ACTIVE" : (f.status || "EXPIRED")}",
  "pricing": {
    "currency": "${f.currency}",
    "basePerKg": ${f.basePerKg},
    "basePerKm": ${f.basePerKm},
    "surcharge": ${f.surcharge}
  }
}`}
        </pre>
      </div>

      {/* شوية تنسيقات بسيطة للأزرار */}
      <style>{`
        .btn { padding:8px 14px; border-radius:10px; border:1px solid #e5e7eb; background:#111827; color:#fff; cursor:pointer; }
        .btn:hover { opacity:.95 }
        .btn-ghost { padding:8px 12px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; color:#111827; cursor:pointer; }
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:14px; }
        .grid { display:grid }
        .page { padding: 16px; }
        .small { font-size:12px }
        label { display:block; font-size:12px; margin-bottom:6px; color:#374151 }
        input { width:100%; padding:8px 10px; border-radius:10px; border:1px solid #e5e7eb; }
        fieldset.card { border-color:#e5e7eb }
        legend { padding:0 6px; font-weight:600; }
      `}</style>
    </div>
  );
}
