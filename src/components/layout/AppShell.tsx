import type { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { TabBar } from './TabBar';

/**
 * Page chrome shared by every route.
 *
 * Mobile-first layout: the content area is centered at `max-w-5xl` so the
 * app reads like a phone shell on desktop too (think native apps that "live"
 * on a phone-shaped column). The tab bar respects the iOS safe-area-inset.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[rgb(var(--bg-app))]">
      <TopBar />
      <main
        id="main"
        className="mx-auto w-full max-w-5xl flex-1 px-4 pb-6 pt-4 sm:px-6 sm:pt-6"
      >
        {children}
      </main>
      <TabBar />
    </div>
  );
}
