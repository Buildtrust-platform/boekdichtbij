import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in Rotterdam-Zuid | BoekDichtbij",
  description:
    "Boek professionele schoonmaak aan huis in Rotterdam-Zuid. Basisschoonmaak vanaf €75, ramen binnen €45. Duidelijke tijdsduur en prijs, veilig betalen.",
  keywords: "schoonmaak aan huis Rotterdam-Zuid, huishoudelijke hulp Rotterdam-Zuid, schoonmaker Rotterdam-Zuid, schoonmaakdienst",
};

export default function SchoonmaakRotterdamZuidPage() {
  return (
    <>
      {/* SEO Header - visible but minimal */}
      <div className="sr-only">
        <h1>Schoonmaak aan huis in Rotterdam-Zuid</h1>
        <p>
          Professionele schoonmaak bij jou thuis in Rotterdam-Zuid. Basisschoonmaak, ramen binnen of grote schoonmaak.
          Duidelijke tijdsduur en prijs vooraf, veilig online betalen.
        </p>
      </div>

      {/* Booking Flow */}
      <SchoonmaakBooking
        citySlug="rotterdam"
        areaSlug="zuid"
        areaLabel="Rotterdam-Zuid"
        serviceSlug="schoonmaak"
      />
    </>
  );
}
