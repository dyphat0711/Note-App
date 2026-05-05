import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../store/useAuthStore";

const ResetPasswordOtp = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);

  const [step, setStep] = useState(1); // 1 = verify OTP, 2 = new password
  const [email, setEmail] = useState(params.get("email") || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!/^\d{6}$/.test(otp)) {
      setErrors({ otp: "Enter the 6-digit code" });
      return;
    }
    setLoading(true);
    const r = await verifyOtp(email, otp);
    setLoading(false);
    if (r.success) {
      setStep(2);
    } else {
      const errs = Object.fromEntries(
        Object.entries(r.errors || {}).map(([k, v]) => [
          k,
          Array.isArray(v) ? v[0] : v,
        ]),
      );
      setErrors(errs);
      toast.error(r.message || "Invalid code");
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setErrors({});
    if (password !== confirm) {
      setErrors({ password_confirmation: "Passwords do not match" });
      return;
    }
    setLoading(true);
    const r = await resetPassword(
      {
        email,
        otp,
        password,
        password_confirmation: confirm,
      },
      "otp",
    );
    setLoading(false);
    if (r.success) {
      toast.success("Password reset. Please sign in.");
      navigate("/login");
    } else {
      const errs = Object.fromEntries(
        Object.entries(r.errors || {}).map(([k, v]) => [
          k,
          Array.isArray(v) ? v[0] : v,
        ]),
      );
      setErrors(errs);
      toast.error(r.message || "Reset failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-500 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-500/10 text-accent-400 mb-4">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-2xl font-display font-semibold text-surface-100 italic">
            {step === 1 ? "Enter verification code" : "Choose a new password"}
          </h1>
          <p className="mt-2 text-sm text-dark-50">
            {step === 1
              ? `We sent a 6-digit code to ${email || "your email"}.`
              : "Pick a strong password (min. 8 characters)."}
          </p>
        </div>

        {step === 1 ? (
          <form
            onSubmit={handleVerify}
            className="bg-dark-300 border border-dark-100 rounded-xl p-6 space-y-4"
          >
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              error={errors.email}
              required
            />
            <Field
              label="One-time code"
              type="text"
              value={otp}
              onChange={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
              error={errors.otp}
              required
              autoComplete="one-time-code"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Verifying..." : "Verify code"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleReset}
            className="bg-dark-300 border border-dark-100 rounded-xl p-6 space-y-4"
          >
            <Field
              label="New password"
              type="password"
              value={password}
              onChange={setPassword}
              error={errors.password}
              required
              autoComplete="new-password"
            />
            <Field
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={setConfirm}
              error={errors.password_confirmation}
              required
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-dark-50">
          <Link
            to="/forgot-password"
            className="font-medium text-accent-400 hover:text-accent-500 transition-colors"
          >
            Use a different email or method
          </Link>
        </p>
      </div>
    </div>
  );
};

const Field = ({ label, type = "text", value, onChange, error, required, autoComplete }) => (
  <div>
    <label className="block text-sm font-medium text-surface-200 mb-1.5">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      required={required}
      className={`input-dark ${error ? "border-danger-500" : ""}`}
    />
    {error && <p className="mt-1.5 text-sm text-danger-400">{error}</p>}
  </div>
);

export default ResetPasswordOtp;
