import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in Vlaardingen | BoekDichtbij",
  description: "Boek professionele schoonmaak aan huis in Vlaardingen. Basisschoonmaak vanaf €75, ramen binnen €45.",
  keywords: "schoonmaak aan huis Vlaardingen, huishoudelijke hulp Vlaardingen, schoonmaker Vlaardingen",
};

export default function SchoonmaakVlaardingenPage() {
  return (
    <>
      <div className="sr-only"><h1>Schoonmaak aan huis in Vlaardingen</h1></div>
      <SchoonmaakBooking citySlug="rotterdam" areaSlug="vlaardingen" areaLabel="Vlaardingen" serviceSlug="schoonmaak" />
    </>
  );
}
