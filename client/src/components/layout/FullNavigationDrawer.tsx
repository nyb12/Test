import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Search, History, User, MessageSquare, X, LogOut, Loader2, Camera } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface FullNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FullNavigationDrawer({ isOpen, onClose }: FullNavigationDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedInputPreference, setSelectedInputPreference] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, logoutMutation } = useAuth();
  
  // Name editing states
  const [isEditingNames, setIsEditingNames] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Email and phone editing states
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  
  // Verification code states
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("");

  // Update name states when user data changes
  useEffect(() => {
    if (user) {
      setFirstName((user as any)?.firstName || "");
      setLastName((user as any)?.lastName || "");
    }
  }, [user]);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Upload profile photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (base64Image: string) => {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ profilePhoto: base64Image }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          throw new Error("Authentication expired. Please log in again.");
        }
        throw new Error("Failed to upload photo");
      }
      
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/auth/profile"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Photo upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        uploadPhotoMutation.mutate(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      // Get JWT token from localStorage using the same key as auth system
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ roleId }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          throw new Error("Authentication expired. Please log in again.");
        }
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Role update failed",
        description: "Please try selecting your role again",
        variant: "destructive",
      });
    },
  });

  // Update input preference mutation
  const updateInputPreferenceMutation = useMutation({
    mutationFn: async (inputPreference: "VOICE" | "KEYBOARD") => {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ inputPreference }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          throw new Error("Authentication expired. Please log in again.");
        }
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Input preference update failed",
        description: "Please try selecting your preference again",
        variant: "destructive",
      });
    },
  });

  // Update name mutation
  const updateNameMutation = useMutation({
    mutationFn: async ({ firstName, lastName }: { firstName: string; lastName: string }) => {
      console.log('Updating name with:', { firstName, lastName });
      const response = await apiRequest("PATCH", "/api/auth/profile", { firstName, lastName });
      const result = await response.json();
      console.log('Name update result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Name update success:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      setIsEditingNames(false);
      toast({
        title: "Success",
        description: "Your name has been updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('Name update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update name",
        variant: "destructive",
      });
    },
  });

  // Handler functions for name editing
  const handleSaveNames = () => {
    updateNameMutation.mutate({ firstName: firstName.trim(), lastName: lastName.trim() });
  };

  const handleCancelNameEdit = () => {
    setFirstName((user as any)?.firstName || "");
    setLastName((user as any)?.lastName || "");
    setIsEditingNames(false);
  };

  // Email update mutation
  const updateEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      console.log('Updating email with:', email);
      const response = await apiRequest("PATCH", "/api/auth/profile", { email });
      const result = await response.json();
      console.log('Email update result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Email update success:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      setIsEditingEmail(false);
      setNewEmail("");
      toast({
        title: "Email Added",
        description: "Email has been added. Click 'Verify' to verify it.",
      });
    },
    onError: (error: any) => {
      console.error('Email update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update email",
        variant: "destructive",
      });
    },
  });

  // Phone update mutation
  const updatePhoneMutation = useMutation({
    mutationFn: async (phone: string) => {
      console.log('Updating phone with:', phone);
      const response = await apiRequest("PATCH", "/api/auth/profile", { phone });
      const result = await response.json();
      console.log('Phone update result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Phone update success:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      setIsEditingPhone(false);
      setNewPhone("");
      toast({
        title: "Phone Added",
        description: "Phone number has been added. Click 'Verify' to verify it.",
      });
    },
    onError: (error: any) => {
      console.error('Phone update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update phone number",
        variant: "destructive",
      });
    },
  });

  // Handler functions for email/phone editing
  const handleSaveEmail = () => {
    if (newEmail.trim()) {
      updateEmailMutation.mutate(newEmail.trim());
    }
  };

  const handleSavePhone = () => {
    if (newPhone.trim()) {
      updatePhoneMutation.mutate(newPhone.trim());
    }
  };

  const handleCancelEmailEdit = () => {
    setNewEmail("");
    setIsEditingEmail(false);
  };

  const handleCancelPhoneEdit = () => {
    setNewPhone("");
    setIsEditingPhone(false);
  };

  // Email verification mutation - uses existing verification system
  const verifyEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/verify-secondary", {
        contactType: "EMAIL",
        contactInfo: user?.email
      });
      return response.json();
    },
    onSuccess: () => {
      setShowEmailVerification(true);
      toast({
        title: "Verification email sent",
        description: "Please enter the verification code below",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email",
        variant: "destructive",
      });
    },
  });

  // Complete email verification mutation
  const completeEmailVerificationMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/auth/complete-verification", {
        contactInfo: user?.email,
        verificationCode: code
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      setShowEmailVerification(false);
      setEmailVerificationCode("");
      toast({
        title: "Success",
        description: "Email has been verified successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  // Phone verification mutation - uses existing verification system
  const verifyPhoneMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/verify-secondary", {
        contactType: "PHONE",
        contactInfo: user?.phone
      });
      return response.json();
    },
    onSuccess: () => {
      setShowPhoneVerification(true);
      toast({
        title: "Verification SMS sent",
        description: "Please enter the verification code below",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification SMS",
        variant: "destructive",
      });
    },
  });

  // Complete phone verification mutation
  const completePhoneVerificationMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/auth/complete-verification", {
        contactInfo: user?.phone,
        verificationCode: code
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      setShowPhoneVerification(false);
      setPhoneVerificationCode("");
      toast({
        title: "Success",
        description: "Phone number has been verified successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        onClose(); // Close the drawer after logout
        setLocation("/"); // Redirect to home screen
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-80 bg-white h-full shadow-xl flex flex-col">
        {/* Drawer Header with Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 mr-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            
            <div className="space-y-2">
              {/* Sample conversation items */}
              <div className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                <div className="flex items-start space-x-3">
                  <div className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0">
                    <MessageSquare className="h-full w-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Product Inquiry
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      Asked about shipping options and pricing...
                    </p>
                    <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                <div className="flex items-start space-x-3">
                  <div className="h-4 w-4 text-green-600 mt-1 flex-shrink-0">
                    <MessageSquare className="h-full w-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Technical Support
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      Help with account setup and configuration...
                    </p>
                    <p className="text-xs text-gray-400 mt-1">1 day ago</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                <div className="flex items-start space-x-3">
                  <div className="h-4 w-4 text-purple-600 mt-1 flex-shrink-0">
                    <MessageSquare className="h-full w-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      General Questions
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      Information about services and features...
                    </p>
                    <p className="text-xs text-gray-400 mt-1">3 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer - Profile Section */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="space-y-2">
            {/* Profile Button */}
            <button 
              onClick={() => setShowProfile(true)}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-white transition-colors text-left"
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || 'User Profile' : 'Profile'}
                </p>
                <p className="text-xs text-gray-500">View and edit profile</p>
              </div>
            </button>
            
            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="w-full justify-start h-auto p-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-3" />
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>

        {/* Profile Overlay */}
        {showProfile && (
          <div className="absolute inset-0 bg-white z-10 flex flex-col">
            {/* Profile Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Profile</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfile(false)}
                className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-600" />
              </Button>
            </div>

            {/* Profile Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {user ? (
                <div className="space-y-4">
                  {/* User Avatar */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative">
                      {(user as any)?.profilePhoto ? (
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                          <img 
                            src={(user as any).profilePhoto} 
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-colors"
                      >
                        {uploadPhotoMutation.isPending ? (
                          <Loader2 className="h-3 w-3 text-white animate-spin" />
                        ) : (
                          <Camera className="h-3 w-3 text-white" />
                        )}
                      </button>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Name Section */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Name</Label>
                    {isEditingNames ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="First Name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="text-sm"
                          />
                          <Input
                            placeholder="Last Name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={handleSaveNames}
                            disabled={updateNameMutation.isPending}
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            {updateNameMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Save'
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancelNameEdit}
                            disabled={updateNameMutation.isPending}
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-900">
                          {((user as any).firstName || (user as any).lastName) ? (
                            `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim()
                          ) : (
                            <span className="text-gray-500 italic">No name set</span>
                          )}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingNames(true)}
                          className="h-6 px-2 text-xs"
                        >
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Role Section */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Role</Label>
                    <Select
                      value={(user as any)?.roleId?.toString() || ""}
                      onValueChange={(value) => {
                        setSelectedRole(value);
                        updateRoleMutation.mutate(parseInt(value));
                      }}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Admin</SelectItem>
                        <SelectItem value="2">User</SelectItem>
                        <SelectItem value="3">Manager</SelectItem>
                        <SelectItem value="4">Operator</SelectItem>
                      </SelectContent>
                    </Select>
                    {updateRoleMutation.isPending && (
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Updating role...</span>
                      </div>
                    )}
                  </div>

                  {/* Input Preference Section */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Input Preference</Label>
                    <Select
                      value={(user as any)?.inputPreference || ""}
                      onValueChange={(value: "VOICE" | "KEYBOARD") => {
                        setSelectedInputPreference(value);
                        updateInputPreferenceMutation.mutate(value);
                      }}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select input preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VOICE">Voice</SelectItem>
                        <SelectItem value="KEYBOARD">Keyboard</SelectItem>
                      </SelectContent>
                    </Select>
                    {updateInputPreferenceMutation.isPending && (
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Updating preference...</span>
                      </div>
                    )}
                  </div>

                  {/* Email Section */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Email</Label>
                    {isEditingEmail ? (
                      <div className="space-y-2">
                        <Input
                          type="email"
                          placeholder="Enter email address"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="text-sm"
                        />
                        <div className="flex space-x-2">
                          <Button
                            onClick={handleSaveEmail}
                            disabled={updateEmailMutation.isPending}
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            {updateEmailMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Save'
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancelEmailEdit}
                            disabled={updateEmailMutation.isPending}
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(user as any).email ? (
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-900">{(user as any).email}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setNewEmail((user as any).email);
                                setIsEditingEmail(true);
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              Edit
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setIsEditingEmail(true)}
                            size="sm"
                            className="w-full h-8 text-xs"
                          >
                            Add Email
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Phone Section */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Phone</Label>
                    {isEditingPhone ? (
                      <div className="space-y-2">
                        <Input
                          type="tel"
                          placeholder="Enter phone number"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          className="text-sm"
                        />
                        <div className="flex space-x-2">
                          <Button
                            onClick={handleSavePhone}
                            disabled={updatePhoneMutation.isPending}
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            {updatePhoneMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Save'
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancelPhoneEdit}
                            disabled={updatePhoneMutation.isPending}
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(user as any).phone ? (
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-900">{(user as any).phone}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setNewPhone((user as any).phone);
                                setIsEditingPhone(true);
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              Edit
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setIsEditingPhone(true)}
                            size="sm"
                            className="w-full h-8 text-xs"
                          >
                            Add Phone
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Email Verification Status */}
                  <div className="grid grid-cols-5 gap-3 py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600 col-span-2">Email Verified:</span>
                    <span className={`text-sm ${(user as any).isEmailVerified ? 'text-green-600' : 'text-red-600'}`}>
                      {(user as any).isEmailVerified ? 'Yes' : 'No'}
                    </span>
                    {!(user as any).isEmailVerified && (user as any).email && !showEmailVerification && (
                      <div className="col-span-2">
                        <Button
                          onClick={() => verifyEmailMutation.mutate()}
                          disabled={verifyEmailMutation.isPending}
                          size="sm"
                          className="h-6 px-2 text-xs"
                        >
                          {verifyEmailMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Verify'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {showEmailVerification && (
                    <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                      <Label className="text-sm font-medium text-blue-900">Email Verification Code</Label>
                      <Input
                        placeholder="Enter verification code"
                        value={emailVerificationCode}
                        onChange={(e) => setEmailVerificationCode(e.target.value)}
                        className="text-sm"
                      />
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => completeEmailVerificationMutation.mutate(emailVerificationCode)}
                          disabled={completeEmailVerificationMutation.isPending || !emailVerificationCode.trim()}
                          size="sm"
                          className="h-6 px-2 text-xs"
                        >
                          {completeEmailVerificationMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Verify'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowEmailVerification(false);
                            setEmailVerificationCode("");
                          }}
                          disabled={completeEmailVerificationMutation.isPending}
                          size="sm"
                          className="h-6 px-2 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Phone Verification Status */}
                  <div className="grid grid-cols-5 gap-3 py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600 col-span-2">Phone Verified:</span>
                    <span className={`text-sm ${(user as any).isPhoneVerified ? 'text-green-600' : 'text-red-600'}`}>
                      {(user as any).isPhoneVerified ? 'Yes' : 'No'}
                    </span>
                    {!(user as any).isPhoneVerified && (user as any).phone && !showPhoneVerification && (
                      <div className="col-span-2">
                        <Button
                          onClick={() => verifyPhoneMutation.mutate()}
                          disabled={verifyPhoneMutation.isPending}
                          size="sm"
                          className="h-6 px-2 text-xs"
                        >
                          {verifyPhoneMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Verify'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {showPhoneVerification && (
                    <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                      <Label className="text-sm font-medium text-blue-900">Phone Verification Code</Label>
                      <Input
                        placeholder="Enter verification code"
                        value={phoneVerificationCode}
                        onChange={(e) => setPhoneVerificationCode(e.target.value)}
                        className="text-sm"
                      />
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => completePhoneVerificationMutation.mutate(phoneVerificationCode)}
                          disabled={completePhoneVerificationMutation.isPending || !phoneVerificationCode.trim()}
                          size="sm"
                          className="h-6 px-2 text-xs"
                        >
                          {completePhoneVerificationMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Verify'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowPhoneVerification(false);
                            setPhoneVerificationCode("");
                          }}
                          disabled={completePhoneVerificationMutation.isPending}
                          size="sm"
                          className="h-6 px-2 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Additional Profile Information */}
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700">Account Information</h4>
                    
                    <div className="grid grid-cols-5 gap-3 py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600 col-span-2 leading-tight">Sign Up Method:</span>
                      <span className="text-sm text-gray-900 capitalize col-span-3">{(user as any).signUpMethod ? (user as any).signUpMethod.toLowerCase() : 'N/A'}</span>
                    </div>

                    <div className="grid grid-cols-5 gap-3 py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600 col-span-2">User ID:</span>
                      <span className="text-sm text-gray-900 break-all col-span-3">{(user as any).id}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p>No profile data available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}