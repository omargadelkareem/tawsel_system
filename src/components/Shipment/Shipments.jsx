import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";
import {
  watchShipments,
  watchCouriersByCompany,
  setStatusWithInventory,
} from "../../firebase";
import "./shipment.css";

const TABS = [
  { id: "new", label: "شحنات جديدة", status: "CREATED" },
  { id: "hub", label: "في المخزن", status: "AT_HUB" },
  { id: "out", label: "قيد التسليم", status: "OUT_FOR_DELIVERY" },
  { id: "done", label: "تم التسليم", status: "DELIVERED" },
  { id: "returned", label: "مرتجع", status: ["RETURNED_TO_HUB", "RETURNED"] },
  { id: "postponed", label: "مؤجل", status: "POSTPONED" },
];

export default function Shipments() {
  const { user, profile } = useAuth();
  const companyId = profile?.companyId;

  const [activeTab, setActiveTab] = useState("new");
  const [shipments, setShipments] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [selectedCourier, setSelectedCourier] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [depositing, setDepositing] = useState(false);

  // مودالات التأكيد
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnShipmentId, setReturnShipmentId] = useState(null);

  const [deliveryFilter, setDeliveryFilter] = useState("today");
  const [previousDate, setPreviousDate] = useState("");

  useEffect(() => {
    if (!companyId) return;
    const unsubShipments = watchShipments(setShipments);
    const unsubCouriers = watchCouriersByCompany(companyId, setCouriers);
    return () => {
      unsubShipments?.();
      unsubCouriers?.();
    };
  }, [companyId]);

  const filtered = useMemo(() => {
    let list = shipments;

    const tab = TABS.find((t) => t.id === activeTab);
    if (tab) {
      if (Array.isArray(tab.status)) {
        list = list.filter((s) => tab.status.includes(s.status));
      } else {
        list = list.filter((s) => s.status === tab.status);
      }
    }

    if (activeTab === "out") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (deliveryFilter === "today") {
        list = list.filter((s) => {
          const timeline = Array.isArray(s.timeline) ? s.timeline : [];
          const outEvent = timeline.find((t) => t.code === "OUT_FOR_DELIVERY");
          if (!outEvent?.at) return false;
          const outDate = new Date(outEvent.at);
          outDate.setHours(0, 0, 0, 0);
          return outDate.getTime() === today.getTime();
        });
      } else if (deliveryFilter === "previous" && previousDate) {
        const selected = new Date(previousDate);
        selected.setHours(0, 0, 0, 0);
        list = list.filter((s) => {
          const timeline = Array.isArray(s.timeline) ? s.timeline : [];
          const outEvent = timeline.find((t) => t.code === "OUT_FOR_DELIVERY");
          if (!outEvent?.at) return false;
          const outDate = new Date(outEvent.at);
          outDate.setHours(0, 0, 0, 0);
          return outDate.getTime() === selected.getTime();
        });
      }
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.reference || "").toLowerCase().includes(term) ||
          (s.pickup?.name || "").toLowerCase().includes(term) ||
          (s.dropoff?.name || "").toLowerCase().includes(term) ||
          (s.dropoff?.phone || "").includes(search)
      );
    }

    return list;
  }, [shipments, activeTab, search, deliveryFilter, previousDate]);

  // إيداع في المخزن
  const handleDeposit = async () => {
    setDepositing(true);
    let success = 0;
    for (const id of selected) {
      try {
        await setStatusWithInventory({
          companyId,
          shipmentId: id,
          status: "AT_HUB",
          currentUser: user,
          note: "إيداع في المخزن",
        });
        success++;
      } catch (e) {
        console.error(e);
      }
    }
    setDepositing(false);
    setShowDepositModal(false);
    setSelected(new Set());
    alert(`تم إيداع ${success} شحنة بنجاح`);
  };

  // تعيين مندوب
  const handleAssign = async () => {
    setAssigning(true);
    let success = 0;
    for (const id of selected) {
      try {
        await setStatusWithInventory({
          companyId,
          shipmentId: id,
          status: "OUT_FOR_DELIVERY",
          assignedDriverId: selectedCourier,
          currentUser: user,
        });
        success++;
      } catch (e) {
        console.error(e);
      }
    }
    setAssigning(false);
    setShowAssignModal(false);
    setSelected(new Set());
    setSelectedCourier("");
    alert(`تم إرسال ${success} شحنة للتسليم`);
  };

  // إرجاع للمخزن
  const handleReturn = async () => {
    if (!returnShipmentId) return;
    try {
      await setStatusWithInventory({
        companyId,
        shipmentId: returnShipmentId,
        status: "AT_HUB",
        currentUser: user,
        note: "إرجاع من التسليم",
      });
      alert("تم إرجاع الشحنة بنجاح");
    } catch (e) {
      alert("فشل الإرجاع");
    }
    setShowReturnModal(false);
    setReturnShipmentId(null);
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === filtered.length && filtered.length > 0
        ? new Set()
        : new Set(filtered.map((s) => s.id))
    );
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
        {TABS.map((tab) => {
          const count = shipments.filter((s) =>
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

      {/* فلتر قيد التسليم */}
      {activeTab === "out" && (
        <div className="action-bar mb-6 p-5 bg-gray-900 rounded-2xl">
          <div className="flex flex-wrap items-center gap-8">
            <label className="flex items-center gap-3 text-lg cursor-pointer">
              <input type="radio" name="df" checked={deliveryFilter === "today"} onChange={() => setDeliveryFilter("today")} />
              اليوم
            </label>
            <label className="flex items-center gap-3 text-lg cursor-pointer">
              <input type="radio" name="df" checked={deliveryFilter === "previous"} onChange={() => setDeliveryFilter("previous")} />
              تاريخ سابق
            </label>
            {deliveryFilter === "previous" && (
              <input
                type="date"
                value={previousDate}
                onChange={(e) => setPreviousDate(e.target.value)}
                className="px-6 py-3 rounded-xl bg-gray-800 text-white"
              />
            )}
          </div>
        </div>
      )}

      {/* شريط الإجراءات */}
      <div className="action-bar mb-6">
        <div className="flex flex-wrap items-center gap-6">
          <input
            type="text"
            className="search-input"
            placeholder="ابحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* شحنات جديدة */}
          {activeTab === "new" && selected.size > 0 && (
            <>
              <span className="text-lg font-bold text-white">محدد: {selected.size}</span>
              <button
                onClick={() => setShowDepositModal(true)}
                disabled={depositing}
                className="bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-xl font-bold text-white shadow-lg"
              >
                {depositing ? "جاري..." : "إيداع في المخزن"}
              </button>
            </>
          )}

          {/* في المخزن */}
          {activeTab === "hub" && selected.size > 0 && (
            <>
              <span className="text-lg font-bold text-white">محدد: {selected.size}</span>
              <select
                value={selectedCourier}
                onChange={(e) => setSelectedCourier(e.target.value)}
                className="px-6 py-4 rounded-xl bg-gray-800 text-white"
              >
                <option value="">اختر المندوب</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.vehicle && `(${c.vehicle})`}
                  </option>
                ))}
              </select>
              <button
                onClick={() => selectedCourier && setShowAssignModal(true)}
                disabled={!selectedCourier || assigning}
                className="bg-green-600 hover:bg-green-700 px-8 py-4 rounded-xl font-bold text-white shadow-lg"
              >
                {assigning ? "جاري..." : "إرسال للتسليم"}
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
              {(activeTab === "new" || activeTab === "hub") && <th></th>}
              <th>المرجع</th>
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
            {filtered.map((s) => (
              <tr key={s.id} className={selected.has(s.id) ? "selected" : ""}>
                {(activeTab === "new" || activeTab === "hub") && (
                  <td className="text-center">
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} />
                  </td>
                )}
                <td className="font-bold text-blue-400">{s.reference || s.id.slice(-8)}</td>
                <td>{s.dropoff?.name || "-"}</td>
                <td>{s.dropoff?.phone || "-"}</td>
                <td className="truncate max-w-xs">{s.dropoff?.address || "-"}</td>
                <td className="font-bold">{s.charges?.total || "-"} ج.م</td>
                <td><StatusBadge status={s.status} /></td>
                <td>{s.assignedDriverName || "-"}</td>
                <td className="space-x-2">
                  <Link to={`/awb/${s.id}`} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-bold">
                    بوليصة
                  </Link>

                  {activeTab === "new" && (
                    <button
                      onClick={() => {
                        setSelected(new Set([s.id]));
                        setShowDepositModal(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
                    >
                      إيداع
                    </button>
                  )}

                  {["out", "done"].includes(activeTab) && (
                    <button
                      onClick={() => {
                        setReturnShipmentId(s.id);
                        setShowReturnModal(true);
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
                    >
                      إرجاع للمخزن
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* مودال إيداع في المخزن */}
      {showDepositModal && (
        <div className="modal-backdrop" onClick={() => setShowDepositModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-3xl font-bold mb-6 text-purple-400">إيداع في المخزن</h3>
            <p className="text-xl mb-8">هل تريد إيداع <strong>{selected.size}</strong> شحنة في المخزن؟</p>
            <div className="flex justify-center gap-6">
              <button onClick={() => setShowDepositModal(false)} className="px-10 py-4 bg-gray-700 rounded-xl text-xl">إلغاء</button>
              <button onClick={handleDeposit} disabled={depositing} className="px-10 py-4 bg-purple-600 hover:bg-purple-700 rounded-xl text-xl font-bold">
                {depositing ? "جاري..." : "نعم، إيداع"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال تعيين مندوب */}
      {showAssignModal && (
        <div className="modal-backdrop" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-3xl font-bold mb-6 text-green-400">إرسال للتسليم</h3>
            <p className="text-xl mb-8">إرسال <strong>{selected.size}</strong> شحنة للمندوب اليوم؟</p>
            <div className="flex justify-center gap-6">
              <button onClick={() => setShowAssignModal(false)} className="px-10 py-4 bg-gray-700 rounded-xl text-xl">إلغاء</button>
              <button onClick={handleAssign} disabled={assigning} className="px-10 py-4 bg-green-600 hover:bg-green-700 rounded-xl text-xl font-bold">
                {assigning ? "جاري..." : "نعم، أرسل"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال إرجاع شحنة */}
      {showReturnModal && (
        <div className="modal-backdrop" onClick={() => setShowReturnModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-3xl font-bold mb-6 text-orange-400">إرجاع للمخزن</h3>
            <p className="text-xl mb-8">هل تريد إرجاع هذه الشحنة إلى المخزن؟</p>
            <div className="flex justify-center gap-6">
              <button onClick={() => setShowReturnModal(false)} className="px-10 py-4 bg-gray-700 rounded-xl text-xl">إلغاء</button>
              <button onClick={handleReturn} className="px-10 py-4 bg-orange-600 hover:bg-orange-700 rounded-xl text-xl font-bold">
                نعم، إرجاع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const labels = {
    CREATED: "جديدة", AT_HUB: "في المخزن", OUT_FOR_DELIVERY: "قيد التسليم",
    DELIVERED: "تم التسليم", RETURNED_TO_HUB: "مرتجع", RETURNED: "مرتجع", POSTPONED: "مؤجل"
  };
  const colors = {
    CREATED: "bg-blue-600", AT_HUB: "bg-purple-600", OUT_FOR_DELIVERY: "bg-orange-600",
    DELIVERED: "bg-green-600", RETURNED_TO_HUB: "bg-red-600", RETURNED: "bg-red-600", POSTPONED: "bg-gray-600"
  };
  return <span className={`badge ${colors[status] || "bg-gray-700"}`}>{labels[status] || status}</span>;
}