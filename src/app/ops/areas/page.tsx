import { requireOpsAuth } from "@/lib/opsAuth";
import { cookies } from "next/headers";
import AreasClient from "./AreasClient";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AreasPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  await requireOpsAuth(token);

  // Get token from cookie or query param for client-side API calls
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("ops_session")?.value || token || "";

  return <AreasClient token={sessionToken} />;
}
