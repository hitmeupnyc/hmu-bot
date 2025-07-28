import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Members } from '@/pages/Members';
import { MemberDetails } from '@/pages/MemberDetails';
import { Events } from '@/pages/Events';
import { Settings } from '@/pages/Settings';
import { Apply } from '@/pages/Apply';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/members/:id" element={<MemberDetails />} />
        <Route path="/events" element={<Events />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/apply" element={<Apply />} />
      </Routes>
    </Layout>
  );
}

export default App;