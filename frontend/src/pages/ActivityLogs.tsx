import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Activity, Search, Calendar, User, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await api.get('/logs');
      setLogs(res.data.logs);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load system activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter ? log.eventType === typeFilter : true;

    return matchesSearch && matchesType;
  });

  // Unique event types
  const eventTypes = Array.from(new Set(logs.map((l) => l.eventType)));

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-2xl font-bold text-slate-800">System Audit Trail</h1>
          <p className="text-sm text-slate-500">Track database mutations, system-wide status adjustments, and role-based login activities.</p>
        </div>
      </div>

      {/* Filter Header */}
      <div className="card p-4 flex gap-4 items-center flex-wrap">
        <div className="search-input-wrap flex-1 min-w-[240px]">
          <Search className="search-icon w-4 h-4" />
          <input
            type="text"
            placeholder="Search activity description or user name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="form-select max-w-[200px]"
        >
          <option value="">All Event Types</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Activity Timeline List */}
      {loading ? (
        <div className="card p-6 flex flex-col gap-4">
          <div className="skeleton h-12 w-full animate-pulse" />
          <div className="skeleton h-12 w-full animate-pulse" />
        </div>
      ) : filteredLogs.length > 0 ? (
        <div className="card p-6">
          <div className="timeline">
            {filteredLogs.map((log) => (
              <div key={log.id} className="timeline-item">
                <div className="timeline-dot bg-slate-100 border border-slate-300">
                  <Activity className="w-4 h-4 text-slate-500" />
                </div>
                <div className="timeline-content">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      {log.description}
                    </span>
                    <span className="text-xs text-slate-400 font-medium inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge badge-primary text-[10px] font-bold py-0.5">
                      {log.eventType}
                    </span>
                    {log.user ? (
                      <span className="text-xs text-slate-500 font-medium inline-flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        By {log.user.name} ({log.user.role})
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium inline-flex items-center gap-1">
                        <Shield className="w-3 h-3 text-slate-300" />
                        System Service
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-state-icon">
            <Activity className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700">No activity logs recorded</h3>
          <p className="text-sm text-slate-400">Database changes and system queries will show up here as they occur.</p>
        </div>
      )}
    </div>
  );
};
export default ActivityLogs;
