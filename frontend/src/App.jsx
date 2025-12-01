// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";

import HomeAdmin from "./pages/HomeAdmin";
import AdminUsers from "./pages/AdminUsers";
import AdminHomestays from "./pages/AdminHomestays";
import AdminPromotions from "./pages/AdminPromotions";
import AdminReviews from "./pages/AdminReviews";
import AdminComplaints from "./pages/AdminComplaints";
import AdminRevenue from "./pages/AdminRevenue";


import HomeOwner from "./pages/HomeOwner";
import HomeCustomer from "./pages/HomeCustomer";
import NotFound from "./pages/NotFound";

import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerBookings from "./pages/OwnerBookings";
import OwnerReviews from "./pages/OwnerReviews";
import OwnerComplaints from "./pages/OwnerComplaints";
import OwnerAnalytics from "./pages/OwnerAnalytics";

import HomestayDetail from "./pages/HomestayDetail";
import MyBookings from "./pages/MyBookings";
import BookingCart from "./pages/BookingCart";


export default function App() {
  return (
    <Routes>
      {/* ===== Public ===== */}
      <Route path="/" element={<HomeCustomer />} />

      {/* ✅ Alias cho VNPay Return */}
      <Route path="/homecustomer" element={<HomeCustomer />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/homestays/:id" element={<HomestayDetail />} />
      <Route path="/customer" element={<Navigate to="/" replace />} />
      <Route path="/vnpay-return" element={<HomeCustomer />} />


      {/* ===== Private ===== */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allow={["admin"]} />}>
          <Route path="/admin" element={<HomeAdmin />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/homestays" element={<AdminHomestays />} />
          <Route path="/admin/promotions" element={<AdminPromotions />} />
          <Route path="/admin/reviews" element={<AdminReviews />} />
          <Route path="/admin/complaints" element={<AdminComplaints />} />
          <Route path="/admin/revenue" element={<AdminRevenue />} />

        </Route>

        <Route element={<RoleRoute allow={["owner"]} />}>
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/owner/homestays" element={<HomeOwner />} />
          <Route path="/owner/bookings" element={<OwnerBookings />} />
          <Route path="/owner/reviews" element={<OwnerReviews />} />
          <Route path="/owner/complaints" element={<OwnerComplaints />} />
          <Route path="/owner/analytics" element={<OwnerAnalytics />} />
        </Route>

        <Route element={<RoleRoute allow={["customer"]} />}>
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/cart" element={<BookingCart />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
