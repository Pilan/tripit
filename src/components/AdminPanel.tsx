'use client';

import { useState, useEffect } from 'react';

interface Milestone {
  name: string;
  cost: number;
  order_index: number;
  description: string;
}

interface TripConfig {
  goal_city: string;
  total_cost: number;
  current_amount: number;
  start_cities: string[];
}

export default function AdminPanel() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [config, setConfig] = useState<TripConfig | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [goalCity, setGoalCity] = useState('');
  const [totalCost, setTotalCost] = useState(0);
  const [currentAmount, setCurrentAmount] = useState(0);
  const [message, setMessage] = useState('');

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const login = async () => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setLoggedIn(true);
      setLoginError('');
      loadConfig();
    } else {
      setLoginError('Wrong password!');
    }
  };

  const loadConfig = async () => {
    const res = await fetch('/api/admin/config');
    if (res.ok) {
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        setGoalCity(data.config.goal_city);
        setTotalCost(data.config.total_cost);
        setCurrentAmount(data.config.current_amount);
      }
      if (data.milestones) {
        setMilestones(data.milestones);
      }
    } else if (res.status === 401) {
      setLoggedIn(false);
    }
  };

  const saveConfig = async () => {
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          goal_city: goalCity,
          total_cost: totalCost,
          start_cities: config?.start_cities || ['Umeå', 'Sundsvall'],
          current_amount: currentAmount,
        },
        milestones: milestones.map((m, i) => ({ ...m, order_index: i })),
      }),
    });
    if (res.ok) {
      showMessage('Configuration saved!');
      loadConfig();
    }
  };

  const updateProgressAmount = async () => {
    const res = await fetch('/api/admin/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_amount: currentAmount }),
    });
    if (res.ok) {
      showMessage('Progress updated!');
      loadConfig();
    }
  };

  const exportConfig = async () => {
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exportToFile: true }),
    });
    if (res.ok) showMessage('Exported to trip-config.json!');
  };

  const importConfig = async () => {
    const res = await fetch('/api/seed', { method: 'POST' });
    if (res.ok) {
      showMessage('Imported from trip-config.json!');
      loadConfig();
    }
  };

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      { name: '', cost: 0, order_index: milestones.length, description: '' },
    ]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string | number) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const moveMilestone = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= milestones.length) return;
    const updated = [...milestones];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setMilestones(updated);
  };

  useEffect(() => {
    // Try loading config in case already logged in
    fetch('/api/admin/config').then(res => {
      if (res.ok) {
        setLoggedIn(true);
        loadConfig();
      }
    });
  }, []);

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-green-50">
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-8 max-w-sm w-full">
          <h1 className="text-3xl font-bold text-center mb-6 text-teal-700">
            🔐 Admin Login
          </h1>
          <input
            type="password"
            placeholder="Enter password..."
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            className="w-full p-3 border-2 border-teal-200 rounded-xl mb-4 text-lg focus:outline-none focus:border-teal-500 bg-white/70"
          />
          {loginError && <p className="text-red-500 text-center mb-3">{loginError}</p>}
          <button
            onClick={login}
            className="w-full bg-teal-600 text-white py-3 rounded-xl text-lg font-bold hover:bg-teal-700 transition-colors"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-green-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-teal-700">
          🗺️ Trip Admin Dashboard
        </h1>
        <p className="text-center text-gray-500 mb-6">Manage your fundraising trip</p>

        {message && (
          <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-xl mb-4 text-center font-bold">
            {message}
          </div>
        )}

        {/* Progress Update */}
        <section className="bg-white/70 backdrop-blur rounded-2xl shadow-md p-6 mb-5">
          <h2 className="text-2xl font-bold mb-4 text-teal-700">💰 Update Progress</h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-500 mb-1">Collected Amount (kr)</label>
              <input
                type="number"
                value={currentAmount}
                onChange={e => setCurrentAmount(Number(e.target.value))}
                className="w-full p-3 border border-gray-200 rounded-xl text-lg bg-white/80 focus:outline-none focus:border-teal-400"
              />
            </div>
            <button
              onClick={updateProgressAmount}
              className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
            >
              Update
            </button>
          </div>
          {config && (
            <div className="mt-3">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>{currentAmount.toLocaleString()} kr</span>
                <span>{Math.round((currentAmount / config.total_cost) * 100)}%</span>
                <span>{config.total_cost.toLocaleString()} kr</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((currentAmount / config.total_cost) * 100))}%`,
                    background: 'linear-gradient(90deg, #34D399, #10B981)',
                  }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Trip Configuration */}
        <section className="bg-white/70 backdrop-blur rounded-2xl shadow-md p-6 mb-5">
          <h2 className="text-2xl font-bold mb-4 text-teal-700">⚙️ Trip Configuration</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-1">Goal City</label>
              <input
                type="text"
                value={goalCity}
                onChange={e => setGoalCity(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl bg-white/80 focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-1">Total Cost (kr)</label>
              <input
                type="number"
                value={totalCost}
                onChange={e => setTotalCost(Number(e.target.value))}
                className="w-full p-3 border border-gray-200 rounded-xl bg-white/80 focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>
        </section>

        {/* Milestones */}
        <section className="bg-white/70 backdrop-blur rounded-2xl shadow-md p-6 mb-5">
          <h2 className="text-2xl font-bold mb-4 text-teal-700">📍 Milestones</h2>
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-2 items-center bg-white/60 p-3 rounded-xl">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveMilestone(i, -1)}
                    className="text-xs bg-gray-100 rounded px-1 hover:bg-gray-200 text-gray-500"
                    disabled={i === 0}
                  >▲</button>
                  <button
                    onClick={() => moveMilestone(i, 1)}
                    className="text-xs bg-gray-100 rounded px-1 hover:bg-gray-200 text-gray-500"
                    disabled={i === milestones.length - 1}
                  >▼</button>
                </div>
                <span className="text-gray-400 font-bold w-6 text-sm">{i + 1}</span>
                <input
                  placeholder="Name"
                  value={m.name}
                  onChange={e => updateMilestone(i, 'name', e.target.value)}
                  className="flex-1 p-2 border border-gray-200 rounded-lg bg-white/80 focus:outline-none focus:border-teal-400"
                />
                <input
                  type="number"
                  placeholder="Cost"
                  value={m.cost}
                  onChange={e => updateMilestone(i, 'cost', Number(e.target.value))}
                  className="w-28 p-2 border border-gray-200 rounded-lg bg-white/80 focus:outline-none focus:border-teal-400"
                />
                <input
                  placeholder="Description"
                  value={m.description}
                  onChange={e => updateMilestone(i, 'description', e.target.value)}
                  className="flex-1 p-2 border border-gray-200 rounded-lg bg-white/80 focus:outline-none focus:border-teal-400"
                />
                <button
                  onClick={() => removeMilestone(i)}
                  className="bg-red-400/80 text-white px-3 py-2 rounded-lg hover:bg-red-500 transition-colors"
                >✕</button>
              </div>
            ))}
          </div>
          <button
            onClick={addMilestone}
            className="mt-3 bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 transition-colors"
          >
            + Add Milestone
          </button>
        </section>

        {/* Save & Import/Export */}
        <div className="flex gap-3 flex-wrap mb-8">
          <button
            onClick={saveConfig}
            className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:bg-teal-700 transition-colors"
          >
            💾 Save All Changes
          </button>
          <button
            onClick={exportConfig}
            className="bg-sky-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-sky-700 transition-colors"
          >
            📤 Export to JSON
          </button>
          <button
            onClick={importConfig}
            className="bg-gray-400 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-500 transition-colors"
          >
            📥 Import from JSON
          </button>
        </div>
      </div>
    </div>
  );
}
