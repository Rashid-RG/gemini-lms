"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, AlertCircle, Key, Check, X, RefreshCw } from "lucide-react";

export default function AssignmentUnlockAdmin() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/admin/assignment-unlock-requests");
      setRequests(res.data.result || []);
    } catch (err) {
      setError("Failed to fetch unlock requests");
    }
    setLoading(false);
  }

  function toggleSelect(id) {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  }

  function toggleSelectAll() {
    if (selected.size === requests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(requests.map((_, i) => i)));
    }
  }

  async function handleDecision(assignmentId, courseId, studentEmail, approve) {
    try {
      await axios.patch("/api/assignment-unlock", {
        assignmentId,
        courseId,
        studentEmail,
        approve,
      });
      setRequests(requests.filter(r => r.assignmentId !== assignmentId || r.studentEmail !== studentEmail));
      setSelected(new Set());
    } catch (err) {
      setError("Failed to process decision");
    }
  }

  async function handleBulkDecision(approve) {
    setProcessing(true);
    try {
      const selectedRequests = Array.from(selected).map(i => requests[i]);
      await axios.post("/api/admin/bulk-unlock-decision", {
        requests: selectedRequests,
        approve,
      });
      setRequests(requests.filter((_, i) => !selected.has(i)));
      setSelected(new Set());
    } catch (err) {
      setError("Failed to process bulk decision");
    }
    setProcessing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 border border-rose-200/50 rounded-xl p-4 text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
            <Key className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Unlock Requests</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage student assignment lock state unlocks</p>
          </div>
        </div>
        <div className="flex gap-3 relative z-10">
          <button 
            onClick={fetchRequests} 
            disabled={loading}
            className="flex items-center justify-center px-4 py-2.5 bg-white/80 border border-slate-200/60 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-50 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-10 text-center py-20">
          <Key className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-base font-bold text-slate-700">No requests pending</h3>
          <p className="text-slate-500 text-xs mt-1">There are no assignment unlock requests awaiting decision.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 border border-slate-200/40 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <button
                className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-[0.98] shadow-sm hover:bg-slate-50"
                onClick={() => toggleSelectAll()}
              >
                {selected.size === requests.length ? "Deselect All" : "Select All"}
              </button>
              <span className="text-xs font-semibold text-slate-500">
                {selected.size} of {requests.length} selected
              </span>
            </div>
            {selected.size > 0 && (
              <div className="flex gap-2">
                <button
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-500/10 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
                  onClick={() => handleBulkDecision(true)}
                  disabled={processing}
                >
                  <Check className="w-3.5 h-3.5" /> Approve Selected
                </button>
                <button
                  className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-rose-500/10 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
                  onClick={() => handleBulkDecision(false)}
                  disabled={processing}
                >
                  <X className="w-3.5 h-3.5" /> Deny Selected
                </button>
              </div>
            )}
          </div>

          <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50/70 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5 text-left w-12">
                      <input 
                        type="checkbox" 
                        checked={selected.size === requests.length} 
                        onChange={() => toggleSelectAll()} 
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                      />
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Assignment</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/50">
                  {requests.map((req, i) => (
                    <tr key={req.assignmentId + req.studentEmail} className="hover:bg-slate-50/60 transition-colors duration-150">
                      <td className="px-5 py-4 w-12">
                        <input 
                          type="checkbox" 
                          checked={selected.has(i)} 
                          onChange={() => toggleSelect(i)} 
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                        {req.assignmentId}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                        {req.studentEmail}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 font-medium">
                        {req.unlockReason || <span className="text-slate-400 font-normal italic">No reason provided</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 text-emerald-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                            onClick={() => handleDecision(req.assignmentId, req.courseId, req.studentEmail, true)}
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button 
                            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200/50 text-rose-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                            onClick={() => handleDecision(req.assignmentId, req.courseId, req.studentEmail, false)}
                          >
                            <X className="w-3.5 h-3.5" /> Deny
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
