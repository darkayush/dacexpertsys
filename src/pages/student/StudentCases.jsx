import { useNavigate } from 'react-router-dom';
import StudentCasesTable from '../../components/student/StudentCasesTable';
import { STUDENT_CASES } from './studentData';

export default function StudentCases() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[#0f172a]">My Cases</h3>
      <StudentCasesTable
        cases={STUDENT_CASES}
        onViewCase={(token) => navigate(`/student/cases/${token}`)}
      />
    </div>
  );
}
