import { notFound } from "next/navigation";
import Link from "next/link";
import {
  isValidCity,
  isValidService,
  getServiceConfig,
  AREAS,
} from "@/config/locations";
import { getAreaOverride } from "@/lib/areaOverrides";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

interface PageProps {
  params: Promise<{
    city: string;
    area: string;
    service: string;
  }>;
  searchParams: Promise<{ token?: string }>;
}

function PilotGatePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Nog niet beschikbaar
        </h1>
        <p className="text-gray-500 mb-6">
          BoekDichtbij is hier nog niet actief.
        </p>
        <Link
          href="/"
          className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Ga terug
        </Link>
      </div>
    </main>
  );
}

export default async function BookingPage({ params, searchParams }: PageProps) {
  const { city, area, service } = await params;
  const { token } = await searchParams;

  // Validate city
  if (!isValidCity(city)) {
    notFound();
  }

  // Get area config directly (don't use isValidArea as it blocks hidden)
  const areaConfig = AREAS[area];
  if (!areaConfig || !areaConfig.enabled || areaConfig.city !== city) {
    notFound();
  }

  // Validate service
  if (!isValidService(service)) {
    notFound();
  }

  const serviceConfig = getServiceConfig(service);
  if (!serviceConfig) {
    notFound();
  }

  // ==================================================
  // PILOT GATE (with DynamoDB overrides)
  // ==================================================
  // - hidden: always 404
  // - pilot: require ops token, otherwise show unavailable page
  // - live: allow as normal
  // ==================================================

  // Get effective rollout status (override takes precedence)
  let effectiveRolloutStatus = areaConfig.rolloutStatus;
  try {
    const override = await getAreaOverride(city, area);
    if (override?.rolloutStatus) {
      effectiveRolloutStatus = override.rolloutStatus;
    }
  } catch {
    // Fallback to registry on error
  }

  if (effectiveRolloutStatus === "hidden") {
    notFound();
  }

  if (effectiveRolloutStatus === "pilot") {
    const opsToken = process.env.OPS_TOKEN;
    const hasValidToken = opsToken && token === opsToken;
    if (!hasValidToken) {
      return <PilotGatePage />;
    }
  }

  // Live or authorized pilot access
  const props = {
    citySlug: city,
    areaSlug: area,
    areaLabel: areaConfig.label,
    serviceSlug: service,
  };

  // Render appropriate booking component based on service
  if (service === "herenkapper") {
    return <HerenkapperBooking {...props} />;
  }

  if (service === "dameskapper") {
    return <DameskapperBooking {...props} />;
  }

  // Fallback for future services
  notFound();
}
