// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut
} from "firebase/auth";

import {
  getDatabase,
  ref,
  push,
  set,
  update,
  onValue,
  get,
  child,
  query,
  orderByChild,
  equalTo,
  serverTimestamp,
  remove
} from "firebase/database";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

// ================= Firebase Config =================
const firebaseConfig = {
  apiKey: "AIzaSyDaDlo0oaetJVVXC9k1Slvs7iIMKTH5VQs",
  authDomain: "tawsel-d2076.firebaseapp.com",
  databaseURL: "https://tawsel-d2076-default-rtdb.firebaseio.com",
  projectId: "tawsel-d2076",
  storageBucket: "tawsel-d2076.appspot.com",
  messagingSenderId: "343398356383",
  appId: "1:343398356383:web:8104debf767cbc7b9559aa",
  measurementId: "G-DR7VVDY5RH"
};

const app = initializeApp(firebaseConfig);
let analytics;
analyticsSupported().then(ok => { if (ok) analytics = getAnalytics(app); });

// ================ Core Services & Auth helpers ================
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export const logout = () => signOut(auth);

export const onAuth = (cb) => onAuthStateChanged(auth, cb);
export const sendReset = (email) => sendPasswordResetEmail(auth, email);

// ===== User profile =====
export function watchUserProfile(uid, cb) {
  return onValue(ref(rtdb, `users/${uid}`), (snap) => cb(snap.val() || null));
}
async function readUserProfile(uid) {
  const snap = await get(child(ref(rtdb), `users/${uid}`));
  return snap.exists() ? snap.val() : null;
}
async function ensureUserProfile(uid, defaults) {
  const nodeRef = ref(rtdb, `users/${uid}`);
  const snap = await get(nodeRef);
  if (!snap.exists()) {
    await set(nodeRef, { ...defaults, createdAt: serverTimestamp() });
    return defaults;
  }
  return snap.val();
}

// ================ Admin Email/Password ================
export async function adminSignUp(email, password, displayName = "Admin") {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  await set(ref(rtdb, `users/${cred.user.uid}`), {
    email,
    displayName: displayName || cred.user.displayName || "Admin",
    role: "ADMIN",
    companyId: "default",
    createdAt: serverTimestamp()
  });
  return cred.user;
}

export async function adminSignIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  let profile = await readUserProfile(cred.user.uid);
  if (!profile) {
    profile = await ensureUserProfile(cred.user.uid, {
      email: cred.user.email,
      displayName: cred.user.displayName || "Admin",
      role: "ADMIN",
      companyId: "default"
    });
  }
  if (profile?.role !== "ADMIN" && profile?.role !== "SUPER_ADMIN") {
    throw new Error("هذا الحساب ليس أدمن.");
  }
  await update(ref(rtdb, `users/${cred.user.uid}`), { lastLoginAt: serverTimestamp() });
  return cred.user;
}

export async function requireAdmin() {
  const u = auth.currentUser;
  if (!u) throw new Error("غير مسجّل الدخول");
  const p = await readUserProfile(u.uid);
  if (!p || (p.role !== "ADMIN" && p.role !== "SUPER_ADMIN")) throw new Error("صلاحيات غير كافية");
  return { user: u, profile: p };
}

// ===================== Shipments =====================
export async function createShipment(data, currentUser) {
  const newRef = push(ref(rtdb, "shipments"));
  const id = newRef.key;
  const base = {
    ...data,
    status: "CREATED",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    reference: null
  };
  await set(newRef, base);
  const tlKey = push(ref(rtdb, `shipments/${id}/timeline`)).key;
  await set(ref(rtdb, `shipments/${id}/timeline/${tlKey}`), {
    at: serverTimestamp(), by: currentUser?.uid || "system", code: "CREATED", note: "Shipment created"
  });
  const short = (id || "").slice(0,6).toUpperCase();
  await update(ref(rtdb, `shipments/${id}`), { reference: `AWB-${new Date().getFullYear()}-${short}` });
  return id;
}

