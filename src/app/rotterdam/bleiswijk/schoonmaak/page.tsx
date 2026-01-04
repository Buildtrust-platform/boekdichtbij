import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in Bleiswijk | BoekDichtbij",
  description: "Boek professionele schoonmaak aan huis in Bleiswijk. Basisschoonmaak vanaf €75, ramen binnen €45.",
  keywords: "schoonmaak aan huis Bleiswijk, huishoudelijke hulp Bleiswijk, schoonmaker Bleiswijk",
};

export default function SchoonmaakBleiswijkPage() {
  return (
    <>
      <div className="sr-only"><h1>Schoonmaak aan huis in Bleiswijk</h1></div>
      <SchoonmaakBooking citySlug="rotterdam" areaSlug="bleiswijk" areaLabel="Bleiswijk" serviceSlug="schoonmaak" />
    </>
  );
}
