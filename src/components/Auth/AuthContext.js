// src/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { onAuth, watchUserProfile   } from "../../firebase";
// import { onAuth, watchUserProfile, logout } from ".../firebase";


const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // {role, companyId,...}
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuth(async (u) => {
      setUser(u || null);
      setProfile(null);
      if (u?.uid) {
        // اسمع البروفايل من RTDB
        const off = watchUserProfile(u.uid, (p) => setProfile(p));
        setLoading(false);
        return () => off && off();
      }
      setLoading(false);
    });
    return () => unsub && unsub();
  }, []);

  const value = { user, profile, loading, };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
