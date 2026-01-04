import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in Maassluis | BoekDichtbij",
  description: "Boek een professionele herenkapper in Maassluis. Knipbeurt vanaf €35, transparante prijzen, veilig betalen.",
  keywords: "herenkapper Maassluis, kapper Maassluis, knipbeurt boeken",
};

export default function HerenkapperMaassluisPage() {
  return (
    <>
      <div className="sr-only"><h1>Herenkapper in Maassluis</h1></div>
      <HerenkapperBooking citySlug="rotterdam" areaSlug="maassluis" areaLabel="Maassluis" serviceSlug="herenkapper" />
    </>
  );
}
