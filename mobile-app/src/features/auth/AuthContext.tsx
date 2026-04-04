import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { LoginResponse } from "../../lib/api";
import { getCurrentUser, login, logout as clearSession } from "../../services/auth";

type AuthState = {
  bootstrapping: boolean;
  user: LoginResponse["user"] | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [user, setUser] = useState<LoginResponse["user"] | null>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const nextUser = await getCurrentUser();
        setUser(nextUser);
      } finally {
        setBootstrapping(false);
      }
    }

    bootstrap();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      bootstrapping,
      user,
      async signIn(email, password) {
        const response = await login(email, password);
        setUser(response.user);
      },
      async signOut() {
        await clearSession();
        setUser(null);
      },
    }),
    [bootstrapping, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
