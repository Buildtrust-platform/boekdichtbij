import { notFound } from "next/navigation";
import {
  isValidCity,
  isValidService,
  AREAS,
} from "@/config/locations";
import { getAreaOverride } from "@/lib/areaOverrides";
import BookingSuccess from "@/components/booking/BookingSuccess";

interface PageProps {
  params: Promise<{
    city: string;
    area: string;
    service: string;
  }>;
}

export default async function SuccessPage({ params }: PageProps) {
  const { city, area, service } = await params;

  // Validate route params against registries
  if (!isValidCity(city)) {
    notFound();
  }

  // Get area config directly (don't use isValidArea as it blocks hidden)
  const areaConfig = AREAS[area];
  if (!areaConfig || !areaConfig.enabled || areaConfig.city !== city) {
    notFound();
  }

  if (!isValidService(service)) {
    notFound();
  }

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

  // Hidden areas should 404 even for success page
  if (effectiveRolloutStatus === "hidden") {
    notFound();
  }

  return (
    <BookingSuccess
      citySlug={city}
      areaSlug={area}
      areaLabel={areaConfig.label}
      serviceSlug={service}
    />
  );
}
