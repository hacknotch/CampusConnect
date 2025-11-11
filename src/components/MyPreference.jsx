import React, { useState } from 'react';
import './MyPreference.css';

export default function MyPreference() {
  const [preferredRoles, setPreferredRoles] = useState('');
  const [preferredLocations, setPreferredLocations] = useState('');
  const [minLpa, setMinLpa] = useState('');

  // This is just a placeholder UI. You can later save to Firestore.
  return (
    <div className="pref-page">
      <div className="pref-card">
        <h1 className="pref-title">My Preference</h1>
        <p className="pref-subtitle">Set your job preferences to get better recommendations.</p>

        <div className="pref-form">
          <label className="pref-label">Preferred Roles</label>
          <input
            className="pref-input"
            value={preferredRoles}
            onChange={(e) => setPreferredRoles(e.target.value)}
            placeholder="e.g., Frontend, Backend, Data Analyst"
          />

          <label className="pref-label">Preferred Locations</label>
          <input
            className="pref-input"
            value={preferredLocations}
            onChange={(e) => setPreferredLocations(e.target.value)}
            placeholder="e.g., Bangalore, Remote"
          />

          <label className="pref-label">Minimum Salary (LPA)</label>
          <input
            className="pref-input"
            type="number"
            min="0"
            step="0.1"
            value={minLpa}
            onChange={(e) => setMinLpa(e.target.value)}
            placeholder="e.g., 6.0"
          />

          <div className="pref-actions">
            <button className="pref-save" onClick={() => alert('This is a placeholder. Hook to Firestore to persist.')}>Save Preferences</button>
          </div>
        </div>
      </div>
    </div>
  );
}
