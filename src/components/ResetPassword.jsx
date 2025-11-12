import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

// Informational page to handle Firebase action links gracefully
export default function ResetPassword() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const mode = params.get('mode'); // resetPassword | verifyEmail | recoverEmail

  const [message, setMessage] = useState('');

  useEffect(() => {
    if (mode === 'resetPassword') {
      setMessage('We opened the official Firebase page for setting a new password in your browser. After completing it, return here and sign in with your new password.');
    } else if (mode === 'verifyEmail') {
      setMessage('Email verified successfully. You can now sign in.');
    } else if (mode === 'recoverEmail') {
      setMessage('Email recovery link handled. Please sign in again.');
    } else {
      setMessage('This page handles password reset and verification links.');
    }
  }, [mode]);

  return (
    <div className="min-h-screen center bg-gray-50 p-6">
      <div className="card max-w-xl w-full text-center">
        <h1 className="text-2xl font-semibold text-campus-dark mb-2">Account Action</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        <Link className="btn-primary inline-block" to="/login">Go to Login</Link>
      </div>
    </div>
  );
}
