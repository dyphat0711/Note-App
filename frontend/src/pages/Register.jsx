import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-500 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-500/10 text-accent-400 mb-4">
            <UserPlus size={24} />
          </div>
          <h1 className="text-2xl font-display font-semibold text-surface-100 italic">
            NoteFlow
          </h1>
          <p className="mt-2 text-sm text-dark-50">Create your account</p>
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
            <label htmlFor="display_name" className="block text-sm font-medium text-surface-200 mb-1.5">Display name</label>
            <input id="display_name" name="display_name" type="text" autoComplete="name" required
              value={formData.display_name} onChange={handleChange}
              className={`input-dark ${fieldErrors.display_name ? "border-danger-500" : ""}`}
              placeholder="Your name" />
            {fieldErrors.display_name && <p className="mt-1.5 text-sm text-danger-400">{fieldErrors.display_name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-surface-200 mb-1.5">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required
              value={formData.email} onChange={handleChange}
              className={`input-dark ${fieldErrors.email ? "border-danger-500" : ""}`}
              placeholder="you@example.com" />
            {fieldErrors.email && <p className="mt-1.5 text-sm text-danger-400">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-surface-200 mb-1.5">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required
              value={formData.password} onChange={handleChange}
              className={`input-dark ${fieldErrors.password ? "border-danger-500" : ""}`}
              placeholder="Min. 8 characters" />
            {fieldErrors.password && <p className="mt-1.5 text-sm text-danger-400">{fieldErrors.password}</p>}
          </div>

          <div>
            <label htmlFor="password_confirmation" className="block text-sm font-medium text-surface-200 mb-1.5">Confirm password</label>
            <input id="password_confirmation" name="password_confirmation" type="password" autoComplete="new-password" required
              value={formData.password_confirmation} onChange={handleChange}
              className={`input-dark ${fieldErrors.password_confirmation ? "border-danger-500" : ""}`}
              placeholder="Re-enter password" />
            {fieldErrors.password_confirmation && <p className="mt-1.5 text-sm text-danger-400">{fieldErrors.password_confirmation}</p>}
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-dark-50">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-accent-400 hover:text-accent-500 transition-colors">
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
