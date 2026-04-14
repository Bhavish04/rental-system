// src/pages/AdminPage.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import { adminAPI } from "@/lib/api";
import {
  BarChart2,
  Users,
  Shield,
  Trophy,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  DollarSign,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays } from "date-fns";

const TABS = [
  { id: "reports", label: "Reports", icon: <FileText size={15} /> },
  { id: "leaderboard", label: "Leaderboard", icon: <Trophy size={15} /> },
  { id: "moderation", label: "Moderation", icon: <Shield size={15} /> },
  { id: "listings", label: "Listings", icon: <CheckCircle size={15} /> },
  { id: "users", label: "Users", icon: <Users size={15} /> },
];

export default function AdminPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("reports");
  const [period, setPeriod] = useState(30);
  const [metric, setMetric] = useState("top_owners");
  const [moderateId, setModerateId] = useState("");
  const [modResult, setModResult] = useState(null);
  const [modLoading, setModLoading] = useState(false);

  const now = new Date();
  const start = format(subDays(now, period), "yyyy-MM-dd'T'HH:mm:ss");
  const end = format(now, "yyyy-MM-dd'T'HH:mm:ss");

  // Reports
  const { data: report, isLoading: repLoading } = useQuery(
    ["admin-reports", period],
    () =>
      adminAPI
        .reports({
          start,
          end,
          period: period <= 1 ? "daily" : period <= 7 ? "weekly" : "monthly",
        })
        .then((r) => r.data),
    { staleTime: 60_000 },
  );

  // Leaderboard
  const { data: leaders = [], isLoading: lbLoading } = useQuery(
    ["leaderboard", metric, period],
    () =>
      adminAPI.leaderboard({ metric, period_days: period }).then((r) => r.data),
    { staleTime: 60_000 },
  );

  // Users
  const { data: users = [], isLoading: usersLoading } = useQuery(
    "admin-users",
    () => adminAPI.users(1).then((r) => r.data),
    { staleTime: 60_000 },
  );

  const suspendMutation = useMutation((id) => adminAPI.suspend(id), {
    onSuccess: () => {
      toast.success("User suspended");
      qc.invalidateQueries("admin-users");
    },
    onError: () => toast.error("Failed to suspend"),
  });

  const unsuspendMutation = useMutation((id) => adminAPI.unsuspend(id), {
    onSuccess: () => {
      toast.success("User reactivated");
      qc.invalidateQueries("admin-users");
    },
    onError: () => toast.error("Failed to unsuspend"),
  });

  const runModeration = async () => {
    if (!moderateId.trim()) {
      toast.error("Enter a property ID");
      return;
    }
    setModLoading(true);
    setModResult(null);
    try {
      const { data } = await adminAPI.moderate(moderateId.trim());
      setModResult(data);
    } catch {
      toast.error("Moderation check failed");
    } finally {
      setModLoading(false);
    }
  };

  const approveMutation = useMutation((id) => adminAPI.approve(id), {
    onSuccess: () => toast.success("Listing approved!"),
  });
  const rejectMutation = useMutation(
    (id) => adminAPI.reject(id, { reason: "Policy violation" }),
    { onSuccess: () => toast.success("Listing rejected") },
  );
  const { data: pendingListings = [], refetch: refetchPending } = useQuery(
    "pending-listings",
    () => adminAPI.pendingProperties().then((r) => r.data),
    { staleTime: 30_000 },
  );
  const approveListingMutation = useMutation((id) => adminAPI.approve(id), {
    onSuccess: () => {
      toast.success("Listing approved!");
      refetchPending();
    },
  });
  const rejectListingMutation = useMutation(
    (id) => adminAPI.reject(id, { reason: "Rejected by admin" }),
    {
      onSuccess: () => {
        toast.success("Listing rejected!");
        refetchPending();
      },
    },
  );
  const reportStats = report
    ? [
        {
          label: "Total Bookings",
          value: report.total_bookings,
          icon: <BarChart2 size={16} />,
          color: "text-accent",
        },
        {
          label: "Confirmed",
          value: report.confirmed_bookings,
          icon: <CheckCircle size={16} />,
          color: "text-green",
        },
        {
          label: "Revenue",
          value: `₹${(report.total_revenue_inr || 0).toLocaleString("en-IN")}`,
          icon: <DollarSign size={16} />,
          color: "text-teal",
        },
        {
          label: "New Users",
          value: report.new_users,
          icon: <Users size={16} />,
          color: "text-blue",
        },
      ]
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pt-20 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-accent" />
            <h1 className="text-2xl font-bold font-display text-text1">
              Admin Portal
            </h1>
          </div>
          <p className="text-text3 text-sm">
            Reports · Leaderboard · Moderation · User Management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text3 text-xs">Period:</span>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                period === d
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "border-border2 text-text3 hover:text-text2"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
              ${
                activeTab === t.id
                  ? "bg-accent/10 text-accent border border-accent/30"
                  : "text-text3 hover:text-text2"
              }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* REPORTS TAB */}
      {activeTab === "reports" && (
        <div className="space-y-6 animate-fade-in">
          {repLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card h-20 animate-pulse bg-card2" />
              ))}
            </div>
          )}
          {report && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {reportStats.map((s) => (
                  <div key={s.label} className="stat-card">
                    <div className={`${s.color} mb-1`}>{s.icon}</div>
                    <span className="text-text3 text-xs">{s.label}</span>
                    <span
                      className={`text-xl font-bold font-display ${s.color}`}
                    >
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Simple bar chart */}
              <div className="card">
                <h3 className="text-text1 font-semibold text-sm mb-4">
                  Booking & Revenue Overview
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={[
                      { name: "Bookings", value: report.total_bookings },
                      { name: "Confirmed", value: report.confirmed_bookings },
                      { name: "Clients", value: report.unique_clients },
                      { name: "New Users", value: report.new_users },
                    ]}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#5c5c72", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#5c5c72", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1e1f28",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#9a9aae" }}
                    />
                    <Bar dataKey="value" fill="#e8a87c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex gap-3">
                <p className="text-text3 text-xs self-center">
                  Period: last {period} days · {report.start_date?.slice(0, 10)}{" "}
                  → {report.end_date?.slice(0, 10)}
                </p>
                <a
                  href={`/api/v1/admin/reports?start=${start}&end=${end}&fmt=csv`}
                  className="btn-ghost text-xs py-1.5 px-3 ml-auto flex items-center gap-1"
                >
                  <FileText size={12} /> Export CSV
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* LEADERBOARD TAB */}
      {activeTab === "leaderboard" && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex gap-2">
            {["top_owners", "top_properties"].map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  metric === m
                    ? "bg-accent/10 text-accent border-accent/30"
                    : "border-border2 text-text3"
                }`}
              >
                {m === "top_owners" ? "🏆 Top Owners" : "🏠 Top Properties"}
              </button>
            ))}
          </div>

          {lbLoading && <div className="card h-40 animate-pulse bg-card2" />}

          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text3 text-xs">
                  <th className="text-left p-4 font-medium">#</th>
                  <th className="text-left p-4 font-medium">
                    {metric === "top_owners" ? "Owner" : "Property"}
                  </th>
                  <th className="text-right p-4 font-medium">Bookings</th>
                  {metric === "top_owners" && (
                    <th className="text-right p-4 font-medium">Revenue</th>
                  )}
                  {metric === "top_properties" && (
                    <th className="text-right p-4 font-medium">Avg Rating</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {leaders.map((l, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-bg3 transition-colors"
                  >
                    <td className="p-4 text-text3 font-mono">
                      {i === 0
                        ? "🥇"
                        : i === 1
                          ? "🥈"
                          : i === 2
                            ? "🥉"
                            : `${i + 1}`}
                    </td>
                    <td className="p-4 text-text1 font-medium">
                      {l.full_name || l.title}
                      {l.city && (
                        <span className="text-text3 font-normal">
                          {" "}
                          · {l.city}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right text-text2">{l.bookings}</td>
                    {metric === "top_owners" && (
                      <td className="p-4 text-right text-accent font-medium font-display">
                        ₹{Number(l.revenue || 0).toLocaleString("en-IN")}
                      </td>
                    )}
                    {metric === "top_properties" && (
                      <td className="p-4 text-right">
                        <span className="flex items-center justify-end gap-1 text-accent">
                          ★ {Number(l.avg_rating || 0).toFixed(1)}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
                {!lbLoading && leaders.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-text3 text-xs"
                    >
                      No data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODERATION TAB */}
      {activeTab === "moderation" && (
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
          <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={18} className="text-accent" />
              <h3 className="font-semibold text-text1">
                AI Content Moderation
              </h3>
            </div>
            <p className="text-text3 text-xs">
              Powered by Gemini — checks for discriminatory content, spam, and
              policy violations
            </p>
            <div>
              <label className="label">Property ID</label>
              <input
                className="input"
                placeholder="Paste property UUID..."
                value={moderateId}
                onChange={(e) => setModerateId(e.target.value)}
              />
            </div>
            <button
              onClick={runModeration}
              disabled={modLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {modLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />{" "}
                  Checking…
                </>
              ) : (
                <>
                  <Shield size={15} /> Run AI Check
                </>
              )}
            </button>
          </div>

          <div>
            {modResult ? (
              <div
                className={`card space-y-4 animate-slide-up border ${
                  modResult.safe ? "border-green/30" : "border-red/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {modResult.safe ? (
                    <CheckCircle size={20} className="text-green" />
                  ) : (
                    <XCircle size={20} className="text-red" />
                  )}
                  <div>
                    <p className="font-semibold text-text1">
                      {modResult.safe ? "Content is Safe" : "Issues Found"}
                    </p>
                    <p className="text-text3 text-xs">
                      {modResult.explanation}
                    </p>
                  </div>
                </div>

                {modResult.flags?.length > 0 && (
                  <div className="bg-red/5 border border-red/20 rounded-xl p-3">
                    <p className="text-red text-xs font-medium mb-2">Flags:</p>
                    <ul className="space-y-1">
                      {modResult.flags.map((f, i) => (
                        <li
                          key={i}
                          className="text-red/80 text-xs flex gap-1.5"
                        >
                          <AlertTriangle
                            size={11}
                            className="mt-0.5 shrink-0"
                          />{" "}
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-text3 text-xs">Recommendation:</span>
                  <span
                    className={`badge-status border text-xs px-2.5 py-0.5 ${
                      modResult.recommendation === "approve"
                        ? "bg-green/10 text-green border-green/30"
                        : modResult.recommendation === "reject"
                          ? "bg-red/10 text-red border-red/30"
                          : "bg-accent/10 text-accent border-accent/30"
                    }`}
                  >
                    {modResult.recommendation}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      approveMutation.mutate(modResult.property_id)
                    }
                    className="flex-1 btn-ghost flex items-center justify-center gap-1 text-green border-green/30 hover:bg-green/10"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(modResult.property_id)}
                    className="flex-1 btn-danger flex items-center justify-center gap-1"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="card flex flex-col items-center justify-center text-center py-16 h-full">
                <Shield size={36} className="text-text3 mb-3" />
                <p className="text-text2 text-sm">
                  Enter a property ID to run AI moderation check
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* LISTINGS TAB */}
      {activeTab === "listings" && (
        <div className="space-y-4">
          <h2 className="text-text1 font-semibold">
            Pending Listings ({pendingListings.length})
          </h2>
          {pendingListings.length === 0 && (
            <div className="card text-center py-12">
              <CheckCircle size={36} className="mx-auto text-green mb-3" />
              <p className="text-text2 font-medium">No pending listings</p>
              <p className="text-text3 text-sm">All caught up!</p>
            </div>
          )}
          {pendingListings.map((l) => (
            <div
              key={l.id}
              className="card flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold text-text1">{l.title}</p>
                <p className="text-text3 text-sm">
                  {l.neighbourhood}, {l.city} · {l.bedrooms}BHK{" "}
                  {l.property_type}
                </p>
                <p className="text-accent font-bold text-sm">
                  ₹{l.price_per_month?.toLocaleString("en-IN")}/mo
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => approveListingMutation.mutate(l.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green/10 text-green text-sm font-medium hover:bg-green/20 transition-colors"
                >
                  <CheckCircle size={14} /> Approve
                </button>
                <button
                  onClick={() => rejectListingMutation.mutate(l.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red/10 text-red text-sm font-medium hover:bg-red/20 transition-colors"
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* USERS TAB */}
      {activeTab === "users" && (
        <div className="animate-fade-in">
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text3 text-xs">
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center">
                      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border/50 hover:bg-bg3 transition-colors"
                  >
                    <td className="p-4">
                      <p className="text-text1 font-medium">{u.full_name}</p>
                      <p className="text-text3 text-xs">{u.email}</p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`badge-status border text-xs px-2 py-0.5 ${
                          u.role === "admin"
                            ? "bg-red/10 text-red border-red/30"
                            : u.role === "owner"
                              ? "bg-accent/10 text-accent border-accent/30"
                              : "bg-blue/10 text-blue border-blue/30"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`badge-status border text-xs px-2 py-0.5 ${
                          u.is_active
                            ? "bg-green/10 text-green border-green/30"
                            : "bg-red/10 text-red border-red/30"
                        }`}
                      >
                        {u.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {u.is_active ? (
                        <button
                          onClick={() => suspendMutation.mutate(u.id)}
                          disabled={u.role === "admin"}
                          className="btn-danger text-xs py-1 px-2.5 flex items-center gap-1 ml-auto disabled:opacity-30"
                        >
                          <UserX size={11} /> Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => unsuspendMutation.mutate(u.id)}
                          className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1 ml-auto text-green border-green/30 hover:bg-green/10"
                        >
                          <UserCheck size={11} /> Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
