// src/pages/AWB.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getShipment } from "../../firebase";
import JsBarcode from "jsbarcode";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function AWB() {
  const { id } = useParams();
  const nav = useNavigate();
  const [s, setS] = useState(null);
  const barcodeRef = useRef(null);
  const cardRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await getShipment(id);
      if (alive) { setS(data); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id]);

  // رسم الباركود
  useEffect(() => {
    if (!s || !barcodeRef.current) return;
    const code = s.reference || s.id;
    try {
      JsBarcode(barcodeRef.current, code, {
        format: "CODE128",
        displayValue: true,
        fontSize: 12,
        width: 2,
        height: 56,
        margin: 0
      });
    } catch {}
  }, [s]);

  async function exportPDF() {
    if (!cardRef.current || !s) return;
    const mmW = 100, mmH = 150;
    const canvas = await html2canvas(cardRef.current, {
      scale: 3, backgroundColor: "#fff", useCORS: true
    });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "mm", format: [mmW, mmH], orientation: "portrait" });
    pdf.addImage(img, "PNG", 0, 0, mmW, mmH, undefined, "FAST");
    pdf.save(`${(s.reference || s.id)}.pdf`);
  }

  function normPhone(ph) {
    if (!ph) return "";
    return String(ph).replace(/[^\d+]/g, "");
  }
  function callRecipient() {
    const to = normPhone(s?.dropoff?.phone);
    if (to) window.location.href = `tel:${to}`;
    else alert("لا يوجد رقم للمستلم.");
  }

  if (loading) return <div className="page"><div className="card">جارٍ التحميل…</div></div>;
  if (!s) return <div className="page"><div className="card">لم يتم العثور على الشحنة.</div></div>;

  const refCode = s.reference || s.id;
  const pickup = s.pickup || {};
  const drop = s.dropoff || {};
  const cod = s.charges?.cod || 0;
  const total = s.charges?.total || 0;
  const currency = s.charges?.currency || "EGP";
  const qrText = `AWB:${refCode}`;
  const dropPhone = drop.phone || "";

  return (
    <div className="page" style={{ paddingBottom: 24 }}>
      {/* شريط الأدوات */}
      <div className="card" style={{display:"flex", gap:8, margin:"0 auto 16px", maxWidth: 600, justifyContent:"center", flexWrap:"wrap"}}>
        <button className="btn-ghost" onClick={()=>nav(-1)}>رجوع</button>
        <button className="btn" onClick={callRecipient}>اتصال بالمستلم</button>
        <button className="btn" onClick={()=>window.print()}>طباعة</button>
        <button className="btn" onClick={exportPDF}>تصدير PDF</button>
      </div>

      {/* تمركز البوليصة */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"center", minHeight:"calc(100vh - 160px)", paddingInline: 12 }}>
        {/* بطاقة البوليصة — 100x150مم تقريبًا */}
        <div
          ref={cardRef}
          className="awb"
          style={{
            width: "378px", height: "567px", maxWidth: "100%",
            background: "#fff", color: "#000", border: "1px solid #ddd", borderRadius: 8, padding: 12,
            boxShadow: "0 2px 10px rgba(0,0,0,.08)", direction: "rtl",
            display:"grid", gridTemplateRows:"auto auto auto 1fr auto", rowGap: 10,
            marginInline: "auto", overflow: "hidden"
          }}
        >
          {/* رأس */}
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div style={{display:"grid"}}>
              <b style={{fontSize:18}}>شركة التوصيل</b>
              <span className="small">بوليصة شحن</span>
            </div>
            <div className="small mono">AWB</div>
          </div>

          {/* المرجع + QR */}
          <div style={{
            display:"grid",
            gridTemplateColumns:"1fr 110px",
            alignItems:"center",
            gap:8
          }}>
            <div>
              <div style={{fontSize:14, marginBottom:4}}>رقم البوليصة</div>
              <div style={{fontSize:20, fontWeight:700, lineHeight:1.2}}>{refCode}</div>
              <div className="small mono" style={{opacity:.75, wordBreak:"break-all"}}>{s.id}</div>
            </div>
            <div style={{display:"grid", justifyItems:"center", alignContent:"center"}}>
              <QRCodeCanvas value={qrText} size={84} includeMargin={false}/>
              <span className="small mono" style={{opacity:.7, marginTop:4}}>QR</span>
            </div>
          </div>

          {/* باركود */}
          <div style={{display:"grid", justifyItems:"center", overflow:"visible"}}>
            <svg ref={barcodeRef} style={{ maxWidth:"100%" }} />
          </div>

          {/* شريط بارز لرقم هاتف المستلم */}
          <div
            style={{
              border:"1px solid #0b6", background:"#eafff5", padding:"8px 10px",
              borderRadius:8, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8
            }}
          >
            <div style={{display:"grid", gap:2}}>
              <div className="small" style={{opacity:.7}}>هاتف المستلم</div>
              <div style={{fontWeight:700, fontSize:18, direction:"ltr"}}>
                {dropPhone || "-"}
              </div>
            </div>
            <button
              className="btn"
              onClick={callRecipient}
              style={{ whiteSpace:"nowrap" }}
              title="اتصال بالمستلم"
            >
              اتصال
            </button>
          </div>

          {/* عناوين */}
          <div className="card" style={{border:"1px dashed #bbb", padding:8}}>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
              <div>
                <div className="small" style={{opacity:.7}}>المرسل</div>
                <div><b>{pickup.name || "-"}</b></div>
                <div className="small">{pickup.phone || "-"}</div>
                <div className="small">{pickup.address || "-"}</div>
                <div className="small" style={{opacity:.7}}>منطقة: {pickup.zone || "-"}</div>
              </div>
              <div>
                <div className="small" style={{opacity:.7}}>المستلم</div>
                <div><b>{drop.name || "-"}</b></div>
                <div className="small">{dropPhone || "-"}</div>
                <div className="small">{drop.address || "-"}</div>
                <div className="small" style={{opacity:.7}}>منطقة: {drop.zone || "-"}</div>
              </div>
            </div>
          </div>

          {/* تفاصيل الشحنة */}
          <div className="card" style={{border:"1px dashed #bbb", padding:8, display:"grid", gap:6}}>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
              <div>الوزن: <b>{s.parcels?.[0]?.weightKg ?? "-"}</b> كجم</div>
              <div>عدد الطرود: <b>{s.parcels?.length ?? 1}</b></div>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
              <div>COD: <b>{cod} {currency}</b></div>
              <div>إجمالي الرسوم: <b>{total} {currency}</b></div>
            </div>
            <div>ملاحظات: <span>{s.note || "-"}</span></div>
            <div className="small" style={{opacity:.8}}>
              تاريخ الإنشاء: {s.createdAt ? new Date(s.createdAt).toLocaleString() : "-"}
            </div>
          </div>

          {/* تذييل للتوقيع */}
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, alignItems:"end"}}>
            <div className="small" style={{borderTop:"1px solid #ccc", paddingTop:6}}>
              توقيع المندوب
            </div>
            <div className="small" style={{borderTop:"1px solid #ccc", paddingTop:6}}>
              توقيع المستلم / الختم
            </div>
          </div>
        </div>
      </div>

      {/* طباعة */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page > .card { display:none !important; }
          .awb { box-shadow: none !important; border: 0 !important; margin: 0 auto !important; }
        }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace; }
        .small { font-size: 12px; }
      `}</style>
    </div>
  );
}
