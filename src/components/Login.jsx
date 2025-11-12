import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from "../firebase/config";
import { signIn as signInFn, fetchUserDoc, sendFirstTimeReset, sendVerificationIfNeeded, signOut as signOutFn } from "../auth/firebaseAuth";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // No-op; could prefill email from query string
  }, []);

  // No HOD request here; login only handles auth + redirects

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1) Sign in
      const { user } = await signInFn(email, password);

      // 2) Fetch users/{uid} (admin pre-created)
      const userSnap = await fetchUserDoc(user.uid);
      if (!userSnap.exists()) {
        await signOutFn();
        setError('Account not provisioned. Please contact the placement office.');
        return;
      }
      const profile = userSnap.data();

      // 3) First-time login enforcement
      if (profile.passwordChanged === false) {
        alert('First-time login detected. Please reset your password before continuing.');
        await sendFirstTimeReset(email);
        await signOutFn();
        return;
      }

      // 4) Email verification (send if missing)
      const sent = await sendVerificationIfNeeded(user);
      if (sent) {
        // Non-blocking banner: you can add UI; we keep login working
        console.log('Verification email sent.');
      }

      // 5) Role-based redirect (student-only for now)
      const role = profile.role || 'student';
      if (role === 'student') {
        navigate('/student/dashboard');
      } else if (role === 'hod') {
        navigate('/hod/dashboard');
      } else if (role === 'tpo' || role === 'manager') {
        navigate('/manager/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Handle specific Firebase Auth error codes
      if (error.code === 'auth/user-not-found') {
        setError('❌ No account found with this email. Please sign up first or check your email address.');
      } else if (error.code === 'auth/wrong-password') {
        setError('❌ Incorrect password. Please try again or use "Forgot Password" to reset.');
      } else if (error.code === 'auth/invalid-email') {
        setError('❌ Invalid email address format. Please check and try again.');
      } else if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/invalid-credential') {
        setError('❌ Invalid email or password. Please check your credentials and try again.');
      } else if (error.code === 'auth/weak-password') {
        setError('❌ Password should be at least 6 characters long. Please choose a stronger password.');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('❌ An account with this email already exists. Please sign in instead.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('❌ Network error. Please check your internet connection and try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('❌ Too many failed login attempts. Please try again later or reset your password.');
      } else if (error.message && error.message.includes('timeout')) {
        setError('❌ Connection timeout. Please check your internet connection and try again.');
      } else if (error.message && error.message.includes('Firestore connection timeout')) {
        setError('⚠️ Warning: Database connection timeout. Authentication succeeded but some features may be limited. Please refresh the page.');
      } else {
        const errorMsg = error.message || 'An error occurred during authentication.';
        setError(`❌ ${errorMsg}\n\nIf this problem persists, please check:\n1. Your internet connection\n2. Firebase project configuration\n3. Your email and password are correct`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 center p-6">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-2xl font-semibold text-campus-dark">CampusConnect</div>
          <div className="text-sm text-gray-600">Sign in with your college email</div>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <label className="label" htmlFor="email">College Email</label>
            <input id="email" type="email" className="input" placeholder="1mj24cs436@mvjce.edu.in" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" type={showPassword? 'text':'password'} className="input pr-10" placeholder="Enter password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" onClick={()=>setShowPassword(!showPassword)}>{showPassword? '🙈':'👁️'}</button>
            </div>
          </div>

          {error && <div className="text-red-600 text-sm whitespace-pre-line">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>{loading? 'Signing in...':'Sign In'}</button>

          <button type="button" className="text-sm text-campus-green underline justify-self-start" onClick={async()=>{
            setError('');
            if (!email) { setError('Enter your email to receive a reset link.'); return; }
            try { await sendFirstTimeReset(email); alert('Reset link sent. Check your email.'); } catch(e){ setError('Could not send reset email.'); }
          }}>Forgot Password?</button>
        </form>

        <div className="text-xs text-gray-500 mt-6">
          First-time users will be asked to reset the default password and verify email.
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-gray-600 underline">← Back to Role Selection</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
