import { useEffect, useState } from "react";
import { watchCustomers } from "../../firebase";


export default function Customers(){
  const [rows, setRows] = useState([]);
  useEffect(()=> { const off = watchCustomers(setRows); return ()=>off && off(); }, []);
  return (
    <div className="page">
      <h2>قائمة العملاء</h2>
      <table border="1" cellPadding="6" style={{ borderCollapse:"collapse", width:"100%" }}>
        <thead><tr><th>الاسم</th><th>الهاتف</th><th>العنوان</th></tr></thead>
        <tbody>{rows.map(r=>(
          <tr key={r.id}><td>{r.name}</td><td>{r.phone}</td><td>{r.address}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}
