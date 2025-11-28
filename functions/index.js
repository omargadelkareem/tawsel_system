// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// تجديد اشتراك شركة — متاح فقط للسوبر أدمن
exports.setCompanySubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in required");
  }

  const db = admin.database();
  const uid = context.auth.uid;

  const roleSnap = await db.ref(`users/${uid}/role`).get();
  if (!roleSnap.exists() || roleSnap.val() !== "SUPER_ADMIN") {
    throw new functions.https.HttpsError("permission-denied", "Super admin only");
  }

  const { companyId, months = 1, seats = null, note = null } = data || {};
  if (!companyId || !months) {
    throw new functions.https.HttpsError("invalid-argument", "companyId, months required");
  }

  const compRef = db.ref(`companies/${companyId}`);
  const compSnap = await compRef.get();
  if (!compSnap.exists()) {
    throw new functions.https.HttpsError("not-found", "Company not found");
  }
  const comp = compSnap.val();

  const now = Date.now();
  const base = comp.expiresAt && comp.expiresAt > now ? comp.expiresAt : now;

  function addMonths(fromMs, m) {
    const d = new Date(fromMs);
    d.setMonth(d.getMonth() + Number(m || 0));
    return d.getTime();
  }

  const newExpires = addMonths(base, months);

  const updates = {
    [`companies/${companyId}/expiresAt`]: newExpires,
    [`companies/${companyId}/status`]: "ACTIVE",
    [`companies/${companyId}/updatedAt`]: admin.database.ServerValue.TIMESTAMP,
    [`billing/audit/${companyId}/${Date.now()}`]: {
      by: uid,
      months: Number(months),
      seats: seats != null ? Number(seats) : null,
      note: note || null,
      at: admin.database.ServerValue.TIMESTAMP,
      action: "extend"
    }
  };
  if (seats != null) updates[`companies/${companyId}/seats`] = Number(seats);

  await db.ref().update(updates);
  return { ok: true, newExpires };
});
