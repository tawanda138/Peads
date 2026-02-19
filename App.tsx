
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { WorksheetState, DiseaseEntry, WorksheetMetadata, User, AppTab, DeathAuditEntry } from './types';
import { INITIAL_DISEASE_LIST } from './constants';
import { extractWorksheetData } from './geminiService';
import Visualizations from './Visualizations';
import DataVisualizer from './DataVisualizer';
import Login from './Login';
import UserManagement from './UserManagement';
import DeathAudit from './DeathAudit';

const App: React.FC = () => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // User Management State
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('app_users');
    return saved ? JSON.parse(saved) : [
      { 
        id: 'admin-1', 
        username: 'machinga', 
        password: 'machinga123', 
        role: 'admin', 
        permissions: ['worksheet', 'dashboard', 'visualizer', 'death_audit', 'admin'] 
      }
    ];
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  
  // Historical Reports State
  const [history, setHistory] = useState<WorksheetState[]>(() => {
    const saved = localStorage.getItem('hospital_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Death Audit State
  const [deathAudits, setDeathAudits] = useState<DeathAuditEntry[]>(() => {
    const saved = localStorage.getItem('death_audits');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sync Users to LocalStorage
  useEffect(() => {
    localStorage.setItem('app_users', JSON.stringify(users));
  }, [users]);

  // Sync History to LocalStorage
  useEffect(() => {
    localStorage.setItem('hospital_history', JSON.stringify(history));
  }, [history]);

  // Sync Death Audits to LocalStorage
  useEffect(() => {
    localStorage.setItem('death_audits', JSON.stringify(deathAudits));
  }, [deathAudits]);

  // Sync Session to SessionStorage
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('current_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('current_user');
    }
  }, [currentUser]);

  // Access Control: Redirect if current tab is not allowed
  useEffect(() => {
    if (currentUser && !currentUser.permissions.includes(activeTab)) {
      if (currentUser.permissions.length > 0) {
        setActiveTab(currentUser.permissions[0]);
      }
    }
  }, [activeTab, currentUser]);

  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  }, []);

  const [metadata, setMetadata] = useState<WorksheetMetadata>({
    wardName: 'Peadiatric Ward',
    month: defaultDate.toLocaleString('default', { month: 'long' }),
    year: defaultDate.getFullYear().toString(),
    compiledBy: '',
    checkedBy: '',
    totalInpatientDays: 0,
    referralsFromHC: 0,
    referralsToHospital: 0,
    wardRounds: 0,
    abscondees: 0,
  });

  const [entries, setEntries] = useState<DiseaseEntry[]>(
    INITIAL_DISEASE_LIST.map((name, index) => ({
      id: `disease-${index}`,
      name,
      admissions_u5: 0,
      admissions_o5: 0,
      deaths_u5: 0,
      deaths_o5: 0,
    }))
  );

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Explicitly land on dashboard if the user has permission, otherwise fallback to first allowed tab
    if (user.permissions.includes('dashboard')) {
      setActiveTab('dashboard');
    } else if (user.permissions.length > 0) {
      setActiveTab(user.permissions[0]);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setEditingId(null);
    setActiveTab('dashboard'); // Reset tab state on logout
    sessionStorage.removeItem('current_user');
  };

  const resetSession = () => {
    setEditingId(null);
    setEntries(INITIAL_DISEASE_LIST.map((name, index) => ({
      id: `disease-${index}`,
      name,
      admissions_u5: 0,
      admissions_o5: 0,
      deaths_u5: 0,
      deaths_o5: 0,
    })));
    setMetadata(prev => ({
      ...prev,
      month: defaultDate.toLocaleString('default', { month: 'long' }),
      year: defaultDate.getFullYear().toString(),
      totalInpatientDays: 0,
      referralsFromHC: 0,
      referralsToHospital: 0,
      abscondees: 0,
    }));
  };

  const loadReportForEditing = (report: WorksheetState) => {
    setEditingId(report.id);
    setMetadata({ ...report.metadata });
    setEntries([...report.entries]);
    setActiveTab('worksheet');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const extracted = await extractWorksheetData(base64);
        if (extracted.metadata) setMetadata(prev => ({ ...prev, ...extracted.metadata }));
        if (extracted.entries) {
          setEntries(currentEntries => 
            currentEntries.map(entry => {
              const matched = extracted.entries?.find(e => 
                e.name.toLowerCase().includes(entry.name.toLowerCase()) || 
                entry.name.toLowerCase().includes(e.name.toLowerCase())
              );
              return matched ? { ...entry, ...matched } : entry;
            })
          );
        }
      } catch (err) {
        alert("Failed to extract data. Please try again or enter manually.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateEntry = (id: string, field: keyof Omit<DiseaseEntry, 'id' | 'name'>, value: string) => {
    const numValue = parseInt(value) || 0;
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: numValue } : e));
  };

  const updateMetadata = (field: keyof WorksheetMetadata, value: string | number) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const submitReport = () => {
    if (editingId) {
      setHistory(prev => prev.map(r => r.id === editingId ? { 
        ...r, 
        metadata: { ...metadata }, 
        entries: [...entries],
        timestamp: Date.now() 
      } : r));
      alert(`Report updated successfully.`);
    } else {
      const newReport: WorksheetState = {
        id: `report-${Date.now()}`,
        metadata: { ...metadata },
        entries: [...entries],
        timestamp: Date.now()
      };
      setHistory(prev => [...prev, newReport]);
      alert(`Report saved to historical database.`);
    }
    resetSession();
    setActiveTab('dashboard');
  };

  const handleAddDeathAudit = (audit: DeathAuditEntry) => {
    setDeathAudits(prev => [audit, ...prev]);
  };

  const handleDeleteDeathAudit = (id: string) => {
    if (confirm('Permanently delete this individual death audit record?')) {
      setDeathAudits(prev => prev.filter(a => a.id !== id));
    }
  };

  const currentSessionState: WorksheetState = { id: editingId || 'current', metadata, entries, timestamp: Date.now() };

  // Render Login Screen if not authenticated
  if (!currentUser) {
    return <Login onLogin={handleLogin} users={users} />;
  }

  const userPermissions = currentUser.permissions;

  return (
    <div className="min-h-screen pb-32 bg-slate-50">
      <header className="bg-blue-700 text-white shadow-lg sticky top-0 z-50 px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-white/20 rounded-full blur group-hover:bg-white/40 transition duration-300"></div>
              <img 
                src="https://images.unsplash.com/photo-1581594632752-4271135b753a?q=80&w=200&h=200&auto=format&fit=crop" 
                alt="Infant Care" 
                className="relative w-14 h-14 rounded-full border-2 border-white/50 object-cover shadow-lg"
              />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">Machinga Peadiatric Ward</h1>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">In-Patient Morbidity Reporting Portal</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <nav className="flex bg-blue-800/50 p-1 rounded-xl shadow-inner border border-blue-600/30">
              {userPermissions.includes('dashboard') && (
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tighter transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-white text-blue-700 shadow-md scale-105' : 'text-blue-100 hover:bg-blue-600'}`}
                >
                  <i className="fa-solid fa-chart-simple"></i>
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              )}
              {userPermissions.includes('worksheet') && (
                <button 
                  onClick={() => setActiveTab('worksheet')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tighter transition-all flex items-center gap-2 ${activeTab === 'worksheet' ? 'bg-white text-blue-700 shadow-md scale-105' : 'text-blue-100 hover:bg-blue-600'}`}
                >
                  <i className="fa-solid fa-pen-to-square"></i>
                  <span className="hidden sm:inline">Data Entry</span>
                </button>
              )}
              {userPermissions.includes('death_audit') && (
                <button 
                  onClick={() => setActiveTab('death_audit')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tighter transition-all flex items-center gap-2 ${activeTab === 'death_audit' ? 'bg-white text-blue-700 shadow-md scale-105' : 'text-blue-100 hover:bg-blue-600'}`}
                >
                  <i className="fa-solid fa-file-invoice"></i>
                  <span className="hidden sm:inline">Death Audit</span>
                </button>
              )}
              {userPermissions.includes('visualizer') && (
                <button 
                  onClick={() => setActiveTab('visualizer')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tighter transition-all flex items-center gap-2 ${activeTab === 'visualizer' ? 'bg-white text-blue-700 shadow-md scale-105' : 'text-blue-100 hover:bg-blue-600'}`}
                >
                  <i className="fa-solid fa-layer-group"></i>
                  <span className="hidden sm:inline">Visualizer</span>
                </button>
              )}
              {userPermissions.includes('admin') && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tighter transition-all flex items-center gap-2 ${activeTab === 'admin' ? 'bg-white text-blue-700 shadow-md scale-105' : 'text-blue-100 hover:bg-blue-600'}`}
                >
                  <i className="fa-solid fa-user-shield"></i>
                  <span className="hidden sm:inline">Users</span>
                </button>
              )}
            </nav>
            
            <div className="flex items-center gap-4 pl-4 ml-4 border-l border-blue-600/50">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Active Personnel</p>
                <div className="flex items-center justify-end gap-2">
                  <span className={`w-2 h-2 rounded-full ${currentUser.role === 'admin' ? 'bg-indigo-400' : 'bg-emerald-400'} animate-pulse`}></span>
                  <p className="text-xs font-black uppercase">{currentUser.username}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="bg-white/10 hover:bg-red-500 text-white p-2.5 rounded-xl transition-all border border-white/10 hover:border-red-400 group shadow-sm"
                title="Secure Logout"
              >
                <i className="fa-solid fa-right-from-bracket group-hover:scale-110 transition-transform"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-8 space-y-8">
        {activeTab === 'dashboard' && <Visualizations history={history} currentSession={currentSessionState} />}
        {activeTab === 'visualizer' && <DataVisualizer history={history} currentSession={currentSessionState} />}
        {activeTab === 'death_audit' && <DeathAudit audits={deathAudits} onAddAudit={handleAddDeathAudit} onDeleteAudit={handleDeleteDeathAudit} />}
        {activeTab === 'admin' && (
          <UserManagement 
            users={users} 
            onAddUser={u => setUsers([...users, u])}
            onDeleteUser={id => setUsers(users.filter(u => u.id !== id))}
            onUpdatePermissions={(userId, perms) => setUsers(users.map(u => u.id === userId ? { ...u, permissions: perms } : u))}
          />
        )}
        {activeTab === 'worksheet' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4 mb-6">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-3">
                <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                {editingId ? "Update Existing Report" : "New Morbidity Entry"}
              </h2>
              <div className="flex gap-2">
                <label className="cursor-pointer bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95">
                  <i className="fa-solid fa-camera"></i>
                  {loading ? "Analyzing Document..." : "Photo Extraction"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
                </label>
                <button onClick={resetSession} className="text-[10px] font-black text-slate-400 hover:text-red-600 px-4 py-2.5 rounded-xl hover:bg-red-50 transition-all uppercase tracking-widest border border-transparent hover:border-red-100">
                  {editingId ? "Cancel Edit" : "Clear Fields"}
                </button>
              </div>
            </div>

            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-hospital-user text-blue-500"></i> Ward / Unit Name
                  </label>
                  <input type="text" value={metadata.wardName} onChange={e => updateMetadata('wardName', e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" placeholder="e.g. Ward 2B" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporting Month</label>
                  <select value={metadata.month} onChange={e => updateMetadata('month', e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none">
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year</label>
                  <input type="number" value={metadata.year} onChange={e => updateMetadata('year', e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 text-sm font-bold text-center outline-none" />
                </div>
                
                {/* Second row of metadata */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-bed-pulse text-indigo-500"></i> In-Patient Days
                  </label>
                  <input type="number" value={metadata.totalInpatientDays} onChange={e => updateMetadata('totalInpatientDays', parseInt(e.target.value) || 0)} className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-truck-arrow-right text-emerald-500"></i> Ref. From HC
                  </label>
                  <input type="number" value={metadata.referralsFromHC} onChange={e => updateMetadata('referralsFromHC', parseInt(e.target.value) || 0)} className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-truck-medical text-blue-500"></i> Ref. To Hospital
                  </label>
                  <input type="number" value={metadata.referralsToHospital} onChange={e => updateMetadata('referralsToHospital', parseInt(e.target.value) || 0)} className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-person-walking-arrow-right text-amber-500"></i> Abscondees
                  </label>
                  <input type="number" value={metadata.abscondees} onChange={e => updateMetadata('abscondees', parseInt(e.target.value) || 0)} className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none" />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden mb-12">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-50 border-b-2 border-slate-200">
                    <tr>
                      <th rowSpan={2} className="px-8 py-6 text-left font-black text-slate-500 text-[10px] uppercase tracking-widest sticky left-0 bg-slate-50 z-10 min-w-[300px]">Morbidity Condition</th>
                      <th colSpan={3} className="px-6 py-3 text-center border-l border-slate-200 font-black text-blue-700 bg-blue-50/50 uppercase text-[10px] tracking-widest">Admissions</th>
                      <th colSpan={3} className="px-6 py-3 text-center border-l border-slate-200 font-black text-red-700 bg-red-50/50 uppercase text-[10px] tracking-widest">Deaths</th>
                    </tr>
                    <tr className="bg-slate-100/50">
                      <th className="px-4 py-3 border-l border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-tighter">Under 5</th>
                      <th className="px-4 py-3 border-l border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-tighter">Over 5</th>
                      <th className="px-4 py-3 border-l border-slate-200 text-[10px] font-black uppercase text-slate-700 bg-blue-100/30">Total</th>
                      <th className="px-4 py-3 border-l border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-tighter">Under 5</th>
                      <th className="px-4 py-3 border-l border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-tighter">Over 5</th>
                      <th className="px-4 py-3 border-l border-slate-200 text-[10px] font-black uppercase text-slate-700 bg-red-100/30">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr key={entry.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/40 transition-all border-b border-slate-100 last:border-0`}>
                        <td className="px-8 py-4 font-bold text-slate-700 border-r border-slate-100 sticky left-0 bg-inherit z-10">{entry.name}</td>
                        <td className="px-2 py-1 border-r border-slate-100 text-center">
                          <input type="number" value={entry.admissions_u5 === 0 ? '' : entry.admissions_u5} onChange={e => updateEntry(entry.id, 'admissions_u5', e.target.value)} className="w-full text-center bg-transparent outline-none font-black text-blue-600 p-2 rounded-lg hover:bg-white focus:bg-white transition-all" />
                        </td>
                        <td className="px-2 py-1 border-r border-slate-100 text-center">
                          <input type="number" value={entry.admissions_o5 === 0 ? '' : entry.admissions_o5} onChange={e => updateEntry(entry.id, 'admissions_o5', e.target.value)} className="w-full text-center bg-transparent outline-none font-black text-blue-900 p-2 rounded-lg hover:bg-white focus:bg-white transition-all" />
                        </td>
                        <td className="px-4 py-1 border-r border-slate-100 bg-blue-50/40 font-black text-center text-blue-800 text-xs">{entry.admissions_u5 + entry.admissions_o5}</td>
                        <td className="px-2 py-1 border-r border-slate-100 text-center">
                          <input type="number" value={entry.deaths_u5 === 0 ? '' : entry.deaths_u5} onChange={e => updateEntry(entry.id, 'deaths_u5', e.target.value)} className="w-full text-center bg-transparent outline-none font-black text-red-600 p-2 rounded-lg hover:bg-white focus:bg-white transition-all" />
                        </td>
                        <td className="px-2 py-1 border-r border-slate-100 text-center">
                          <input type="number" value={entry.deaths_o5 === 0 ? '' : entry.deaths_o5} onChange={e => updateEntry(entry.id, 'deaths_o5', e.target.value)} className="w-full text-center bg-transparent outline-none font-black text-red-900 p-2 rounded-lg hover:bg-white focus:bg-white transition-all" />
                        </td>
                        <td className="px-4 py-1 bg-red-50/40 font-black text-center text-red-800 text-xs">{entry.deaths_u5 + entry.deaths_o5}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>

      {activeTab === 'worksheet' && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t p-5 flex justify-center z-[60] shadow-2xl">
          <button className={`${editingId ? 'bg-amber-600 shadow-amber-200' : 'bg-blue-600 shadow-blue-200'} text-white px-10 py-4 rounded-2xl font-black shadow-xl flex items-center gap-4 transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest`} onClick={submitReport}>
            <i className={`fa-solid ${editingId ? 'fa-floppy-disk' : 'fa-cloud-arrow-up'} text-lg`}></i>
            {editingId ? 'Confirm Updates' : 'Publish Report to Database'}
          </button>
        </footer>
      )}

      {loading && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center text-white p-8 text-center animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-24 h-24 border-8 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <i className="fa-solid fa-microchip absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl animate-pulse"></i>
          </div>
          <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter mt-8">Machine Intelligence Processing</h2>
          <p className="text-slate-400 font-bold max-w-md text-sm leading-relaxed uppercase tracking-widest">
            Gemini Flash is decoding the handwritten counts and validating medical categories. Please maintain connection.
          </p>
        </div>
      )}
    </div>
  );
};

export default App;
