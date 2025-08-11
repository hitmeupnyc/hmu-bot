import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SimpleAppHeader } from '@/components/SimpleAppHeader';
import { SimpleLoginPage } from '@/pages/SimpleLoginPage';
import { Apply } from '@/pages/Apply';
import { Dashboard } from '@/pages/Dashboard';
import { Debug } from '@/pages/Debug';
import { EventDetails } from '@/pages/EventDetails';
import { Events } from '@/pages/Events';
import { MemberDetails } from '@/pages/MemberDetails';
import { Members } from '@/pages/Members';
import { NotFound } from '@/pages/NotFound';
import { Settings } from '@/pages/Settings';
import { Route, Routes } from 'react-router-dom';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<SimpleLoginPage />} />
      
      {/* Protected routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <SimpleAppHeader />
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/members" element={<Members />} />
              <Route path="/members/:id" element={<MemberDetails />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetails />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/apply" element={<Apply />} />
              <Route path="/debug" element={<Debug />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;
