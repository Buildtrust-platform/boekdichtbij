import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in Bleiswijk | BoekDichtbij",
  description: "Boek een professionele herenkapper in Bleiswijk. Knipbeurt vanaf €35, transparante prijzen, veilig betalen.",
  keywords: "herenkapper Bleiswijk, kapper Bleiswijk, knipbeurt boeken",
};

export default function HerenkapperBleiswijkPage() {
  return (
    <>
      <div className="sr-only"><h1>Herenkapper in Bleiswijk</h1></div>
      <HerenkapperBooking citySlug="rotterdam" areaSlug="bleiswijk" areaLabel="Bleiswijk" serviceSlug="herenkapper" />
    </>
  );
}
