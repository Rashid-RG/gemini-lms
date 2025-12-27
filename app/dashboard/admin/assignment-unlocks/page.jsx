"use client";
import { useEffect, useState } from "react";
import axios from "axios";

export default function AssignmentUnlockAdmin() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function fetchRequests() {
      setLoading(true);
      try {
        const res = await axios.get("/api/admin/assignment-unlock-requests");
        setRequests(res.data.result || []);
      } catch (err) {
        setError("Failed to fetch unlock requests");
      }
      setLoading(false);
    }
    fetchRequests();
  }, []);

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

  if (loading) return <div>Loading unlock requests...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Assignment Unlock Requests</h2>
      {requests.length === 0 ? (
        <div>No unlock requests pending.</div>
      ) : (
        <div>
          <div className="mb-4 flex gap-2">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={() => toggleSelectAll()}
            >
              {selected.size === requests.length ? "Deselect All" : "Select All"}
            </button>
            {selected.size > 0 && (
              <>
                <button
                  className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
                  onClick={() => handleBulkDecision(true)}
                  disabled={processing}
                >
                  Approve Selected ({selected.size})
                </button>
                <button
                  className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
                  onClick={() => handleBulkDecision(false)}
                  disabled={processing}
                >
                  Deny Selected ({selected.size})
                </button>
              </>
            )}
          </div>
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2"><input type="checkbox" checked={selected.size === requests.length} onChange={() => toggleSelectAll()} /></th>
                <th className="p-2 text-left">Assignment</th>
                <th className="p-2 text-left">Student</th>
                <th className="p-2 text-left">Reason</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req, i) => (
                <tr key={req.assignmentId + req.studentEmail} className="border-t hover:bg-gray-50">
                  <td className="p-2"><input type="checkbox" checked={selected.has(i)} onChange={() => toggleSelect(i)} /></td>
                  <td className="p-2">{req.assignmentId}</td>
                  <td className="p-2">{req.studentEmail}</td>
                  <td className="p-2">{req.unlockReason || "-"}</td>
                  <td className="p-2">
                    <button className="bg-green-500 text-white px-2 py-1 mr-2 rounded" onClick={() => handleDecision(req.assignmentId, req.courseId, req.studentEmail, true)}>Approve</button>
                    <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => handleDecision(req.assignmentId, req.courseId, req.studentEmail, false)}>Deny</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