export function watchShipments(cb) {
  return onValue(ref(rtdb, "shipments"), (snap) => {
    const v = snap.val() || {};
    const rows = Object.entries(v).map(([id, s]) => ({ id, ...s }));
    rows.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    cb(rows);
  });
}

export function watchCompanyShipments(companyId, cb) {
  const qRef = query(ref(rtdb, "shipments"), orderByChild("companyId"), equalTo(companyId));
  return onValue(qRef, (snap) => {
    const v = snap.val() || {};
    const rows = Object.entries(v).map(([id, s]) => ({ id, ...s }));
    rows.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    cb(rows);
  });
}

// اسم بديل مريح للاستخدام
export const watchShipmentsByCompany = watchCompanyShipments;

export async function updateShipment(id, patch, currentUser) {
  await update(ref(rtdb, `shipments/${id}`), { ...patch, updatedAt: serverTimestamp() });
  if (patch?.status) {
    const key = push(ref(rtdb, `shipments/${id}/timeline`)).key;
    await set(ref(rtdb, `shipments/${id}/timeline/${key}`), {
      at: serverTimestamp(), by: currentUser?.uid || "system", code: patch.status, note: patch?.note || null
    });
  }
}
export const setShipmentStatus = (id, status, currentUser, note) =>
  updateShipment(id, { status, note: note || null }, currentUser);

export async function getShipment(id) {
  const snap = await get(ref(rtdb, `shipments/${id}`));
  return snap.exists() ? { id, ...snap.val() } : null;
}

// ===================== Customers =====================
export async function createCustomer(data, currentUser) {
  const newRef = push(ref(rtdb, "customers"));
  await set(newRef, { ...data, createdAt: serverTimestamp(), createdBy: currentUser?.uid || "system" });
  return newRef.key;
}
export function watchCustomers(cb) {
  return onValue(ref(rtdb, "customers"), (snap) => {
    const v = snap.val() || {};
    const rows = Object.entries(v).map(([id, s]) => ({ id, ...s }));
    rows.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    cb(rows);
  });
}
export function watchCustomersByCompany(companyId, cb) {
  const qRef = query(ref(rtdb, "customers"), orderByChild("companyId"), equalTo(companyId));
  return onValue(qRef, (snap) => {
    const v = snap.val() || {};
    const rows = Object.entries(v).map(([id, s]) => ({ id, ...s }));
    cb(rows);
  });
}

// ===================== Couriers =====================
export async function createCourier(data, currentUser) {
  const newRef = push(ref(rtdb, "couriers"));
  await set(newRef, { ...data, online: false, createdAt: serverTimestamp(), createdBy: currentUser?.uid || "system" });
  return newRef.key;
}
export function watchCouriers(cb) {
  return onValue(ref(rtdb, "couriers"), (snap) => {
    const v = snap.val() || {};
    const rows = Object.entries(v).map(([id, s]) => ({ id, ...s }));
    rows.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    cb(rows);
  });
}
export function watchCouriersByCompany(companyId, cb) {
  const qRef = query(ref(rtdb, "couriers"), orderByChild("companyId"), equalTo(companyId));
  return onValue(qRef, (snap) => {
    const v = snap.val() || {};
    const rows = Object.entries(v).map(([id, s]) => ({ id, ...s }));
    cb(rows);
  });
}

// ===================== Company Settings =====================
export function watchCompanySettings(companyId, cb) {
  return onValue(ref(rtdb, `companies/${companyId}`), (snap) => cb(snap.val() || null));
}
export async function saveCompanySettings(companyId, data, currentUser) {
  await update(ref(rtdb, `companies/${companyId}`), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy: currentUser?.uid || "system"
  });
}

