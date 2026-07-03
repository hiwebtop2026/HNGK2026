import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { ResultPage } from '@/pages/ResultPage';
import { AuthPage } from '@/pages/AuthPage';
import { MajorScorePage } from '@/pages/MajorScorePage';
import AnalysisPage from '@/pages/AnalysisPage';

const APP_TITLE = '智能高考志愿助理';

function TitleSetter() {
  const location = useLocation();
  
  useEffect(() => {
    document.title = APP_TITLE;
  }, [location.pathname]);
  
  return null;
}

export default function App() {
  return (
    <Router>
      <TitleSetter />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/majorscore" element={<MajorScorePage />} />
      </Routes>
    </Router>
  );
}