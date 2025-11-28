import { useEffect, useState } from "react";
import { useAuth } from "../Auth/AuthContext";
import { watchZones, createZone, updateZone, deleteZone } from "../../firebase";

export default function Zones(){
  const { profile } = useAuth();
  const companyId = profile?.companyId || "default";

  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ name:"", code:"", pricePerZone:"" });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const off = watchZones(companyId, setRows);
    return () => off && off();
  }, [companyId]);

  async function save(e){
    e.preventDefault();
    if (!f.name) return alert("اكتب اسم المنطقة");
    if (editId) {
      await updateZone(companyId, editId, { ...f, pricePerZone: Number(f.pricePerZone || 0) });
      setEditId(null);
    } else {
      await createZone(companyId, { ...f, pricePerZone: Number(f.pricePerZone || 0) });
    }
    setF({ name:"", code:"", pricePerZone:"" });
  }

  function onEdit(z){ setEditId(z.id); setF({ name:z.name||"", code:z.code||"", pricePerZone:z.pricePerZone||"" }); }
  async function onDelete(id){ if (window.confirm("حذف المنطقة؟")) await deleteZone(companyId, id); }

  return (
    <div className="page">
      <h2>المناطق (Zones)</h2>

      <form onSubmit={save} className="card form-grid form-3 gap-3" style={{maxWidth:900}}>
        <div>
          <label>اسم المنطقة</label>
          <input value={f.name} onChange={e=>setF(s=>({...s,name:e.target.value}))}/>
        </div>
        <div>
          <label>كود (اختياري)</label>
          <input value={f.code} onChange={e=>setF(s=>({...s,code:e.target.value}))}/>
        </div>
        <div>
          <label>سعر المنطقة (ثابت للشحنة)</label>
          <input type="number" step="0.01" value={f.pricePerZone} onChange={e=>setF(s=>({...s,pricePerZone:e.target.value}))}/>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          <button className="btn">{editId ? "تحديث" : "إضافة منطقة"}</button>
          {editId && <button type="button" className="btn-ghost" onClick={()=>{setEditId(null); setF({name:"",code:"",pricePerZone:""});}}>إلغاء</button>}
        </div>
      </form>

      <div className="table-wrap" style={{marginTop:12}}>
        <table className="table">
          <thead><tr><th>الاسم</th><th>الكود</th><th>سعر المنطقة</th><th></th></tr></thead>
          <tbody>
            {rows.map(z=>(
              <tr key={z.id}>
                <td>{z.name}</td>
                <td>{z.code || "-"}</td>
                <td>{z.pricePerZone ?? 0}</td>
                <td>
                  <div style={{display:"flex", gap:8}}>
                    <button className="btn-ghost" onClick={()=>onEdit(z)}>تعديل</button>
                    <button className="btn-danger" onClick={()=>onDelete(z.id)}>حذف</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="4">لا توجد مناطق بعد.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
