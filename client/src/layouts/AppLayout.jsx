import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';
import Breadcrumbs from '../components/common/Breadcrumbs.jsx';
import GlobalSearchModal from '../components/common/GlobalSearchModal.jsx';
import { ToastContainer } from '../components/ui/index.js';

export const AppLayout = () => {
  const { theme } = useSelector((state) => state.ui);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      {/* Toast Notification Mount */}
      <ToastContainer />

      {/* Global Command Palette / Search Modal (⌘K) */}
      <GlobalSearchModal />

      {/* Primary Sidebar (Role-aware & Mobile drawer ready) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Context-aware Breadcrumbs Navigation */}
            <Breadcrumbs />

            {/* Active Route Content */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
