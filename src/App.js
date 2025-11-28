// src/App.jsx
import { Routes, Route, NavLink, useLocation, Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "./components/Auth/AuthContext";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import Login from "./components/login/login";
import Dashboard from "./components/Dashboard/Dashboard";
import Shipments from "./components/Shipment/Shipments";
import ShipmentCreate from "./components/Shipment/ShipmentCreate";
import Customers from "./components/Customers/Customers";
import CustomerCreate from "./components/Customers/CustomerCreate";
import Couriers from "./components/Courier/Couriers";
import CourierCreate from "./components/Courier/CourierCreate";
import Reports from "./components/Reports/Reports";
import Settings from "./components/Settings/Settings";
import ThemeToggle from "./components/ThemeToggle";
import Zones from "./components/Zones/Zones";
import DriverApp from "./components/Driver/DriverApp";
import DispatchMap from "./components/DispatchMap/DispatchMap";
import Hubs from "./components/Hubs/Hubs";
import Warehouse from "./components/Hubs/Warehouse";
import AWB from "./components/AWB/AWB";
import Header from "./components/Header/Header";
import AdminCompanies from "./components/Admin/Companies";


export default function App() {
  const { user, profile, logout } = useAuth();
  const [open, setOpen] = useState(false);

    const location = useLocation();

  // يظهر الشِل فقط لو فيه مستخدم ومساره مش login/unauthorized
  const showShell = Boolean(user) && !["/login","/unauthorized"].includes(location.pathname);

  return (
    <div className={`layout ${ showShell&& open ? "open" : ""} ${!showShell ? "no-shell" : ""}`}>
      {/* Topbar */}
    
      <header className="topbar">
        <button className="menu-btn" onClick={()=>setOpen(o=>!o)}>☰</button>
        <div className="grow" />
        {user ? (
          <div className="userbox">
           
               <Header />
          </div>
        ) : null}
      </header>

      {/* Sidebar */}
     {/* Sidebar */}
      {showShell && (
        <aside className="sidebar">
          <div className="logo">Tawsel</div>
          <ThemeToggle />
          <nav className="nav">
            <NavLink to="/" end>لوحة التحكم</NavLink>

            <div className="section">الشحنات</div>
            <NavLink to="/shipments/new">إضافة شحنة</NavLink>
            <NavLink to="/shipments">قائمة الشحنات</NavLink>
          

            <div className="section">العملاء</div>
            <NavLink to="/customers/new">إضافة عميل</NavLink>
            <NavLink to="/customers">قائمة العملاء</NavLink>

            <div className="section">المندوبون</div>
            <NavLink to="/couriers/new">إضافة مندوب</NavLink>
            <NavLink to="/couriers">قائمة المندوبين</NavLink>
            <NavLink to="/dispatch-map">خريطة التوزيع</NavLink>
<NavLink to="/driver-app">Driver App (اختبار)</NavLink>


            <div className="section">إداري</div>
            <NavLink to="/zones">المناطق (Zones)</NavLink>
            <NavLink to="/hubs">المخازن</NavLink>
            <NavLink to="/warehouse">المخزن</NavLink>

            


            <NavLink to="/reports">التقارير</NavLink>
            <NavLink to="/settings">الإعدادات</NavLink>
          </nav>
        </aside>
      )}


      {/* Content */}
      <main className="content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<div className="page p">غير مصرح</div>} />

          <Route path="/" element={
            <ProtectedRoute roles={["ADMIN"]}><Dashboard /></ProtectedRoute>
          } />
          <Route path="/shipments" element={
            <ProtectedRoute roles={["ADMIN"]}><Shipments /></ProtectedRoute>
          } />
          <Route path="/shipments/new" element={
            <ProtectedRoute roles={["ADMIN"]}><ShipmentCreate /></ProtectedRoute>
          } />
          <Route path="/customers" element={
            <ProtectedRoute roles={["ADMIN"]}><Customers /></ProtectedRoute>
          } />
          <Route path="/warehouse" element={<ProtectedRoute roles={["ADMIN","DISPATCHER"]}><Warehouse/></ProtectedRoute>} />
          <Route path="/customers/new" element={
            <ProtectedRoute roles={["ADMIN"]}><CustomerCreate /></ProtectedRoute>
          } />
          <Route path="/couriers" element={
            <ProtectedRoute roles={["ADMIN"]}><Couriers /></ProtectedRoute>
          } />
          <Route path="/couriers/new" element={
            <ProtectedRoute roles={["ADMIN"]}><CourierCreate /></ProtectedRoute>
          } />
          <Route path="/hubs" element={<ProtectedRoute roles={["ADMIN","DISPATCHER"]}><Hubs/></ProtectedRoute>} />
          <Route path="/zones" element={<ProtectedRoute roles={["ADMIN"]}><Zones /></ProtectedRoute>} />
          <Route path="/driver-app" element={
  <ProtectedRoute roles={["DRIVER","ADMIN"]}><DriverApp /></ProtectedRoute>
} />
<Route path="/dispatch-map" element={
  <ProtectedRoute roles={["ADMIN","DISPATCHER"]}><DispatchMap /></ProtectedRoute>
} />
        <Route path="/awb/:id" element={<ProtectedRoute roles={["ADMIN","DISPATCHER"]}><AWB/></ProtectedRoute>} />

          <Route path="/reports" element={
            <ProtectedRoute roles={["ADMIN"]}><Reports /></ProtectedRoute>
          } />

          <Route path="/admin/companies" element={
  <ProtectedRoute roles={["SUPER_ADMIN"]}>
    <AdminCompanies/>
  </ProtectedRoute>
}/>
          <Route path="/settings" element={
            <ProtectedRoute roles={["ADMIN"]}><Settings /></ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}
