// Example: /ops?token=YOUR_OPS_TOKEN

import OpsClient from "./OpsClient";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function OpsPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token || token !== process.env.OPS_TOKEN) {
    return <p>Niet beschikbaar.</p>;
  }

  return <OpsClient />;
}
