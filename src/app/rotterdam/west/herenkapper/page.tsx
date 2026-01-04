import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in Rotterdam-West | BoekDichtbij",
  description:
    "Boek een professionele herenkapper in Rotterdam-West. Knipbeurt vanaf €35, transparante prijzen, veilig betalen. Kies een tijdvak dat jou uitkomt.",
  keywords: "herenkapper Rotterdam-West, kapper Rotterdam, knipbeurt boeken, herenkapper boeken",
};

export default function HerenkapperRotterdamWestPage() {
  return (
    <>
      {/* SEO Header - visible but minimal */}
      <div className="sr-only">
        <h1>Herenkapper in Rotterdam-West</h1>
        <p>
          Boek een professionele herenkapper in Rotterdam-West.
          Kies het gewenste tijdvak, bekijk de prijs vooraf en betaal veilig online.
        </p>
      </div>

      {/* Booking Flow */}
      <HerenkapperBooking
        citySlug="rotterdam"
        areaSlug="west"
        areaLabel="Rotterdam-West"
        serviceSlug="herenkapper"
      />
    </>
  );
}
