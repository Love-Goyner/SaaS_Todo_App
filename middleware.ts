import {
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const publicRoutes = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook/register",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  const pathname = request.nextUrl.pathname;

  if (!userId && !publicRoutes(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (userId) {
    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const role = user.publicMetadata.role as string | undefined;
    
        // Admin role redirection logic
        if (role === "admin" && pathname === "/dashboard") {
          return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        }
    
        // Prevent non-admin users from accessing admin routes
        if (role !== "admin" && pathname.startsWith("/admin")) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
    
        // Redirect authenticated users trying to access public routes
        if (publicRoutes(request)) {
          return NextResponse.redirect(
            new URL(
              role === "admin" ? "/admin/dashboard" : "/dashboard",
              request.url
            )
          );
        }
    } catch (error:any) {
        console.error('Error fetching user data from Clerk:', error);
        return NextResponse.redirect(new URL('/error', request.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
