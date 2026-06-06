import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { Shield, Lock, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('vendor');
  const [loading, setLoading] = useState(false);
  const loginUser = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const response = await api.post('/auth/login', { email, password });
        const { token, user } = response.data;
        loginUser(token, user);
        toast.success(`Welcome back, ${user.name}!`);
        navigate('/');
      } else {
        const response = await api.post('/auth/signup', { name, email, password, role });
        const { token, user } = response.data;
        loginUser(token, user);
        toast.success(`Account created successfully! Welcome, ${user.name}!`);
        navigate('/');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const msg = err.response?.data?.error || 'Authentication failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="card w-full max-w-md animate-scale-in">
        <div className="card-body flex flex-col gap-6">
          
          {/* Logo Header */}
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              VendorBridge ERP
            </h1>
            <p className="text-sm text-slate-400">
              {isLogin ? 'Sign in to your account' : 'Create a new account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {!isLogin && (
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full Name</label>
                <div className="search-input-wrap">
                  <input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div className="search-input-wrap">
                <Mail className="search-icon w-4 h-4" />
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="form-group">
              <div className="flex items-center justify-between">
                <label className="form-label" htmlFor="password">Password</label>
                {isLogin && (
                  <a
                    href="/forgot-password"
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Forgot Password?
                  </a>
                )}
              </div>
              <div className="search-input-wrap">
                <Lock className="search-icon w-4 h-4" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div className="form-group">
                <label className="form-label" htmlFor="role">Role</label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="form-input"
                >
                  <option value="vendor">Vendor</option>
                  <option value="procurement">Procurement Officer</option>
                  <option value="approver">Manager / Approver</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center mt-2 shadow-lg shadow-blue-900/10"
            >
              {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign In' : 'Sign Up')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center text-sm text-slate-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 font-semibold hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>

          {/* Seed demo info box */}
          {isLogin && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex flex-col gap-1 text-xs text-blue-800">
              <span className="font-bold">Demo Login Roles:</span>
              <div className="grid grid-cols-2 gap-1 text-slate-600">
                <span>Procurement: <code className="text-blue-950 font-bold">procurement@...</code></span>
                <span>Pass: <code className="text-blue-950 font-bold">Procure@1234</code></span>
                <span>Approver: <code className="text-blue-950 font-bold">approver@...</code></span>
                <span>Pass: <code className="text-blue-950 font-bold">Approve@1234</code></span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
export default Login;
