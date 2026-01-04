import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in Barendrecht | BoekDichtbij",
  description:
    "Boek een professionele herenkapper in Barendrecht. Knipbeurt vanaf €35, transparante prijzen, veilig betalen. Kies een tijdvak dat jou uitkomt.",
  keywords: "herenkapper Barendrecht, kapper Barendrecht, knipbeurt boeken, herenkapper boeken",
};

export default function HerenkapperBarendrechtPage() {
  return (
    <>
      <div className="sr-only">
        <h1>Herenkapper in Barendrecht</h1>
        <p>Boek een professionele herenkapper in Barendrecht. Kies het gewenste tijdvak, bekijk de prijs vooraf en betaal veilig online.</p>
      </div>
      <HerenkapperBooking
        citySlug="rotterdam"
        areaSlug="barendrecht"
        areaLabel="Barendrecht"
        serviceSlug="herenkapper"
      />
    </>
  );
}
