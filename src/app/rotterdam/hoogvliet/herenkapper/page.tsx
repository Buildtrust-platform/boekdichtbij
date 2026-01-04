import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in Hoogvliet | BoekDichtbij",
  description: "Boek een professionele herenkapper in Hoogvliet. Knipbeurt vanaf €35, transparante prijzen, veilig betalen.",
  keywords: "herenkapper Hoogvliet, kapper Hoogvliet, knipbeurt boeken",
};

export default function HerenkapperHoogvlietPage() {
  return (
    <>
      <div className="sr-only"><h1>Herenkapper in Hoogvliet</h1></div>
      <HerenkapperBooking citySlug="rotterdam" areaSlug="hoogvliet" areaLabel="Hoogvliet" serviceSlug="herenkapper" />
    </>
  );
}
