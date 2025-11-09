import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Get the selected role from localStorage
    const role = localStorage.getItem('selectedRole');
    setSelectedRole(role);
  }, []);

  // Function to create HOD approval request
  const createHODRequest = async (studentId, studentData) => {
    try {
      // Check if request already exists
      const existingRequestDoc = await getDoc(doc(db, 'hodRequests', studentId));
      if (!existingRequestDoc.exists()) {
        // Normalize department value for consistent matching
        let department = studentData.department || studentData.branch || 'CSE';
        // Map common variations to 'CSE' for consistency
        const deptLower = department.toLowerCase().trim();
        if (deptLower.includes('computer') || deptLower.includes('cse')) {
          department = 'CSE';
        }

        await setDoc(doc(db, 'hodRequests', studentId), {
          studentId: studentId,
          studentName: studentData.name,
          studentEmail: studentData.email,
          department: department,
          branch: studentData.branch || department,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        console.log('✅ HOD approval request created for:', studentData.name, 'Department:', department);
      } else {
        console.log('ℹ️ HOD request already exists for this student');
      }
    } catch (error) {
      console.error('Error creating HOD request:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let userCredential;
      
      if (isLogin) {
        // Sign in existing user
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Create new user
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }

      const user = userCredential.user;
      let collectionName;
      if (selectedRole === 'student') {
        collectionName = 'students';
      } else if (selectedRole === 'manager') {
        collectionName = 'managers';
      } else {
        collectionName = 'hods';
      }
      const userDocRef = doc(db, collectionName, user.uid);
      
      if (isLogin) {
        // Get existing user data with timeout handling
        try {
          const userDoc = await Promise.race([
            getDoc(userDocRef),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Firestore connection timeout')), 15000)
            )
          ]);
          
            if (userDoc.exists()) {
              const userData = userDoc.data();
              
              // Check approval status for students
              if (selectedRole === 'student') {
                if (!userData.approved) {
                  // Create HOD request if not already exists
                  await createHODRequest(user.uid, userData);
                  localStorage.setItem(selectedRole, JSON.stringify(userData));
                  navigate('/student/approval-pending');
                  return;
                }
              }
              
              localStorage.setItem(selectedRole, JSON.stringify(userData));
              
              // Navigate based on role
              if (selectedRole === 'student') {
                navigate('/student/dashboard');
              } else if (selectedRole === 'manager') {
                navigate('/manager/dashboard');
              } else {
                navigate('/hod/dashboard');
              }
            } else {
              // Create user record if it doesn't exist during login
              console.log(`Creating ${selectedRole} record for existing user...`);
              const newUserData = {
                email: user.email,
                name: user.displayName || email.split('@')[0],
                role: selectedRole,
                createdAt: new Date().toISOString()
              };

              if (selectedRole === 'student') {
                newUserData.branch = 'Computer Science';
                newUserData.cgpa = '0.0';
                newUserData.year = '2024';
                newUserData.department = 'CSE';
                newUserData.approved = false; // Students need HOD approval
              } else if (selectedRole === 'manager') {
                newUserData.department = 'Placement Office';
                newUserData.experience = '0 years';
              } else {
                newUserData.department = 'Computer Science';
                newUserData.experience = '15 years';
                newUserData.qualification = 'Ph.D. Computer Science';
              }

              try {
                await Promise.race([
                  setDoc(userDocRef, newUserData),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firestore connection timeout')), 15000)
                  )
                ]);
                
                localStorage.setItem(selectedRole, JSON.stringify(newUserData));
                
                // Create HOD request for new students created during login
                if (selectedRole === 'student') {
                  try {
                    await createHODRequest(user.uid, newUserData);
                  } catch (hodError) {
                    console.error('Error creating HOD request:', hodError);
                  }
                  // Navigate to approval pending page since student is not approved
                  navigate('/student/approval-pending');
                  return;
                }
                
                // Navigate based on role
                if (selectedRole === 'student') {
                  navigate('/student/dashboard');
                } else if (selectedRole === 'manager') {
                  navigate('/manager/dashboard');
                } else {
                  navigate('/hod/dashboard');
                }
              } catch (setDocError) {
                console.error('Error setting document:', setDocError);
                // Save to localStorage even if Firestore fails
                localStorage.setItem(selectedRole, JSON.stringify(newUserData));
                
                alert('⚠️ Warning: Could not save to database. Data saved locally. Please check your internet connection.');
                
                if (selectedRole === 'student') {
                  navigate('/student/approval-pending');
                } else if (selectedRole === 'manager') {
                  navigate('/manager/dashboard');
                } else {
                  navigate('/hod/dashboard');
                }
              }
            }
          } catch (firestoreError) {
            console.error('Firestore error:', firestoreError);
            // Even if Firestore fails, allow login to proceed with basic user data
            const basicUserData = {
              email: user.email,
              name: user.displayName || email.split('@')[0],
              role: selectedRole
            };
            localStorage.setItem(selectedRole, JSON.stringify(basicUserData));
            
            // Show warning but allow navigation
            alert('⚠️ Warning: Could not connect to database. Some features may be limited. Please check your internet connection.');
            
            if (selectedRole === 'student') {
              navigate('/student/dashboard');
            } else if (selectedRole === 'manager') {
              navigate('/manager/dashboard');
            } else {
              navigate('/hod/dashboard');
            }
          }
      } else {
        // Create new user document
        const newUserData = {
          email: user.email,
          name: email.split('@')[0], // Use email prefix as default name
          role: selectedRole,
          createdAt: new Date().toISOString()
        };

        if (selectedRole === 'student') {
          newUserData.branch = 'Computer Science';
          newUserData.cgpa = '0.0';
          newUserData.year = '2024';
          newUserData.department = 'CSE';
          newUserData.approved = false; // Students need HOD approval
        } else if (selectedRole === 'manager') {
          newUserData.department = 'Placement Office';
          newUserData.experience = '0 years';
        } else {
          newUserData.department = 'Computer Science';
          newUserData.experience = '15 years';
          newUserData.qualification = 'Ph.D. Computer Science';
        }

        try {
          await Promise.race([
            setDoc(userDocRef, newUserData),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Firestore connection timeout')), 15000)
            )
          ]);
          
          localStorage.setItem(selectedRole, JSON.stringify(newUserData));
          
          // Create HOD request for new students (sign up)
          if (selectedRole === 'student') {
            try {
              await createHODRequest(user.uid, newUserData);
            } catch (hodError) {
              console.error('Error creating HOD request:', hodError);
            }
            // Navigate to approval pending page since student is not approved yet
            navigate('/student/approval-pending');
            return;
          }
          
          // Navigate based on role
          if (selectedRole === 'student') {
            navigate('/student/dashboard');
          } else if (selectedRole === 'manager') {
            navigate('/manager/dashboard');
          } else {
            navigate('/hod/dashboard');
          }
        } catch (firestoreError) {
          console.error('Firestore error during signup:', firestoreError);
          // Save basic user data locally even if Firestore fails
          localStorage.setItem(selectedRole, JSON.stringify(newUserData));
          
          alert('⚠️ Warning: Could not connect to database. Your account was created but some features may be limited. Please check your internet connection and refresh the page.');
          
          if (selectedRole === 'student') {
            navigate('/student/approval-pending');
          } else if (selectedRole === 'manager') {
            navigate('/manager/dashboard');
          } else {
            navigate('/hod/dashboard');
          }
        }
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
        setError('❌ Invalid email or password. Please check your credentials and try again.\n\n💡 Tip: If you don\'t have an account, please click "Sign Up" to create one.');
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
    <div className="login-container">
      {/* Left Side - Branding */}
      <div className="login-left">
        <div className="login-logo">
          <span className="logo-icon">🎓</span>
          <span className="logo-text">CampusConnect</span>
        </div>
        
        <div className="login-left-content">
          <h1 className="login-left-heading">Connecting Talent with Opportunity</h1>
          <p className="login-left-description">
            Your centralized hub for campus recruitment, streamlining the process for students, HODs, and TPOs.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-right">
        <div className="login-form-container">
          <h2 className="login-welcome">
            {selectedRole === 'student' ? 'Student Welcome Back' :
             selectedRole === 'manager' ? 'TPO/Admin Welcome Back' :
             selectedRole === 'hod' ? 'HOD Welcome Back' :
             'Welcome Back'}
          </h2>
          <p className="login-subtitle">
            {selectedRole === 'student' ? 'Login as a Student' :
             selectedRole === 'manager' ? 'Login as TPO/Admin' :
             selectedRole === 'hod' ? 'Login as HOD' :
             'Sign in to access your account'}
          </p>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email / User ID</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={
                    selectedRole === 'student' ? 'Student ID' :
                    selectedRole === 'manager' ? 'TPO/Admin ID' :
                    selectedRole === 'hod' ? 'HOD ID' :
                    'Student ID / Employee ID'
                  }
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="form-input"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 3.33333C6.66667 3.33333 3.825 5.425 2.5 8.33333C3.825 11.2417 6.66667 13.3333 10 13.3333C13.3333 13.3333 16.175 11.2417 17.5 8.33333C16.175 5.425 13.3333 3.33333 10 3.33333ZM10 11.6667C8.15833 11.6667 6.66667 10.175 6.66667 8.33333C6.66667 6.49167 8.15833 5 10 5C11.8417 5 13.3333 6.49167 13.3333 8.33333C13.3333 10.175 11.8417 11.6667 10 11.6667Z" fill="#495057"/>
                      <path d="M10 6.66667C9.07953 6.66667 8.33333 7.41286 8.33333 8.33333C8.33333 9.25381 9.07953 10 10 10C10.9205 10 11.6667 9.25381 11.6667 8.33333C11.6667 7.41286 10.9205 6.66667 10 6.66667Z" fill="#495057"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.5 2.5L17.5 17.5M8.33333 8.33333C8.08487 8.58179 7.93333 8.91286 7.93333 9.28333C7.93333 10.2038 8.67953 10.95 9.6 10.95C9.97047 10.95 10.3015 10.7985 10.55 10.55M14.8167 12.6333C13.8 13.2833 12.4583 13.75 11 13.75C7.66667 13.75 4.825 11.6583 3.5 8.75C4.08333 7.28333 5.00833 6.05 6.13333 5.16667M9.03333 4.11667C9.39167 4.04167 9.75833 4 10.1667 4C13.5 4 16.3417 6.09167 17.6667 9C17.2417 10.1583 16.575 11.1583 15.75 11.95" stroke="#495057" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error.split('\n').map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>
            )}

            <button type="submit" disabled={loading} className="verify-btn">
              {loading ? 'Loading...' : 'Verify'}
            </button>
          </form>

          <p className="toggle-text">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              className="toggle-btn"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
          
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate('/')}
          >
            ← Back to Role Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
