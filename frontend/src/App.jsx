import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import HomeAdmin from "./pages/HomeAdmin";
import HomeOwner from "./pages/HomeOwner";
import HomeCustomer from "./pages/HomeCustomer";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allow={["admin"]} />}>
          <Route path="/admin" element={<HomeAdmin />} />
        </Route>
        <Route element={<RoleRoute allow={["owner"]} />}>
          <Route path="/owner" element={<HomeOwner />} />
        </Route>
        <Route element={<RoleRoute allow={["customer"]} />}>
          <Route path="/customer" element={<HomeCustomer />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