// ===================== Reports helpers =====================
export function watchShipmentsByDateRange(startMs, endMs, cb) {
  const qRef = query(
    ref(rtdb, "shipments"),
    orderByChild("createdAt"),
    // startAt/endAt: نستوردهم ضمن query مباشرة بإصدارات جديدة؟ هنا نستخدم قيم مباشرة:
    // في RTDB Web v9، startAt/endAt تُمرَّر كأرجومنتس للدوال (لكننا استغنينا لتبسيطك).
  );
  // بديل بسيط: هنجيب كل الشركة وتفلتر على الواجهة لو حابب، أو اتركها معلّقة لو مش محتاجها الآن.
  return onValue(qRef, (snap) => {
    const v = snap.val() || {};
    const rows = Object.entries(v).map(([id, s]) => ({ id, ...s }));
    rows.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    cb(rows);
  });
}

// ===================== Pricing =====================
export function priceShipmentLocal({ settings, weightKg = 0, distanceKm = 0, isCOD = false, codAmount = 0 }) {
  const cur = settings?.pricing?.currency || "USD";
  const basePerKg = Number(settings?.pricing?.basePerKg ?? 1.5);
  const basePerKm = Number(settings?.pricing?.basePerKm ?? 0.4);
  const surcharge = Number(settings?.pricing?.surcharge ?? 0);
  const codFeePct = Number(settings?.pricing?.codFeePct ?? 0);
  const weight = weightKg * basePerKg;
  const distance = distanceKm * basePerKm;
  const fuel = surcharge;
  const codFee = isCOD ? (codAmount * codFeePct) / 100 : 0;
  const total = Math.round((weight + distance + fuel + codFee) * 100) / 100;
  return { currency: cur, breakdown: { weight, distance, fuel, codFee }, total };
}

// ===================== Auto-Assign =====================
export async function autoAssignCourier(companyId) {
  const snap = await get(ref(rtdb, "couriers"));
  if (!snap.exists()) return null;
  const list = Object.entries(snap.val() || {})
    .map(([id,v]) => ({ id, ...v }))
    .filter(c => c.companyId === companyId && c.online);
  if (!list.length) return null;
  list.sort((a,b) => (a.assignedCount||0) - (b.assignedCount||0));
  return list[0].id;
}

export async function autoAssignCourierAdvanced(companyId, preferredZone = null) {
  const snap = await get(ref(rtdb, "couriers"));
  if (!snap.exists()) return null;
  const list = Object.entries(snap.val() || {})
    .map(([id, v]) => ({ id, ...v }))
    .filter(c => c.companyId === companyId && c.online);
  if (!list.length) return null;
  const score = (c) => {
    let s = 0;
    if (preferredZone && c.zone === preferredZone) s -= 5;
    s += (c.assignedCount || 0);
    return s;
  };
  list.sort((a, b) => score(a) - score(b));
  return list[0].id;
}

export async function bumpCourierLoad(courierUid, delta = 1) {
  const node = ref(rtdb, `couriers/${courierUid}`);
  const s = await get(node);
  const cur = s.exists() ? (s.val().assignedCount || 0) : 0;
  await update(node, { assignedCount: Math.max(0, cur + delta) });
}

// ===================== COD Ledger =====================
export async function codCollect(companyId, shipmentId, amount, currency, byUid) {
  const key = push(ref(rtdb, `cod_ledger/${companyId}/entries`)).key;
  await set(ref(rtdb, `cod_ledger/${companyId}/entries/${key}`), {
    shipmentId, amount, currency, type: "collect", by: byUid, at: serverTimestamp()
  });
  await update(ref(rtdb, `shipments/${shipmentId}/cod`), { collected: true });
}
export async function codSettle(companyId, shipmentId, amount, currency, byUid) {
  const key = push(ref(rtdb, `cod_ledger/${companyId}/entries`)).key;
  await set(ref(rtdb, `cod_ledger/${companyId}/entries/${key}`), {
    shipmentId, amount, currency, type: "settle", by: byUid, at: serverTimestamp()
  });
  await update(ref(rtdb, `shipments/${shipmentId}/cod`), { settled: true, settledAt: serverTimestamp() });
}

