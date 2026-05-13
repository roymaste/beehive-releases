import React from 'react';
import { useAuth } from '../context/AuthContext';
import { SidebarInset, SidebarProvider, SidebarTrigger } from './ui/sidebar';
import { AppSidebar } from './layout/app-sidebar';
import { Separator } from './ui/separator';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, logout } = useAuth();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">蜂巢智能体</span>
          <div className="ml-auto flex items-center gap-2">
            {token && (
              <button
                onClick={logout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                退出登录
              </button>
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
