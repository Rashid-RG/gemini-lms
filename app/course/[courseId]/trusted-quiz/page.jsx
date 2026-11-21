"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

// Isolated pilot: existing Quiz/MCQ pages remain unchanged until verification.
export default function TrustedQuizPilot() {
  const { courseId } = useParams();
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(null);
  const [responses, setResponses] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    fetch("/api/assessments/trusted/catalog?courseId=" + encodeURIComponent(courseId), { cache: "no-store" })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Unable to list assessments");
        return data;
      })
      .then(data => { if (!cancelled) setCatalog(data.assessments || []); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [courseId]);

  const start = async (assessmentId) => {
    setBusy(true); setError(""); setResult(null); setResponses({});
    try {
      const response = await fetch("/api/assessments/trusted/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, assessmentId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to start");
      setAttempt(data);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    if (!attempt) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/assessments/trusted/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: attempt.attemptId,
          responses: attempt.questions.map(q => responses[q.id] || "")
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to submit");
      setResult(data);
      setAttempt(null);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trusted Assessment Pilot</h1>
        <p className="text-sm text-slate-500 mt-2">
          Scores are calculated on the server. This pilot is unavailable until the feature is explicitly enabled.
        </p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}
      {loading && <p>Loading available assessments...</p>}
      {!loading && !attempt && !result && catalog.length === 0 && !error && <p>No ready assessments found.</p>}
      {!attempt && !result && catalog.map(item => (
        <div key={item.assessmentId} className="rounded-2xl border p-5 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{item.type} — Chapter {item.chapterId ?? "All"}</p>
            <p className="text-sm text-slate-500">{item.difficulty || "Standard"} difficulty</p>
          </div>
          <Button disabled={busy} onClick={() => start(item.assessmentId)}>Start</Button>
        </div>
      ))}
      {attempt && (
        <section className="space-y-5">
          <p className="text-sm text-slate-600">
            {attempt.questionCount} questions · Deadline {new Date(attempt.expiresAt).toLocaleString()}
          </p>
          {attempt.questions.map((q, i) => (
            <div key={q.id} className="rounded-2xl border p-5 space-y-3">
              <h2 className="font-semibold">{i + 1}. {q.question}</h2>
              {Array.isArray(q.options) && q.options.length ? (
                <div className="space-y-2">
                  {q.options.map((opt, j) => {
                    const value = String(opt);
                    return (
                      <label key={j} className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer">
                        <input type="radio" name={`q-${q.id}`} checked={responses[q.id] === value}
                          onChange={() => setResponses(prev => ({ ...prev, [q.id]: value }))} />
                        <span>{value}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <input value={responses[q.id] || ""} onChange={e => setResponses(prev => ({ ...prev, [q.id]: e.target.value }))}
                  maxLength={2000} className="w-full rounded-xl border p-3" placeholder="Your answer" />
              )}
            </div>
          ))}
          <Button disabled={busy} onClick={submit}>{busy ? "Submitting..." : "Submit for Server Grading"}</Button>
        </section>
      )}
      {result && (
        <div className="rounded-2xl border p-6 space-y-3">
          <h2 className="text-xl font-bold">Verified Assessment Result</h2>
          <p className="text-3xl font-semibold">{result.score}%</p>
          <p>{result.correctCount} of {result.totalQuestions} correct</p>
          <p className="text-xs text-slate-500">Grading version: {result.gradingVersion}</p>
          <Button variant="outline" onClick={() => { setResult(null); setResponses({}); }}>Choose another assessment</Button>
        </div>
      )}
    </main>
  );
}
