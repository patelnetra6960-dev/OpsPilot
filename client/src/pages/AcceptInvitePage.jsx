import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Building2, ShieldCheck, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '../components/ui/index.js';
import { addToast } from '../store/uiSlice.js';
import { fetchMyOrganizations, setCurrentTenant } from '../store/tenantSlice.js';
import apiClient from '../services/apiClient.js';

export const AcceptInvitePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState(null);
  const [fullName, setFullName] = useState(user?.full_name || '');

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token in the URL. Please verify your invitation link.');
      setLoading(false);
      return;
    }

    async function verifyToken() {
      try {
        setLoading(true);
        const res = await apiClient.get(`/organizations/invitations/${token}/verify`);
        if (res.data?.success) {
          setInvitation(res.data.data);
          if (!fullName && res.data.data?.email) {
            setFullName(res.data.data.email.split('@')[0]);
          }
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            'This invitation token is invalid, has expired, or has already been accepted.'
        );
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleAccept = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/invite/accept?token=${token}`)}`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient.post(`/organizations/invitations/${token}/accept`, {
        full_name: fullName || user?.full_name || 'Team Member'
      });

      if (res.data?.success) {
        dispatch(
          addToast({
            type: 'success',
            title: 'Welcome to the Team!',
            message: `You have successfully joined ${invitation?.organization_name || 'the organization'}.`
          })
        );

        // Refresh user's organizations and switch to the newly joined organization
        await dispatch(fetchMyOrganizations());
        if (invitation?.organization_id) {
          dispatch(
            setCurrentTenant({
              id: invitation.organization_id,
              name: invitation.organization_name
            })
          );
        }

        navigate('/');
      }
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Acceptance Failed',
          message: err.response?.data?.message || 'Failed to accept invitation. Please try again.'
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto text-blue-600 mb-4" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Verifying your OpsPilot invitation...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center border-red-200 dark:border-red-900/50 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Invalid Invitation
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Go to Sign In
            </Button>
            <Button
              variant="ghost"
              className="w-full text-xs"
              onClick={() => navigate('/landing')}
            >
              OpsPilot Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 shadow-xl border-slate-200 dark:border-slate-800">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            You're Invited!
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You've been invited to join an operations workspace on OpsPilot.
          </p>
        </div>

        {/* Invitation Info Box */}
        <div className="bg-slate-100 dark:bg-slate-800/60 rounded-xl p-4 mb-6 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Organization</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {invitation?.organization_name}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Role</span>
            <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5" />
              {invitation?.role}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Invited Email</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {invitation?.email}
            </span>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              Sign in with your OpsPilot account to accept this invitation and access the workspace.
            </p>
            <Button
              className="w-full flex items-center justify-center gap-2"
              onClick={() =>
                navigate(`/login?redirect=${encodeURIComponent(`/invite/accept?token=${token}`)}`)
              }
            >
              <span>Sign In to Accept</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <div className="text-center pt-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Don't have an account yet?{' '}
                <Link
                  to={`/register?redirect=${encodeURIComponent(`/invite/accept?token=${token}`)}`}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Create one
                </Link>
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAccept} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Your Full Name in Workspace
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Liam Patel"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Joining Workspace...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept Invitation & Join</span>
                </>
              )}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default AcceptInvitePage;
