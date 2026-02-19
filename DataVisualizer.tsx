
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart
} from 'recharts';
import { WorksheetState } from './types';

interface DataVisualizerProps {
  history: WorksheetState[];
  currentSession: WorksheetState;
}

type ChartType = 'pivot' | 'trend' | 'area' | 'radar';
type PivotDimension = 'disease' | 'month' | 'year';
type PivotMetric = 'admissions' | 'deaths';

const DataVisualizer: React.FC<DataVisualizerProps> = ({ history, currentSession }) => {
  const [chartType, setChartType] = useState<ChartType>('pivot');
  const [pivotRow, setPivotRow] = useState<PivotDimension>('disease');
  const [pivotMetric, setPivotMetric] = useState<PivotMetric>('admissions');

  // Flatten data for easier pivoting
  const flatData = useMemo(() => {
    const allReports = [...history];
    const hasCurrentData = currentSession.entries.some(e => 
      e.admissions_u5 > 0 || e.admissions_o5 > 0 || e.deaths_u5 > 0 || e.deaths_o5 > 0
    );
    if (hasCurrentData) allReports.push(currentSession);

    const records: any[] = [];
    allReports.forEach(report => {
      report.entries.forEach(entry => {
        if (entry.admissions_u5 + entry.admissions_o5 + entry.deaths_u5 + entry.deaths_o5 > 0) {
          records.push({
            disease: entry.name,
            month: report.metadata.month,
            year: report.metadata.year,
            admissions: entry.admissions_u5 + entry.admissions_o5,
            deaths: entry.deaths_u5 + entry.deaths_o5,
            u5_admissions: entry.admissions_u5,
            o5_admissions: entry.admissions_o5,
            u5_deaths: entry.deaths_u5,
            o5_deaths: entry.deaths_o5,
          });
        }
      });
    });
    return records;
  }, [history, currentSession]);

  // Dynamic Grouping Logic for Pivot Table and Charts
  const chartData = useMemo(() => {
    const groups: Record<string, any> = {};

    flatData.forEach(record => {
      const key = record[pivotRow];
      if (!groups[key]) {
        groups[key] = {
          label: key,
          admissions: 0,
          deaths: 0,
          u5_admissions: 0,
          o5_admissions: 0,
          u5_deaths: 0,
          o5_deaths: 0,
        };
      }
      groups[key].admissions += record.admissions;
      groups[key].deaths += record.deaths;
      groups[key].u5_admissions += record.u5_admissions;
      groups[key].o5_admissions += record.o5_admissions;
      groups[key].u5_deaths += record.u5_deaths;
      groups[key].o5_deaths += record.o5_deaths;
    });

    return Object.values(groups).sort((a, b) => b[pivotMetric] - a[pivotMetric]);
  }, [flatData, pivotRow, pivotMetric]);

  const renderPivotTable = () => (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-slate-50 border-b-2 border-slate-200">
          <tr>
            <th className="px-6 py-4 text-left font-bold text-slate-600 uppercase tracking-widest text-[10px]">{pivotRow}</th>
            <th className="px-4 py-4 text-center font-bold text-blue-600">ADM (U5)</th>
            <th className="px-4 py-4 text-center font-bold text-blue-900">ADM (O5)</th>
            <th className="px-4 py-4 text-center font-black text-blue-700 bg-blue-50/50">TOTAL ADM</th>
            <th className="px-4 py-4 text-center font-bold text-red-600">DTH (U5)</th>
            <th className="px-4 py-4 text-center font-bold text-red-900">DTH (O5)</th>
            <th className="px-4 py-4 text-center font-black text-red-700 bg-red-50/50">TOTAL DTH</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {chartData.map((row, idx) => (
            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
              <td className="px-6 py-3 font-bold text-slate-700">{row.label}</td>
              <td className="px-4 py-3 text-center text-blue-600">{row.u5_admissions}</td>
              <td className="px-4 py-3 text-center text-blue-900">{row.o5_admissions}</td>
              <td className="px-4 py-3 text-center font-black text-blue-700 bg-blue-50/20">{row.admissions}</td>
              <td className="px-4 py-3 text-center text-red-600">{row.u5_deaths}</td>
              <td className="px-4 py-3 text-center text-red-900">{row.o5_deaths}</td>
              <td className="px-4 py-3 text-center font-black text-red-700 bg-red-50/20">{row.deaths}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-800 text-white font-bold">
          <tr>
            <td className="px-6 py-4 uppercase text-[10px] tracking-widest">Grand Total</td>
            <td className="px-4 py-4 text-center">{chartData.reduce((s, r) => s + r.u5_admissions, 0)}</td>
            <td className="px-4 py-4 text-center">{chartData.reduce((s, r) => s + r.o5_admissions, 0)}</td>
            <td className="px-4 py-4 text-center bg-blue-600">{chartData.reduce((s, r) => s + r.admissions, 0)}</td>
            <td className="px-4 py-4 text-center">{chartData.reduce((s, r) => s + r.u5_deaths, 0)}</td>
            <td className="px-4 py-4 text-center">{chartData.reduce((s, r) => s + r.o5_deaths, 0)}</td>
            <td className="px-4 py-4 text-center bg-red-600">{chartData.reduce((s, r) => s + r.deaths, 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Sidebar Controls */}
      <aside className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 border-b pb-2">Analysis Config</h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">View Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'pivot', icon: 'fa-table', label: 'Pivot' },
                  { id: 'trend', icon: 'fa-chart-line', label: 'Trend' },
                  { id: 'area', icon: 'fa-chart-area', label: 'Area' },
                  { id: 'radar', icon: 'fa-dharmachakra', label: 'Radar' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setChartType(type.id as ChartType)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                      chartType === type.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    <i className={`fa-solid ${type.icon}`}></i>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Group By (Rows)</label>
              <select 
                value={pivotRow} 
                onChange={(e) => setPivotRow(e.target.value as PivotDimension)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="disease">Name of Disease</option>
                <option value="month">Reporting Month</option>
                <option value="year">Reporting Year</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Sort By Metric</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setPivotMetric('admissions')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${pivotMetric === 'admissions' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Admissions
                </button>
                <button 
                  onClick={() => setPivotMetric('deaths')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${pivotMetric === 'deaths' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Deaths
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-700 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden group">
          <i className="fa-solid fa-lightbulb absolute -right-4 -bottom-4 text-7xl opacity-10 group-hover:scale-110 transition-transform"></i>
          <h4 className="text-sm font-black uppercase tracking-widest mb-2">Did you know?</h4>
          <p className="text-xs opacity-90 leading-relaxed font-medium">
            Pivot tables help you identify trends. Try grouping by "Month" to see seasonal spikes in malaria or pneumonia.
          </p>
        </div>
      </aside>

      {/* Visualization Area */}
      <main className="lg:col-span-3 space-y-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 min-h-[600px]">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <span className="w-1.5 h-8 bg-blue-600 rounded-full"></span>
              {chartType.toUpperCase()} ANALYSIS
              <span className="text-xs font-bold text-slate-400 tracking-normal ml-2">Filtered by {pivotRow}</span>
            </h2>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
              {flatData.length} records analyzed
            </div>
          </div>

          <div className="h-[500px] w-full">
            {chartType === 'pivot' && renderPivotTable()}

            {chartType === 'trend' && (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                  <Bar name="Total Admissions" dataKey="admissions" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  <Line name="Mortality Trend" type="monotone" dataKey="deaths" stroke="#ef4444" strokeWidth={3} dot={{ r: 6, fill: '#ef4444' }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}

            {chartType === 'area' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAdm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="admissions" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAdm)" />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {chartType === 'radar' && (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData.slice(0, 10)}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <PolarRadiusAxis />
                  <Radar name="Admissions" dataKey="admissions" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Radar name="Deaths" dataKey="deaths" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>

          {chartData.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <i className="fa-solid fa-database text-6xl mb-4 opacity-20"></i>
              <p className="font-bold">No historical data available for analysis.</p>
              <p className="text-sm">Submit reports to build your database.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DataVisualizer;
