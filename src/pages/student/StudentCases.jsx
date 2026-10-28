import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StudentCasesTable from '../../components/student/StudentCasesTable';
import { getCases } from '../../services/api';

function toTitleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function StudentCases() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const search = (searchParams.get('q') || '').trim().toLowerCase();
  const hasLoggedResponseRef = useRef(false);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const casesResponse = await getCases();

        if (!hasLoggedResponseRef.current) {
          console.log('StudentCases API response:', { cases: casesResponse });
          hasLoggedResponseRef.current = true;
        }

        const mappedCases = casesResponse.map((entry) => {
          const status = toTitleCase(entry.status);
          const severity = toTitleCase(entry.severity);
          return {
            token: String(entry.id),
            offenseType: toTitleCase(entry.offense_type) || 'N/A',
            severity,
            severityClass: severity === 'Critical' ? 'bg-red-100 text-red-700' : severity === 'High' ? 'bg-orange-100 text-orange-700' : severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600',
            status,
            statusDot: status === 'Resolved' ? 'bg-emerald-500' : status === 'Dac Review' ? 'bg-purple-500' : status === 'Investigation' ? 'bg-blue-500' : 'bg-yellow-500',
            dateReported: formatDate(entry.incident_date ?? entry.created_at),
          };
        });

        if (mounted) setCases(mappedCases);
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.message || 'Failed to fetch cases.');
          setCases([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredCases = useMemo(() => {
    if (!search) return cases;
    return cases.filter((c) =>
      [c.token, c.offenseType, c.status, c.severity].some((v) => String(v).toLowerCase().includes(search))
    );
  }, [cases, search]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[#0f172a]">My Cases</h3>
      {loading && <p className="text-[#64748b] text-sm">Loading...</p>}
      {!!error && <p className="text-sm text-red-600">Error: {error}</p>}
      <StudentCasesTable
        cases={filteredCases}
        onViewCase={(token) => navigate(`/student/cases/${token}`)}
      />
    </div>
  );
}
