import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Ask from './pages/Ask';
import Inspector from './pages/Inspector';
import History from './pages/History';
import Evaluation from './pages/Evaluation';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/ask" element={<Ask />} />
          <Route path="/inspector" element={<Inspector />} />
          <Route path="/history" element={<History />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
