import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in Spijkenisse | BoekDichtbij",
  description: "Boek professionele schoonmaak aan huis in Spijkenisse. Basisschoonmaak vanaf €75, ramen binnen €45.",
  keywords: "schoonmaak aan huis Spijkenisse, huishoudelijke hulp Spijkenisse, schoonmaker Spijkenisse",
};

export default function SchoonmaakSpijkenissePage() {
  return (
    <>
      <div className="sr-only"><h1>Schoonmaak aan huis in Spijkenisse</h1></div>
      <SchoonmaakBooking citySlug="rotterdam" areaSlug="spijkenisse" areaLabel="Spijkenisse" serviceSlug="schoonmaak" />
    </>
  );
}
