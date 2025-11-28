// src/components/Header.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";
import { logout } from "../../firebase";
import { useEffect, useState } from "react";

export default function Header(){
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState(null); // {text}

  async function doLogout(){
    try{
      setBusy(true);
      await logout();
      setToast({ text: "تم تسجيل الخروج" });
      // ممكن يظهر نصف ثانية قبل التحويل
      setTimeout(() => nav("/login", { replace: true }), 600);
    }catch(e){
      setToast({ text: e.message || "حدث خطأ" });
    }finally{
      setBusy(false);
      setShowConfirm(false);
    }
  }

  // إخفاء التوست تلقائيًا
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="brand">🚚 Tawsel</div>
      </div>
      <div className="topbar__right">
        {user ? (
          <div className="userbox">
            <div className="userbox__info">
              <div className="userbox__name">{profile?.displayName || user.email}</div>
              <div className="userbox__role small">{profile?.role || "USER"}</div>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => setShowConfirm(true)}
              disabled={busy}
              aria-label="Logout"
            >
              {busy ? <span className="spinner" /> : "تسجيل الخروج"}
            </button>
          </div>
        ) : (
          <button className="btn" onClick={()=>nav("/login")}>تسجيل الدخول</button>
        )}
      </div>

      {/* Modal التأكيد */}
      {showConfirm && (
        <ConfirmModal
          title="تأكيد تسجيل الخروج"
          message="هل تريد تسجيل الخروج بالتأكيد؟"
          confirmText={busy ? "جارٍ الخروج..." : "تأكيد الخروج"}
          cancelText="إلغاء"
          onConfirm={doLogout}
          onCancel={() => !busy && setShowConfirm(false)}
          disabled={busy}
        />
      )}

      {/* Toast */}
      {toast && <Toast text={toast.text} />}
      
      <style>{modalAndToastCSS}</style>
    </header>
  );
}

/* ========== Modal Component ========== */
function ConfirmModal({ title, message, confirmText, cancelText, onConfirm, onCancel, disabled }){
  // إغلاق بـ ESC، تأكيد بـ Enter
  useEffect(() => {
    function onKey(e){
      if (e.key === "Escape") onCancel && onCancel();
      if (e.key === "Enter") onConfirm && onConfirm();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div className="modal-card" onMouseDown={(e)=>e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-msg">{message}</div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onCancel} disabled={disabled}> {cancelText} </button>
          <button className="btn-danger" onClick={onConfirm} disabled={disabled}> {confirmText} </button>
        </div>
      </div>
    </div>
  );
}

/* ========== Toast Component ========== */
function Toast({ text }){
  return (
    <div className="toast">
      {text}
    </div>
  );
}

/* ========== Scoped CSS for modal & toast ========== */
const modalAndToastCSS = `
.modal-overlay{
  position: fixed; inset:0;
  background: rgba(0,0,0,.4);
  display:flex; align-items:center; justify-content:center;
  z-index: 9999;
  padding: 16px;
}
.modal-card{
  width: 100%; max-width: 420px;
  background: #0c1230;
  color: #e9ecf1;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
}
.modal-title{ font-weight: 800; font-size: 18px; margin-bottom: 8px; }
.modal-msg{ opacity:.9; line-height:1.7; margin-bottom: 14px; }
.modal-actions{ display:flex; gap:8px; justify-content:flex-end; }

.toast{
  position: fixed;
  bottom: 18px; inset-inline: 0;
  margin-inline: auto;
  width: fit-content;
  max-width: calc(100% - 32px);
  background: #0b6;
  color: #021f12;
  font-weight: 700;
  padding: 10px 14px;
  border-radius: 999px;
  box-shadow: 0 10px 24px rgba(0,0,0,.25);
  z-index: 9999;
}
`;
