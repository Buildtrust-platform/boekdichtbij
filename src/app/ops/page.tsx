import { requireOpsAuth } from "@/lib/opsAuth";
import OpsClient from "./OpsClient";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function OpsPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  await requireOpsAuth(token);

  return <OpsClient />;
}
