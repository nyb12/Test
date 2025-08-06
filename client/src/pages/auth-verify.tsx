import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function AuthVerifyPage() {
  const [_, setLocation] = useLocation();
  const { user, completeVerificationMutation } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  // Get contact info and method from localStorage (set during start verification)
  const contactInfo = localStorage.getItem('verification_contact_info') || '';
  const signUpMethod =
    (localStorage.getItem('verification_sign_up_method') as
      | 'EMAIL'
      | 'PHONE') || 'EMAIL';
  const roleId = localStorage.getItem('verification_role_id');
  const inputPreference =
    (localStorage.getItem('verification_input_preference') as
      | 'VOICE'
      | 'KEYBOARD') || 'KEYBOARD';

  // Remove automatic redirect - let routing handle this
  // useEffect(() => {
  //   if (user) {
  //     setLocation('/dashboard');
  //   }
  // }, [user, setLocation]);

  useEffect(() => {
    // If no contact info, redirect back to auth
    if (!contactInfo) {
      setLocation('/auth');
    }
  }, [contactInfo, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    try {
      await completeVerificationMutation.mutateAsync({
        contactInfo,
        signUpMethod,
        code: code.trim(),
        roleId: roleId ? parseInt(roleId) : undefined,
        inputPreference,
      });

      // Prefetch critical data before navigation to reduce loading time
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['/api/aircraft'],
          staleTime: 15 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: ['/api/contacts'],
          staleTime: 5 * 60 * 1000,
        }),
      ]);

      // Clear localStorage
      localStorage.removeItem('verification_contact_info');
      localStorage.removeItem('verification_sign_up_method');
      localStorage.removeItem('verification_role_id');
      localStorage.removeItem('verification_input_preference');

      setLocation('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    }
  };

  const handleBackToAuth = () => {
    localStorage.removeItem('verification_contact_info');
    localStorage.removeItem('verification_sign_up_method');
    localStorage.removeItem('verification_role_id');
    localStorage.removeItem('verification_input_preference');
    setLocation('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Enter Verification Code
              </h1>
              <p className="text-gray-600 mt-2">
                We sent a verification code to{' '}
                <span className="font-medium">
                  {signUpMethod === 'EMAIL'
                    ? contactInfo
                    : contactInfo.replace(
                        /(\+\d{1,3})(\d{3})(\d{3})(\d{4})/,
                        '$1 ($2) $3-$4',
                      )}
                </span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  disabled={completeVerificationMutation.isPending}
                  required
                  className="w-full text-center text-lg tracking-widest"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  completeVerificationMutation.isPending || code.length !== 6
                }
              >
                {completeVerificationMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Verify & Sign In
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-center">
              <button
                onClick={handleBackToAuth}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to sign in
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Didn't receive the code? Check your{' '}
                {signUpMethod === 'EMAIL' ? 'email inbox' : 'text messages'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
