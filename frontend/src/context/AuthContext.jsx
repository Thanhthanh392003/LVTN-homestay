// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../services/auth";

function normalizeRole(u) {
    if (!u) return null;

    const idFromAny =
        u.role_id ??
        u.ROLE_ID ??
        (typeof u.role === "number" ? u.role : undefined) ??
        (typeof u.role?.id === "number" ? u.role.id : undefined);

    const nameFromAnyRaw =
        (typeof u.role === "string" ? u.role : undefined) ??
        (typeof u.role?.name === "string" ? u.role.name : undefined);

    const nameFromId =
        idFromAny === 1
            ? "admin"
            : idFromAny === 2
                ? "owner"
                : idFromAny === 3
                    ? "customer"
                    : undefined;

    return {
        ...u,
        role_id: idFromAny ?? u.role_id ?? u.ROLE_ID,
        roleName: (nameFromAnyRaw || nameFromId || "").toLowerCase(),
    };
}

const AuthContext = createContext(null);
const STORAGE_KEY = "greenstay:auth:user";

export function AuthProvider({ children }) {
    // Load user từ localStorage khi FE khởi động
    const [user, setUserState] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return normalizeRole(JSON.parse(raw));
        } catch {
            return null;
        }
    });

    const setUser = (next) => {
        const normalized = next ? normalizeRole(next) : null;
        try {
            if (normalized) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch { }
        setUserState(normalized);
    };
    useEffect(() => {
        if (import.meta.env.DEV) {
            localStorage.removeItem("greenstay:auth:user");
        }

        (async () => {
            try {
                const res = await authApi.me();
                const raw = res?.user || res?.data?.user || null;

                if (raw) {
                    setUser(normalizeRole(raw));
                }
            } catch { }
        })();
    }, []);

    const login = async (email, password) => {
        const res = await authApi.login(email, password);
        const raw = res?.user || res?.data?.user || res?.data;
        const normalized = normalizeRole(raw);

        setUser(normalized);
        return { user: normalized };
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } catch { }
        finally {
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
