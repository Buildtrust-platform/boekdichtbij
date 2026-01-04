import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in Krimpen aan den IJssel | BoekDichtbij",
  description: "Boek een professionele herenkapper in Krimpen aan den IJssel. Knipbeurt vanaf €35, transparante prijzen, veilig betalen.",
  keywords: "herenkapper Krimpen aan den IJssel, kapper Krimpen aan den IJssel, knipbeurt boeken",
};

export default function HerenkapperKrimpenPage() {
  return (
    <>
      <div className="sr-only"><h1>Herenkapper in Krimpen aan den IJssel</h1></div>
      <HerenkapperBooking citySlug="rotterdam" areaSlug="krimpen" areaLabel="Krimpen aan den IJssel" serviceSlug="herenkapper" />
    </>
  );
}
