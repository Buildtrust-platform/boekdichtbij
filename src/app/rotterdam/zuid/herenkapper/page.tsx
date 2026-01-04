import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in Rotterdam-Zuid | BoekDichtbij",
  description:
    "Boek een professionele herenkapper in Rotterdam-Zuid. Knipbeurt vanaf €35, transparante prijzen, veilig betalen. Kies een tijdvak dat jou uitkomt.",
  keywords: "herenkapper Rotterdam-Zuid, kapper Rotterdam-Zuid, knipbeurt boeken, herenkapper boeken",
};

export default function HerenkapperRotterdamZuidPage() {
  return (
    <>
      {/* SEO Header - visible but minimal */}
      <div className="sr-only">
        <h1>Herenkapper in Rotterdam-Zuid</h1>
        <p>
          Boek een professionele herenkapper in Rotterdam-Zuid.
          Kies het gewenste tijdvak, bekijk de prijs vooraf en betaal veilig online.
        </p>
      </div>

      {/* Booking Flow */}
      <HerenkapperBooking
        citySlug="rotterdam"
        areaSlug="zuid"
        areaLabel="Rotterdam-Zuid"
        serviceSlug="herenkapper"
      />
    </>
  );
}
