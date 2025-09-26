// src/App.jsx
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";

import HomeAdmin from "./pages/HomeAdmin";
import HomeOwner from "./pages/HomeOwner";           // /owner/homestays
import HomeCustomer from "./pages/HomeCustomer";
import NotFound from "./pages/NotFound";

// NEW: trang chủ Owner & trang quản lý booking
import OwnerDashboard from "./pages/OwnerDashboard"; // /owner
import OwnerBookings from "./pages/OwnerBookings";   // /owner/bookings

// Trang chi tiết Homestay (public)
import HomestayDetail from "./pages/HomestayDetail";

export default function App() {
  return (
    <Routes>
      {/* ===== Public ===== */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Chi tiết homestay: CHO PHÉP TRUY CẬP PUBLIC */}
      <Route path="/homestays/:id" element={<HomestayDetail />} />

      {/* ===== Private (cần đăng nhập) ===== */}
      <Route element={<ProtectedRoute />}>
        {/* Admin */}
        <Route element={<RoleRoute allow={["admin"]} />}>
          <Route path="/admin" element={<HomeAdmin />} />
        </Route>

        {/* Owner */}
        <Route element={<RoleRoute allow={["owner"]} />}>
          {/* Trang chủ Owner (dashboard) */}
          <Route path="/owner" element={<OwnerDashboard />} />
          {/* Quản lý Homestay */}
          <Route path="/owner/homestays" element={<HomeOwner />} />
          {/* Quản lý Đơn đặt phòng */}
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
