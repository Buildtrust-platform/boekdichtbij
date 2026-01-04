import type { Metadata } from "next";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

export const metadata: Metadata = {
  title: "Dameskapper in Vlaardingen | BoekDichtbij",
  description: "Boek een professionele dameskapper in Vlaardingen. Knippen en stylen vanaf €45, transparante prijzen.",
  keywords: "dameskapper Vlaardingen, kapper Vlaardingen, dames knipbeurt boeken",
};

export default function DameskapperVlaardingenPage() {
  return (
    <>
      <div className="sr-only"><h1>Dameskapper in Vlaardingen</h1></div>
      <DameskapperBooking citySlug="rotterdam" areaSlug="vlaardingen" areaLabel="Vlaardingen" serviceSlug="dameskapper" />
    </>
  );
}
