// src/components/Label.jsx
export default function Label({ s }) {
  // s = shipment object
  return (
    <div style={{ width: '100mm', height: '150mm', padding:'8mm', border:'1px solid #ccc', background:'#fff', color:'#000' }}>
      <h3 style={{margin:'0 0 6mm'}}>AWB: {s.reference}</h3>
      <div>From: {s.pickup?.name}</div>
      <div>To: {s.dropoff?.name}</div>
      <div>Weight: {s.parcels?.[0]?.weightKg ?? '-' } kg</div>
      <div style={{marginTop:'6mm'}}>Status: {s.status}</div>
      {/* QR سريع بس كـ نص (استبدله بمكتبة qrcode لاحقًا) */}
      <div style={{marginTop:'10mm', fontSize:10}}>QR: /track/{s.reference}</div>
    </div>
  );
}
