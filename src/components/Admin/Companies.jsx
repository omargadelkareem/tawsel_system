// src/components/Admin/Companies.jsx
import { useState } from "react";
import { useAuth } from "../../components/Auth/AuthContext";
import { rtdb } from "../../firebase";
import { ref, update, serverTimestamp, get } from "firebase/database";

export default function AdminCompanies() {
  const { profile } = useAuth();

  // Hooks لازم تكون دائمًا في الأعلى، قبل أي return مشروط
  const [companyId, setCompanyId] = useState("");
  const [months, setMonths] = useState(1);
  const [seats, setSeats] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const isSuper = profile?.role === "SUPER_ADMIN";

  function addMonths(fromMs, m) {
    const d = new Date(fromMs);
    d.setMonth(d.getMonth() + Number(m || 0));
    return d.getTime();
  }

  async function renew() {
    if (!companyId.trim()) return alert("اكتب companyId");
    try {
      setBusy(true);
      const id = companyId.trim();
      const cRef = ref(rtdb, `companies/${id}`);
      const snap = await get(cRef);
      if (!snap.exists()) {
        return alert("الشركة غير موجودة");
      }
      const comp = snap.val();
      const now = Date.now();
      const base = comp.expiresAt && comp.expiresAt > now ? comp.expiresAt : now;
      const newExpires = addMonths(base, Number(months) || 1);

      const updates = {
        expiresAt: newExpires,
        status: "ACTIVE",
        updatedAt: serverTimestamp()
      };
      if (seats !== "") updates.seats = Number(seats);

      await update(cRef, updates);

      // لوج اختياري
      await update(ref(rtdb, `billing/audit/${id}/${Date.now()}`), {
        by: profile?.uid || "super",
        months: Number(months) || 1,
        seats: seats !== "" ? Number(seats) : null,
        note: note || null,
        at: serverTimestamp(),
        action: "extend"
      });

      alert("تم التجديد حتى: " + new Date(newExpires).toLocaleString());
      setNote("");
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h2>إدارة الاشتراكات (سوبر أدمن)</h2>

      {!isSuper ? (
        <div className="card" style={{ maxWidth: 560 }}>
          مسموح للسوبر أدمن فقط.
        </div>
      ) : (
        <div className="card" style={{ maxWidth: 560, display: "grid", gap: 12 }}>
          <div>
            <label>Company ID</label>
            <input
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="مثال: default"
            />
          </div>

          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label>عدد الشهور</label>
              <input
                type="number"
                min="1"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
              />
            </div>
            <div>
              <label>Seats (اختياري)</label>
              <input
                type="number"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label>ملاحظة (اختياري)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="سبب التجديد/رقم فاتورة ..."
            />
          </div>

          <div>
            <button className="btn" onClick={renew} disabled={busy}>
              {busy ? "..." : "تجديد الاشتراك"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .btn { padding:8px 14px; border-radius:10px; border:1px solid #e5e7eb; background:#111827; color:#fff; cursor:pointer; }
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:14px; }
        label { display:block; font-size:12px; margin-bottom:6px; color:#374151 }
        input { width:100%; padding:8px 10px; border-radius:10px; border:1px solid #e5e7eb; }
      `}</style>
    </div>
  );
}

