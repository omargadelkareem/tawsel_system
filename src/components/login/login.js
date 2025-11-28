// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { adminSignIn, sendReset, rtdb } from "../../firebase";
import { useAuth } from "../Auth/AuthContext";
import { ref, update, serverTimestamp } from "firebase/database";

export default function Login() {
  const { user } = useAuth() || {};
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [busy, setBusy]   = useState(false);

  // لوحة ترقية مالك النظام (سرّية)
  const [openSetup, setOpenSetup] = useState(false);
  const [setupCode, setSetupCode] = useState("");

  // متغير البيئة في CRA:
  const MASTER_SETUP_CODE = process.env.REACT_APP_SETUP_CODE || "CHANGE-ME-STRONG-CODE";

  useEffect(() => {
    if (user) nav("/", { replace: true });
  }, [user, nav]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setBusy(true);
      await adminSignIn(email, pass);
      // onAuthStateChanged هينقلك تلقائيًا
    } catch (e2) {
      alert(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!email) return alert("اكتب الإيميل أولًا");
    try { await sendReset(email); alert("تم إرسال رابط إعادة التعيين إلى بريدك"); }
    catch (e) { alert(e.message); }
  }

  async function promoteToSuperAdmin() {
    if (!user) return alert("سجّل الدخول أولًا");
    if (!setupCode.trim()) return alert("ادخل الكود السري");
    if (setupCode.trim() !== MASTER_SETUP_CODE) return alert("الكود غير صحيح");

    try {
      setBusy(true);
      await update(ref(rtdb, `users/${user.uid}`), {
        role: "SUPER_ADMIN",
        companyId: "default",
        promotedAt: serverTimestamp()
      });
      alert("تم ترقيتك إلى SUPER_ADMIN. أعد فتح الصفحة.");
      // ممكن nav("/admin/companies") لو عايز
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="login-wrap">
      <div className="card login-card" style={{ minWidth: 360 }}>
        <h1 className="login-title">تسجيل الدخول</h1>
        <p className="login-sub">أدخل بريد الأدمن وكلمة المرور</p>

        <form onSubmit={handleSubmit} className="grid gap-2">
          <input className="input" placeholder="admin@company.com"
                 value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="••••••••"
                 value={pass} onChange={e=>setPass(e.target.value)} />

          <button className="btn" type="submit" disabled={busy}>
            {busy ? "جارٍ الدخول..." : "تسجيل الدخول"}
          </button>

          <div className="small" style={{ display:"flex", gap:8, justifyContent:"space-between", alignItems:"center" }}>
            <button className="link" type="button" onClick={handleReset}>نسيت كلمة المرور؟</button>
            <button
              className="link"
              type="button"
              onClick={()=>setOpenSetup(v=>!v)}
              title="إعداد مالك النظام (مرة واحدة)"
            >
              {openSetup ? "إخفاء الإعداد السري" : "إعداد مالك النظام"}
            </button>
          </div>
        </form>

        {openSetup && (
          <div className="card" style={{ marginTop: 12, display:"grid", gap:8 }}>
            <div className="small" style={{ opacity:.8 }}>
              استخدم هذا الإجراء مرة واحدة لمالك النظام: أدخل <b>الكود السري</b> لترقية حسابك الحالي إلى <b>SUPER_ADMIN</b>.
            </div>
            <input
              className="input mono"
              type="password"
              placeholder="الكود السري"
              value={setupCode}
              onChange={e=>setSetupCode(e.target.value)}
            />
            <button className="btn btn-ghost" onClick={promoteToSuperAdmin} disabled={busy}>
              {busy ? "..." : "ترقية لسوبر أدمن"}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .login-wrap { min-height:100dvh; display:grid; place-items:center; padding:16px; background:#0f172a; }
        .login-card { background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:18px; box-shadow: 0 10px 20px rgba(0,0,0,.08); }
        .login-title { margin:0 0 4px; font-size:20px; font-weight:700; }
        .login-sub { margin:0 0 12px; color:#6b7280; font-size:12px; }
        .grid { display:grid }
        .gap-2 { gap:8px }
        .input { width:100%; padding:10px 12px; border-radius:12px; border:1px solid #e5e7eb; background:#fff; }
        .btn { padding:10px 14px; border-radius:12px; border:1px solid #111827; background:#111827; color:#fff; cursor:pointer; }
        .btn:hover { opacity:.95 }
        .btn-ghost { padding:10px 12px; border-radius:12px; border:1px solid #e5e7eb; background:#fff; color:#111827; cursor:pointer; }
        .link { background:none; border:none; color:#2563eb; cursor:pointer; padding:0 }
        .small { font-size:12px }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
      `}</style>
    </div>
  );
}
