import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuth } from './firebaseAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// ProtectedRoute wraps a route and optionally enforces allowed roles
export default function ProtectedRoute({ children, allowedRoles }) {
  const [state, setState] = useState({ loading: true, user: null, role: null });

  useEffect(() => {
    const unsub = onAuth(async (user) => {
      if (!user) {
        setState({ loading: false, user: null, role: null });
        return;
      }
      try {
        // Read role from users/{uid}; allow dashboard even if not emailVerified for now
        const snap = await getDoc(doc(db, 'users', user.uid));
        const role = snap.exists() ? (snap.data().role || 'student') : 'student';
        setState({ loading: false, user, role });
      } catch (e) {
        console.error('ProtectedRoute role fetch failed', e);
        setState({ loading: false, user, role: 'student' });
      }
    });
    return () => unsub();
  }, []);

  if (state.loading) {
    return (
      <div className="min-h-screen center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-gray-300 border-t-campus-green" />
      </div>
    );
  }

  if (!state.user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(state.role)) {
    // Redirect to their own dashboard
    if (state.role === 'student') return <Navigate to="/student/dashboard" replace />;
    if (state.role === 'hod') return <Navigate to="/hod/dashboard" replace />;
    if (state.role === 'tpo' || state.role === 'manager') return <Navigate to="/manager/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}
