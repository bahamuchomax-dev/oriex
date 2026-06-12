import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut,
} from "firebase/auth";
import { auth } from "../../firebase/firebase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLoading(false);
    }, 8000);

    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        window.clearTimeout(timeout);
        setUser(u);
        setLoading(false);
      },
      (err) => {
        window.clearTimeout(timeout);
        setError(err);
        setLoading(false);
      }
    );
    return () => {
      window.clearTimeout(timeout);
      unsub();
    };
  }, []);

  async function signInAnon() {
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (err) {
      // The most common cause is "Anonymous sign-in" being disabled in the
      // Firebase console (Authentication > Sign-in method). Surface it.
      setError(err);
    }
  }

  async function signOutUser() {
    setError(null);
    try {
      await signOut(auth);
    } catch (err) {
      setError(err);
    }
  }

  const value = {
    user,
    uid: user?.uid ?? null,
    loading,
    error,
    signInAnon,
    signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
