import type { Metadata } from "next";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

export const metadata: Metadata = {
  title: "Dameskapper in Ridderkerk | BoekDichtbij",
  description:
    "Boek een professionele dameskapper in Ridderkerk. Knippen en stylen voor alle haarlengtes, transparante prijzen vanaf €45. Kies een tijdvak dat jou uitkomt.",
  keywords: "dameskapper Ridderkerk, kapper Ridderkerk, dames knipbeurt boeken, dameskapper boeken",
};

export default function DameskapperRidderkerkPage() {
  return (
    <>
      {/* SEO Header - visible but minimal */}
      <div className="sr-only">
        <h1>Dameskapper in Ridderkerk</h1>
        <p>
          Boek een professionele dameskapper in Ridderkerk. Knippen en stylen voor alle haarlengtes,
          met transparante prijzen. Bekijk de opties, kies een tijdvak en betaal veilig online.
        </p>
      </div>

      {/* Booking Flow */}
      <DameskapperBooking
        citySlug="rotterdam"
        areaSlug="ridderkerk"
        areaLabel="Ridderkerk"
        serviceSlug="dameskapper"
      />
    </>
  );
}
