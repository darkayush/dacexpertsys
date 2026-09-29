import { Outlet } from 'react-router-dom';
import DACLayout from '../components/layout/DACLayout';

export default function StudentLayout() {
  return (
    <DACLayout>
      <Outlet />
    </DACLayout>
  );
}
