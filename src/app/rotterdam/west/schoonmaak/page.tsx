import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in Rotterdam-West | BoekDichtbij",
  description:
    "Boek professionele schoonmaak aan huis in Rotterdam-West. Basisschoonmaak vanaf €75, ramen binnen €45. Duidelijke tijdsduur en prijs, veilig betalen.",
  keywords: "schoonmaak aan huis Rotterdam-West, huishoudelijke hulp Rotterdam, schoonmaker Rotterdam, schoonmaakdienst",
};

export default function SchoonmaakRotterdamWestPage() {
  return (
    <>
      {/* SEO Header - visible but minimal */}
      <div className="sr-only">
        <h1>Schoonmaak aan huis in Rotterdam-West</h1>
        <p>
          Professionele schoonmaak bij jou thuis in Rotterdam-West. Basisschoonmaak, ramen binnen of grote schoonmaak.
          Duidelijke tijdsduur en prijs vooraf, veilig online betalen.
        </p>
      </div>

      {/* Booking Flow */}
      <SchoonmaakBooking
        citySlug="rotterdam"
        areaSlug="west"
        areaLabel="Rotterdam-West"
        serviceSlug="schoonmaak"
      />
    </>
  );
}
