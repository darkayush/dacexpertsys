import { Outlet } from 'react-router-dom';
import DACLayout from '../components/layout/DACLayout';

export default function AdminSettings() {
  return (
    <DACLayout>
      <div className="max-w-6xl mx-auto">
        <Outlet />
      </div>
    </DACLayout>
  );
}
