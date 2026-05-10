import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import useAuthStore from "../store/useAuthStore";

const Register = () => {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const [formData, setFormData] = useState({
    display_name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    if (formData.password !== formData.password_confirmation) {
      setFieldErrors({ password_confirmation: "Passwords do not match" });
      return;
    }

    const result = await register(formData);
    if (result.success) {
      navigate("/");
    } else if (result.errors) {
      setFieldErrors(
        Object.fromEntries(
          Object.entries(result.errors).map(([k, v]) => [
            k,
            Array.isArray(v) ? v[0] : v,
          ]),
        ),
      );
    }
  };

  const fields = [
    {
      id: "display_name",
      label: "Display name",
      type: "text",
      autoComplete: "name",
      placeholder: "Your name",
      toggleShow: null,
    },
    {
      id: "email",
      label: "Email",
      type: "email",
      autoComplete: "email",
      placeholder: "you@example.com",
      toggleShow: null,
    },
    {
      id: "password",
      label: "Password",
      type: showPassword ? "text" : "password",
      autoComplete: "new-password",
      placeholder: "Min. 8 characters",
      toggleShow: () => setShowPassword((v) => !v),
      showState: showPassword,
    },
    {
      id: "password_confirmation",
      label: "Confirm password",
      type: showConfirm ? "text" : "password",
      autoComplete: "new-password",
      placeholder: "Re-enter password",
      toggleShow: () => setShowConfirm((v) => !v),
      showState: showConfirm,
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-500 px-4 py-8 relative overflow-hidden">
      {/* Background orbs */}
      <div className="auth-orb-1" />
      <div className="auth-orb-2" />

      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 transition-transform hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.06))",
              border: "1px solid rgba(99,102,241,0.25)",
            }}
          >
            <UserPlus size={22} className="text-accent-400" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-surface-100 italic">
            NoteFlow
          </h1>
          <p className="mt-1.5 text-sm text-dark-50">Create your account to get started.</p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: "rgba(var(--dark-300), 0.85)",
            border: "1px solid rgba(var(--dark-100), 0.5)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}
        >
          {error?.message && (
            <div
              className="p-3 rounded-xl text-sm animate-slide-down"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "rgb(248 113 113)",
              }}
            >
              {error.message}
            </div>
          )}

          {fields.map(({ id, label, type, autoComplete, placeholder, toggleShow, showState }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-sm font-medium text-surface-200 mb-1.5">
                {label}
              </label>
              <div className="relative">
                <input
                  id={id}
                  name={id}
                  type={type}
                  autoComplete={autoComplete}
                  required
                  value={formData[id]}
                  onChange={handleChange}
                  className={`input-dark ${toggleShow ? "pr-10" : ""} ${
                    fieldErrors[id] ? "border-red-500 focus:ring-red-500" : ""
                  }`}
                  placeholder={placeholder}
                />
                {toggleShow && (
                  <button
                    type="button"
                    onClick={toggleShow}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-50 hover:text-surface-200 transition-colors"
                    aria-label={showState ? "Hide password" : "Show password"}
                  >
                    {showState ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
              {fieldErrors[id] && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors[id]}</p>
              )}
            </div>
          ))}

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn-primary w-full mt-2"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : "Create account"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-dark-50">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-accent-400 hover:text-accent-300 transition-colors">
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
