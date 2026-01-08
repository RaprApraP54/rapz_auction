import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WalletProvider } from './contexts/WalletContext';
import { ContractProvider } from './contexts/ContractContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AuctionList from './pages/AuctionList';
import AuctionDetail from './pages/AuctionDetail';
import CreateAuction from './pages/CreateAuction';
import AdminDashboard from './pages/AdminDashboard';
import AdminDeliveries from './pages/AdminDeliveries';
import EmergencyRefund from './pages/EmergencyRefund';
import MyWins from './pages/MyWins';
import ReportAdmin from './pages/ReportAdmin';
import ReportUser from './pages/ReportUser';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <WalletProvider>
          <ContractProvider>
            <div className="app">
              <Navbar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/auctions" element={<AuctionList />} />
                  <Route path="/auctions/:id" element={<AuctionDetail />} />
                  <Route
                    path="/auctions/create"
                    element={
                      <ProtectedRoute>
                        <CreateAuction />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requireAdmin>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/deliveries"
                    element={
                      <ProtectedRoute requireAdmin>
                        <AdminDeliveries />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/emergency-refund/:id"
                    element={
                      <ProtectedRoute requireAdmin>
                        <EmergencyRefund />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/reports"
                    element={
                      <ProtectedRoute requireAdmin>
                        <ReportAdmin />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-wins"
                    element={
                      <ProtectedRoute>
                        <MyWins />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-reports"
                    element={
                      <ProtectedRoute>
                        <ReportUser />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </main>
            </div>
          </ContractProvider>
        </WalletProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
