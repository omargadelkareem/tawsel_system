// src/pages/Reports.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../Auth/AuthContext";
import { watchCompanySettings, watchShipmentsByDateRange } from "../../firebase";

function toDateInputValue(d) {
  // يحوّل Date لــ yyyy-mm-dd
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export default function Reports() {
  const { user, profile } = useAuth();
  const companyId = profile?.companyId || "default";

  // نطاق التاريخ الافتراضي: الشهر الحالي
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [from, setFrom] = useState(toDateInputValue(monthStart));
  const [to, setTo] = useState(toDateInputValue(now));

  const [settings, setSettings] = useState(null);
  const [rows, setRows] = useState([]);

  // اقرأ إعدادات الشركة (التسعير البسيط)
  useEffect(() => {
    const off = watchCompanySettings(companyId, setSettings);
    return () => off && off();
  }, [companyId]);

  // راقب الشحنات حسب المدى الزمني
  useEffect(() => {
    const fromMs = new Date(from + "T00:00:00").getTime();
    const toMs   = new Date(to   + "T23:59:59").getTime();
    const off = watchShipmentsByDateRange(fromMs, toMs, (list) => {
      // صفّي حسب الشركة (RTDB لا يدعم orderByChild مزدوج)
      setRows(list.filter(r => (r.companyId || "default") === companyId));
    });
    return () => off && off();
  }, [from, to, companyId]);

  // مؤشرات
  const kpis = useMemo(() => {
    const total = rows.length;
    const delivered = rows.filter(r => r.status === "DELIVERED").length;
    const inTransit = rows.filter(r => r.status === "IN_TRANSIT").length;
    const created = rows.filter(r => r.status === "CREATED").length;

    const totalWeight = rows.reduce((acc, r) => acc + (Number(r.parcels?.[0]?.weightKg) || 0), 0);

    // تسعير تقريبي (اختياري) باستخدام إعدادات الشركة، بدون مسافات/مسافات كم
    const basePerKg = Number(settings?.pricing?.basePerKg ?? 1.5);
    const estRevenue = Math.round(totalWeight * basePerKg * 100) / 100;

    return { total, delivered, inTransit, created, totalWeight, estRevenue, currency: settings?.pricing?.currency || "USD" };
  }, [rows, settings]);

  function exportCSV() {
    const headers = ["reference","pickupName","dropoffName","weightKg","status","createdAt"];
    const lines = [
      headers.join(","),
      ...rows.map(r => {
        const weight = r.parcels?.[0]?.weightKg ?? "";
        const createdAt = r.createdAt ? new Date(r.createdAt).toISOString() : "";
        return [
          r.reference || "",
          r.pickup?.name || "",
          r.dropoff?.name || "",
          weight,
          r.status || "",
          createdAt
        ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",");
      })
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `shipments_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <h2>التقارير</h2>

      <div className="card" style={{ display:"grid", gap:12, maxWidth: 900 }}>
        <div style={{ display:"flex", gap:10 }}>
          <div>
            <label>من</label><br/>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
          </div>
          <div>
            <label>إلى</label><br/>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
          <div style={{ alignSelf:"end" }}>
            <button onClick={exportCSV}>تصدير CSV</button>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          <div className="card">إجمالي الشحنات: {kpis.total}</div>
          <div className="card">تم التسليم: {kpis.delivered}</div>
          <div className="card">قيد النقل: {kpis.inTransit}</div>
          <div className="card">جديدة: {kpis.created}</div>
          <div className="card">إجمالي الوزن (كجم): {kpis.totalWeight}</div>
          <div className="card">إيراد تقريبي: {kpis.estRevenue} {kpis.currency}</div>
        </div>

        <div className="card">
          <h3>تفاصيل الشحنات</h3>
          <table border="1" cellPadding="6" style={{ borderCollapse:"collapse", width:"100%" }}>
            <thead>
              <tr>
                <th>مرجع</th>
                <th>مرسل</th>
                <th>مستلم</th>
                <th>وزن</th>
                <th>حالة</th>
                <th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.reference || "-"}</td>
                  <td>{r.pickup?.name || "-"}</td>
                  <td>{r.dropoff?.name || "-"}</td>
                  <td>{r.parcels?.[0]?.weightKg ?? "-"}</td>
                  <td>{r.status || "-"}</td>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
