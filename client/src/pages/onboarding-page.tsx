import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    contactInfo: '',
    signUpMethod: 'PHONE' as 'EMAIL' | 'PHONE',
    roleId: '',
    inputPreference: 'KEYBOARD' as 'VOICE' | 'KEYBOARD',
    isExisting: false,
  });

  // Fetch roles for selection with optimized caching
  const { data: roles = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ['/api/roles'],
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    gcTime: 30 * 60 * 1000, // Keep in memory for 30 minutes
  });

  // Remove automatic redirect - let AuthRoute handle this
  // useEffect(() => {
  //   if (user) {
  //     setLocation('/aviOS');
  //   }
  // }, [user, setLocation]);

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      if (formData.isExisting && step === 3) {
        // For existing accounts, go back from contact info (step 3) to account type (step 1)
        setStep(1);
      } else if (formData.isExisting && step === 4) {
        // For existing accounts, go back from input preference (step 4) to contact info (step 3)
        setStep(3);
      } else {
        // Normal step progression for new accounts
        setStep(step - 1);
      }
    } else {
      setLocation('/');
    }
  };

  const handleAccountTypeSelection = (isExisting: boolean) => {
    setFormData({ ...formData, isExisting });
    if (isExisting) {
      // For existing accounts, go directly to auth page
      setLocation('/auth');
    } else {
      // For new accounts, continue with onboarding steps
      setStep(2);
    }
  };

  const handleContactSubmit = async () => {
    try {
      // Store contact info for verification
      localStorage.setItem('verification_contact_info', formData.contactInfo);
      localStorage.setItem(
        'verification_sign_up_method',
        formData.signUpMethod,
      );
      localStorage.setItem('verification_role_id', formData.roleId);
      localStorage.setItem(
        'verification_input_preference',
        formData.inputPreference,
      );

      // Send SMS verification
      const response = await fetch('/api/auth/start-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactInfo: formData.contactInfo,
          signUpMethod: formData.signUpMethod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send verification');
      }

      setLocation('/auth/verify');
    } catch (error: any) {
      console.error('Failed to send verification:', error.message);
      // Still redirect to verification page even if send fails
      setLocation('/auth/verify');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Ironfleet
              </h2>
              <p className="text-gray-600">
                Do you already have an account with us?
              </p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => handleAccountTypeSelection(true)}
                variant="outline"
                className="w-full h-16 text-left justify-start"
              >
                <div>
                  <div className="font-medium">I have an existing account</div>
                  <div className="text-sm text-gray-500">
                    Sign in to your account
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => handleAccountTypeSelection(false)}
                className="w-full h-16 text-left justify-start"
              >
                <div>
                  <div className="font-medium">I'm new to Ironfleet</div>
                  <div className="text-sm text-gray-200">
                    Create a new account
                  </div>
                </div>
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {formData.isExisting ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="text-gray-600">
                {formData.isExisting
                  ? 'Enter your contact information to sign in'
                  : "Let's get you set up with a new account"}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="contact-method">Contact Method</Label>
                <Select
                  value={formData.signUpMethod}
                  onValueChange={(value: 'EMAIL' | 'PHONE') =>
                    setFormData({ ...formData, signUpMethod: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHONE">Phone Number</SelectItem>
                    <SelectItem value="EMAIL">Email Address</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="contact-info">
                  {formData.signUpMethod === 'PHONE'
                    ? 'Phone Number'
                    : 'Email Address'}
                </Label>
                <Input
                  id="contact-info"
                  type={formData.signUpMethod === 'PHONE' ? 'tel' : 'email'}
                  placeholder={
                    formData.signUpMethod === 'PHONE'
                      ? '+1 (555) 123-4567'
                      : 'your.email@company.com'
                  }
                  value={formData.contactInfo}
                  onChange={(e) =>
                    setFormData({ ...formData, contactInfo: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1"
                disabled={!formData.contactInfo.trim()}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 3:
        if (formData.isExisting) {
          // For existing users, trigger SMS verification directly
          handleContactSubmit();
          return null;
        }

        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Profile Setup
              </h2>
              <p className="text-gray-600">
                Tell us about your role and preferences
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="role">Your Role</Label>
                <Select
                  value={formData.roleId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, roleId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="input-preference">Input Preference</Label>
                <Select
                  value={formData.inputPreference}
                  onValueChange={(value: 'VOICE' | 'KEYBOARD') =>
                    setFormData({ ...formData, inputPreference: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KEYBOARD">Keyboard</SelectItem>
                    <SelectItem value="VOICE">Voice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1"
                disabled={!formData.roleId}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Choose Your Plan
              </h2>
              <p className="text-gray-600">
                Select the plan that best fits your needs
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">
                Plan selection will be available after verification
              </p>
              <Button onClick={handleContactSubmit} className="w-full">
                Continue to Verification
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            <div className="flex justify-center">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Calculate display step for existing accounts
  const getDisplayStep = () => {
    if (formData.isExisting) {
      // For existing accounts: Step 1 = Account Type, Step 3 = Contact Info, Step 4 = Input Preference
      if (step === 1) return 1;
      if (step === 3) return 2;
      if (step === 4) return 3;
    }
    return step;
  };

  const getTotalSteps = () => {
    return formData.isExisting ? 3 : 4;
  };

  const getProgressIndicators = () => {
    const totalSteps = getTotalSteps();
    const displayStep = getDisplayStep();
    return Array.from({ length: totalSteps }, (_, i) => i + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center space-x-2 mb-4">
              {getProgressIndicators().map((i) => (
                <div
                  key={i}
                  className={`h-2 w-8 rounded-full ${
                    i <= getDisplayStep() ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <CardTitle>
              Step {getDisplayStep()} of {getTotalSteps()}
            </CardTitle>
          </CardHeader>
          <CardContent>{renderStep()}</CardContent>
        </Card>
      </div>
    </div>
  );
}
