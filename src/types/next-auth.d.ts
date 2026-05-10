import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    allowed?: boolean;
  }

  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      allowed: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    allowed?: boolean;
  }
}
