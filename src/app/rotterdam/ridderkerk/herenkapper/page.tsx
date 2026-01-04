import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in Ridderkerk | BoekDichtbij",
  description:
    "Boek een professionele herenkapper in Ridderkerk. Knipbeurt vanaf €35, transparante prijzen, veilig betalen. Kies een tijdvak dat jou uitkomt.",
  keywords: "herenkapper Ridderkerk, kapper Ridderkerk, knipbeurt boeken, herenkapper boeken",
};

export default function HerenkapperRidderkerkPage() {
  return (
    <>
      {/* SEO Header - visible but minimal */}
      <div className="sr-only">
        <h1>Herenkapper in Ridderkerk</h1>
        <p>
          Boek een professionele herenkapper in Ridderkerk.
          Kies het gewenste tijdvak, bekijk de prijs vooraf en betaal veilig online.
        </p>
      </div>

      {/* Booking Flow */}
      <HerenkapperBooking
        citySlug="rotterdam"
        areaSlug="ridderkerk"
        areaLabel="Ridderkerk"
        serviceSlug="herenkapper"
      />
    </>
  );
}
