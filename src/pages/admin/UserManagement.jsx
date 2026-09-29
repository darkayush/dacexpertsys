import { useEffect, useMemo, useState } from 'react';
import {
  createUser,
  deleteUser,
  getUsers,
  resetUserPassword,
  updateUser,
  updateUserRole,
} from '../../services/api';
import EmptyState from '../../components/ui/EmptyState';

const ROLE_OPTIONS = ['warden', 'chief_warden', 'dsw', 'admin', 'student'];

const ROLE_BADGE_MAP = {
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  dsw: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  chief_warden: 'bg-blue-50 text-blue-700 border-blue-200',
  warden: 'bg-amber-50 text-amber-700 border-amber-200',
  student: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatingRoleId, setUpdatingRoleId] = useState(null);
  const [resettingPasswordId, setResettingPasswordId] = useState(null);
  const [savingUser, setSavingUser] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const [userModal, setUserModal] = useState({ open: false, mode: 'create' });
  const [form, setForm] = useState({
    id: null,
    name: '',
    email: '',
    role: 'warden',
    program: '',
    enrollment_no: '',
    year: '',
    hostel: '',
    room: '',
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tempPasswordModal, setTempPasswordModal] = useState({
    open: false,
    userName: '',
    tempPassword: '',
  });

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      try {
        setLoading(true);
        setError('');
        const payload = await getUsers({ excludeRole: 'student' });
        if (!mounted) return;
        setUsers(payload);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError?.message || 'Failed to fetch users');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !query ||
        String(user.name || '').toLowerCase().includes(query) ||
        String(user.email || '').toLowerCase().includes(query);
      const matchesRole = roleFilter === 'All' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = page * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  const handleRoleChange = async (userId, nextRole) => {
    try {
      setUpdatingRoleId(userId);
      setError('');
      setSuccess('');
      const result = await updateUserRole(userId, nextRole);

      setUsers((prev) => prev.map((user) => (
        user.id === userId ? { ...user, role: result?.user?.role || nextRole } : user
      )));

      setSuccess('User role updated successfully.');
    } catch (roleError) {
      setError(roleError?.message || 'Failed to update role.');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const openCreateModal = () => {
    setForm({
      id: null,
      name: '',
      email: '',
      role: 'warden',
      program: '',
      enrollment_no: '',
      year: '',
      hostel: '',
      room: '',
    });
    setUserModal({ open: true, mode: 'create' });
    setError('');
    setSuccess('');
  };

  const openEditModal = (user) => {
    setForm({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'warden',
      program: user.program || '',
      enrollment_no: user.enrollment_no || '',
      year: user.year ? String(user.year) : '',
      hostel: user.hostel || '',
      room: user.room || '',
    });
    setUserModal({ open: true, mode: 'edit' });
    setError('');
    setSuccess('');
  };

  const closeUserModal = () => {
    setUserModal({ open: false, mode: 'create' });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      setSavingUser(true);
      setError('');
      setSuccess('');

      if (!form.name || !form.email) {
        throw new Error('Name and email are required');
      }

      if (userModal.mode === 'create') {
        const created = await createUser({
          name: form.name,
          email: form.email,
          role: form.role,
          hostel: form.hostel || null,
          room: form.room || null,
          program: form.program || null,
          enrollment_no: form.enrollment_no || null,
          year: form.year ? Number(form.year) : null,
        });

        setUsers((prev) => [created.user, ...prev]);
        setSuccess('User created successfully.');
      } else {
        const updated = await updateUser(form.id, {
          name: form.name,
          email: form.email,
          role: form.role,
          hostel: form.hostel || null,
          room: form.room || null,
          program: form.program || null,
          enrollment_no: form.enrollment_no || null,
          year: form.year ? Number(form.year) : null,
        });

        setUsers((prev) => prev.map((u) => (u.id === form.id ? updated.user : u)));
        setSuccess('User updated successfully.');
      }

      closeUserModal();
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save user');
    } finally {
      setSavingUser(false);
    }
  };

  const handleResetPassword = async (userId, userName) => {
    try {
      setResettingPasswordId(userId);
      setError('');
      setSuccess('');

      const result = await resetUserPassword(userId);
      setTempPasswordModal({
        open: true,
        userName,
        tempPassword: result.tempPassword || 'Password reset link sent',
      });
      setSuccess(`Password generated for ${userName}`);
    } catch (resetError) {
      setError(resetError?.message || 'Failed to reset password');
    } finally {
      setResettingPasswordId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    try {
      setError('');
      setSuccess('');
      await deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setSuccess(`User ${deleteTarget.name} removed successfully.`);
      setDeleteTarget(null);
    } catch (delError) {
      setError(delError?.message || 'Failed to delete user');
    }
  };

  const tabOptions = ['All', 'warden', 'chief_warden', 'dsw', 'admin'];

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a] leading-tight">Faculty & Administrative Users</h2>
          <p className="text-xs text-[#64748b] mt-0.5">Manage access control, permissions, and security credentials</p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 bg-[#5c56e9] hover:bg-[#4338ca] text-white text-xs font-bold rounded-xl px-4 py-2.5 shadow-sm hover:shadow transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Add New User
        </button>
      </div>

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-[#edf2f7] shadow-sm overflow-hidden">
        {/* Search & Tabs Header */}
        <div className="p-5 border-b border-[#edf2f7] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search by name or email..."
              className="w-full bg-[#f8fafc] border border-[#edf2f7] rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#5c56e9] focus:ring-2 focus:ring-[#5c56e9]/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#f8fafc] p-1 rounded-xl border border-[#edf2f7]">
            {tabOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setRoleFilter(opt);
                  setPage(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  roleFilter === opt
                    ? 'bg-white text-[#5c56e9] shadow-xs'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                {opt.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* User Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-3 border-[#5c56e9] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-[#64748b]">Loading user roster...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon="group"
              title="No Users Found"
              description="No user accounts match the current filter or search criteria."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#edf2f7]">
                    <th className="px-6 py-3.5 text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">User</th>
                    <th className="px-6 py-3.5 text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">Role Access</th>
                    <th className="px-6 py-3.5 text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">Assigned Block</th>
                    <th className="px-6 py-3.5 text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">Room</th>
                    <th className="px-6 py-3.5 text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2f7]">
                  {paginatedUsers.map((user) => {
                    const initials = (user.name || 'User')
                      .split(' ')
                      .filter(Boolean)
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();

                    const badgeClass = ROLE_BADGE_MAP[user.role] || 'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <tr key={user.id} className="hover:bg-[#f8fafc] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5c56e9] to-[#3b82f6] text-white flex items-center justify-center text-xs font-bold shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0f172a] truncate">{user.name || 'Unnamed'}</p>
                              <p className="text-xs text-[#64748b] truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${badgeClass}`}>
                            {user.role?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-[#334155]">{user.hostel || 'Campus Wide'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-[#64748b]">{user.room || '—'}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={user.role}
                              disabled={updatingRoleId === user.id}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              className="bg-[#f8fafc] border border-[#edf2f7] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#334155] focus:outline-none focus:border-[#5c56e9] cursor-pointer"
                            >
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>
                              ))}
                            </select>

                            <button
                              type="button"
                              disabled={resettingPasswordId === user.id}
                              onClick={() => handleResetPassword(user.id, user.name || 'User')}
                              title="Reset Password"
                              className="p-1.5 rounded-xl border border-[#edf2f7] bg-[#f8fafc] hover:bg-slate-100 text-[#64748b] hover:text-[#5c56e9] transition-colors disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(user)}
                              title="Edit User"
                              className="p-1.5 rounded-xl border border-[#edf2f7] bg-[#f8fafc] hover:bg-[#5c56e9]/10 text-[#64748b] hover:text-[#5c56e9] transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(user)}
                              title="Delete User"
                              className="p-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#edf2f7]">
              <p className="text-xs text-[#64748b]">
                Showing <strong className="text-[#0f172a]">{filteredUsers.length > 0 ? page * pageSize + 1 : 0}</strong>–
                <strong className="text-[#0f172a]">{Math.min((page + 1) * pageSize, filteredUsers.length)}</strong> of{' '}
                <strong className="text-[#0f172a]">{filteredUsers.length}</strong> users
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs font-semibold border border-[#edf2f7] rounded-xl bg-white text-[#64748b] hover:bg-[#f8fafc] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="text-xs font-bold text-[#0f172a] px-2">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-xs font-semibold border border-[#edf2f7] rounded-xl bg-white text-[#64748b] hover:bg-[#f8fafc] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal: Create or Edit User */}
      {userModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-[#edf2f7] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf2f7]">
              <h4 className="text-[#0f172a] text-base font-bold">
                {userModal.mode === 'create' ? 'Create New Faculty/Admin User' : 'Edit User Profile'}
              </h4>
              <button
                type="button"
                onClick={closeUserModal}
                className="text-[#94a3b8] hover:text-[#0f172a]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[#334155] text-xs font-bold uppercase tracking-wider block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#5c56e9] focus:ring-2 focus:ring-[#5c56e9]/20"
                  />
                </div>
                <div>
                  <label className="text-[#334155] text-xs font-bold uppercase tracking-wider block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. rajesh.sharma@bmu.edu.in"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#5c56e9] focus:ring-2 focus:ring-[#5c56e9]/20"
                  />
                </div>
                <div>
                  <label className="text-[#334155] text-xs font-bold uppercase tracking-wider block mb-1">Role *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#5c56e9] focus:ring-2 focus:ring-[#5c56e9]/20 cursor-pointer"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[#334155] text-xs font-bold uppercase tracking-wider block mb-1">Hostel Block</label>
                  <input
                    type="text"
                    value={form.hostel}
                    onChange={(e) => setForm((prev) => ({ ...prev, hostel: e.target.value }))}
                    placeholder="e.g. Block B"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#5c56e9] focus:ring-2 focus:ring-[#5c56e9]/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#edf2f7]">
                <button
                  type="button"
                  onClick={closeUserModal}
                  className="px-4 py-2 text-xs font-semibold text-[#64748b] hover:text-[#0f172a]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-6 py-2.5 bg-[#5c56e9] hover:bg-[#4338ca] text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {savingUser ? 'Saving...' : userModal.mode === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Temp Password Display */}
      {tempPasswordModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#edf2f7] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <div>
                <h4 className="text-[#0f172a] text-sm font-bold">Temporary Password Generated</h4>
                <p className="text-xs text-[#64748b]">For {tempPasswordModal.userName}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#edf2f7] flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-[#5c56e9]">
                {tempPasswordModal.tempPassword}
              </span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(tempPasswordModal.tempPassword)}
                className="text-xs font-bold text-[#5c56e9] hover:underline"
              >
                Copy
              </button>
            </div>

            <button
              type="button"
              onClick={() => setTempPasswordModal({ open: false, userName: '', tempPassword: '' })}
              className="w-full py-2.5 bg-[#5c56e9] text-white text-xs font-bold rounded-xl"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#edf2f7] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              <div>
                <h4 className="text-[#0f172a] text-sm font-bold">Confirm User Deletion</h4>
                <p className="text-xs text-[#64748b]">This action will permanently revoke all access.</p>
              </div>
            </div>

            <p className="text-xs text-[#334155] leading-relaxed">
              Are you sure you want to remove <strong className="text-[#0f172a]">{deleteTarget.name}</strong> ({deleteTarget.email})?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-[#64748b] hover:text-[#0f172a]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
