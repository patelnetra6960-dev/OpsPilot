import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { AlertTriangle, Home, Search } from 'lucide-react';
import { Button, Card } from '../components/ui/index.js';
import { getDefaultRouteForRole } from '../utils/demoPersonas.js';
import { openSearchModal } from '../store/uiSlice.js';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const homePath = getDefaultRouteForRole(user?.role);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card variant="elevated" className="max-w-md w-full p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
            404 Error • Page Not Found
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Resource or Module Unavailable
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            The page or route you navigated to does not exist or has been relocated within the
            tenant boundary.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button variant="secondary" size="sm" onClick={() => dispatch(openSearchModal())}>
            <Search className="w-3.5 h-3.5 mr-1.5" />
            <span>Search Pages (⌘K)</span>
          </Button>

          <Button variant="primary" size="sm" onClick={() => navigate(homePath)}>
            <Home className="w-3.5 h-3.5 mr-1.5" />
            <span>Go to Dashboard</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotFoundPage;
