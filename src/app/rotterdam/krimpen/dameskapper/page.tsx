import type { Metadata } from "next";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

export const metadata: Metadata = {
  title: "Dameskapper in Krimpen aan den IJssel | BoekDichtbij",
  description: "Boek een professionele dameskapper in Krimpen aan den IJssel. Knippen en stylen vanaf €45, transparante prijzen.",
  keywords: "dameskapper Krimpen aan den IJssel, kapper Krimpen aan den IJssel, dames knipbeurt boeken",
};

export default function DameskapperKrimpenPage() {
  return (
    <>
      <div className="sr-only"><h1>Dameskapper in Krimpen aan den IJssel</h1></div>
      <DameskapperBooking citySlug="rotterdam" areaSlug="krimpen" areaLabel="Krimpen aan den IJssel" serviceSlug="dameskapper" />
    </>
  );
}
