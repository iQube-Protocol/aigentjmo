
import React from 'react';
import { cn } from '@/lib/utils';
import SidebarHeader from './SidebarHeader';
import MainNavigation from './MainNavigation';
import ActiveIQubesList from './ActiveIQubesList';
import SignOutButton from './SignOutButton';
import CollapseButton from './CollapseButton';
import { navItems, iQubeItems, QubeItem } from './sidebarData';

interface SidebarContentProps {
  collapsed: boolean;
  iQubesOpen: boolean;
  selectedIQube: string | null;
  activeQubes: {[key: string]: boolean};
  location: { pathname: string };
  toggleSidebar: () => void;
  toggleIQubesMenu: () => void;
  handleIQubeClick: (iqubeId: string) => void;
  toggleIQubeActive: (e: React.MouseEvent<HTMLDivElement>, qubeName: string) => void;
  handleCloseMetisIQube: (e: React.MouseEvent<HTMLButtonElement>) => void;
  handleSignOut: () => void;
  toggleMobileSidebar?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  collapsed,
  iQubesOpen,
  selectedIQube,
  activeQubes,
  location,
  toggleSidebar,
  toggleIQubesMenu,
  handleIQubeClick,
  toggleIQubeActive,
  handleCloseMetisIQube,
  handleSignOut,
  toggleMobileSidebar
}) => {
  return (
    <div className={cn(
      "flex flex-col h-full bg-sidebar py-4 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header with logo and collapse button */}
      <SidebarHeader collapsed={collapsed} toggleSidebar={toggleSidebar} />

      {/* Main Navigation */}
      <MainNavigation 
        navItems={navItems} 
        activePath={location.pathname} 
        collapsed={collapsed} 
        iQubeItems={iQubeItems}
        iQubesOpen={iQubesOpen}
        toggleIQubesMenu={toggleIQubesMenu}
        selectedIQube={selectedIQube}
        activeQubes={activeQubes}
        handleIQubeClick={handleIQubeClick}
        toggleIQubeActive={toggleIQubeActive}
        location={location}
        toggleMobileSidebar={toggleMobileSidebar}
      />

      {/* Active iQubes */}
      <ActiveIQubesList 
        activeQubes={activeQubes}
        collapsed={collapsed}
        onIQubeClick={handleIQubeClick}
        onCloseIQube={(e, qubeName) => {
          e.stopPropagation();
          if (qubeName === "Metis") {
            handleCloseMetisIQube(e);
          }
        }}
        toggleMobileSidebar={toggleMobileSidebar}
      />

      {/* Sign Out button */}
      <SignOutButton collapsed={collapsed} onSignOut={handleSignOut} />

      {/* Expand button when collapsed */}
      {collapsed && <CollapseButton toggleSidebar={toggleSidebar} />}
    </div>
  );
};

export default SidebarContent;
