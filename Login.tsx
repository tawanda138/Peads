
import React, { useState } from 'react';
import { User } from './types';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid username or password. Please contact the administrator.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-blue-700 p-8 text-center text-white relative overflow-hidden">
          <i className="fa-solid fa-hospital-user text-6xl opacity-20 absolute -right-4 -bottom-4"></i>
          <div className="relative z-10">
            <i className="fa-solid fa-shield-halved text-4xl mb-4"></i>
            <h1 className="text-2xl font-black uppercase tracking-tight">Hospital Portal</h1>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-2">Authorized Access Only</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold flex items-center gap-3 border border-red-100 animate-shake">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
            <div className="relative">
              <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 active:scale-95 uppercase text-xs tracking-widest"
          >
            Authenticate Session
          </button>

          <div className="text-center pt-4 border-t border-slate-50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              Machinga District Hospital Health Information System
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
