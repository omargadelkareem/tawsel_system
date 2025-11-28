import { useState } from "react";
import { useAuth } from "../Auth/AuthContext";
import { createCustomer } from "../../firebase";

export default function CustomerCreate() {
  const { user, profile } = useAuth();
  const companyId = profile?.companyId || "default";

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    username: "",    // جديد
    password: "",    // جديد
  });

  const [showPass, setShowPass] = useState(false);

  async function submit(e) {
    e.preventDefault();

    // تحقق بسيط
    if (!form.name || !form.phone || !form.username || !form.password) {
      alert("كل الحقول مطلوبة");
      return;
    }

    try {
      await createCustomer(
        {
          companyId,
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          username: form.username.trim().toLowerCase(),   // اسم المستخدم
          password: form.password,                        // كلمة المرور (بتتحفظ عادي، لو عايز تشفرها بعدين نقدر)
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
        },
        user
      );

      // إعادة تعيين النموذج
      setForm({ name: "", phone: "", address: "", username: "", password: "" });
      alert("تم إضافة العميل بنجاح! يمكنه الآن تسجيل الدخول باسم المستخدم وكلمة المرور");
    } catch (err) {
      console.error(err);
      alert("حصل خطأ، حاول تاني");
    }
  }

  return (
    <div className="page" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-4xl font-bold mb-10 text-center">إضافة عميل جديد</h2>

        <form onSubmit={submit} className="bg-gray-900 rounded-3xl p-10 shadow-2xl border border-gray-800">
          <div className="grid md:grid-cols-2 gap-6">
            {/* الاسم */}
            <div>
              <label className="block text-lg font-bold mb-2 text-gray-300">اسم العميل</label>
              <input
                type="text"
                placeholder="مثال: أحمد محمد"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-5 py-4 rounded-xl bg-gray-800 text-white text-lg focus:ring-4 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* الهاتف */}
            <div>
              <label className="block text-lg font-bold mb-2 text-gray-300">رقم الجوال</label>
              <input
                type="tel"
                placeholder="مثال: 01012345678"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-5 py-4 rounded-xl bg-gray-800 text-white text-lg focus:ring-4 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* اسم المستخدم */}
            <div>
              <label className="block text-lg font-bold mb-2 text-gray-300">اسم المستخدم (للدخول)</label>
              <input
                type="text"
                placeholder="مثال: ahmed2025"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full px-5 py-4 rounded-xl bg-gray-800 text-white text-lg focus:ring-4 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* كلمة المرور */}
            <div>
              <label className="block text-lg font-bold mb-2 text-gray-300">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="كلمة مرور قوية"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-5 py-4 rounded-xl bg-gray-800 text-white text-lg focus:ring-4 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPass ? "إخفاء" : "عرض"}
                </button>
              </div>
            </div>

            {/* العنوان */}
            <div className="md:col-span-2">
              <label className="block text-lg font-bold mb-2 text-gray-300">العنوان بالتفصيل</label>
              <textarea
                rows="3"
                placeholder="مثال: شقة 5، عمارة 10، شارع التحرير، الجيزة"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full px-5 py-4 rounded-xl bg-gray-800 text-white text-lg focus:ring-4 focus:ring-blue-500 focus:outline-none resize-none"
                required
              />
            </div>
          </div>

          {/* زر الحفظ */}
          <div className="mt-10 text-center">
            <button
              type="submit"
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-xl px-16 py-5 rounded-2xl shadow-2xl transform hover:scale-105 transition duration-300"
            >
              إضافة العميل الآن
            </button>
          </div>
        </form>

        {/* نصائح */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          بعد الإضافة، العميل يقدر يدخل التطبيق باستخدام:
          <br />
          <strong>اسم المستخدم</strong> و <strong>كلمة المرور</strong> اللي دخلتهم
        </div>
      </div>
    </div>
  );
}