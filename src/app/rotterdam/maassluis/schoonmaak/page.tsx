import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in Maassluis | BoekDichtbij",
  description: "Boek professionele schoonmaak aan huis in Maassluis. Basisschoonmaak vanaf €75, ramen binnen €45.",
  keywords: "schoonmaak aan huis Maassluis, huishoudelijke hulp Maassluis, schoonmaker Maassluis",
};

export default function SchoonmaakMaassluisPage() {
  return (
    <>
      <div className="sr-only"><h1>Schoonmaak aan huis in Maassluis</h1></div>
      <SchoonmaakBooking citySlug="rotterdam" areaSlug="maassluis" areaLabel="Maassluis" serviceSlug="schoonmaak" />
    </>
  );
}
