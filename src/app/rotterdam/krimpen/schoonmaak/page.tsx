import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in Krimpen aan den IJssel | BoekDichtbij",
  description: "Boek professionele schoonmaak aan huis in Krimpen aan den IJssel. Basisschoonmaak vanaf €75, ramen binnen €45.",
  keywords: "schoonmaak aan huis Krimpen aan den IJssel, huishoudelijke hulp Krimpen aan den IJssel, schoonmaker Krimpen aan den IJssel",
};

export default function SchoonmaakKrimpenPage() {
  return (
    <>
      <div className="sr-only"><h1>Schoonmaak aan huis in Krimpen aan den IJssel</h1></div>
      <SchoonmaakBooking citySlug="rotterdam" areaSlug="krimpen" areaLabel="Krimpen aan den IJssel" serviceSlug="schoonmaak" />
    </>
  );
}
