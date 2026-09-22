import { TodayView } from '../components/TodayView';

// Server Component wrapper (route segment config like `dynamic` only works
// outside 'use client' files): forces this route to render per-request
// instead of being statically prerendered at build time, so it never bakes
// in the build machine's date. TodayView itself still self-corrects for the
// visitor's local date/timezone once it hydrates (spec §11).
export const dynamic = 'force-dynamic';

export default function TodayPage() {
  return <TodayView />;
}
