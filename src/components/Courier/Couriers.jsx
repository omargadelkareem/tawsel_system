// src/pages/Couriers.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../Auth/AuthContext";
import { watchCouriers, rtdb } from "../../firebase";
import { ref, set, update, remove, serverTimestamp } from "firebase/database";

export default function Couriers() {
  const { user, profile } = useAuth();
  const companyId = profile?.companyId || "default";

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  // ✅ فورم موحد مع الحقول الجديدة
  const [f, setF] = useState({
    uid: "",
    name: "",
    phone: "",
    zone: "",
    vehiclePlate: "",
    vehicleType: "",
    online: true,
    username: "",
    password: "",
  });

  // ✅ تحميل المندوبين لحظيًا
  useEffect(() => {
    const off = watchCouriers((rs) => {
      const filtered = rs.filter((c) => (c.companyId || companyId) === companyId);
      const normalized = filtered.map((c) => ({
        ...c,
        _name:
          c.name ??
          c.displayName ??
          c.fullName ??
          c.profile?.name ??
          "",
        _plate: c.vehicle?.plate ?? c.vehicleId ?? "",
        _type: c.vehicle?.type ?? c.vehicleType ?? "",
      }));
      setRows(normalized);
    });
    return () => off && off();
  }, [companyId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((c) => {
      if (!term) return true;
      return (
        (c._name || "").toLowerCase().includes(term) ||
        (c.phone || "").toLowerCase().includes(term) ||
        (c.zone || "").toLowerCase().includes(term) ||
        (c._plate || "").toLowerCase().includes(term) ||
        (c.username || "").toLowerCase().includes(term) ||
        (c.id || "").toLowerCase().includes(term)
      );
    });
  }, [rows, q]);

  // ✅ بدء التعديل
  function startEdit(c) {
    setEditing(c?.id || null);
    setF({
      uid: c?.id || "",
      name: c?._name || "",
      phone: c?.phone || "",
      zone: c?.zone || "",
      vehiclePlate: c?._plate || "",
      vehicleType: c?._type || "",
      online: !!c?.online,
      username: c?.username || "",
      password: "", // لا نعرض القديمة
    });
  }

  function resetForm() {
    setEditing(null);
    setF({
      uid: "",
      name: "",
      phone: "",
      zone: "",
      vehiclePlate: "",
      vehicleType: "",
      online: true,
      username: "",
      password: "",
    });
  }

  // ✅ حفظ / تحديث البيانات
  async function save(e) {
    e.preventDefault();
    if (!f.uid) return alert("اكتب UID المندوب (هو نفسه UID حسابه في users)");

    setBusy(true);
    try {
      const path = `couriers/${f.uid}`;

      const payload = {
        name: f.name || f.uid,
        phone: f.phone || null,
        zone: f.zone || null,
        companyId,
        online: !!f.online,
        username: f.username?.trim() || null,
        vehicle: {
          plate: f.vehiclePlate || null,
          type: f.vehicleType || null,
        },
        vehicleId: f.vehiclePlate || null,
        ...(editing
          ? {}
          : { assignedCount: 0, createdAt: serverTimestamp(), createdBy: user?.uid || "system" }),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || "system",
      };

      // ✅ إضافة كلمة المرور (أو تجاهلها في التعديل)
      if (!editing || f.password.trim()) {
        payload.password = f.password.trim();
      }

      if (editing) {
        await update(ref(rtdb, path), payload);
      } else {
        await set(ref(rtdb, path), payload);
      }

      resetForm();
      alert(editing ? "تم تحديث بيانات المندوب" : "تمت إضافة المندوب");
    } catch (e2) {
      alert(e2.message);
    } finally {
      setBusy(false);
    }
  }

  // ✅ أوامر أخرى
  async function toggleOnline(c) {
    try {
      await update(ref(rtdb, `couriers/${c.id}`), {
        online: !c.online,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || "system",
      });
    } catch (e) {
      alert(e.message);
    }
  }

  async function zeroLoad(c) {
    if (!window.confirm("تأكيد تصفير حمل العمل (assignedCount)؟")) return;
    try {
      await update(ref(rtdb, `couriers/${c.id}`), {
        assignedCount: 0,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || "system",
      });
    } catch (e) {
      alert(e.message);
    }
  }

  async function del(c) {
    if (!window.confirm("حذف هذا المندوب نهائيًا؟")) return;
    try {
      await remove(ref(rtdb, `couriers/${c.id}`));
    } catch (e) {
      alert(e.message);
    }
  }

  // ✅ واجهة العرض
  return (
    <div className="page">
      <h2>المندوبون</h2>

      {/* ✅ فورم الإضافة/التعديل */}
      <form onSubmit={save} className="card form-grid form-3 gap-3" style={{ maxWidth: 1000 }}>
        <div>
          <label>UID</label>
          <input
            placeholder="مثال: A1b2C3d4..."
            value={f.uid}
            onChange={(e) => setF((s) => ({ ...s, uid: e.target.value.trim() }))}
            disabled={!!editing}
          />
          <div className="small" style={{ opacity: 0.8 }}>
            المفتاح الأساسي للمندوب — لازم يطابق UID حسابه في users.
          </div>
        </div>

        <div>
          <label>الاسم</label>
          <input
            placeholder="اسم المندوب"
            value={f.name}
            onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))}
          />
        </div>

        <div>
          <label>الهاتف</label>
          <input
            placeholder="رقم الهاتف"
            value={f.phone}
            onChange={(e) => setF((s) => ({ ...s, phone: e.target.value }))}
          />
        </div>

        <div>
          <label>المنطقة</label>
          <input
            placeholder="مثال: Cairo"
            value={f.zone}
            onChange={(e) => setF((s) => ({ ...s, zone: e.target.value }))}
          />
        </div>

        <div>
          <label>رقم المركبة (اللوحة)</label>
          <input
            placeholder="ABC-123"
            value={f.vehiclePlate}
            onChange={(e) => setF((s) => ({ ...s, vehiclePlate: e.target.value }))}
          />
        </div>

        <div>
          <label>نوع المركبة</label>
          <input
            placeholder="Bike / Car / Van ..."
            value={f.vehicleType}
            onChange={(e) => setF((s) => ({ ...s, vehicleType: e.target.value }))}
          />
        </div>

        {/* ✅ حقول الدخول الجديدة */}
        <div>
          <label>اسم المستخدم (Username)</label>
          <input
            placeholder="مثال: courier123"
            value={f.username}
            onChange={(e) => setF((s) => ({ ...s, username: e.target.value }))}
          />
        </div>

        <div>
          <label>كلمة المرور (Password)</label>
          <input
            type="password"
            placeholder="••••••••"
            value={f.password}
            onChange={(e) => setF((s) => ({ ...s, password: e.target.value }))}
          />
          {editing && (
            <div className="small" style={{ opacity: 0.8 }}>
              اتركها فارغة إذا كنت لا تريد تغيير كلمة المرور.
            </div>
          )}
        </div>

        <div>
          <label>الحالة</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={f.online}
              onChange={(e) => setF((s) => ({ ...s, online: e.target.checked }))}
            />
            <span>{f.online ? "أونلاين" : "أوفلاين"}</span>
          </div>
        </div>

        <div style={{ gridColumn: "1/-1", display: "flex", gap: 8 }}>
          <button className="btn" disabled={busy}>
            {busy ? "جارٍ الحفظ..." : editing ? "تحديث" : "إضافة مندوب"}
          </button>
          {editing && (
            <button type="button" className="btn-ghost" onClick={resetForm}>
              إلغاء التعديل
            </button>
          )}
        </div>
      </form>

      {/* ✅ شريط أدوات */}
      <div className="card" style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 200px", gap: 8 }}>
        <input
          placeholder="بحث بالاسم/الهاتف/المنطقة/اللوحة/UID/اسم المستخدم…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <span className="small">إجمالي: {filtered.length}</span>
        </div>
      </div>

      {/* ✅ الجدول */}
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>UID</th>
              <th>اسم المستخدم</th>
              <th>الهاتف</th>
              <th>المنطقة</th>
              <th>المركبة</th>
              <th>الحالة</th>
              <th>الحمل</th>
              <th>آخر موقع</th>
              <th style={{ minWidth: 260 }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>{c._name || c.name || "-"}</td>
                <td className="mono small">{c.id}</td>
                <td>{c.username || "-"}</td>
                <td>{c.phone || "-"}</td>
                <td>{c.zone || "-"}</td>
                <td className="small mono">
                  {c._plate || "-"} {c._type ? `(${c._type})` : ""}
                </td>
                <td>
                  <span className={`chip ${c.online ? "chip-ok" : ""}`}>
                    {c.online ? "أونلاين" : "أوفلاين"}
                  </span>
                </td>
                <td className="mono small">{c.assignedCount ?? 0}</td>
                <td className="small">
                  {c.lastLoc?.lat && c.lastLoc?.lng
                    ? `${Number(c.lastLoc.lat).toFixed(4)}, ${Number(c.lastLoc.lng).toFixed(4)}`
                    : "-"}
                  <div style={{ opacity: 0.7 }}>
                    {c.lastLoc?.at ? new Date(c.lastLoc.at).toLocaleString() : ""}
                  </div>
                </td>
                <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn-ghost" onClick={() => startEdit(c)}>تعديل</button>
                  <button className="btn-ghost" onClick={() => toggleOnline(c)}>
                    {c.online ? "تعيين كأوفلاين" : "تعيين كأونلاين"}
                  </button>
                  <button className="btn-ghost" onClick={() => zeroLoad(c)}>تصفير الحمل</button>
                  <button className="btn-danger" onClick={() => del(c)}>حذف</button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan="10">لا يوجد مندوبون.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
        .chip { display:inline-flex; align-items:center; padding:2px 8px; border-radius:12px; background:#eee; font-size:12px; }
        .chip-ok { background: #e6ffed; }
      `}</style>
    </div>
  );
}
