import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Shield, Mail, ArrowLeft, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Reset link dispatched! Please check your email or server log.');
      setEmail('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to request reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="card w-full max-w-md animate-scale-in">
        <div className="card-body flex flex-col gap-6">
          
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800">
              Recover Password
            </h1>
            <p className="text-sm text-slate-400">
              Enter your email and we'll send a password recovery token.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center mt-2"
            >
              {loading ? 'Requesting...' : 'Send Recovery Link'}
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex justify-center">
            <button
              onClick={() => navigate('/login')}
              className="btn btn-ghost text-xs hover:text-slate-800 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
export default ForgotPassword;
