"use client";

import { useEffect, useState } from "react";
import Guard from "@/components/admin/Guard";

type Merchant = {
  id: string;
  name: string;
  createdAt: string;
};

type MerchantsList = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: Merchant[];
};

export default function MerchantsPage() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const [data, setData] = useState<MerchantsList | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal state for registration
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    merchantName: "",
    storeName: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`/api/merchants?page=${page}&limit=${limit}`, {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to load merchants");

      const body = await res.json();
      setData(body.data ?? null);
    } catch (e: any) {
      setErr(e?.message || "Failed to load merchants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSuccess(null);

    // Validation
    if (!form.merchantName.trim()) {
      setErr("Merchant name is required");
      return;
    }
    if (!form.storeName.trim()) {
      setErr("Store name is required");
      return;
    }
    if (!form.fullName.trim()) {
      setErr("Full name is required");
      return;
    }
    if (!form.email.trim()) {
      setErr("Email is required");
      return;
    }
    if (form.password.length < 8) {
      setErr("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setErr("Passwords don't match");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/merchants/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          merchantName: form.merchantName,
          storeName: form.storeName,
          fullName: form.fullName,
          email: form.email,
          password: form.password,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setErr(body?.message || "Registration failed");
        return;
      }

      setSuccess("Merchant registered successfully!");
      setForm({
        merchantName: "",
        storeName: "",
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setShowModal(false);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Registration failed");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Guard>
      <div className="w-full h-full overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Merchants</h1>
              <p className="text-slate-400">
                Manage and register new merchants in the system
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Register Merchant
            </button>
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20 animate-in fade-in slide-in-from-top-2">
              <svg
                className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-green-300">{success}</p>
            </div>
          )}

          {/* Error message */}
          {err && !showModal && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-2">
              <svg
                className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-300">{err}</p>
            </div>
          )}

          {/* Merchants Table */}
          <div className="rounded-xl border border-slate-700/50 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="text-slate-400">Loading merchants...</div>
              </div>
            ) : data?.items && data.items.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700/50 bg-slate-800/50">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
                          Merchant Name
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
                          Date Created
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-slate-200">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {data.items.map((merchant) => (
                        <tr
                          key={merchant.id}
                          className="hover:bg-slate-800/30 transition-colors duration-200"
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-100">
                              {merchant.name}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {merchant.id}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">
                            {formatDate(merchant.createdAt)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-colors duration-200">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {data.pages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 bg-slate-800/30 border-t border-slate-700/50">
                    <p className="text-sm text-slate-400">
                      Page {data.page} of {data.pages} ({data.total} total)
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        Previous
                      </button>
                      <button
                        disabled={page === data.pages}
                        onClick={() => setPage(page + 1)}
                        className="px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-12">
                <svg
                  className="w-12 h-12 text-slate-600 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="text-slate-400 mb-4">No merchants yet</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200"
                >
                  Register the first merchant
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Registration Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-md backdrop-blur-xl bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-1">
                Register Merchant
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Create a new merchant account and store
              </p>

              {err && (
                <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <svg
                    className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-red-300">{err}</p>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Merchant Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Your Business Name"
                    value={form.merchantName}
                    onChange={(e) =>
                      setForm({ ...form, merchantName: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Store Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Main Store"
                    value={form.storeName}
                    onChange={(e) =>
                      setForm({ ...form, storeName: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Admin Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@business.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <svg
                          className="w-4 h-4 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Registering...
                      </>
                    ) : (
                      "Register"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Guard>
  );
}
