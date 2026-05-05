import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../store/useAuthStore";

const ChangePassword = () => {
  const navigate = useNavigate();
  const changePassword = useAuthStore((s) => s.changePassword);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (next.length < 8) {
      setErrors({ password: "Use at least 8 characters" });
      return;
    }
    if (next !== confirm) {
      setErrors({ password_confirmation: "Passwords do not match" });
      return;
    }
    setLoading(true);
    const r = await changePassword({
      current_password: current,
      password: next,
      password_confirmation: confirm,
    });
    setLoading(false);
    if (r.success) {
      toast.success("Password changed");
      navigate("/");
    } else {
      const errs = Object.fromEntries(
        Object.entries(r.errors || {}).map(([k, v]) => [
          k,
          Array.isArray(v) ? v[0] : v,
        ]),
      );
      setErrors(errs);
      toast.error(r.message || "Failed to change password");
    }
  };

  return (
    <div className="min-h-screen bg-dark-500 px-4 py-8">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-dark-50 hover:text-surface-200 transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Back to notes
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-500/10 text-accent-400 mb-3">
            <KeyRound size={22} />
          </div>
          <h1 className="text-xl font-display font-semibold text-surface-100">
            Change account password
          </h1>
        </div>

        <form
          onSubmit={submit}
          className="bg-dark-300 border border-dark-100 rounded-xl p-6 space-y-4"
        >
          <Field
            label="Current password"
            value={current}
            onChange={setCurrent}
            error={errors.current_password}
            autoFocus
          />
          <Field
            label="New password"
            value={next}
            onChange={setNext}
            error={errors.password}
            hint="Min. 8 characters"
          />
          <Field
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            error={errors.password_confirmation}
          />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, error, autoFocus, hint }) => (
  <div>
    <label className="block text-sm font-medium text-surface-200 mb-1.5">
      {label}
    </label>
    <input
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      autoComplete="new-password"
      className={`input-dark ${error ? "border-danger-500" : ""}`}
    />
    {error ? (
      <p className="mt-1.5 text-sm text-danger-400">{error}</p>
    ) : hint ? (
      <p className="mt-1.5 text-xs text-dark-50">{hint}</p>
    ) : null}
  </div>
);

export default ChangePassword;
