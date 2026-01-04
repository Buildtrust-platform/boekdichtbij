import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in Bergschenhoek | BoekDichtbij",
  description: "Boek professionele schoonmaak aan huis in Bergschenhoek. Basisschoonmaak vanaf €75, ramen binnen €45.",
  keywords: "schoonmaak aan huis Bergschenhoek, huishoudelijke hulp Bergschenhoek, schoonmaker Bergschenhoek",
};

export default function SchoonmaakBergschenhoekPage() {
  return (
    <>
      <div className="sr-only"><h1>Schoonmaak aan huis in Bergschenhoek</h1></div>
      <SchoonmaakBooking citySlug="rotterdam" areaSlug="bergschenhoek" areaLabel="Bergschenhoek" serviceSlug="schoonmaak" />
    </>
  );
}
