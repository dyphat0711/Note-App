import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Sun, Moon, Monitor, Palette } from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../store/useAuthStore";
import useNoteStore from "../store/useNoteStore";

const DEFAULT_PREFS = {
  theme: "dark",
  font_size: 16,
  default_note_color: "#fef3c7",
  default_label_color: "#3b82f6",
  default_view: "grid",
};

const NOTE_COLOR_PRESETS = [
  "#fef3c7", "#fee2e2", "#dbeafe", "#dcfce7", "#fae8ff", "#fff7ed", "#f1f5f9",
];

const Preferences = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const updatePreferences = useAuthStore((s) => s.updatePreferences);
  const setViewMode = useNoteStore((s) => s.setViewMode);

  const [prefs, setPrefs] = useState({
    ...DEFAULT_PREFS,
    ...(user?.preferences || {}),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) fetchUser();
  }, [user, fetchUser]);

  useEffect(() => {
    if (user?.preferences) {
      setPrefs({ ...DEFAULT_PREFS, ...user.preferences });
    }
  }, [user]);

  // Live preview: apply theme + font-size to body so the user sees changes immediately.
  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;
    if (prefs.theme === "dark") {
      root.classList.add("dark");
    } else if (prefs.theme === "light") {
      root.classList.remove("dark");
    } else {
      const m = window.matchMedia("(prefers-color-scheme: dark)");
      if (m.matches) root.classList.add("dark");
      else root.classList.remove("dark");
    }
    body.style.fontSize = `${prefs.font_size}px`;
  }, [prefs.theme, prefs.font_size]);

  const update = (patch) => setPrefs((p) => ({ ...p, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    const r = await updatePreferences(prefs);
    setSaving(false);
    if (r.success) {
      toast.success("Preferences saved");
      // Sync default_view to note store immediately
      if (prefs.default_view) {
        setViewMode(prefs.default_view);
      }
    } else {
      toast.error(r.message || "Failed to save");
    }
  };

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
          Preferences
        </h1>

        <Section title="Theme" subtitle="Toggle between light and dark.">
          <div className="grid grid-cols-3 gap-2">
            <ThemeButton
              icon={<Sun size={16} />}
              label="Light"
              active={prefs.theme === "light"}
              onClick={() => update({ theme: "light" })}
            />
            <ThemeButton
              icon={<Moon size={16} />}
              label="Dark"
              active={prefs.theme === "dark"}
              onClick={() => update({ theme: "dark" })}
            />
            <ThemeButton
              icon={<Monitor size={16} />}
              label="System"
              active={prefs.theme === "system"}
              onClick={() => update({ theme: "system" })}
            />
          </div>
        </Section>

        <Section title="Font size" subtitle="Adjust the body font size for notes.">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={12}
              max={24}
              step={1}
              value={prefs.font_size}
              onChange={(e) => update({ font_size: Number(e.target.value) })}
              className="flex-1"
            />
            <span
              className="text-sm font-mono w-12 text-right text-surface-200"
              aria-live="polite"
            >
              {prefs.font_size}px
            </span>
          </div>
        </Section>

        <Section title="Default note color">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => update({ default_note_color: "random" })}
              className={`px-3 h-8 rounded-lg border-2 text-xs font-medium transition-all ${
                prefs.default_note_color === "random"
                  ? "border-accent-500 text-accent-500"
                  : "border-dark-100 text-surface-200"
              }`}
            >
              Random
            </button>
            {NOTE_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => update({ default_note_color: c })}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  prefs.default_note_color === c
                    ? "border-white scale-110"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
            <input
              type="color"
              value={prefs.default_note_color === "random" ? "#3b82f6" : prefs.default_note_color}
              onChange={(e) => update({ default_note_color: e.target.value })}
              className="w-8 h-8 rounded-lg cursor-pointer"
              aria-label="Custom color"
            />
          </div>
        </Section>

        <Section
          title="Default view"
          subtitle="Pick whether new sessions open in grid or list."
        >
          <div className="grid grid-cols-2 gap-2">
            <ThemeButton
              icon={<Palette size={16} />}
              label="Grid"
              active={prefs.default_view === "grid"}
              onClick={() => update({ default_view: "grid" })}
            />
            <ThemeButton
              icon={<Palette size={16} />}
              label="List"
              active={prefs.default_view === "list"}
              onClick={() => update({ default_view: "list" })}
            />
          </div>
        </Section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full mt-2"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Save size={14} />
              Save preferences
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

const Section = ({ title, subtitle, children }) => (
  <div
    className="rounded-2xl p-5 sm:p-6 mb-3.5"
    style={{
      background: "rgba(var(--dark-300), 0.8)",
      border: "1px solid rgba(var(--dark-100), 0.5)",
    }}
  >
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-surface-200">{title}</h2>
      {subtitle && (
        <p className="text-xs text-dark-50 mt-0.5 leading-relaxed">{subtitle}</p>
      )}
    </div>
    <div>{children}</div>
  </div>
);

const ThemeButton = ({ icon, label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 active:scale-95 ${
      active
        ? "text-accent-300"
        : "text-surface-200 hover:border-dark-50"
    }`}
    style={active ? {
      background: "rgba(99,102,241,0.12)",
      borderColor: "rgba(99,102,241,0.4)",
    } : {
      background: "rgba(var(--dark-200), 0.7)",
      borderColor: "rgba(var(--dark-100), 0.6)",
    }}
  >
    {icon}
    {label}
  </button>
);

export default Preferences;
