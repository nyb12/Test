import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Phone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Role {
  id: number;
  name: string;
  description: string;
}

export default function AuthPage() {
  const [_, setLocation] = useLocation();
  const { user, startVerificationMutation } = useAuth();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [inputPreference, setInputPreference] = useState('KEYBOARD');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('email');

  // Fetch available roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
  });

  // Remove automatic redirect - let routing handle this
  // useEffect(() => {
  //   if (user) {
  //     setLocation('/dashboard');
  //   }
  // }, [user, setLocation]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await startVerificationMutation.mutateAsync({
        contactInfo: email,
        signUpMethod: 'EMAIL',
      });

      // Store contact info for verification page (existing accounts don't need role/preference)
      localStorage.setItem('verification_contact_info', email);
      localStorage.setItem('verification_sign_up_method', 'EMAIL');

      setLocation('/auth/verify');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Format phone number for international format if needed
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+1' + formattedPhone.replace(/\D/g, '');
    }

    try {
      await startVerificationMutation.mutateAsync({
        contactInfo: formattedPhone,
        signUpMethod: 'PHONE',
      });

      // Store contact info for verification page (existing accounts don't need role/preference)
      localStorage.setItem('verification_contact_info', formattedPhone);
      localStorage.setItem('verification_sign_up_method', 'PHONE');

      setLocation('/auth/verify');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
              <p className="text-gray-600 mt-2">
                Sign in with your email or phone number
              </p>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  SMS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="mt-6">
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={startVerificationMutation.isPending}
                      required
                      className="w-full"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      startVerificationMutation.isPending || !email.trim()
                    }
                  >
                    {startVerificationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Send Verification Code
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="phone" className="mt-6">
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number (e.g., +1234567890)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={startVerificationMutation.isPending}
                      required
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Include country code (e.g., +1 for US)
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      startVerificationMutation.isPending || !phone.trim()
                    }
                  >
                    {startVerificationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Send SMS Code
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                We'll send you a verification code to sign in securely without a
                password
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