// ===================== Proof uploads =====================
export async function uploadProofPhoto(file, { companyId = "default", shipmentId, currentUser }) {
  if (!shipmentId || !file) throw new Error("shipmentId و file مطلوبان");
  const path = `proof/${companyId}/${shipmentId}/${Date.now()}_${file.name}`;
  const sref = storageRef(storage, path);
  await uploadBytes(sref, file);
  const url = await getDownloadURL(sref);
  const photoKey = push(ref(rtdb, `shipments/${shipmentId}/proof/photos`)).key;
  await set(ref(rtdb, `shipments/${shipmentId}/proof/photos/${photoKey}`), {
    url, path, by: currentUser?.uid || "system", at: serverTimestamp()
  });
  return { url, path };
}

// ===================== Zones =====================
export function watchZones(companyId, cb) {
  return onValue(ref(rtdb, `zones/${companyId}`), (snap) => {
    const v = snap.val() || {};
    const rows = Object.entries(v).map(([id, z]) => ({ id, ...z }));
    cb(rows);
  });
}
export async function createZone(companyId, data) {
  const key = push(ref(rtdb, `zones/${companyId}`)).key;
  await set(ref(rtdb, `zones/${companyId}/${key}`), {
    name: data.name,
    code: data.code || null,
    pricePerZone: Number(data.pricePerZone ?? 0),
    createdAt: serverTimestamp()
  });
  return key;
}
export async function updateZone(companyId, id, patch) {
  await update(ref(rtdb, `zones/${companyId}/${id}`), {
    ...patch, updatedAt: serverTimestamp()
  });
}
export async function deleteZone(companyId, id) {
  await remove(ref(rtdb, `zones/${companyId}/${id}`));
}

// ===================== Hubs =====================
export function watchHubs(companyId, cb){
  return onValue(ref(rtdb, `hubs/${companyId}`), (snap) => {
    const v = snap.val() || {};
    const rows = Object.entries(v).map(([id, x]) => ({ id, ...x }));
    cb(rows);
  });
}
export async function createHub(companyId, data, currentUser){
  const key = push(ref(rtdb, `hubs/${companyId}`)).key;
  await set(ref(rtdb, `hubs/${companyId}/${key}`), {
    name: data.name,
    code: data.code || null,
    address: data.address || null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    createdAt: serverTimestamp(),
    createdBy: currentUser?.uid || "system"
  });
  return key;
}
export async function updateHub(companyId, id, patch, currentUser){
  await update(ref(rtdb, `hubs/${companyId}/${id}`), {
    ...patch,
    updatedAt: serverTimestamp(),
    updatedBy: currentUser?.uid || "system"
  });
}
export async function deleteHub(companyId, id){
  await remove(ref(rtdb, `hubs/${companyId}/${id}`));
}

// ===================== Inventory =====================
export function watchInventory(companyId, hubId, cb){
  return onValue(ref(rtdb, `inventory/${companyId}/${hubId}`), (snap) => {
    const v = snap.val() || {};
    const rows = Object.entries(v).map(([shipmentId, inv]) => ({ shipmentId, ...inv }));
    cb(rows);
  });
}

export async function putInHub(companyId, hubId, shipmentId, { status="AT_HUB", slot=null, note=null } = {}, currentUser){
  await update(ref(rtdb, `inventory/${companyId}/${hubId}/${shipmentId}`), {
    status,
    slot,
    note,
    updatedAt: serverTimestamp(),
    by: currentUser?.uid || "system"
  });
}

export async function setInventoryStatus(companyId, hubId, shipmentId, status, currentUser, { slot, note } = {}){
  await update(ref(rtdb, `inventory/${companyId}/${hubId}/${shipmentId}`), {
    status,
    slot: slot ?? null,
    note: note ?? null,
    updatedAt: serverTimestamp(),
    by: currentUser?.uid || "system"
  });
}

