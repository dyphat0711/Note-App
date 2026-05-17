import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Trash2, Save, Mail, BadgeCheck, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../store/useAuthStore";

const Profile = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar);
  const deleteAvatar = useAuthStore((s) => s.deleteAvatar);
  const resendVerification = useAuthStore((s) => s.resendVerification);

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!user) fetchUser();
  }, [user, fetchUser]);

  useEffect(() => {
    setDisplayName(user?.displayName || "");
    setEmail(user?.email || "");
  }, [user?.id, user?.displayName, user?.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    const payload = {};
    if (displayName !== user?.displayName) payload.display_name = displayName;
    if (email !== user?.email) payload.email = email;
    if (Object.keys(payload).length === 0) {
      setLoading(false);
      toast("No changes to save", { icon: "ℹ️" });
      return;
    }
    const r = await updateProfile(payload);
    setLoading(false);
    if (r.success) {
      toast.success("Profile updated");
    } else {
      const errs = Object.fromEntries(
        Object.entries(r.errors || {}).map(([k, v]) => [
          k,
          Array.isArray(v) ? v[0] : v,
        ]),
      );
      setErrors(errs);
      toast.error(r.message || "Failed to update profile");
    }
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar must be ≤2MB");
      return;
    }
    const r = await uploadAvatar(file);
    if (r.success) toast.success("Avatar updated");
    else toast.error(r.message || "Upload failed");
    e.target.value = "";
  };

  const handleAvatarDelete = async () => {
    const r = await deleteAvatar();
    if (r.success) toast.success("Avatar removed");
  };

  const handleResend = async () => {
    const r = await resendVerification();
    if (r.success) toast.success("Verification email sent");
    else toast.error(r.message || "Failed");
  };

  const initial =
    displayName?.charAt(0).toUpperCase() ||
    user?.displayName?.charAt(0).toUpperCase() ||
    "U";

  return (
    <div className="min-h-screen bg-dark-500 px-4 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto animate-fade-in-up">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-dark-50 hover:text-surface-200 transition-colors mb-5"
        >
          <ArrowLeft size={14} /> Back to notes
        </button>

        <h1 className="text-2xl font-display font-semibold text-surface-100 mb-5">
          Profile
        </h1>

        <div
          className="rounded-2xl p-5 sm:p-6 mb-4"
          style={{
            background: "rgba(var(--dark-300), 0.8)",
            border: "1px solid rgba(var(--dark-100), 0.5)",
          }}
        >
          <h2 className="text-sm font-semibold text-surface-200 mb-4">Avatar</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-dark-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-accent-500/20 flex items-center justify-center text-3xl font-medium text-accent-300 border-2 border-dark-100">
                  {initial}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarSelect}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="btn-secondary text-xs"
              >
                <Camera size={12} className="inline mr-1.5" />
                Upload new
              </button>
              {user?.avatarUrl && (
                <button
                  onClick={handleAvatarDelete}
                  className="btn-secondary text-xs ml-2"
                >
                  <Trash2 size={12} className="inline mr-1.5" />
                  Remove
                </button>
              )}
              <p className="text-[11px] text-dark-50">
                JPEG, PNG, or WebP · max 2MB.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-5 sm:p-6 space-y-4"
          style={{
            background: "rgba(var(--dark-300), 0.8)",
            border: "1px solid rgba(var(--dark-100), 0.5)",
          }}
        >
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1.5">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`input-dark ${errors.display_name ? "border-danger-500" : ""}`}
            />
            {errors.display_name && (
              <p className="mt-1.5 text-sm text-danger-400">{errors.display_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1.5 flex items-center gap-2">
              Email
              {user?.isVerified ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                  <BadgeCheck size={11} /> verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                  <AlertCircle size={11} /> not verified
                </span>
              )}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`input-dark ${errors.email ? "border-danger-500" : ""}`}
            />
            {errors.email && (
              <p className="mt-1.5 text-sm text-danger-400">{errors.email}</p>
            )}
            {!user?.isVerified && (
              <button
                type="button"
                onClick={handleResend}
                className="mt-2 text-xs text-accent-400 hover:text-accent-300 inline-flex items-center gap-1"
              >
                <Mail size={11} /> Resend verification email
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            <Save size={14} className="inline mr-2" />
            {loading ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
