import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { ResultPage } from '@/pages/ResultPage';
import { AuthPage } from '@/pages/AuthPage';
import { MajorScorePage } from '@/pages/MajorScorePage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/majorscore" element={<MajorScorePage />} />
      </Routes>
    </Router>
  );
}