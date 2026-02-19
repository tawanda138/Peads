
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { WorksheetState, DiseaseEntry } from './types';

interface VisualizationsProps {
  history: WorksheetState[];
  currentSession: WorksheetState;
}

type AggregationMode = 'monthly' | 'quarterly' | 'six-monthly' | 'yearly';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getQuarter = (month: string) => {
  const idx = MONTHS.indexOf(month);
  if (idx < 3) return 'Q1';
  if (idx < 6) return 'Q2';
  if (idx < 9) return 'Q3';
  return 'Q4';
};

const getHalfYear = (month: string) => {
  const idx = MONTHS.indexOf(month);
  return idx < 6 ? 'H1 (Jan-Jun)' : 'H2 (Jul-Dec)';
};

const Visualizations: React.FC<VisualizationsProps> = ({ history, currentSession }) => {
  const [mode, setMode] = useState<AggregationMode>('monthly');

  // Prepare all raw reports including current if it has data
  const rawReports = useMemo(() => {
    const reports = [...history];
    const hasCurrentData = currentSession.entries.some(e => 
      e.admissions_u5 > 0 || e.admissions_o5 > 0 || e.deaths_u5 > 0 || e.deaths_o5 > 0
    );
    if (hasCurrentData) {
      reports.push({ ...currentSession, id: 'current' });
    }
    return reports;
  }, [history, currentSession]);

  // Aggregate reports based on mode
  const aggregatedReports = useMemo(() => {
    if (mode === 'monthly') {
      return rawReports.map(r => ({
        ...r,
        label: `${r.metadata.month} ${r.metadata.year}${r.id === 'current' ? ' (Current)' : ''}`
      }));
    }

    const groups: Record<string, WorksheetState[]> = {};
    rawReports.forEach(r => {
      let groupKey = '';
      if (mode === 'quarterly') groupKey = `${getQuarter(r.metadata.month)} ${r.metadata.year}`;
      else if (mode === 'six-monthly') groupKey = `${getHalfYear(r.metadata.month)} ${r.metadata.year}`;
      else if (mode === 'yearly') groupKey = `${r.metadata.year}`;

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(r);
    });

    return Object.entries(groups).map(([label, reports]) => {
      // Create a dummy aggregated entry list
      const diseaseMap: Record<string, DiseaseEntry> = {};

      reports.forEach(report => {
        report.entries.forEach(entry => {
          if (!diseaseMap[entry.name]) {
            diseaseMap[entry.name] = { ...entry, id: `agg-${entry.name}` };
          } else {
            diseaseMap[entry.name].admissions_u5 += entry.admissions_u5;
            diseaseMap[entry.name].admissions_o5 += entry.admissions_o5;
            diseaseMap[entry.name].deaths_u5 += entry.deaths_u5;
            diseaseMap[entry.name].deaths_o5 += entry.deaths_o5;
          }
        });
      });

      return {
        id: `agg-${label}`,
        label: label,
        metadata: {
          ...reports[0].metadata,
          month: label,
          referralsFromHC: reports.reduce((sum, r) => sum + r.metadata.referralsFromHC, 0),
          referralsToHospital: reports.reduce((sum, r) => sum + r.metadata.referralsToHospital, 0),
          abscondees: reports.reduce((sum, r) => sum + r.metadata.abscondees, 0),
          wardRounds: reports.reduce((sum, r) => sum + r.metadata.wardRounds, 0),
          totalInpatientDays: reports.reduce((sum, r) => sum + r.metadata.totalInpatientDays, 0),
        },
        entries: Object.values(diseaseMap),
        timestamp: reports[0].timestamp
      };
    });
  }, [mode, rawReports]);

  const [selectedId, setSelectedId] = useState<string>('');

  // Effect to reset selected ID when mode changes or reports change
  React.useEffect(() => {
    if (aggregatedReports.length > 0) {
      const defaultReport = mode === 'monthly' 
        ? aggregatedReports.find(r => r.id === 'current') || aggregatedReports[aggregatedReports.length - 1]
        : aggregatedReports[aggregatedReports.length - 1];
      setSelectedId(defaultReport.id);
    }
  }, [aggregatedReports, mode]);

  const activeReport = useMemo(() => {
    return aggregatedReports.find(r => r.id === selectedId) || aggregatedReports[0];
  }, [selectedId, aggregatedReports]);

  if (!activeReport) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
        <i className="fa-solid fa-chart-pie text-6xl mb-4 opacity-20"></i>
        <h3 className="text-xl font-bold text-slate-500">No Data to Visualize</h3>
        <p className="text-sm">Please enter morbidity data in the "Data Entry" tab or upload a worksheet photo.</p>
      </div>
    );
  }

  const { entries, metadata } = activeReport;

  const activeEntries = useMemo(() => 
    entries.filter(e => 
      e.admissions_u5 > 0 || e.admissions_o5 > 0 || e.deaths_u5 > 0 || e.deaths_o5 > 0
    ), [entries]
  );

  const topAdmissions = [...activeEntries]
    .sort((a, b) => (b.admissions_u5 + b.admissions_o5) - (a.admissions_u5 + a.admissions_o5))
    .slice(0, 10);

  const topDeaths = [...activeEntries]
    .sort((a, b) => (b.deaths_u5 + b.deaths_o5) - (a.deaths_u5 + a.deaths_o5))
    .slice(0, 10);

  const metadataMetrics = [
    { name: 'Ref. In', value: metadata.referralsFromHC, color: '#3b82f6' },
    { name: 'Ref. Out', value: metadata.referralsToHospital, color: '#6366f1' },
    { name: 'Abscondees', value: metadata.abscondees, color: '#f59e0b' },
    { name: 'In-Patient Days', value: metadata.totalInpatientDays, color: '#8b5cf6' }
  ];

  const totalU5 = entries.reduce((acc, curr) => acc + curr.admissions_u5, 0);
  const totalO5 = entries.reduce((acc, curr) => acc + curr.admissions_o5, 0);
  const totalDeaths = entries.reduce((acc, curr) => acc + curr.deaths_u5 + curr.deaths_o5, 0);
  
  const ageData = [
    { name: 'Under 5', value: totalU5, color: '#3b82f6' },
    { name: 'Over 5', value: totalO5, color: '#1e40af' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Dashboard Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <i className="fa-solid fa-chart-line text-xl"></i>
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Morbidity Dashboard</h2>
            <p className="text-xs text-slate-500">
              Analysis for <span className="text-blue-600 font-bold">{(activeReport as any).label}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {(['monthly', 'quarterly', 'six-monthly', 'yearly'] as AggregationMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${
                  mode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m.replace('-', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all min-w-[200px]"
            >
              {aggregatedReports.map(report => (
                <option key={report.id} value={report.id}>
                  {(report as any).label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid - Updated to 5 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <i className="fa-solid fa-users absolute -right-4 -bottom-4 text-6xl opacity-10 group-hover:scale-110 transition-transform"></i>
          <p className="text-xs font-bold uppercase opacity-80 mb-1">Total Admissions</p>
          <p className="text-3xl font-black">{totalU5 + totalO5}</p>
        </div>
        <div className="bg-red-600 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <i className="fa-solid fa-heart-pulse absolute -right-4 -bottom-4 text-6xl opacity-10 group-hover:scale-110 transition-transform"></i>
          <p className="text-xs font-bold uppercase opacity-80 mb-1">Total Deaths</p>
          <p className="text-3xl font-black">{totalDeaths}</p>
        </div>
        <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <i className="fa-solid fa-bed-pulse absolute -right-4 -bottom-4 text-6xl opacity-10 group-hover:scale-110 transition-transform"></i>
          <p className="text-xs font-bold uppercase opacity-80 mb-1">In-Patient Days</p>
          <p className="text-3xl font-black">{metadata.totalInpatientDays}</p>
        </div>
        <div className="bg-amber-500 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <i className="fa-solid fa-person-walking-arrow-right absolute -right-4 -bottom-4 text-6xl opacity-10 group-hover:scale-110 transition-transform"></i>
          <p className="text-xs font-bold uppercase opacity-80 mb-1">Abscondees</p>
          <p className="text-3xl font-black">{metadata.abscondees}</p>
        </div>
        <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <i className="fa-solid fa-truck-medical absolute -right-4 -bottom-4 text-6xl opacity-10 group-hover:scale-110 transition-transform"></i>
          <p className="text-xs font-bold uppercase opacity-80 mb-1">Total Referrals</p>
          <p className="text-3xl font-black">{metadata.referralsFromHC + metadata.referralsToHospital}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Admissions Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-hospital-user text-blue-500"></i>
            Top Admissions by Disease
          </h3>
          <div className="h-80 w-full">
            {topAdmissions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAdmissions} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} interval={0} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                  <Bar name="Admissions <5" dataKey="admissions_u5" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar name="Admissions >5" dataKey="admissions_o5" stackId="a" fill="#1e40af" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic">No admissions recorded</div>
            )}
          </div>
        </div>

        {/* Deaths Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-skull-crossbones text-red-500"></i>
            Top Mortality by Disease
          </h3>
          <div className="h-80 w-full">
            {topDeaths.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDeaths} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} interval={0} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                  <Bar name="Deaths <5" dataKey="deaths_u5" stackId="b" fill="#ef4444" radius={[0, 0, 0, 0]} />
                  <Bar name="Deaths >5" dataKey="deaths_o5" stackId="b" fill="#b91c1c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic">No mortality recorded</div>
            )}
          </div>
        </div>

        {/* Operational Metrics */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-chart-line text-amber-500"></i>
            Operational Metrics
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metadataMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {metadataMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Distribution Pie */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-pie-chart text-indigo-500"></i>
            Admissions Age Breakdown
          </h3>
          <div className="h-64 w-full flex flex-col items-center justify-center">
            {ageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {ageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic">No age data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualizations;
