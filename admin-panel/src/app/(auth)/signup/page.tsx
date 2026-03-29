"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PasswordInput } from "@/components/admin/password_input";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 - Account
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2 - Business
  const [merchantName, setMerchantName] = useState("");
  const [storeName, setStoreName] = useState("");

  // Step 3 - Optional
  const [currency, setCurrency] = useState("GHS");
  const [location, setLocation] = useState("");
  const [receiptPrefix, setReceiptPrefix] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Validate Step 1
  const validateStep1 = () => {
    setErr(null);

    if (!fullName.trim()) {
      setErr("Full name is required");
      return false;
    }

    if (!email.trim()) {
      setErr("Email is required");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Invalid email format");
      return false;
    }

    if (password.length < 8) {
      setErr("Password must be at least 8 characters");
      return false;
    }

    if (password !== confirmPassword) {
      setErr("Passwords don't match");
      return false;
    }

    return true;
  };

  // Validate Step 2
  const validateStep2 = () => {
    setErr(null);

    if (!merchantName.trim()) {
      setErr("Business name is required");
      return false;
    }

    if (!storeName.trim()) {
      setErr("Store name is required");
      return false;
    }

    return true;
  };

  // Handle Next button
  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3);
      }
    }
  };

  // Handle Back button
  const handleBack = () => {
    setErr(null);
    setStep(step - 1);
  };

  // Handle Skip button (from step 3)
  const handleSkip = async () => {
    await submitRegistration();
  };

  // Submit registration
  const submitRegistration = async () => {
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/merchants/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          merchantName,
          storeName,
          ...(currency && { currency }),
          ...(location && { location }),
          ...(receiptPrefix && { receiptPrefix }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data?.message ?? "Registration failed");
        setLoading(false);
        return;
      }

      router.replace("/login?message=Registration successful! Please log in.");
    } catch (e: unknown) {
      const error = e as any;
      setErr(error?.message ?? "Registration failed");
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 3) {
      submitRegistration();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Main container */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">V</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Virnyx
          </h1>
          <p className="text-slate-400 text-sm">Get started in 3 simple steps</p>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all duration-300 ${
                  step >= s
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                    : "bg-slate-700/50 text-slate-400"
                }`}
              >
                {step > s ? (
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded-full transition-all duration-300 ${
                    step > s
                      ? "bg-gradient-to-r from-blue-600 to-purple-600"
                      : "bg-slate-700/50"
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="backdrop-blur-xl bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 shadow-2xl space-y-4 transition-all duration-300"
        >
          {/* Step 1 - Account Creation */}
          {step === 1 && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">
                  Create Your Account
                </h2>
                <p className="text-slate-400 text-sm">
                  Let&apos;s start with your personal information
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-slate-200"
                >
                  Full Name
                </label>
                <div
                  className={`flex items-center relative transition-all duration-200 rounded-lg ${
                    focusedField === "fullName"
                      ? "ring-2 ring-blue-500/50"
                      : ""
                  }`}
                >
                  <div className="absolute left-4 text-slate-400 pointer-events-none">
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onFocus={() => setFocusedField("fullName")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-200"
                >
                  Email Address
                </label>
                <div
                  className={`flex items-center relative transition-all duration-200 rounded-lg ${
                    focusedField === "email" ? "ring-2 ring-blue-500/50" : ""
                  }`}
                >
                  <div className="absolute left-4 text-slate-400 pointer-events-none">
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
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="admin@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-200"
                >
                  Password
                </label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  required
                  className={`${
                    focusedField === "password"
                      ? "ring-2 ring-blue-500/50"
                      : ""
                  }`}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Minimum 8 characters
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-200"
                >
                  Confirm Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField(null)}
                  required
                  className={`${
                    focusedField === "confirmPassword"
                      ? "ring-2 ring-blue-500/50"
                      : ""
                  }`}
                />
              </div>
            </>
          )}

          {/* Step 2 - Business Setup */}
          {step === 2 && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">
                  Tell us about your business
                </h2>
                <p className="text-slate-400 text-sm">
                  We need some basic information to set up your account
                </p>
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <label
                  htmlFor="merchantName"
                  className="block text-sm font-medium text-slate-200"
                >
                  Business Name
                </label>
                <div
                  className={`flex items-center relative transition-all duration-200 rounded-lg ${
                    focusedField === "merchantName"
                      ? "ring-2 ring-blue-500/50"
                      : ""
                  }`}
                >
                  <div className="absolute left-4 text-slate-400 pointer-events-none">
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
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1M9 7a4 4 0 0 1 8 0m0 0a4 4 0 0 1 8 0"
                      />
                    </svg>
                  </div>
                  <input
                    id="merchantName"
                    type="text"
                    required
                    placeholder="Your Business Name"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    onFocus={() => setFocusedField("merchantName")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  />
                </div>
              </div>

              {/* Store Name */}
              <div className="space-y-2">
                <label
                  htmlFor="storeName"
                  className="block text-sm font-medium text-slate-200"
                >
                  Store Name
                </label>
                <div
                  className={`flex items-center relative transition-all duration-200 rounded-lg ${
                    focusedField === "storeName" ? "ring-2 ring-blue-500/50" : ""
                  }`}
                >
                  <div className="absolute left-4 text-slate-400 pointer-events-none">
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <input
                    id="storeName"
                    type="text"
                    required
                    placeholder="Main Store"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    onFocus={() => setFocusedField("storeName")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 3 - Optional Setup */}
          {step === 3 && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">
                  Customize your setup
                </h2>
                <p className="text-slate-400 text-sm">
                  Optional settings - you can change these later
                </p>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <label
                  htmlFor="currency"
                  className="block text-sm font-medium text-slate-200"
                >
                  Currency
                </label>
                <div
                  className={`flex items-center relative transition-all duration-200 rounded-lg ${
                    focusedField === "currency"
                      ? "ring-2 ring-blue-500/50"
                      : ""
                  }`}
                >
                  <div className="absolute left-4 text-slate-400 pointer-events-none">
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
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    onFocus={() => setFocusedField("currency")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 transition-colors duration-200 appearance-none"
                  >
                    <option value="GHS">GHS - Ghana Cedis</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="NGN">NGN - Nigerian Naira</option>
                    <option value="ZAR">ZAR - South African Rand</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-slate-200"
                >
                  Location
                </label>
                <div
                  className={`flex items-center relative transition-all duration-200 rounded-lg ${
                    focusedField === "location"
                      ? "ring-2 ring-blue-500/50"
                      : ""
                  }`}
                >
                  <div className="absolute left-4 text-slate-400 pointer-events-none">
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
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <input
                    id="location"
                    type="text"
                    placeholder="Accra, Ghana"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onFocus={() => setFocusedField("location")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  />
                </div>
              </div>

              {/* Receipt Prefix */}
              <div className="space-y-2">
                <label
                  htmlFor="receiptPrefix"
                  className="block text-sm font-medium text-slate-200"
                >
                  Receipt Prefix
                </label>
                <div
                  className={`flex items-center relative transition-all duration-200 rounded-lg ${
                    focusedField === "receiptPrefix"
                      ? "ring-2 ring-blue-500/50"
                      : ""
                  }`}
                >
                  <div className="absolute left-4 text-slate-400 pointer-events-none">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <input
                    id="receiptPrefix"
                    type="text"
                    placeholder="RCP"
                    value={receiptPrefix}
                    onChange={(e) => setReceiptPrefix(e.target.value)}
                    onFocus={() => setFocusedField("receiptPrefix")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Example: RCP-001, RCP-002, etc.
                </p>
              </div>
            </>
          )}

          {/* Error message */}
          {err && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-2">
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

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
            )}

            {step < 3 && (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            )}

            {step === 3 && (
              <>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
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
                    "Complete"
                  )}
                </button>
              </>
            )}
          </div>

          {/* Sign in link */}
          <div className="text-center pt-4 border-t border-slate-700/50">
            <p className="text-slate-400 text-sm">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>

        {/* Floating cards for visual interest */}
        <div className="absolute -z-10 -top-20 right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -z-10 -bottom-20 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
}