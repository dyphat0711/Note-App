import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Edit3 } from "lucide-react";
import useAuthStore from "../store/useAuthStore";

const Login = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});

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
    const result = await login(formData);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-500 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-500/10 text-accent-400 mb-4">
            <Edit3 size={24} />
          </div>
          <h1 className="text-2xl font-display font-semibold text-surface-100 italic">
            NoteFlow
          </h1>
          <p className="mt-2 text-sm text-dark-50">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-dark-300 border border-dark-100 rounded-xl p-6 space-y-4"
        >
          {error?.message && (
            <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm">
              {error.message}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-surface-200 mb-1.5">
              Email
            </label>
            <input
              id="email" name="email" type="email" autoComplete="email" required
              value={formData.email} onChange={handleChange}
              className={`input-dark ${fieldErrors.email ? "border-danger-500" : ""}`}
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p className="mt-1.5 text-sm text-danger-400">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-surface-200 mb-1.5">
              Password
            </label>
            <input
              id="password" name="password" type="password" autoComplete="current-password" required
              value={formData.password} onChange={handleChange}
              className={`input-dark ${fieldErrors.password ? "border-danger-500" : ""}`}
              placeholder="••••••••"
            />
            {fieldErrors.password && (
              <p className="mt-1.5 text-sm text-danger-400">{fieldErrors.password}</p>
            )}
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? "Signing in..." : "Sign in"}
          </button>

          <p className="text-center text-xs text-dark-50">
            <Link
              to="/forgot-password"
              className="hover:text-surface-200 transition-colors"
            >
              Forgot password?
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-dark-50">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-medium text-accent-400 hover:text-accent-500 transition-colors">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
