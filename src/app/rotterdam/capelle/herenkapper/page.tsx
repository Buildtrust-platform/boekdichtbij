import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in Capelle aan den IJssel | BoekDichtbij",
  description: "Boek een professionele herenkapper in Capelle aan den IJssel. Knipbeurt vanaf €35, transparante prijzen, veilig betalen.",
  keywords: "herenkapper Capelle aan den IJssel, kapper Capelle, knipbeurt boeken",
};

export default function HerenkapperCapellePage() {
  return (
    <>
      <div className="sr-only"><h1>Herenkapper in Capelle aan den IJssel</h1></div>
      <HerenkapperBooking citySlug="rotterdam" areaSlug="capelle" areaLabel="Capelle aan den IJssel" serviceSlug="herenkapper" />
    </>
  );
}
