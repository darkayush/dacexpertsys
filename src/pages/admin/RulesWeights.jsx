import { useEffect, useMemo, useState } from 'react';
import { createRule, deleteRule, getRules, updateRule } from '../../services/api';

const severityColors = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-orange-100 text-orange-700',
  Medium:   'bg-yellow-100 text-yellow-700',
  Low:      'bg-slate-100 text-slate-600',
};

const emptyRuleForm = {
  id: null,
  name: '',
  category: '',
  weight: '',
};

function toSeverity(weight) {
  const value = Number(weight || 0);
  if (value >= 80) return 'Critical';
  if (value >= 60) return 'High';
  if (value >= 40) return 'Medium';
  return 'Low';
}

function formatRuleId(id) {
  return `R-${String(id).padStart(3, '0')}`;
}

export default function RulesWeights() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modal, setModal] = useState({ open: false, mode: 'create' });
  const [form, setForm] = useState(emptyRuleForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadRules() {
      try {
        setLoading(true);
        setError('');
        const payload = await getRules();
        if (!mounted) return;
        setRules(payload || []);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError?.message || 'Failed to load rules.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadRules();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    if (!rules.length) {
      return { total: 0, critical: 0, high: 0, avgWeight: 0 };
    }
    const total = rules.length;
    const critical = rules.filter((rule) => toSeverity(rule.weight) === 'Critical').length;
    const high = rules.filter((rule) => toSeverity(rule.weight) === 'High').length;
    const avgWeight = Math.round(rules.reduce((sum, rule) => sum + Number(rule.weight || 0), 0) / total);
    return { total, critical, high, avgWeight };
  }, [rules]);

  const openCreate = () => {
    setForm(emptyRuleForm);
    setSuccess('');
    setError('');
    setModal({ open: true, mode: 'create' });
  };

  const openEdit = (rule) => {
    setForm({
      id: rule.id,
      name: rule.question || '',
      category: rule.category || '',
      weight: String(rule.weight ?? ''),
    });
    setSuccess('');
    setError('');
    setModal({ open: true, mode: 'edit' });
  };

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    setForm(emptyRuleForm);
  };

  const handleFormChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || form.weight === '') {
      setError('Rule name and weight are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      if (modal.mode === 'create') {
        const created = await createRule({
          question: form.name.trim(),
          category: form.category.trim() || null,
          weight: Number(form.weight),
        });
        setRules((prev) => [...prev, created]);
        setSuccess('Rule added successfully.');
      } else {
        const updated = await updateRule(form.id, {
          question: form.name.trim(),
          category: form.category.trim() || null,
          weight: Number(form.weight),
        });
        setRules((prev) => prev.map((rule) => (rule.id === updated.id ? updated : rule)));
        setSuccess('Rule updated successfully.');
      }
      closeModal();
    } catch (submitError) {
      setError(submitError?.message || 'Failed to save rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      await deleteRule(deleteTarget.id);
      setRules((prev) => prev.filter((rule) => rule.id !== deleteTarget.id));
      setSuccess('Rule deleted successfully.');
    } catch (deleteError) {
      setError(deleteError?.message || 'Failed to delete rule.');
    } finally {
      setSubmitting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#0f172a]">Rules &amp; Weight Management</h3>
          <p className="text-sm text-[#64748b] mt-0.5">
            Configure the scoring rules and their severity weights used during case evaluation.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#162d6b] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Rule
        </button>
      </div>

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Rules', value: stats.total, icon: 'rule', color: 'text-[#4f46e5]', bg: 'bg-[#eef2fb]' },
            { label: 'Critical', value: stats.critical, icon: 'crisis_alert', color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'High', value: stats.high, icon: 'warning', color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Avg Weight', value: stats.avgWeight, icon: 'scale', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0f172a]">{value}</p>
              <p className="text-xs text-[#64748b]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rules table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-[#e2e8f0]">
                {['Rule ID', 'Rule Name', 'Category', 'Weight', 'Severity', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-[#64748b]">
                    Loading rules...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-[#64748b]">
                    No rules found.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => {
                  const severity = toSeverity(rule.weight);
                  return (
                    <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-5 py-4">
                        <span className="font-mono text-sm text-[#64748b]">{formatRuleId(rule.id)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-[#0f172a]">{rule.question}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[#64748b]">{rule.category || '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-28 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#4f46e5] rounded-full"
                              style={{ width: `${Math.min(Number(rule.weight || 0), 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-[#0f172a] w-8">{rule.weight}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityColors[severity]}`}>
                          {severity}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => openEdit(rule)}
                            className="p-1.5 text-[#64748b] hover:text-[#4f46e5] hover:bg-[#eef2fb] rounded-lg transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(rule)}
                            className="p-1.5 text-[#64748b] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#e2e8f0] p-6 space-y-4">
            <div>
              <h4 className="text-[#0f172a] text-lg font-bold">
                {modal.mode === 'create' ? 'Add Rule' : 'Edit Rule'}
              </h4>
              <p className="text-sm text-[#64748b] mt-1">Provide rule details for scoring.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-[#334155]">Rule Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleFormChange('name')}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#334155]">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={handleFormChange('category')}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#334155]">Weight *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.weight}
                  onChange={handleFormChange('weight')}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm font-semibold text-[#475569] hover:text-[#0f172a]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-semibold bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Save Rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#e2e8f0] p-6 space-y-4">
            <div>
              <h4 className="text-[#0f172a] text-lg font-bold">Delete Rule</h4>
              <p className="text-sm text-[#64748b] mt-1">
                Are you sure you want to delete {deleteTarget.question}?
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-[#475569] hover:text-[#0f172a]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
