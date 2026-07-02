// ============================================================
// Auth removed: useAuth is now a no-op stub.
// همه کاربران به‌عنوان ادمین در نظر گرفته می‌شوند و نیازی به ورود نیست.
// ============================================================
import { ReactNode } from "react";

interface AuthCtx {
  user: null;
  session: null;
  loading: false;
  roles: string[];
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const STUB: AuthCtx = {
  user: null,
  session: null,
  loading: false,
  roles: ["admin"],
  isAdmin: true,
  signOut: async () => {},
};

export const AuthProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
export const useAuth = () => STUB;
