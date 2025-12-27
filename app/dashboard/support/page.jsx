"use client"
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";

function SupportPage() {
    const { user, isLoaded } = useUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress || "";

    const [mounted, setMounted] = useState(false);
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [category, setCategory] = useState("General");
    const [aiIssue, setAiIssue] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // New: State for ticket threads
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [replyingId, setReplyingId] = useState(null);
    const [replyMessage, setReplyMessage] = useState("");
    const [replying, setReplying] = useState(false);

    // Ensure client-side only rendering to avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    // Set email when user loads
    useEffect(() => {
        if (isLoaded && userEmail && !email) {
            setEmail(userEmail);
        }
    }, [isLoaded, userEmail, email]);

    // Fetch user's tickets
    const fetchTickets = async () => {
        if (!email) return;
        setLoadingTickets(true);
        try {
            const res = await axios.get(`/api/support?userEmail=${encodeURIComponent(email)}`, {
                headers: { 'x-user-email': email }
            });
            setTickets(res.data.result || []);
        } catch {
            setTickets([]);
        } finally {
            setLoadingTickets(false);
        }
    };

    useEffect(() => {
        fetchTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [email, submitting, replying]);

    // Listen for real-time updates from admin
    useEffect(() => {
        if (!mounted || !email) return;

        const eventSource = new EventSource(
            `/api/notifications/stream?userEmail=${encodeURIComponent(email)}`
        );

        eventSource.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.type === 'update' && payload.ticket) {
                    // Update the specific ticket in the list
                    setTickets(prev => {
                        const exists = prev.find(t => t.id === payload.ticket.id);
                        if (exists) {
                            return prev.map(t => t.id === payload.ticket.id ? payload.ticket : t);
                        }
                        return prev;
                    });
                }
            } catch (err) {
                console.error('SSE parse error:', err);
            }
        };

        return () => {
            eventSource.close();
        };
    }, [mounted, email]);

    // Submit new support request
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !subject || !message) {
            toast.error("Email, subject, and message are required");
            return;
        }
        try {
            setSubmitting(true);
            await axios.post("/api/support", {
                userEmail: email,
                subject,
                message,
                category,
                aiIssue,
                metadata: { page: "dashboard/support" }
            });
            toast.success("Support request sent. We will follow up soon.");
            setSubject("");
            setMessage("");
            setAiIssue(false);
        } catch (error) {
            const errMsg = error?.response?.data?.error || "Unable to send request";
            toast.error(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    // Reply to ticket
    const handleReply = async (ticketId) => {
        if (!replyMessage.trim()) {
            toast.error("Message cannot be empty");
            return;
        }
        try {
            setReplying(true);
            await axios.patch("/api/support", {
                id: ticketId,
                status: "Open",
                userReply: replyMessage.trim()
            }, {
                headers: { 'x-user-email': email }
            });
            toast.success("Reply sent");
            setReplyingId(null);
            setReplyMessage("");
        } catch (error) {
            toast.error("Unable to send reply");
        } finally {
            setReplying(false);
        }
    };

    // Show loading state until mounted to avoid hydration mismatch
    if (!mounted) {
        return (
            <div className="max-w-3xl space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Help & Support</h1>
                    <p className="text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Help & Support</h1>
                <p className="text-slate-600">Tell us what is not working or how AI results can be improved. We typically reply within 1 business day.</p>
            </div>

            {/* Ticket thread view */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold text-slate-800">Your Support Tickets</h2>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchTickets} 
                        disabled={loadingTickets}
                        className="text-xs"
                    >
                        <RefreshCw className={`h-3 w-3 mr-1 ${loadingTickets ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
                {loadingTickets ? (
                    <div className="p-4 text-sm text-slate-600">Loading tickets...</div>
                ) : tickets.length === 0 ? (
                    <div className="p-4 text-sm text-slate-600">No tickets found.</div>
                ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
                        {tickets.map(ticket => (
                            <div key={ticket.id} className="px-4 py-3">
                                <div className="flex flex-col gap-1">
                                    <div className="flex gap-2 items-center flex-wrap">
                                        <span className="font-mono text-slate-500">#{ticket.id}</span>
                                        <span className="font-semibold">{ticket.subject}</span>
                                        <span className="text-xs font-medium text-slate-600">{ticket.category}</span>
                                        <span className="text-xs font-semibold text-blue-700">{ticket.status || 'Open'}</span>
                                    </div>
                                    <div className="text-sm text-slate-700">{ticket.message}</div>
                                    {ticket.adminMessage && (
                                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                            <p className="font-semibold text-blue-800">Admin reply:</p>
                                            <p className="text-blue-700">{ticket.adminMessage}</p>
                                        </div>
                                    )}
                                    {ticket.userReply && (
                                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                                            <p className="font-semibold text-green-800">Your reply:</p>
                                            <p className="text-green-700">{ticket.userReply}</p>
                                        </div>
                                    )}
                                    {/* Only show reply option if ticket is not closed */}
                                    {ticket.status === 'Closed' ? (
                                        <div className="mt-2 text-xs text-slate-500 italic">This ticket is closed.</div>
                                    ) : replyingId === ticket.id ? (
                                        <div className="mt-2 space-y-2">
                                            <Textarea
                                                placeholder="Type your reply to admin..."
                                                value={replyMessage}
                                                onChange={e => setReplyMessage(e.target.value)}
                                                className="text-xs h-20"
                                            />
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => handleReply(ticket.id)} disabled={replying} className="text-xs">Send</Button>
                                                <Button size="sm" variant="outline" onClick={() => { setReplyingId(null); setReplyMessage(""); }} className="text-xs">Cancel</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button size="sm" variant="outline" onClick={() => setReplyingId(ticket.id)} className="text-xs mt-2 w-fit">Reply</Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* New support request form */}
            <form onSubmit={handleSubmit} className="space-y-4 border border-slate-200 rounded-lg bg-white p-4">
                <h2 className="text-xl font-semibold text-slate-800">Submit a new request</h2>
                <div>
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <input
                        type="email"
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium text-slate-700">Category</label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="General">General</SelectItem>
                                <SelectItem value="AI Quality">AI Quality</SelectItem>
                                <SelectItem value="Generation Error">Generation Error</SelectItem>
                                <SelectItem value="Billing">Billing</SelectItem>
                                <SelectItem value="Bug">Bug</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2 mt-6 sm:mt-8">
                        <input
                            id="ai-issue"
                            type="checkbox"
                            checked={aiIssue}
                            onChange={(e) => setAiIssue(e.target.checked)}
                            className="h-4 w-4 accent-blue-600"
                        />
                        <label htmlFor="ai-issue" className="text-sm text-slate-700">This issue is about AI output</label>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-700">Subject</label>
                    <input
                        type="text"
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="AI quiz missed key topics"
                        required
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-700">Details</label>
                    <Textarea
                        className="mt-1 h-40"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Include course/topic, what you expected, and what happened."
                        required
                    />
                </div>

                <div className="flex items-center gap-3">
                    <Button type="submit" disabled={submitting}>
                        {submitting ? "Sending..." : "Submit request"}
                    </Button>
                    <p className="text-sm text-slate-500">We will email you with updates.</p>
                </div>
            </form>
        </div>
    );
}

export default SupportPage;
