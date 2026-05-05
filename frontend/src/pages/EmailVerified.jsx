import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BadgeCheck, AlertCircle } from "lucide-react";
import api from "../api/axios";

/**
 * Lands here when the user clicks the signed link from the verification email.
 * Calls the API endpoint with the same query params, then shows a status page.
 */
const EmailVerified = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState("");

  useEffect(() => {
    const id = params.get("id");
    const hash = params.get("hash");
    const expires = params.get("expires");
    const signature = params.get("signature");

    if (!id || !hash) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    api
      .get(`/email/verify/${id}/${hash}`, {
        params: { expires, signature },
      })
      .then((res) => {
        setStatus("success");
        setMessage(res.data?.message || "Email verified!");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err.response?.data?.message || "Verification link is invalid or expired.",
        );
      });
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-500 px-4">
      <div className="w-full max-w-sm bg-dark-300 border border-dark-100 rounded-xl p-8 text-center">
        {status === "verifying" && (
          <div className="animate-spin w-8 h-8 mx-auto border-2 border-accent-500 border-t-transparent rounded-full" />
        )}
        {status === "success" && (
          <BadgeCheck size={48} className="mx-auto text-emerald-400 mb-3" />
        )}
        {status === "error" && (
          <AlertCircle size={48} className="mx-auto text-danger-400 mb-3" />
        )}
        <h1 className="text-lg font-display font-semibold text-surface-100 mt-4">
          {status === "verifying"
            ? "Verifying your email..."
            : status === "success"
              ? "Email verified"
              : "Verification failed"}
        </h1>
        <p className="text-sm text-dark-50 mt-2">{message}</p>
        <Link
          to="/login"
          className="inline-block mt-6 text-sm text-accent-400 hover:text-accent-300"
        >
          Continue to sign in
        </Link>
      </div>
    </div>
  );
};

export default EmailVerified;
