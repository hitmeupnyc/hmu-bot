import { Layout } from '@/components/Layout';
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
  );
}

export default App;
