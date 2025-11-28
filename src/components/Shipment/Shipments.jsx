import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";
import {
  watchShipments,
  watchCouriersByCompany,    // الصحيحة
  setStatusWithInventory,
} from "../../firebase";
import "./shipment.css";

const TABS = [
  { id: "new", label: "شحنات جديدة", status: "CREATED" },
  { id: "hub", label: "في المخزن", status: "AT_HUB" },
  { id: "ready", label: "جاهزة للتسليم", status: "ASSIGNED" },
  { id: "out", label: "قيد التسليم", status: "OUT_FOR_DELIVERY" },
  { id: "done", label: "تم التسليم", status: "DELIVERED" },
 
  { id: "returned", label: "مرتجع", status: ["RETURNED_TO_HUB", "RETURNED"] },
  { id: "postponed", label: "مؤجل", status: "POSTPONED" },
];

export default function Shipments() {
  {
  const { user, profile } = useAuth();

  // مهم جدًا: ما نستخدمش "default" هنا
  const companyId = profile?.companyId;

  const [activeTab, setActiveTab] = useState("new");
  const [shipments, setShipments] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [selectedCourier, setSelectedCourier] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // جلب البيانات
  useEffect(() => {
    if (!companyId) {
      console.warn("لا يوجد companyId → المندوبين والشحنات مش هتظهر");
      setCouriers([]);
      setShipments([]);
      return;
    }

    const unsubShipments = watchShipments(setShipments);
    const unsubCouriers = watchCouriersByCompany(companyId, setCouriers); // الصحيح

    return () => {
      unsubShipments?.();
      unsubCouriers?.();
    };
  }, [companyId]);

  // الفلترة
  const filtered = useMemo(() => {
    let list = shipments;

    const tab = TABS.find(t => t.id === activeTab);
    if (tab) {
      if (Array.isArray(tab.status)) {
        list = list.filter(s => tab.status.includes(s.status));
      } else {
        list = list.filter(s => s.status === tab.status);
      }
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(s =>
        (s.reference || "").toLowerCase().includes(term) ||
        (s.pickup?.name || "").toLowerCase().includes(term) ||
        (s.dropoff?.name || "").toLowerCase().includes(term) ||
        (s.dropoff?.phone || "").includes(search)
      );
    }

    return list;
  }, [shipments, activeTab, search]);

  const toggleAll = () => {
    setSelected(prev =>
      prev.size === filtered.length && filtered.length > 0
        ? new Set()
        : new Set(filtered.map(s => s.id))
    );
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAssign = () => {
    if (selected.size === 0) return alert("اختر شحنة واحدة على الأقل");
    if (!selectedCourier) return alert("اختر المندوب أولًا");
    setShowModal(true);
  };

  const executeAssign = async () => {
    setAssigning(true);
    let success = 0, failed = 0;

    for (const id of selected) {
      try {
        await setStatusWithInventory({
          companyId,
          shipmentId: id,
          status: "ASSIGNED",
          assignedDriverId: selectedCourier,
          currentUser: user,
        });
        success++;
      } catch (e) {
        console.error("فشل تعيين شحنة:", id, e);
        failed++;
      }
    }

    setAssigning(false);
    setShowModal(false);
    setSelected(new Set());
    setSelectedCourier("");

    alert(
      success > 0
        ? `تم تعيين ${success} شحنة بنجاح${failed > 0 ? `، فشل ${failed}` : ""}`
        : "فشل تعيين كل الشحنات"
    );
  };

  return (
    <div className="page" dir="rtl">
      {/* العنوان */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-bold">الشحنات</h2>
        <div className="text-xl text-gray-400">
          الكل: {shipments.length} | معروض: {filtered.length}
        </div>
      </div>

      {/* التبويبات */}
      <div className="tabs">
        {TABS.map(tab => {
          const count = shipments.filter(s =>
            Array.isArray(tab.status) ? tab.status.includes(s.status) : s.status === tab.status
          ).length;

          return (
            <div
              key={tab.id}
              className={`tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => {
                setActiveTab(tab.id);
                setSelected(new Set());
              }}
            >
              <span className="count">{count}</span>
              {tab.label}
            </div>
          );
        })}
      </div>

      {/* شريط الإجراءات */}
      <div className="action-bar">
        <div className="flex flex-wrap items-center gap-6">
          <input
            className="search-input"
            placeholder="ابحث بالمرجع، العميل، الجوال..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <label className="flex items-center gap-3 text-lg cursor-pointer">
            <input
              type="checkbox"
              checked={selected.size === filtered.length && filtered.length > 0}
              onChange={toggleAll}
              className="w-6 h-6 rounded"
            />
            تحديد الكل ({selected.size})
          </label>

          {selected.size > 0 && (
            <>
              <select
                className="select-courier"
                value={selectedCourier}
                onChange={e => setSelectedCourier(e.target.value)}
              >
                <option value="">
                  {couriers.length === 0 ? "جاري تحميل المندوبين..." : "اختر المندوب"}
                </option>
                {couriers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.vehicle ? `(${c.vehicle})` : ""}
                  </option>
                ))}
              </select>

              <button
                onClick={openAssign}
                disabled={!selectedCourier || assigning}
                className="btn-large btn-success"
              >
                {assigning ? "جاري..." : `تعيين ${selected.size} شحنة`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* الجدول */}
      <div className="table-container">
        <table className="table w-full">
          <thead>
            <tr>
              <th><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
              <th>المرجع</th>
              <th>المرسل</th>
              <th>المستلم</th>
              <th>الجوال</th>
              <th>العنوان</th>
              <th>السعر</th>
              <th>الحالة</th>
              <th>المندوب</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className={selected.has(s.id) ? "selected" : ""}>
                <td className="text-center">
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} />
                </td>
                <td className="font-bold text-blue-400">
                  {s.reference || s.id.slice(-8)}
                </td>
                <td>{s.pickup?.name || "-"}</td>
                <td>{s.dropoff?.name || "-"}</td>
                <td>{s.dropoff?.phone || "-"}</td>
                <td className="truncate max-w-xs">{s.dropoff?.address || "-"}</td>
                <td className="font-bold">
                  {s.charges?.total || "-"} {s.charges?.currency || "ج.م"}
                </td>
                <td><StatusBadge status={s.status} /></td>
                <td>{s.assignedDriverName || "-"}</td>
                <td>
                  <Link
                    to={`/awb/${s.id}`}
                    className="bg-gray-800 hover:bg-gray-700 px-5 py-2 rounded-lg text-sm font-bold"
                  >
                    بوليصة
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-2xl text-gray-500">
            لا توجد شحنات في هذا القسم
          </div>
        )}
      </div>

      {/* مودال التأكيد */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="text-3xl font-bold mb-6">تأكيد تعيين المندوب</h3>
            <p className="text-xl mb-8">
              تعيين <span className="text-green-400 text-5xl font-bold">{selected.size}</span> شحنة؟
            </p>
            <div className="flex justify-center gap-8">
              <button
                onClick={() => setShowModal(false)}
                className="px-10 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl text-xl font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={executeAssign}
                disabled={assigning}
                className="btn-large btn-success"
              >
                {assigning ? "جاري..." : "نعم، عيّن"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// حالة الشحنة - الـ badge صغير وجميل
function StatusBadge({ status }) {
  const map = {
    CREATED: "badge-new",
    AT_HUB: "badge-hub",
    ASSIGNED: "badge-ready",
    OUT_FOR_DELIVERY: "badge-out",
    DELIVERED: "badge-done",
    RETURNED_TO_HUB: "badge-returned",
    RETURNED: "badge-returned",
    POSTPONED: "badge-postponed",
  };

  const labels = {
    CREATED: "جديدة",
    AT_HUB: "في المخزن",
    ASSIGNED: "جاهزة",
    OUT_FOR_DELIVERY: "قيد التسليم",
    DELIVERED: "تم التسليم",
    RETURNED_TO_HUB: "مرتجع",
    RETURNED: "مرتجع",
    POSTPONED: "مؤجل",
  };

  return (
    <span className={`badge ${map[status] || "bg-gray-700"}`}>
      {labels[status] || status}
    </span>
  );
} }