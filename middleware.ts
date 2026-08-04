import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Acceso restringido", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="ORA Kairos Access"',
    },
  });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const protectedPaths = ["/kairos", "/soberania"];

  const needsProtection = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (!needsProtection) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorized();
  }

  try {
    const base64Credentials = authHeader.split(" ")[1];
    const decoded = atob(base64Credentials);
    const [username, password] = decoded.split(":");

    const validUser = process.env.KAIROS_USER;
    const validPass = process.env.KAIROS_PASS;

    if (username === validUser && password === validPass) {
      return NextResponse.next();
    }

    return unauthorized();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: ["/kairos/:path*", "/soberania/:path*"],
};
