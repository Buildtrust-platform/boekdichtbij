import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in Spijkenisse | BoekDichtbij",
  description: "Boek een professionele herenkapper in Spijkenisse. Knipbeurt vanaf €35, transparante prijzen, veilig betalen.",
  keywords: "herenkapper Spijkenisse, kapper Spijkenisse, knipbeurt boeken",
};

export default function HerenkapperSpijkenissePage() {
  return (
    <>
      <div className="sr-only"><h1>Herenkapper in Spijkenisse</h1></div>
      <HerenkapperBooking citySlug="rotterdam" areaSlug="spijkenisse" areaLabel="Spijkenisse" serviceSlug="herenkapper" />
    </>
  );
}
