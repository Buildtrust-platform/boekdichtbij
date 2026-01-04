import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in Ridderkerk | BoekDichtbij",
  description:
    "Boek professionele schoonmaak aan huis in Ridderkerk. Basisschoonmaak vanaf €75, ramen binnen €45. Duidelijke tijdsduur en prijs, veilig betalen.",
  keywords: "schoonmaak aan huis Ridderkerk, huishoudelijke hulp Ridderkerk, schoonmaker Ridderkerk, schoonmaakdienst",
};

export default function SchoonmaakRidderkerkPage() {
  return (
    <>
      {/* SEO Header - visible but minimal */}
      <div className="sr-only">
        <h1>Schoonmaak aan huis in Ridderkerk</h1>
        <p>
          Professionele schoonmaak bij jou thuis in Ridderkerk. Basisschoonmaak, ramen binnen of grote schoonmaak.
          Duidelijke tijdsduur en prijs vooraf, veilig online betalen.
        </p>
      </div>

      {/* Booking Flow */}
      <SchoonmaakBooking
        citySlug="rotterdam"
        areaSlug="ridderkerk"
        areaLabel="Ridderkerk"
        serviceSlug="schoonmaak"
      />
    </>
  );
}
