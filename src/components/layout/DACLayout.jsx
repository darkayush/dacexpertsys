import { useState } from 'react';
import FloatingSidebar from './FloatingSidebar';
import TopBar from './TopBar';

export default function DACLayout({
  children,
  searchValue = '',
  onSearchChange,
  primaryAction,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f0f2fb] font-sans antialiased text-slate-800 flex overflow-x-hidden">
      {/* Floating Left Navigation Rail */}
      <FloatingSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area with offset for floating rail */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-20 transition-all duration-300">
        {/* Top Navigation Bar */}
        <TopBar
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          primaryAction={primaryAction}
        />

        {/* Large Rounded Content Area Canvas inspired by the reference */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6">
          <div className="w-full h-full bg-[#f8f9fe]/90 rounded-[28px] sm:rounded-[36px] p-4 sm:p-6 lg:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.02)] border border-white">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
