import type { Metadata } from "next";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

export const metadata: Metadata = {
  title: "Dameskapper in Capelle aan den IJssel | BoekDichtbij",
  description: "Boek een professionele dameskapper in Capelle aan den IJssel. Knippen en stylen vanaf €45, transparante prijzen.",
  keywords: "dameskapper Capelle aan den IJssel, kapper Capelle, dames knipbeurt boeken",
};

export default function DameskapperCapellePage() {
  return (
    <>
      <div className="sr-only"><h1>Dameskapper in Capelle aan den IJssel</h1></div>
      <DameskapperBooking citySlug="rotterdam" areaSlug="capelle" areaLabel="Capelle aan den IJssel" serviceSlug="dameskapper" />
    </>
  );
}
