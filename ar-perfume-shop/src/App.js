import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Utility to lazy-load pages
const page = (path) => lazy(() => import(`./pages/${path}`));
const adminPage = (path) => lazy(() => import(`./pages/admin/${path}`));

// ─── Public pages ───
const MainPage = page("MainPage");
const ReleasesPage = page("ReleasesPage");
const ShopPage = page("ShopPage");
const ProductPage = page("ProductPage");
const ComparePage = page("ComparePage");
const QuizPage = page("QuizPage");
const ARViewer = page("ARViewer"); // ✅ NEW — AR viewer route

// ─── Auth pages ───
const LoginPage = page("LoginPage");
const SignupPage = page("SignupPage");
const ForgotPasswordPage = page("ForgotPasswordPage");
const ResetPasswordConfirmPage = page("ResetPasswordConfirmPage");

// ─── User-only pages ───
const AccountPage = page("AccountPage");
const CartPage = page("CartPage");
const CheckoutPage = page("CheckoutPage");
const OrdersPage = page("OrdersPage");
const EditProfilePage = page("EditProfilePage");
const RateOrderPage = page("RateOrderPage");

// ─── Settings pages ───
const SettingsPage = page("SettingsPage");
const AboutPage = page("AboutPage");
const RetailersPage = page("RetailersPage");
const HelpCenterPage = page("HelpCenterPage");

// ─── Admin-only pages ───
const AdminDashboardPage = adminPage("AdminDashboardPage");
const AdminUsersPage = adminPage("AdminUsersPage");
const AdminProductsPage = adminPage("AdminProductsPage");
const AdminProductFormPage = adminPage("AdminProductFormPage");
const AdminOrdersPage = adminPage("AdminOrdersPage");
const AdminQuizManagement = adminPage("AdminQuizManagement");
const AdminARManagement = adminPage("AdminARManagement");
const AdminAREditPage = adminPage("AdminAREditPage");
const AdminReviewPage = adminPage("AdminReviewPage");
const AdminAboutPage = adminPage("AdminAboutPage");
const AdminRetailersPage = adminPage("AdminRetailersPage");

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<div style={{ color: "#fff", padding: 16 }}>Loading…</div>}>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* ─── Public Pages ─── */}
            <Route index element={<MainPage />} />
            <Route path="releases" element={<ReleasesPage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="product/:id" element={<ProductPage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="quiz" element={<QuizPage />} />
            <Route path="arview/:slug" element={<ARViewer />} /> {/* ✅ ADDED HERE */}

            {/* ─── Auth Pages ─── */}
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route
              path="reset-password/:uid/:token"
              element={<ResetPasswordConfirmPage />}
            />

            {/* ─── User-only Pages ─── */}
            {[
              ["account", AccountPage],
              ["cart", CartPage],
              ["checkout", CheckoutPage],
              ["orders", OrdersPage],
              ["edit-profile", EditProfilePage],
              ["rate/:id", RateOrderPage],
              ["settings", SettingsPage],
              ["settings/about", AboutPage],
              ["settings/retailers", RetailersPage],
              ["settings/help", HelpCenterPage],
            ].map(([path, Component]) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute>
                    <Component />
                  </ProtectedRoute>
                }
              />
            ))}

            {/* ─── Admin-only Pages ─── */}
            {[
              ["admin/dashboard", AdminDashboardPage],
              ["admin/users", AdminUsersPage],
              ["admin/products", AdminProductsPage],
              ["admin/products/new", AdminProductFormPage],
              ["admin/products/:id/edit", AdminProductFormPage],
              ["admin/orders", AdminOrdersPage],
              ["admin/quiz-management", AdminQuizManagement],
              ["admin/ar-management", AdminARManagement],
              ["admin/ar-management/new", AdminAREditPage],
              ["admin/ar-management/:id/edit", AdminAREditPage],
              ["admin/reviews", AdminReviewPage],
              ["admin/about", AdminAboutPage],
              ["admin/retailers", AdminRetailersPage],
            ].map(([path, Component]) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute adminOnly>
                    <Component />
                  </ProtectedRoute>
                }
              />
            ))}

            {/* ─── Redirects ─── */}
            <Route
              path="my-orders"
              element={<Navigate to="/orders?tab=TO_BUY" replace />}
            />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
