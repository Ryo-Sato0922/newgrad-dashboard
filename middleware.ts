import { NextRequest, NextResponse } from "next/server";

const user = process.env.DASHBOARD_USER;
const password = process.env.DASHBOARD_PASSWORD;

export function middleware(request: NextRequest) {
  if (!user || !password) {
    return NextResponse.next();
  }

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const [, encoded] = auth.split(" ");
    const [inputUser, inputPassword] = atob(encoded).split(":");
    if (inputUser === user && inputPassword === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Newgrad Dashboard"'
    }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
