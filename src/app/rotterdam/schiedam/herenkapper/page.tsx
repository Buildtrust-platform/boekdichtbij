import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in Schiedam | BoekDichtbij",
  description: "Boek een professionele herenkapper in Schiedam. Knipbeurt vanaf €35, transparante prijzen, veilig betalen.",
  keywords: "herenkapper Schiedam, kapper Schiedam, knipbeurt boeken",
};

export default function HerenkapperSchiedamPage() {
  return (
    <>
      <div className="sr-only"><h1>Herenkapper in Schiedam</h1></div>
      <HerenkapperBooking citySlug="rotterdam" areaSlug="schiedam" areaLabel="Schiedam" serviceSlug="herenkapper" />
    </>
  );
}