export async function transferBetweenHubs(companyId, fromHubId, toHubId, shipmentId, currentUser){
  const fromRef = ref(rtdb, `inventory/${companyId}/${fromHubId}/${shipmentId}`);
  const toRef   = ref(rtdb, `inventory/${companyId}/${toHubId}/${shipmentId}`);
  const snap = await get(fromRef);
  const data = snap.exists() ? snap.val() : { status:"AT_HUB", slot:null, note:null };
  await set(toRef, { ...data, status: "AT_HUB", updatedAt: serverTimestamp(), by: currentUser?.uid || "system" });
  await remove(fromRef);
}

// ===================== Driver Inbox & Tracking =====================
export function watchDriverInbox(driverId, cb) {
  return onValue(ref(rtdb, `driver_inbox/${driverId}`), (snap) => {
    const v = snap.val() || {};
    cb(Object.keys(v));
  });
}

export async function pushDriverLocation(driverUid, { lat, lng }, accuracy = null) {
  if (!driverUid || lat == null || lng == null) throw new Error("موقع غير صالح");
  const key = push(ref(rtdb, `courier_tracks/${driverUid}`)).key;
  await set(ref(rtdb, `courier_tracks/${driverUid}/${key}`), {
    lat, lng, accuracy, at: serverTimestamp()
  });
  await update(ref(rtdb, `couriers/${driverUid}`), {
    lastLoc: { lat, lng, at: serverTimestamp() },
    online: true
  });
}
export function watchDriverTrack(driverUid, cb) {
  return onValue(ref(rtdb, `courier_tracks/${driverUid}`), (snap) => {
    const v = snap.val() || {};
    const list = Object.values(v).sort((a,b)=>(a.at||0)-(b.at||0));
    cb(list);
  });
}

export function watchAllCouriers(cb) {
  return onValue(ref(rtdb, "couriers"), (snap) => {
    const v = snap.val() || {};
    const rows = Object.entries(v).map(([id, c]) => ({ id, ...c }));
    cb(rows);
  });
}
// ===== تعيين حالة الشحنة + تزامن الجرد (Inventory) =====
export async function setStatusWithInventory({
  companyId,
  hubId,            // المخزن الحالي أو المستهدف
  shipmentId,
  status,           // CREATED | AT_HUB | OUT_FOR_DELIVERY | DELIVERED | RETURNED_TO_HUB | RETURNED
  currentUser,
  note = null,
  slot = null
}) {
  if (!shipmentId || !status) throw new Error("shipmentId و status مطلوبان");

  // 1) حدّث الشحنة نفسها (status + timeline)
  await update(ref(rtdb, `shipments/${shipmentId}`), { status, updatedAt: serverTimestamp(), note: note || null });

  const tlKey = push(ref(rtdb, `shipments/${shipmentId}/timeline`)).key;
  await set(ref(rtdb, `shipments/${shipmentId}/timeline/${tlKey}`), {
    at: serverTimestamp(),
    by: currentUser?.uid || "system",
    code: status,
    note: note || null
  });

  // 2) لو فيه companyId + hubId نزامن مع الجرد
  if (!companyId || !hubId) return;

  const invRef = ref(rtdb, `inventory/${companyId}/${hubId}/${shipmentId}`);

  if (status === "AT_HUB") {
    await update(invRef, {
      status: "AT_HUB",
      slot: slot ?? null,
      note: note ?? null,
      updatedAt: serverTimestamp(),
      by: currentUser?.uid || "system"
    });
  } else if (status === "OUT_FOR_DELIVERY") {
    await update(invRef, {
      status: "OUT_FOR_DELIVERY",
      note: note ?? null,
      updatedAt: serverTimestamp(),
      by: currentUser?.uid || "system"
    });
  } else if (status === "RETURNED" || status === "RETURNED_TO_HUB") {
    await update(invRef, {
      status: "RETURNED_TO_HUB",
      note: note ?? null,
      updatedAt: serverTimestamp(),
      by: currentUser?.uid || "system"
    });
  } else if (status === "DELIVERED") {
    // تم التسليم → شيلها من جرد المخزن
    await remove(invRef);
  }
}


// ===================== Debug (اختياري) =====================
if (typeof window !== "undefined") {
  window.auth = auth;
  window.rtdb = rtdb;
}
