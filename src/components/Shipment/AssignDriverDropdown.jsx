    import { useEffect, useState } from "react";
import { watchCouriers, watchDriverTrack, autoAssignCourier } from "../../firebase";

export default function AssignDriverDropdown({ companyId, shipment, user, disabled, onAssigned }) {
  const [open, setOpen] = useState(false);
  const [couriers, setCouriers] = useState([]);
  const [hoverId, setHoverId] = useState(null);
  const [hoverTrack, setHoverTrack] = useState([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!open) return;
    const off = watchCouriers((rows) => {
      const filtered = rows.filter(c => (c.companyId || companyId) === companyId);
      setCouriers(filtered);
    });
    return () => off && off();
  }, [open, companyId]);

  useEffect(() => {
    if (!hoverId) { setHoverTrack([]); return; }
    const off = watchDriverTrack(hoverId, (list) => {
      const last = list.slice(-10);
      setHoverTrack(last);
    });
    return () => off && off();
  }, [hoverId]);

  async function assignTo(driverId) {
    try {
      setAssigning(true);
      await autoAssignCourier({ shipmentId: shipment.id, driverId, currentUser: user });
      setOpen(false);
      onAssigned && onAssigned();
    } catch (e) {
      alert(e.message);
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        className="btn-ghost"
        disabled={disabled || assigning}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        {assigning ? "جارٍ التعيين..." : "تعيين مندوب"}
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "absolute", top: "110%", insetInlineStart: 0,
            width: 360, zIndex: 50, padding: 8
          }}
        >
          <div className="small" style={{ marginBottom: 6 }}>اختر مندوبًا:</div>
          <div style={{ maxHeight: 320, overflow: "auto", display: "grid", gap: 6 }}>
            {couriers.length ? couriers.map(c => (
              <div
                key={c.id}
                className="row hover"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px",
                  gap: 8, alignItems: "center",
                  padding: "6px 8px", borderRadius: 8, cursor: "pointer"
                }}
                onMouseEnter={() => setHoverId(c.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={() => assignTo(c.id)}
                title="انقر للتعيين"
              >
                <div style={{ display: "grid", gap: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <b style={{ direction: "rtl" }}>{c.name || c.id}</b>
                    <span className={`chip ${c.online ? "chip-ok" : ""}`}>
                      {c.online ? "أونلاين" : "أوفلاين"}
                    </span>
                  </div>
                  <div className="small mono">
                    مركبة: {c.vehicle?.plate || "-"} {c.vehicle?.type ? `(${c.vehicle.type})` : ""}
                  </div>
                  <div className="small" style={{ opacity: .8 }}>
                    حمل العمل: {c.assignedCount || 0}
                  </div>
                </div>
                <MiniTrackSparkline points={hoverId === c.id ? hoverTrack : []} />
              </div>
            )) : (
              <div className="small" style={{ opacity: .7 }}>لا يوجد مندوبون.</div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn-ghost" onClick={() => setOpen(false)}>إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniTrackSparkline({ points }) {
  const W = 120, H = 42, PAD = 4;
  if (!points || points.length < 2) {
    return <div className="small" style={{ textAlign: "end", opacity: .7 }}>لا مسار</div>;
  }
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const dx = (maxLng - minLng) || 1e-6;
  const dy = (maxLat - minLat) || 1e-6;

  const toX = (lng) => PAD + ((lng - minLng) / dx) * (W - 2 * PAD);
  const toY = (lat) => PAD + (1 - (lat - minLat) / dy) * (H - 2 * PAD);

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.lng).toFixed(1)} ${toY(p.lat).toFixed(1)}`).join(" ");

  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <rect x="0" y="0" width={W} height={H} rx="6" ry="6" fill="transparent" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
