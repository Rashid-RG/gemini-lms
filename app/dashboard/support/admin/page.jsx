"use client"
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

function SupportAdminPage() {
    const { user } = useUser();
    const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
    const isAdmin = useMemo(() => email && ADMIN_EMAILS.includes(email), [email]);

    const [tickets, setTickets] = useState([]);
    const [statusFilter, setStatusFilter] = useState("all");
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [adminMessage, setAdminMessage] = useState("");

    const loadTickets = async () => {
        if (!isAdmin || !email) return;
        try {
            setLoading(true);
            const params = statusFilter && statusFilter !== 'all' ? `?status=${encodeURIComponent(statusFilter)}` : "";
            const res = await axios.get(`/api/support${params}`, {
                headers: { 'x-admin-email': email }
            });
            setTickets(res?.data?.result || []);
        } catch (error) {
            toast.error(error?.response?.data?.error || "Unable to load tickets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, isAdmin, email]);

    // Listen for real-time admin notifications
    useEffect(() => {
        if (!isAdmin || !email) return;

        const eventSource = new EventSource(
            `/api/notifications/stream?userEmail=${encodeURIComponent(email)}`
        );

        eventSource.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                // Listen for both admin-update (user replies) and update events
                if ((payload.type === 'admin-update' || payload.type === 'update') && payload.ticket) {
                    // Refresh tickets when user replies
                    loadTickets();
                    if (payload.ticket.userReply) {
                        toast.info(`New reply from ${payload.ticket.userEmail}`);
                    }
                }
            } catch (err) {
                console.error('SSE parse error:', err);
            }
        };

        return () => {
            eventSource.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, email]);

    const updateStatus = async (id, status, message = null) => {
        if (!isAdmin) return;
        try {
            setUpdatingId(id);
            await axios.patch('/api/support', { id, status, adminMessage: message }, {
                headers: { 'x-admin-email': email }
            });
            toast.success(`Ticket ${status}`);
            setReplyingTo(null);
            setAdminMessage("");
            await loadTickets();
        } catch (error) {
            toast.error(error?.response?.data?.error || "Unable to update ticket");
        } finally {
            setUpdatingId(null);
        }
    };

    const sendReply = async (ticketId) => {
        if (!adminMessage.trim()) {
            toast.error("Message cannot be empty");
            return;
        }
        const ticket = tickets.find(t => t.id === ticketId);
        await updateStatus(ticketId, ticket?.status || 'In Review', adminMessage.trim());
    };

    if (!isAdmin) {
        return (
            <div className="max-w-3xl">
                <h1 className="text-2xl font-bold text-slate-900">Support Admin</h1>
                <p className="mt-2 text-slate-600">Access restricted. Add your email to ADMIN_EMAILS in .env.local to view tickets.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Support Inbox</h1>
                    <p className="text-sm text-slate-600">Review and update support tickets. Filter by status to keep AI issues prioritized.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadTickets} disabled={loading}>
                        {loading ? "Refreshing..." : "Refresh"}
                    </Button>
                    <div className="w-48">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="In Review">In Review</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="grid grid-cols-5 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                    <span>ID</span>
                    <span>Subject</span>
                    <span>Category</span>
                    <span>Status</span>
                    <span>Actions</span>
                </div>
                {loading ? (
                    <div className="p-4 text-sm text-slate-600">Loading tickets...</div>
                ) : tickets.length === 0 ? (
                    <div className="p-4 text-sm text-slate-600">No tickets found.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {tickets.map(ticket => (
                            <div key={ticket.id} className="px-4 py-3">
                                <div className="grid grid-cols-5 items-start gap-4 text-sm text-slate-800">
                                    <span className="font-mono text-slate-500">#{ticket.id}</span>
                                    <div className="space-y-1 col-span-2">
                                        <p className="font-semibold">{ticket.subject}</p>
                                        <p className="text-xs text-slate-500 line-clamp-2">{ticket.message}</p>
                                        <p className="text-xs text-slate-500">{ticket.userEmail}</p>
                                        {ticket.adminMessage && (
                                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                                <p className="font-semibold text-blue-800">Admin reply:</p>
                                                <p className="text-blue-700">{ticket.adminMessage}</p>
                                            </div>
                                        )}
                                        {ticket.userReply && (
                                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                                                <p className="font-semibold text-green-800">User reply:</p>
                                                <p className="text-green-700">{ticket.userReply}</p>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs font-medium text-slate-600">{ticket.category}</span>
                                    <div className="space-y-2">
                                        <span className="text-xs font-semibold text-blue-700 block">{ticket.status || 'Open'}</span>
                                        <div className="flex flex-col gap-2">
                                            {replyingTo === ticket.id ? (
                                                <div className="space-y-2">
                                                    <Textarea
                                                        placeholder="Type your message to the user..."
                                                        value={adminMessage}
                                                        onChange={(e) => setAdminMessage(e.target.value)}
                                                        className="text-xs h-20"
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => sendReply(ticket.id)}
                                                            disabled={updatingId === ticket.id}
                                                            className="text-xs"
                                                        >
                                                            Send
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setReplyingTo(null);
                                                                setAdminMessage("");
                                                            }}
                                                            className="text-xs"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setReplyingTo(ticket.id);
                                                            setAdminMessage(ticket.adminMessage || "");
                                                        }}
                                                        disabled={updatingId === ticket.id}
                                                        className="text-xs"
                                                    >
                                                        Reply
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => updateStatus(ticket.id, 'In Review')}
                                                        disabled={updatingId === ticket.id}
                                                        className="text-xs"
                                                    >
                                                        In Review
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                                                        onClick={() => updateStatus(ticket.id, 'Closed')}
                                                        disabled={updatingId === ticket.id}
                                                    >
                                                        Close
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default SupportAdminPage;
