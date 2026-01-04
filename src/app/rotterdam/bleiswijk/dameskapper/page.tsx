import type { Metadata } from "next";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

export const metadata: Metadata = {
  title: "Dameskapper in Bleiswijk | BoekDichtbij",
  description: "Boek een professionele dameskapper in Bleiswijk. Knippen en stylen vanaf €45, transparante prijzen.",
  keywords: "dameskapper Bleiswijk, kapper Bleiswijk, dames knipbeurt boeken",
};

export default function DameskapperBleiswijkPage() {
  return (
    <>
      <div className="sr-only"><h1>Dameskapper in Bleiswijk</h1></div>
      <DameskapperBooking citySlug="rotterdam" areaSlug="bleiswijk" areaLabel="Bleiswijk" serviceSlug="dameskapper" />
    </>
  );
}
