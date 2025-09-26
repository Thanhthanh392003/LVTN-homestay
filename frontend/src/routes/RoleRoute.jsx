import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleRoute({ allow = [] }) {
    const { user } = useAuth();
    const location = useLocation();

    const role = user?.roleName; // đã normalize

    if (!role || !allow.includes(role)) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return <Outlet />;
}