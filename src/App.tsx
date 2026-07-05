import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { ResultPage } from '@/pages/ResultPage';
import { AuthPage } from '@/pages/AuthPage';
import { MajorScorePage } from '@/pages/MajorScorePage';
import AnalysisPage from '@/pages/AnalysisPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const APP_TITLE = '智能高考志愿助理';

function TitleSetter() {
  const location = useLocation();

  useEffect(() => {
    document.title = APP_TITLE;
  }, [location.pathname]);

  return null;
}

/** 404 兜底页面 */
function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="glass rounded-2xl p-8 max-w-md w-full shadow-lg text-center">
        <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">页面未找到</h2>
        <p className="text-sm text-gray-500 mb-6">您访问的页面不存在或已被移除</p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <TitleSetter />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/result"
            element={
              <ProtectedRoute>
                <ResultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis"
            element={
              <ProtectedRoute>
                <AnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/majorscore"
            element={
              <ProtectedRoute>
                <MajorScorePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
