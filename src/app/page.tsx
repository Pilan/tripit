import TripMap from '@/components/TripMap';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-100 to-green-50">
      <TripMap />
    </main>
  );
}
