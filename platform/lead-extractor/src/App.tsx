import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Rules } from './pages/Rules';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;