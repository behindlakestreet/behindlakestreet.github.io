import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Header } from '@/components/Header';
import { LogRoute } from '@/app/routes/LogRoute';
import { HistoryRoute } from '@/app/routes/HistoryRoute';
import { ReportRoute } from '@/app/routes/ReportRoute';
import { LetterRoute } from '@/app/routes/LetterRoute';

export function App() {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Header />
      <main className="max-w-3xl mx-auto p-4">
        <Routes>
          <Route path="/" element={<Navigate to="/log" replace />} />
          <Route path="/log" element={<LogRoute />} />
          <Route path="/geschiedenis" element={<HistoryRoute />} />
          <Route path="/rapport" element={<ReportRoute />} />
          <Route path="/brief" element={<LetterRoute />} />
          <Route path="*" element={<Navigate to="/log" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
