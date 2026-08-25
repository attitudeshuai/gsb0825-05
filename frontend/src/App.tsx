import { useSelector } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RootState } from './store';
import Login from './pages/Login';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import TenantList from './pages/tenants/TenantList';
import TenantDetail from './pages/tenants/TenantDetail';
import PlanList from './pages/plans/PlanList';
import PlanDetail from './pages/plans/PlanDetail';
import BillList from './pages/bills/BillList';
import BillDetail from './pages/bills/BillDetail';

function App() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tenants" element={<TenantList />} />
        <Route path="tenants/:id" element={<TenantDetail />} />
        <Route path="plans" element={<PlanList />} />
        <Route path="plans/:id" element={<PlanDetail />} />
        <Route path="bills" element={<BillList />} />
        <Route path="bills/:id" element={<BillDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
