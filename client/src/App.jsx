import { Routes, Route } from 'react-router-dom';
import { CustomerLayout } from './components/layout/CustomerLayout.jsx';
import { AdminLayout } from './components/layout/AdminLayout.jsx';
import { ProtectedRoute, AdminRoute } from './components/common/ProtectedRoute.jsx';

import { Home } from './pages/Home.jsx';
import { Menu } from './pages/Menu.jsx';
import { BuildPizza } from './pages/BuildPizza.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { VerifyEmail } from './pages/VerifyEmail.jsx';
import { ForgotPassword } from './pages/ForgotPassword.jsx';
import { ResetPassword } from './pages/ResetPassword.jsx';
import { Checkout } from './pages/Checkout.jsx';
import { MyOrders } from './pages/MyOrders.jsx';
import { OrderDetails } from './pages/OrderDetails.jsx';
import { NotFound } from './pages/NotFound.jsx';

import { AdminLogin } from './pages/admin/AdminLogin.jsx';
import { AdminDashboard } from './pages/admin/AdminDashboard.jsx';
import { AdminOrders } from './pages/admin/AdminOrders.jsx';
import { AdminOrderDetails } from './pages/admin/AdminOrderDetails.jsx';
import { AdminInventory } from './pages/admin/AdminInventory.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route index element={<Home />} />
        <Route path="menu" element={<Menu />} />
        <Route path="build" element={<BuildPizza />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route
          path="checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-orders"
          element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetails />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="admin/login" element={<AdminLogin />} />
      <Route
        path="admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="orders/:id" element={<AdminOrderDetails />} />
        <Route path="inventory" element={<AdminInventory />} />
      </Route>
    </Routes>
  );
}
