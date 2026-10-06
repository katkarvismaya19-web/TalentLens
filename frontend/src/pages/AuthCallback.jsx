import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageLoader } from "../components/ui";
import { homeFor, useAuth } from "../lib/auth";

export default function AuthCallback() {
  const { signInWithToken } = useAuth();
  const navigate = useNavigate();

  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    window.history.replaceState(null, "", "/auth/callback"); // keep the token out of history
    if (!token) {
      navigate("/login?error=" + encodeURIComponent("Sign-in didn't complete. Try again."), { replace: true });
      return;
    }
    signInWithToken(token).then((user) =>
      navigate(user ? homeFor(user) : "/login?error=" + encodeURIComponent("Sign-in failed. Try again."), { replace: true }));
  }, [navigate, signInWithToken]);

  return <PageLoader />;
}
