// src/pages/Hubs.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../Auth/AuthContext";
import { watchHubs, createHub, updateHub, deleteHub } from "../../firebase";

export default function Hubs(){
  const { profile, user } = useAuth();
  const companyId = profile?.companyId || "default";
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ name:"", code:"", address:"" });
  const [editId, setEditId] = useState(null);

  useEffect(()=>{ const off=watchHubs(companyId,setRows); return ()=>off&&off(); },[companyId]);

  async function save(e){
    e.preventDefault();
    if (!f.name) return alert("اكتب اسم المخزن");
    if (editId){ await updateHub(companyId, editId, f, user); setEditId(null); }
    else { await createHub(companyId, f, user); }
    setF({name:"",code:"",address:""});
  }

  return (
    <div className="page">
      <h2>المخازن / الفروع</h2>

      <form onSubmit={save} className="card form-grid form-3 gap-3" style={{maxWidth:900}}>
        <div><label>الاسم</label><input value={f.name} onChange={e=>setF(s=>({...s,name:e.target.value}))}/></div>
        <div><label>الكود</label><input value={f.code} onChange={e=>setF(s=>({...s,code:e.target.value}))}/></div>
        <div><label>العنوان</label><input value={f.address} onChange={e=>setF(s=>({...s,address:e.target.value}))}/></div>
        <div style={{gridColumn:"1/-1"}}>
          <button className="btn">{editId?"تحديث":"إضافة مخزن"}</button>
          {editId && <button type="button" className="btn-ghost" onClick={()=>{setEditId(null); setF({name:"",code:"",address:""});}}>إلغاء</button>}
        </div>
      </form>

      <div className="table-wrap" style={{marginTop:12}}>
        <table className="table">
          <thead><tr><th>الاسم</th><th>الكود</th><th>العنوان</th><th></th></tr></thead>
          <tbody>
            {rows.map(h=>(
              <tr key={h.id}>
                <td>{h.name}</td><td>{h.code||"-"}</td><td>{h.address||"-"}</td>
                <td style={{display:"flex",gap:8}}>
                  <button className="btn-ghost" onClick={()=>{setEditId(h.id); setF({name:h.name||"",code:h.code||"",address:h.address||""});}}>تعديل</button>
                  <button className="btn-danger" onClick={()=>window.confirm("حذف؟") && deleteHub(companyId,h.id)}>حذف</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="4">لا توجد مخازن بعد.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
