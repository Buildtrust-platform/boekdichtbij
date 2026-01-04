import type { Metadata } from "next";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

export const metadata: Metadata = {
  title: "Dameskapper in Spijkenisse | BoekDichtbij",
  description: "Boek een professionele dameskapper in Spijkenisse. Knippen en stylen vanaf €45, transparante prijzen.",
  keywords: "dameskapper Spijkenisse, kapper Spijkenisse, dames knipbeurt boeken",
};

export default function DameskapperSpijkenissePage() {
  return (
    <>
      <div className="sr-only"><h1>Dameskapper in Spijkenisse</h1></div>
      <DameskapperBooking citySlug="rotterdam" areaSlug="spijkenisse" areaLabel="Spijkenisse" serviceSlug="dameskapper" />
    </>
  );
}
