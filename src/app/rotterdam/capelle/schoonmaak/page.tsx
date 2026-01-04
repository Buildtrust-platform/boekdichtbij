import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in Capelle aan den IJssel | BoekDichtbij",
  description: "Boek professionele schoonmaak aan huis in Capelle aan den IJssel. Basisschoonmaak vanaf €75, ramen binnen €45.",
  keywords: "schoonmaak aan huis Capelle aan den IJssel, huishoudelijke hulp Capelle, schoonmaker Capelle",
};

export default function SchoonmaakCapellePage() {
  return (
    <>
      <div className="sr-only"><h1>Schoonmaak aan huis in Capelle aan den IJssel</h1></div>
      <SchoonmaakBooking citySlug="rotterdam" areaSlug="capelle" areaLabel="Capelle aan den IJssel" serviceSlug="schoonmaak" />
    </>
  );
}
