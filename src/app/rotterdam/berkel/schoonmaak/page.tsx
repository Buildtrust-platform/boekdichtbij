import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in Berkel en Rodenrijs | BoekDichtbij",
  description: "Boek professionele schoonmaak aan huis in Berkel en Rodenrijs. Basisschoonmaak vanaf €75, ramen binnen €45.",
  keywords: "schoonmaak aan huis Berkel en Rodenrijs, huishoudelijke hulp Berkel en Rodenrijs, schoonmaker Berkel en Rodenrijs",
};

export default function SchoonmaakBerkelPage() {
  return (
    <>
      <div className="sr-only"><h1>Schoonmaak aan huis in Berkel en Rodenrijs</h1></div>
      <SchoonmaakBooking citySlug="rotterdam" areaSlug="berkel" areaLabel="Berkel en Rodenrijs" serviceSlug="schoonmaak" />
    </>
  );
}
