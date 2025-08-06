import { createContext, ReactNode, useContext, useEffect } from 'react';
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

type User = {
  id: string;
  email: string | null;
  phone: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  signUpMethod: 'EMAIL' | 'PHONE';
  profilePhoto: string | null;
  roleId: number | null;
  inputPreference: 'VOICE' | 'KEYBOARD';
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  startVerificationMutation: UseMutationResult<
    any,
    Error,
    StartVerificationType
  >;
  completeVerificationMutation: UseMutationResult<
    any,
    Error,
    CompleteVerificationType
  >;
  initiateSecondaryVerificationMutation: UseMutationResult<
    any,
    Error,
    SecondaryVerificationType
  >;
  logoutMutation: UseMutationResult<void, Error, void>;
};

type StartVerificationType = {
  contactInfo: string;
  signUpMethod: 'EMAIL' | 'PHONE';
};

type CompleteVerificationType = {
  contactInfo: string;
  signUpMethod: 'EMAIL' | 'PHONE';
  code: string;
  roleId?: number;
  inputPreference?: 'VOICE' | 'KEYBOARD';
};

type SecondaryVerificationType = {
  contactType: 'EMAIL' | 'PHONE';
  contactInfo: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Function to get the auth token from localStorage
  const getAuthToken = () => localStorage.getItem('auth_token');

  // Query to fetch the authenticated user's profile
  const {
    data: user = null,
    error,
    isLoading,
    refetch,
  } = useQuery<User | null, Error>({
    queryKey: ['/api/auth/profile'],
    queryFn: async () => {
      const token = getAuthToken();

      if (!token) {
        return null;
      }

      const response = await fetch('/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // If unauthorized, clear the token
          localStorage.removeItem('auth_token');
          return null;
        }
        throw new Error('Failed to fetch user profile');
      }

      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    enabled: true, // Always enable the query to prevent flash
    initialData: null,
  });

  // Prefetch critical data when user is authenticated
  useEffect(() => {
    if (user && user.id) {
      // Prefetch contacts data
      queryClient.prefetchQuery({
        queryKey: ['/api/contacts'],
        staleTime: 2 * 60 * 1000, // 2 minutes
      });

      // Prefetch roles data
      queryClient.prefetchQuery({
        queryKey: ['/api/roles'],
        staleTime: 10 * 60 * 1000, // 10 minutes for relatively static data
      });
    }
  }, [user, queryClient]);

  // Start verification mutation (sends code to email/phone)
  const startVerificationMutation = useMutation({
    mutationFn: async ({
      contactInfo,
      signUpMethod,
    }: StartVerificationType) => {
      const response = await fetch('/api/auth/start-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactInfo, signUpMethod }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start verification');
      }

      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Complete verification mutation (verify code and login/signup)
  const completeVerificationMutation = useMutation({
    mutationFn: async ({
      contactInfo,
      signUpMethod,
      code,
    }: CompleteVerificationType) => {
      // Get stored values from localStorage if they exist
      const roleId = localStorage.getItem('verification_role_id');
      const inputPreference = localStorage.getItem(
        'verification_input_preference',
      );

      const requestBody: any = {
        contactInfo,
        signUpMethod,
        code,
      };

      // Add roleId and inputPreference if they exist
      if (roleId) {
        requestBody.roleId = parseInt(roleId);
      }
      if (inputPreference) {
        requestBody.inputPreference = inputPreference;
      }

      const response = await fetch('/api/auth/complete-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify code');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Store token in localStorage
      localStorage.setItem('auth_token', data.token);

      // Clean up verification data from localStorage
      localStorage.removeItem('verification_contact_info');
      localStorage.removeItem('verification_sign_up_method');
      localStorage.removeItem('verification_role_id');
      localStorage.removeItem('verification_input_preference');

      // Refresh the user data
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Initiate secondary verification mutation (add/verify another contact method)
  const initiateSecondaryVerificationMutation = useMutation({
    mutationFn: async ({
      contactType,
      contactInfo,
    }: SecondaryVerificationType) => {
      const token = getAuthToken();

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/auth/verify-secondary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contactType, contactInfo }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initiate verification');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Verification code sent',
        description:
          'Please check your email or phone for the verification code',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // For passwordless auth, we just need to remove the token
      localStorage.removeItem('auth_token');
    },
    onSuccess: () => {
      // Invalidate and refetch user query to reflect logout
      queryClient.invalidateQueries({ queryKey: ['/api/auth/profile'] });

      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });
    },
  });

  // Effect to check token on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        startVerificationMutation,
        completeVerificationMutation,
        initiateSecondaryVerificationMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
