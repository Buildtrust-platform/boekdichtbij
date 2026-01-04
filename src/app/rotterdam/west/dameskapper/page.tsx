import type { Metadata } from "next";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

export const metadata: Metadata = {
  title: "Dameskapper in Rotterdam-West | BoekDichtbij",
  description:
    "Boek een professionele dameskapper in Rotterdam-West. Knippen en stylen voor alle haarlengtes, transparante prijzen vanaf €45. Kies een tijdvak dat jou uitkomt.",
  keywords: "dameskapper Rotterdam-West, kapper Rotterdam, dames knipbeurt boeken, dameskapper boeken",
};

export default function DameskapperRotterdamWestPage() {
  return (
    <>
      {/* SEO Header - visible but minimal */}
      <div className="sr-only">
        <h1>Dameskapper in Rotterdam-West</h1>
        <p>
          Boek een professionele dameskapper in Rotterdam-West. Knippen en stylen voor alle haarlengtes,
          met transparante prijzen. Bekijk de opties, kies een tijdvak en betaal veilig online.
        </p>
      </div>

      {/* Booking Flow */}
      <DameskapperBooking
        citySlug="rotterdam"
        areaSlug="west"
        areaLabel="Rotterdam-West"
        serviceSlug="dameskapper"
      />
    </>
  );
}
