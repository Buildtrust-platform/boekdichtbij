import type { Metadata } from "next";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

export const metadata: Metadata = {
  title: "Dameskapper in Bergschenhoek | BoekDichtbij",
  description: "Boek een professionele dameskapper in Bergschenhoek. Knippen en stylen vanaf €45, transparante prijzen.",
  keywords: "dameskapper Bergschenhoek, kapper Bergschenhoek, dames knipbeurt boeken",
};

export default function DameskapperBergschenhoekPage() {
  return (
    <>
      <div className="sr-only"><h1>Dameskapper in Bergschenhoek</h1></div>
      <DameskapperBooking citySlug="rotterdam" areaSlug="bergschenhoek" areaLabel="Bergschenhoek" serviceSlug="dameskapper" />
    </>
  );
}
