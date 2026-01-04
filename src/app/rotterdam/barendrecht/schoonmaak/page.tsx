import type { Metadata } from "next";
import SchoonmaakBooking from "@/components/booking/SchoonmaakBooking";

export const metadata: Metadata = {
  title: "Schoonmaak aan huis in Barendrecht | BoekDichtbij",
  description:
    "Boek professionele schoonmaak aan huis in Barendrecht. Basisschoonmaak vanaf €75, ramen binnen €45. Duidelijke tijdsduur en prijs, veilig betalen.",
  keywords: "schoonmaak aan huis Barendrecht, huishoudelijke hulp Barendrecht, schoonmaker Barendrecht, schoonmaakdienst",
};

export default function SchoonmaakBarendrechtPage() {
  return (
    <>
      <div className="sr-only">
        <h1>Schoonmaak aan huis in Barendrecht</h1>
        <p>Professionele schoonmaak bij jou thuis in Barendrecht. Basisschoonmaak, ramen binnen of grote schoonmaak.</p>
      </div>
      <SchoonmaakBooking
        citySlug="rotterdam"
        areaSlug="barendrecht"
        areaLabel="Barendrecht"
        serviceSlug="schoonmaak"
      />
    </>
  );
}
