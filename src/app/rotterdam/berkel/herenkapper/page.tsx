import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in Berkel en Rodenrijs | BoekDichtbij",
  description: "Boek een professionele herenkapper in Berkel en Rodenrijs. Knipbeurt vanaf €35, transparante prijzen, veilig betalen.",
  keywords: "herenkapper Berkel en Rodenrijs, kapper Berkel en Rodenrijs, knipbeurt boeken",
};

export default function HerenkapperBerkelPage() {
  return (
    <>
      <div className="sr-only"><h1>Herenkapper in Berkel en Rodenrijs</h1></div>
      <HerenkapperBooking citySlug="rotterdam" areaSlug="berkel" areaLabel="Berkel en Rodenrijs" serviceSlug="herenkapper" />
    </>
  );
}
