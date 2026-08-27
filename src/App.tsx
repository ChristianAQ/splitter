import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { AppLayout } from "./AppLayout";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Expenses } from "./pages/Expenses";
import { Groups } from "./pages/Groups";
import { Friends } from "./pages/Friends";
import { GroupDetail } from "./pages/GroupDetail";
import { Stats } from "./pages/Stats";
import { Settings } from "./pages/Settings";
import { AppLoading } from "./components/layout/AppLoading";

function PrivateArea() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppLoading />;
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gastos" element={<Expenses />} />
        <Route path="/grupos" element={<Groups />} />
        <Route path="/grupos/:groupId" element={<GroupDetail />} />
        <Route path="/amigos" element={<Friends />} />
        <Route path="/estadisticas" element={<Stats />} />
        <Route path="/perfil" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

function Root() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={!loading && user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={<PrivateArea />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <HashRouter>
            <Root />
          </HashRouter>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
