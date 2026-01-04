import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in Hoogvliet | BoekDichtbij",
  description: "Boek professionele schoonmaak aan huis in Hoogvliet. Basisschoonmaak vanaf €75, ramen binnen €45.",
  keywords: "schoonmaak aan huis Hoogvliet, huishoudelijke hulp Hoogvliet, schoonmaker Hoogvliet",
};

export default function SchoonmaakHoogvlietPage() {
  return (
    <>
      <div className="sr-only"><h1>Schoonmaak aan huis in Hoogvliet</h1></div>
      <SchoonmaakBooking citySlug="rotterdam" areaSlug="hoogvliet" areaLabel="Hoogvliet" serviceSlug="schoonmaak" />
    </>
  );
}
