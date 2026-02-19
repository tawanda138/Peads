
import React, { useState } from 'react';
import { User, UserRole, AppTab } from './types';

interface UserManagementProps {
  users: User[];
  onAddUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onUpdatePermissions: (userId: string, permissions: AppTab[]) => void;
}

const ALL_TABS: { id: AppTab; label: string; icon: string }[] = [
  { id: 'worksheet', label: 'Data Entry', icon: 'fa-pen-to-square' },
  { id: 'death_audit', label: 'Death Audit', icon: 'fa-file-invoice' },
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-simple' },
  { id: 'visualizer', label: 'Visualizer', icon: 'fa-layer-group' },
  { id: 'admin', label: 'User Admin', icon: 'fa-user-shield' }
];

const UserManagement: React.FC<UserManagementProps> = ({ users, onAddUser, onDeleteUser, onUpdatePermissions }) => {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('staff');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;

    const newUser: User = {
      id: `user-${Date.now()}`,
      username: newUsername,
      password: newPassword,
      role: newRole,
      permissions: newRole === 'admin' ? ['worksheet', 'death_audit', 'dashboard', 'visualizer', 'admin'] : ['dashboard', 'visualizer']
    };

    onAddUser(newUser);
    setNewUsername('');
    setNewPassword('');
    setNewRole('staff');
  };

  const togglePermission = (user: User, tab: AppTab) => {
    let newPerms: AppTab[];
    if (user.permissions.includes(tab)) {
      newPerms = user.permissions.filter(p => p !== tab);
    } else {
      newPerms = [...user.permissions, tab];
    }
    onUpdatePermissions(user.id, newPerms);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-6">
          <i className="fa-solid fa-user-plus text-blue-600"></i>
          Register New Personnel
        </h2>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username</label>
            <input 
              type="text" 
              value={newUsername} 
              onChange={e => setNewUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
              placeholder="e.g. j.doe"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Password</label>
            <input 
              type="text" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Role</label>
            <select 
              value={newRole} 
              onChange={e => setNewRole(e.target.value as UserRole)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
            >
              <option value="staff">Clinical Staff</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <button type="submit" className="bg-blue-600 text-white font-black p-3 rounded-xl uppercase text-[10px] tracking-widest hover:bg-blue-700 shadow-md transition-all active:scale-95">
            Create User Account
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <i className="fa-solid fa-users-gear text-blue-600"></i>
            Manage Access Rights
          </h2>
          <span className="text-xs font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
            {users.length} Registered Accounts
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left font-black text-slate-500 text-[10px] uppercase">User Profile</th>
                <th className="px-6 py-4 text-center font-black text-slate-500 text-[10px] uppercase">Access Permissions</th>
                <th className="px-6 py-4 text-right font-black text-slate-500 text-[10px] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg ${user.role === 'admin' ? 'bg-indigo-600' : 'bg-blue-500'}`}>
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-700">{user.username}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-tighter ${user.role === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {user.role} Account
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center flex-wrap gap-2">
                      {ALL_TABS.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => togglePermission(user, tab.id)}
                          disabled={user.role === 'admin' && tab.id === 'admin'}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                            user.permissions.includes(tab.id)
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-white text-slate-300 border-slate-100 line-through opacity-50'
                          }`}
                        >
                          <i className={`fa-solid ${tab.icon}`}></i>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => onDeleteUser(user.id)}
                      disabled={user.username === 'machinga'}
                      className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 disabled:opacity-30 transition-all"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
