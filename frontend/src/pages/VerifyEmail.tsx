import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return; // avoid double-invoke in React StrictMode
    ranRef.current = true;

    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');
      const slug = searchParams.get('slug') || undefined;

      if (!token || !email) {
        setStatus('error');
        setMessage('Invalid verification link. Please check your email and try again.');
        return;
      }

      try {
        const response = await apiClient.verifyEmail(token, email, slug);
        setStatus('success');
        setMessage(response.message);
        setAlreadyVerified(response.already_verified || false);
        
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      } catch (error: any) {
        setStatus('error');
        
        // Customize error messages
        if (error?.code === 'TOKEN_EXPIRED') {
          setMessage('Your verification link has expired. Please contact support to request a new verification email.');
        } else if (error?.code === 'INVALID_TOKEN') {
          setMessage('This verification link is invalid or has already been used.');
        } else {
          setMessage(error?.message || 'Email verification failed. Please try again or contact support.');
        }
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700/50 p-8">
          
          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-white">Verifying Your Email</h2>
                <p className="text-gray-400">Please wait while we verify your account...</p>
              </div>
            </div>
          )}
          
          {/* Success State */}
          {status === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
                <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-green-400">
                  {alreadyVerified ? '✅ Already Verified!' : '✅ Email Verified!'}
                </h2>
                <p className="text-gray-300">{message}</p>
                {!alreadyVerified && (
                  <p className="text-sm text-gray-400">
                    You've received a welcome email with more details. 📧
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Redirecting to login in 3 seconds...</span>
                </div>
                <Link
                  to="/login"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Go to Login Now
                </Link>
              </div>
            </div>
          )}
          
          {/* Error State */}
          {status === 'error' && (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
                <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-red-400">Verification Failed</h2>
                <p className="text-gray-300">{message}</p>
              </div>
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="inline-block px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Return to Login
                </Link>
                <p className="text-xs text-gray-500">
                  Need help? Contact support at support@auzguard.com
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Branding */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            Powered by <span className="font-semibold text-white">AuzGuard</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Secure AI Governance & Routing Platform
          </p>
        </div>
      </div>
    </div>
  );
}

