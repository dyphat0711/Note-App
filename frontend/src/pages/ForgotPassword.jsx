import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, Send } from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../store/useAuthStore";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState("link"); // 'link' | 'otp'
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const r = await forgotPassword(email.trim(), mode);
    setLoading(false);
    if (r.success) {
      setSubmitted(true);
      toast.success(
        mode === "otp"
          ? "If your account exists, an OTP has been sent."
          : "If your account exists, a reset link has been sent.",
      );
      if (mode === "otp") {
        navigate(`/reset-password/otp?email=${encodeURIComponent(email.trim())}`);
      }
    } else {
      toast.error(r.message || "Request failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-500 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-500/10 text-accent-400 mb-4">
            <KeyRound size={24} />
          </div>
          <h1 className="text-2xl font-display font-semibold text-surface-100 italic">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-dark-50">
            We'll send you a {mode === "otp" ? "one-time code" : "secure link"} to reset it.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-dark-300 border border-dark-100 rounded-xl p-6 space-y-4"
        >
          <div className="flex gap-1 p-0.5 bg-dark-200 rounded-lg">
            <button
              type="button"
              onClick={() => setMode("link")}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === "link"
                  ? "bg-dark-100 text-surface-100"
                  : "text-dark-50"
              }`}
            >
              Email link
            </button>
            <button
              type="button"
              onClick={() => setMode("otp")}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === "otp"
                  ? "bg-dark-100 text-surface-100"
                  : "text-dark-50"
              }`}
            >
              One-time code
            </button>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-surface-200 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-dark"
              placeholder="you@example.com"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || submitted}
            className="btn-primary w-full"
          >
            <Send size={14} className="inline mr-2" />
            {loading ? "Sending..." : submitted ? "Sent" : "Send reset"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-dark-50">
          <Link to="/login" className="inline-flex items-center gap-1 font-medium text-accent-400 hover:text-accent-500 transition-colors">
            <ArrowLeft size={12} /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
