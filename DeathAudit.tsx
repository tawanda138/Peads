
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DeathAuditEntry } from './types';
import { DIAGNOSIS_LIST } from './constants';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell 
} from 'recharts';

interface DeathAuditProps {
  audits: DeathAuditEntry[];
  onAddAudit: (audit: DeathAuditEntry) => void;
  onDeleteAudit: (id: string) => void;
}

const PREDEFINED_STAFF = ["Eda Kachipala", "Dr W Barton"];

const DeathAudit: React.FC<DeathAuditProps> = ({ audits, onAddAudit, onDeleteAudit }) => {
  const [showForm, setShowForm] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'trend' | 'demographics' | 'rules'>('trend');
  const [isOtherStaff, setIsOtherStaff] = useState(false);
  const [isPer1000, setIsPer1000] = useState(false);
  
  // Diagnosis Search State
  const [diagnosisQuery, setDiagnosisQuery] = useState('');
  const [showDiagnosisList, setShowDiagnosisList] = useState(false);
  const diagnosisListRef = useRef<HTMLDivElement>(null);
  
  // Date Range State
  const [startDate, setStartDate] = useState('2023-06-01');
  const [endDate, setEndDate] = useState('2025-06-10');

  const initialFormData: Omit<DeathAuditEntry, 'id'> = {
    serialNumber: '',
    patientName: '',
    residentialAddress: '',
    dob: '',
    age: '',
    sex: 'Male',
    weight: '',
    readmission: 'N',
    admissionDate: '',
    admissionTime: '',
    deathDate: '',
    deathTime: '',
    deathOccurrence: 'Weekday',
    deadOnArrival: 'N',

    filePresentUsed: 'N',
    ccpUsed: 'N',
    recordsIncomplete: 'N',
    qualityOfNotesPoor: 'N',
    recordsNotesOk: 'Y',
    emergencySigns: '',
    triage: '',
    initialEtName: '',
    initialEtTime: '',

    isReferred: 'N',
    referringFacilityName: '',
    referralDate: '',
    referralTime: '',
    referringFacilityType: '',
    diagnosisOnReferral: '',
    reasonForReferral: '',
    preReferralTreatment: '',
    preReferralTreatmentTime: '',
    modeOfTransport: '',

    motherStatus: 'Alive and well',
    fatherStatus: 'Alive and well',
    primaryCaregiver: 'Mother',
    
    diagnosis: '',
    treatment: '',
    confirmedBy: PREDEFINED_STAFF[0]
  };

  const [formData, setFormData] = useState<Omit<DeathAuditEntry, 'id'>>(initialFormData);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (diagnosisListRef.current && !diagnosisListRef.current.contains(event.target as Node)) {
        setShowDiagnosisList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDiagnoses = useMemo(() => {
    if (!diagnosisQuery) return DIAGNOSIS_LIST.slice(0, 10);
    return DIAGNOSIS_LIST.filter(d => 
      d.toLowerCase().includes(diagnosisQuery.toLowerCase())
    ).slice(0, 15);
  }, [diagnosisQuery]);

  const trendData = useMemo(() => {
    if (audits.length === 0) return [];
    const monthlyCounts: Record<string, number> = {};
    const sortedAudits = [...audits].sort((a, b) => 
      new Date(a.deathDate).getTime() - new Date(b.deathDate).getTime()
    );
    sortedAudits.forEach(audit => {
      const date = new Date(audit.deathDate);
      const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear().toString().slice(-2)}`;
      monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
    });
    return Object.entries(monthlyCounts).map(([name, count]) => ({
      name,
      count: isPer1000 ? (count * 1.5) : count
    }));
  }, [audits, isPer1000]);

  const demographicsData = useMemo(() => {
    const ageCategories = { '<10': 0, '10-19': 0, '20-29': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60-69': 0, '70-79': 0, '80+': 0 };
    const genderCounts = { Female: 0, Male: 0 };
    const diagnosisCounts: Record<string, number> = {};

    audits.forEach(audit => {
      if (audit.sex === 'Female' || audit.sex === 'Male') genderCounts[audit.sex]++;
      const ageStr = audit.age.toLowerCase();
      let ageVal = parseInt(ageStr);
      if (ageStr.includes('month') || ageStr.includes('wk') || ageStr.includes('day')) ageCategories['<10']++;
      else if (!isNaN(ageVal)) {
        if (ageVal < 10) ageCategories['<10']++;
        else if (ageVal < 20) ageCategories['10-19']++;
        else if (ageVal < 30) ageCategories['20-29']++;
        else if (ageVal < 40) ageCategories['30-39']++;
        else if (ageVal < 50) ageCategories['40-49']++;
        else if (ageVal < 60) ageCategories['50-59']++;
        else if (ageVal < 70) ageCategories['60-69']++;
        else if (ageVal < 80) ageCategories['70-79']++;
        else ageCategories['80+']++;
      }
      const diags = audit.diagnosis.split(/[,;\n]/).map(d => d.trim()).filter(d => d.length > 0);
      diags.forEach(d => diagnosisCounts[d] = (diagnosisCounts[d] || 0) + 1);
    });

    return {
      age: Object.entries(ageCategories).map(([name, value]) => ({ name, value })),
      gender: Object.entries(genderCounts).map(([name, value]) => ({ name, value })),
      diagnosis: Object.entries(diagnosisCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }))
    };
  }, [audits]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    if (name === 'confirmedBy' && value === 'OTHER') {
      setIsOtherStaff(true);
      setFormData(prev => ({ ...prev, confirmedBy: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDiagnosisSelection = (d: string) => {
    setFormData(prev => ({ ...prev, diagnosis: d }));
    setDiagnosisQuery(d);
    setShowDiagnosisList(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDiagnosis = diagnosisQuery || formData.diagnosis;
    const newAudit: DeathAuditEntry = {
      ...formData,
      diagnosis: finalDiagnosis,
      id: `audit-${Date.now()}`
    };
    onAddAudit(newAudit);
    resetForm();
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setDiagnosisQuery('');
    setIsOtherStaff(false);
    setShowForm(false);
    setShowDiagnosisList(false);
  };

  const BAR_COLOR = "#6b7280";

  const renderSectionHeader = (title: string) => (
    <div className="bg-slate-100 px-4 py-2 border-y border-slate-200">
      <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">{title}</h3>
    </div>
  );

  const renderRadioGroup = (name: keyof Omit<DeathAuditEntry, 'id'>, label: string, options: string[]) => (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="flex gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, [name]: opt }))}
            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
              formData[name] === opt ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Visualization Panel */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 px-6 bg-white">
          {(['trend', 'demographics', 'rules'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${
                activeSubTab === tab ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
              {activeSubTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>
              )}
            </button>
          ))}
        </div>

        {activeSubTab === 'trend' && (
          <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-tight">DEATHS IN LAST 5 YEARS - ALL TREND</h3>
              <div className="flex items-center gap-2">
                <button className="p-1.5 text-slate-300 hover:text-slate-600"><i className="fa-solid fa-chart-column"></i></button>
                <button className="p-1.5 text-slate-600 border border-slate-200 rounded-md bg-slate-50"><i className="fa-solid fa-chart-line"></i></button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 mb-8 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dates</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 outline-none" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 outline-none" />
              </div>
              <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient count</span>
                <button onClick={() => setIsPer1000(!isPer1000)} className={`w-10 h-5 rounded-full relative transition-colors ${isPer1000 ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${isPer1000 ? 'right-0.5' : 'left-0.5'}`}></div>
                </button>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">per 1,000</span>
              </div>
            </div>
            <div className="h-72 w-full flex items-center justify-center">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="1 1" vertical={true} horizontal={true} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 'auto']} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="count" stroke="#64748b" strokeWidth={3} dot={true} activeDot={{ r: 6, fill: '#3b82f6' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                  <i className="fa-solid fa-chart-line text-5xl mb-4 opacity-10"></i>
                  <p className="font-bold text-sm">No Audit Records Entered</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSubTab === 'demographics' && (
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Age</h4>
                </div>
                <div className="p-6 h-64">
                  {audits.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={demographicsData.age}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="value" fill={BAR_COLOR} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (<div className="h-full flex items-center justify-center text-slate-300 text-xs">No records</div>)}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gender</h4>
                </div>
                <div className="p-6 h-64">
                  {audits.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={demographicsData.gender} barSize={60}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="value" fill={BAR_COLOR} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (<div className="h-full flex items-center justify-center text-slate-300 text-xs">No records</div>)}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Top Diagnoses</h4>
              </div>
              <div className="p-6 h-80">
                {audits.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demographicsData.diagnosis} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={150} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="value" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (<div className="h-full flex items-center justify-center text-slate-300 text-xs">No records</div>)}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'rules' && (
          <div className="p-8">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-2xl">
              <h4 className="text-sm font-black text-blue-800 uppercase mb-4">Machinga DH Death Audit Rules</h4>
              <ul className="space-y-3 text-xs font-bold text-blue-700/80">
                <li className="flex gap-2"><i className="fa-solid fa-check-circle mt-0.5"></i> All in-patient deaths must be documented within 24 hours.</li>
                <li className="flex gap-2"><i className="fa-solid fa-check-circle mt-0.5"></i> Senior clinical staff signature is mandatory for registry closure.</li>
                <li className="flex gap-2"><i className="fa-solid fa-check-circle mt-0.5"></i> Cause of death should follow ICD-10 coding where applicable.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
          <i className="fa-solid fa-file-invoice text-red-600"></i> Audit Records
        </h2>
        <button onClick={() => setShowForm(true)} className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-700 transition-all flex items-center gap-2">
          <i className="fa-solid fa-plus"></i> Record Death Audit
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={resetForm}></div>
          <div className="relative bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 max-h-[95vh] overflow-y-auto animate-in zoom-in duration-300">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-8 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <i className="fa-solid fa-file-medical text-red-600"></i>
                  Paediatric Death Review form
                </h2>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest italic">Confidential document</p>
              </div>
              <button onClick={resetForm} className="text-slate-400 hover:text-red-500 text-2xl transition-colors">
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-0 pb-8">
              {/* Patient Identification Section */}
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1 lg:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</label>
                  <input required name="patientName" value={formData.patientName} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Residential Address</label>
                  <input required name="residentialAddress" value={formData.residentialAddress} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth</label>
                  <input required type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age</label>
                  <input required name="age" value={formData.age} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender</label>
                  <select name="sex" value={formData.sex} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                    <option value="Male">M</option>
                    <option value="Female">F</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight (kg)</label>
                  <input name="weight" value={formData.weight} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                </div>

                <div className="space-y-1">
                  {renderRadioGroup('readmission', 'Re-admission', ['Y', 'N', 'U'])}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Admission</label>
                  <input required type="date" name="admissionDate" value={formData.admissionDate} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time of Admission</label>
                  <input type="time" name="admissionTime" value={formData.admissionTime} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                </div>
                <div className="space-y-1">
                  {renderRadioGroup('deathOccurrence', 'Death Occurred', ['Weekday', 'Weekend', 'Public holiday'])}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Death</label>
                  <input required type="date" name="deathDate" value={formData.deathDate} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time of Death</label>
                  <input type="time" name="deathTime" value={formData.deathTime} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                </div>
                <div className="space-y-1">
                  {renderRadioGroup('deadOnArrival', 'Dead on Arrival', ['Y', 'N', 'U'])}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Serial Number</label>
                  <input name="serialNumber" value={formData.serialNumber} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="Registry ID" />
                </div>
              </div>

              {/* Records (CCP) Section */}
              {renderSectionHeader('Records (critical care pathways (CCP))')}
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="space-y-1">{renderRadioGroup('filePresentUsed', '1. File present used', ['Y', 'N'])}</div>
                <div className="space-y-1">{renderRadioGroup('ccpUsed', '2. CCP used', ['Y', 'N'])}</div>
                <div className="space-y-1">{renderRadioGroup('recordsIncomplete', '3. Records incomplete', ['Y', 'N'])}</div>
                <div className="space-y-1">{renderRadioGroup('qualityOfNotesPoor', '4. Inadequate (Notes Poor)', ['Y', 'N'])}</div>
                <div className="space-y-1">{renderRadioGroup('recordsNotesOk', '5. Records & Notes OK', ['Y', 'N'])}</div>
                
                <div className="space-y-1 lg:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emergency Signs</label>
                  <input name="emergencySigns" value={formData.emergencySigns} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                </div>
                <div className="space-y-1">{renderRadioGroup('triage', 'Triage', ['E', 'P', 'Q'])}</div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name of initial ET</label>
                  <input name="initialEtName" value={formData.initialEtName} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time given</label>
                  <input type="time" name="initialEtTime" value={formData.initialEtTime} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                </div>
              </div>

              {/* Referred Section */}
              {renderSectionHeader('Referred (Yes or No) if no, skip this section')}
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 items-center">
                  <div className="lg:col-span-1">{renderRadioGroup('isReferred', 'Referred?', ['Y', 'N'])}</div>
                  {formData.isReferred === 'Y' && (
                    <>
                      <div className="md:col-span-2 lg:col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name of referring facility</label>
                        <input name="referringFacilityName" value={formData.referringFacilityName} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                      </div>
                      <div className="space-y-1">
                        {renderRadioGroup('referringFacilityType', 'Facility Type', ['Hospital', 'Health centre', 'Private', 'Other'])}
                      </div>
                    </>
                  )}
                </div>

                {formData.isReferred === 'Y' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Referral Date</label>
                      <input type="date" name="referralDate" value={formData.referralDate} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Referral Time</label>
                      <input type="time" name="referralTime" value={formData.referralTime} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnosis on Referral</label>
                      <input name="diagnosisOnReferral" value={formData.diagnosisOnReferral} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason for Referral</label>
                      <input name="reasonForReferral" value={formData.reasonForReferral} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pre-referral treatment</label>
                      <input name="preReferralTreatment" value={formData.preReferralTreatment} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mode of transport</label>
                      <input name="modeOfTransport" value={formData.modeOfTransport} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                    </div>
                  </div>
                )}
              </div>

              {/* Social Section */}
              {renderSectionHeader('Social')}
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mother Status</label>
                  <select name="motherStatus" value={formData.motherStatus} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                    <option>Alive and well</option>
                    <option>Dead</option>
                    <option>Sick</option>
                    <option>Unknown</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Father Status</label>
                  <select name="fatherStatus" value={formData.fatherStatus} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                    <option>Alive and well</option>
                    <option>Dead</option>
                    <option>Sick</option>
                    <option>Unknown</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Caregiver</label>
                  <select name="primaryCaregiver" value={formData.primaryCaregiver} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                    <option>Mother</option>
                    <option>Grandmother</option>
                    <option>Father</option>
                    <option>Other</option>
                    <option>Unknown</option>
                  </select>
                </div>
              </div>

              {/* Final Clinical Section (Combined searchable diagnosis) */}
              {renderSectionHeader('Final Clinical Summary')}
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 relative" ref={diagnosisListRef}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Final Diagnosis (Searchable)</label>
                  <div className="relative">
                    <input 
                      required 
                      type="text"
                      autoComplete="off"
                      placeholder="Search diagnosis..."
                      value={diagnosisQuery}
                      onFocus={() => setShowDiagnosisList(true)}
                      onChange={(e) => {
                        setDiagnosisQuery(e.target.value);
                        setShowDiagnosisList(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    {showDiagnosisList && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[110] max-h-60 overflow-y-auto">
                        {filteredDiagnoses.map((d, i) => (
                          <button key={i} type="button" onClick={() => handleDiagnosisSelection(d)} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-b border-slate-50 last:border-0">{d}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Treatment Provided</label>
                  <textarea name="treatment" value={formData.treatment} onChange={handleInputChange} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="List medications and interventions..."></textarea>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Review Confirmed By</label>
                  <select name="confirmedBy" value={formData.confirmedBy} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                    {PREDEFINED_STAFF.map(staff => <option key={staff} value={staff}>{staff}</option>)}
                    <option value="OTHER">Other Staff...</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-white border-t border-slate-100 py-4 px-8">
                <button type="button" onClick={resetForm} className="px-6 py-3 rounded-2xl font-black text-slate-400 hover:text-slate-600 transition-all text-xs uppercase tracking-widest">Cancel</button>
                <button type="submit" className="bg-red-600 text-white px-12 py-3 rounded-2xl font-black shadow-xl hover:bg-red-700 transition-all text-xs uppercase tracking-widest">Save Review Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table Records */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{audits.length} Records Found</p>
          <div className="flex gap-2">
            <button className="p-2 text-slate-400 hover:text-blue-600"><i className="fa-solid fa-download"></i></button>
            <button className="p-2 text-slate-400 hover:text-blue-600"><i className="fa-solid fa-print"></i></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left font-black text-slate-500 text-[10px] uppercase">Serial/Patient</th>
                <th className="px-6 py-4 text-left font-black text-slate-500 text-[10px] uppercase">Review Dates</th>
                <th className="px-6 py-4 text-left font-black text-slate-500 text-[10px] uppercase">Demographics</th>
                <th className="px-6 py-4 text-left font-black text-slate-500 text-[10px] uppercase">Clinical Summary</th>
                <th className="px-6 py-4 text-left font-black text-slate-500 text-[10px] uppercase">Review Status</th>
                <th className="px-6 py-4 text-right font-black text-slate-500 text-[10px] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audits.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400"><i className="fa-solid fa-folder-open text-4xl mb-3 opacity-20"></i><p className="font-bold">No paediatric death audits recorded yet.</p></td></tr>
              ) : (
                audits.map(audit => (
                  <tr key={audit.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-6 py-4">
                      <p className="text-[10px] font-black text-blue-600 uppercase mb-1">{audit.serialNumber || 'N/A'}</p>
                      <p className="font-black text-slate-800">{audit.patientName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Adm: <span className="text-slate-700">{audit.admissionDate}</span></p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Dth: <span className="text-red-600 font-black">{audit.deathDate}</span></p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-700">{audit.age}, {audit.sex}, {audit.weight}kg</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{audit.residentialAddress}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[300px]">
                        <p className="text-xs font-black text-slate-800 line-clamp-1" title={audit.diagnosis}>Dx: {audit.diagnosis}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1 italic" title={audit.treatment}>CCP: {audit.ccpUsed === 'Y' ? 'Used' : 'Not used'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${audit.recordsNotesOk === 'Y' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <p className="text-xs font-bold text-slate-700">{audit.recordsNotesOk === 'Y' ? 'Notes OK' : 'Inadequate'}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 font-black uppercase">By {audit.confirmedBy}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => onDeleteAudit(audit.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><i className="fa-solid fa-trash"></i></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeathAudit;
