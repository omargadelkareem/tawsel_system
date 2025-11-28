import { useEffect, useState } from "react";
import { useAuth } from "../Auth/AuthContext";
import { watchShipments } from "../../firebase";

export default function Dashboard() {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const off = watchShipments(setRows);
    return () => off && off();
  }, []);

  const delivered = rows.filter(r => r.status === "DELIVERED").length;
  const inTransit = rows.filter(r => r.status === "IN_TRANSIT").length;
  const created = rows.filter(r => r.status === "CREATED").length;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        لوحة التحكم — الشركة:{" "}
        <span style={{ color: "#2a4d8f" }}>{profile?.companyId || "default"}</span>
      </h2>

      <div style={styles.grid}>
        <Card title="جديدة" count={created} color="#2a9df4" emoji="📦" />
        <Card title="قيد النقل" count={inTransit} color="#f4c542" emoji="🚚" />
        <Card title="تم التسليم" count={delivered} color="#4caf50" emoji="✅" />
      </div>
    </div>
  );
}

function Card({ title, count, color, emoji }) {
  return (
    <div style={{ ...styles.card, borderLeft: `6px solid ${color}` }}>
      <div style={styles.cardContent}>
        <div style={{ fontSize: "24px", marginRight: "10px" }}>{emoji}</div>
        <div>
          <div style={styles.cardTitle}>{title}</div>
          <div style={styles.cardNumber}>{count}</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    backgroundColor: "#f8f9fa",
    minHeight: "100vh",
    fontFamily: "sans-serif",
  },
  title: {
    fontSize: "24px",
    marginBottom: "24px",
    color: "#1e1e1e",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    transition: "transform 0.2s",
  },
  cardContent: {
    display: "flex",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: "16px",
    color: "#666",
  },
  cardNumber: {
    fontSize: "22px",
    fontWeight: "bold",
    color: "#333",
  },
};
