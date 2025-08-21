import { AppHeader } from '@/components/AppHeader';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Apply } from '@/pages/Apply';
import { Dashboard } from '@/pages/Dashboard';
import { Debug } from '@/pages/Debug';
import { EventDetails } from '@/pages/EventDetails';
import { Events } from '@/pages/Events';
import { LoginPage } from '@/pages/LoginPage';
import { MemberDetails } from '@/pages/MemberDetails';
import { Members } from '@/pages/Members';
import { NotFound } from '@/pages/NotFound';
import Permissions from '@/pages/Permissions';
import { Settings } from '@/pages/Settings';
import { Route, Routes } from 'react-router-dom';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppHeader />
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/members" element={<Members />} />
                <Route path="/members/:id" element={<MemberDetails />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:id" element={<EventDetails />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/permissions" element={<Permissions />} />
                <Route path="/apply" element={<Apply />} />
                <Route path="/debug" element={<Debug />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
