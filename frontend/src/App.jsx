// src/App.jsx
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";

import HomeAdmin from "./pages/HomeAdmin";
import AdminUsers from "./pages/AdminUsers";
import AdminHomestays from "./pages/AdminHomestays"; // 👈 THÊM ROUTE TRANG QUẢN LÝ HOMESTAY

import HomeOwner from "./pages/HomeOwner";            // /owner/homestays
import HomeCustomer from "./pages/HomeCustomer";
import NotFound from "./pages/NotFound";

import OwnerDashboard from "./pages/OwnerDashboard";  // /owner
import OwnerBookings from "./pages/OwnerBookings";    // /owner/bookings

import HomestayDetail from "./pages/HomestayDetail";

export default function App() {
  return (
    <Routes>
      {/* ===== Public ===== */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Chi tiết homestay: public */}
      <Route path="/homestays/:id" element={<HomestayDetail />} />

      {/* ===== Private (cần đăng nhập) ===== */}
      <Route element={<ProtectedRoute />}>
        {/* Admin */}
        <Route element={<RoleRoute allow={["admin"]} />}>
          <Route path="/admin" element={<HomeAdmin />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          {/* ✅ THÊM đường dẫn quản lý homestay cho admin */}
          <Route path="/admin/homestays" element={<AdminHomestays />} />
        </Route>

        {/* Owner */}
        <Route element={<RoleRoute allow={["owner"]} />}>
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/owner/homestays" element={<HomeOwner />} />
          <Route path="/owner/bookings" element={<OwnerBookings />} />
        </Route>

        {/* Customer */}
        <Route element={<RoleRoute allow={["customer"]} />}>
          <Route path="/customer" element={<HomeCustomer />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
