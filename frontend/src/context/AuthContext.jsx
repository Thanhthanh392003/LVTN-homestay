import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../services/auth";
import { usersApi } from "../services/users";

const AuthContext = createContext(null);

// Chuẩn hoá role từ mọi kiểu trả về của BE
function normalizeRole(u) {
    if (!u) return u;

    // Bắt hết mọi biến thể có thể có
    const idFromAny =
        u.role_id ??
        u.ROLE_ID ??
        (typeof u.role === "number" ? u.role : undefined) ??
        (typeof u.role?.id === "number" ? u.role.id : undefined);

    const nameFromAnyRaw =
        (typeof u.role === "string" ? u.role : undefined) ??
        (typeof u.role?.name === "string" ? u.role.name : undefined);

    const nameFromId =
        idFromAny === 1 ? "admin" :
            idFromAny === 2 ? "owner" :
                idFromAny === 3 ? "customer" : undefined;

    const roleName = (nameFromAnyRaw || nameFromId || "").toLowerCase();

    return {
        ...u,
        role_id: idFromAny ?? u.role_id ?? u.ROLE_ID,
        roleName, // <— dùng nhất quán ở mọi nơi
    };
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Hồi phiên khi F5 (đọc /me)
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const me = await usersApi.me();
                // /me có thể trả dạng {status,data:{...}} hoặc {user:{...}} hoặc {...}
                const raw =
                    me?.data?.user || me?.data || me?.user || me;
                if (mounted) setUser(normalizeRole(raw));
            } catch {
                if (mounted) setUser(null);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => (mounted = false);
    }, []);

    const login = async (email, password) => {
        const res = await authApi.login(email, password); // { message, user } hoặc {data:{user}}
        const raw = res?.user || res?.data?.user || res?.data;
        const normalized = normalizeRole(raw);
        setUser(normalized);
        return { user: normalized };
    };

    const logout = async () => {
        try { await authApi.logout(); } catch { }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() { return useContext(AuthContext); }
