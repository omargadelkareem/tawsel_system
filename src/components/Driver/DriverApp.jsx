import { useEffect, useRef, useState } from "react";
import { useAuth } from "../Auth/AuthContext";
import { pushDriverLocation } from "../../firebase";

export default function DriverApp(){
  const { user } = useAuth();
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState("جاهز");
  const watchIdRef = useRef(null);
  const timerRef = useRef(null);
  const lastPosRef = useRef(null);

  useEffect(() => () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  function startTracking(){
    if (!user) return alert("سجّل الدخول");
    if (!("geolocation" in navigator)) return alert("المتصفح لا يدعم الموقع");
    setTracking(true);
    setStatus("بدء التتبع…");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude:lat, longitude:lng, accuracy } = pos.coords;
        lastPosRef.current = { lat, lng, accuracy };
      },
      (err) => setStatus("خطأ تحديد الموقع: " + err.message),
      { enableHighAccuracy:true, maximumAge:5000, timeout:10000 }
    );

    timerRef.current = setInterval(async () => {
      try {
        const p = lastPosRef.current;
        if (p && user?.uid) {
          await pushDriverLocation(user.uid, { lat:p.lat, lng:p.lng }, p.accuracy);
          setStatus(`آخر إرسال: ${new Date().toLocaleTimeString()}`);
        }
      } catch (e) {
        setStatus("فشل الإرسال: " + e.message);
      }
    }, 12000); // كل 12 ثانية
  }

  function stopTracking(){
    setTracking(false);
    setStatus("تم الإيقاف");
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  return (
    <div className="page">
      <h2>تطبيق المندوب</h2>
      <div className="card" style={{display:"flex", gap:10, alignItems:"center"}}>
        {!tracking
          ? <button className="btn" onClick={startTracking}>بدء التتبع</button>
          : <button className="btn-danger" onClick={stopTracking}>إيقاف التتبع</button>}
        <span className="small">{status}</span>
      </div>
    </div>
  );
}
