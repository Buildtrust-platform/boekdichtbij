import type { Metadata } from "next";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

export const metadata: Metadata = {
  title: "Dameskapper in Hoogvliet | BoekDichtbij",
  description: "Boek een professionele dameskapper in Hoogvliet. Knippen en stylen vanaf €45, transparante prijzen.",
  keywords: "dameskapper Hoogvliet, kapper Hoogvliet, dames knipbeurt boeken",
};

export default function DameskapperHoogvlietPage() {
  return (
    <>
      <div className="sr-only"><h1>Dameskapper in Hoogvliet</h1></div>
      <DameskapperBooking citySlug="rotterdam" areaSlug="hoogvliet" areaLabel="Hoogvliet" serviceSlug="dameskapper" />
    </>
  );
}
