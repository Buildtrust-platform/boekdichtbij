import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in IJsselmonde | BoekDichtbij",
  description: "Boek professionele schoonmaak aan huis in IJsselmonde. Basisschoonmaak vanaf €75, ramen binnen €45.",
  keywords: "schoonmaak aan huis IJsselmonde, huishoudelijke hulp IJsselmonde, schoonmaker IJsselmonde",
};

export default function SchoonmaakIJsselmondePage() {
  return (
    <>
      <div className="sr-only"><h1>Schoonmaak aan huis in IJsselmonde</h1></div>
      <SchoonmaakBooking citySlug="rotterdam" areaSlug="ijsselmonde" areaLabel="IJsselmonde" serviceSlug="schoonmaak" />
    </>
  );
}
