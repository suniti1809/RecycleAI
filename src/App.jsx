import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layout & Pages
import Layout from './components/Layout';
import { UserLanding, RecyclerLanding } from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Classifier from './pages/Classifier';
import Bookings from './pages/Bookings';
import RecyclerDashboard from './pages/RecyclerDashboard';
import RecyclerMyJobs from './pages/RecyclerMyJobs';
import Marketplace from './pages/Marketplace';
import MyListings from './pages/MyListings';
import MyOffers from './pages/MyOffers';
import NegotiationThread from './pages/NegotiationThread';
import RecyclerMap from './pages/RecyclerMap';
import Impact from './pages/Impact';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';

// Guards
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/" replace />;
  return children;
};

const ProtectedUser = ({ children }) => {
  const { isLoggedIn, isRecycler } = useAuth();
  if (!isLoggedIn) return <Navigate to="/" replace />;
  if (isRecycler) return <Navigate to="/recycler" replace />;
  return children;
};

const ProtectedRecycler = ({ children }) => {
  const { isLoggedIn, isRecycler } = useAuth();
  if (!isLoggedIn) return <Navigate to="/recycler-portal" replace />;
  if (!isRecycler) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  const { isLoggedIn, isRecycler } = useAuth();

  return (
    <>
      <Routes>
        {/* Public Landings */}
        <Route path="/" element={
          isLoggedIn ? <Navigate to={isRecycler ? "/recycler" : "/dashboard"} replace /> : <UserLanding />
        } />
        <Route path="/recycler-portal" element={
          isLoggedIn ? <Navigate to={isRecycler ? "/recycler" : "/dashboard"} replace /> : <RecyclerLanding />
        } />

        {/* Authenticated Application (Shared & Role-Aware) */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          {/* User / Seller Portal (Only for Sellers) */}
          <Route path="/dashboard" element={<ProtectedUser><Dashboard /></ProtectedUser>} />
          <Route path="/classifier" element={<ProtectedUser><Classifier /></ProtectedUser>} />
          <Route path="/my-listings" element={<ProtectedUser><MyListings /></ProtectedUser>} />

          {/* Recycler / Buyer Portal (Only for Recyclers / Collectors) */}
          <Route path="/recycler" element={<ProtectedRecycler><RecyclerDashboard /></ProtectedRecycler>} />
          <Route path="/recycler/my-jobs" element={<ProtectedRecycler><RecyclerMyJobs /></ProtectedRecycler>} />
          <Route path="/my-offers" element={<ProtectedRecycler><MyOffers /></ProtectedRecycler>} />

          {/* Shared Marketplace & Deal Flow */}
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/negotiations/:id" element={<NegotiationThread />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/transactions" element={<Navigate to="/bookings" replace />} />
          <Route path="/transactions/:id" element={<Navigate to="/bookings" replace />} />
          <Route path="/listings/:id" element={<Navigate to="/my-listings" replace />} />
          <Route path="/map" element={<RecyclerMap />} />
          <Route path="/impact" element={<Impact />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/user/settings" element={<ProtectedUser><Settings /></ProtectedUser>} />
          <Route path="/recycler/settings" element={<ProtectedRecycler><Settings /></ProtectedRecycler>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

