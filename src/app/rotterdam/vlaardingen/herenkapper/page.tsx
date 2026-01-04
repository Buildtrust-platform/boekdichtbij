import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in Vlaardingen | BoekDichtbij",
  description: "Boek een professionele herenkapper in Vlaardingen. Knipbeurt vanaf €35, transparante prijzen, veilig betalen.",
  keywords: "herenkapper Vlaardingen, kapper Vlaardingen, knipbeurt boeken",
};

export default function HerenkapperVlaardingenPage() {
  return (
    <>
      <div className="sr-only"><h1>Herenkapper in Vlaardingen</h1></div>
      <HerenkapperBooking citySlug="rotterdam" areaSlug="vlaardingen" areaLabel="Vlaardingen" serviceSlug="herenkapper" />
    </>
  );
}
