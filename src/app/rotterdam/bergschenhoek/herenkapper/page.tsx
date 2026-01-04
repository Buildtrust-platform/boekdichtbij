import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in Bergschenhoek | BoekDichtbij",
  description: "Boek een professionele herenkapper in Bergschenhoek. Knipbeurt vanaf €35, transparante prijzen, veilig betalen.",
  keywords: "herenkapper Bergschenhoek, kapper Bergschenhoek, knipbeurt boeken",
};

export default function HerenkapperBergschenhoekPage() {
  return (
    <>
      <div className="sr-only"><h1>Herenkapper in Bergschenhoek</h1></div>
      <HerenkapperBooking citySlug="rotterdam" areaSlug="bergschenhoek" areaLabel="Bergschenhoek" serviceSlug="herenkapper" />
    </>
  );
}
