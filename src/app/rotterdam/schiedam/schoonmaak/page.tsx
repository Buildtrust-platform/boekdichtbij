import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in Schiedam | BoekDichtbij",
  description: "Boek professionele schoonmaak aan huis in Schiedam. Basisschoonmaak vanaf €75, ramen binnen €45.",
  keywords: "schoonmaak aan huis Schiedam, huishoudelijke hulp Schiedam, schoonmaker Schiedam",
};

export default function SchoonmaakSchiedamPage() {
  return (
    <>
      <div className="sr-only"><h1>Schoonmaak aan huis in Schiedam</h1></div>
      <SchoonmaakBooking citySlug="rotterdam" areaSlug="schiedam" areaLabel="Schiedam" serviceSlug="schoonmaak" />
    </>
  );
}
