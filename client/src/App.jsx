import { Routes, Route } from "react-router-dom";
import AuthProvider from "./AuthProvider.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import DocumentsPage from "./pages/DocumentsPage.jsx";
import DocumentFormPage from "./pages/DocumentFormPage.jsx";
import DocumentDetailPage from "./pages/DocumentDetailPage.jsx";
import ReviewsPage from "./pages/ReviewsPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/new" element={<DocumentFormPage />} />
          <Route path="/documents/:id/edit" element={<DocumentFormPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route
            path="/reviews"
            element={
              <ProtectedRoute roles={["REVIEWER", "ADMIN"]}>
                <ReviewsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
