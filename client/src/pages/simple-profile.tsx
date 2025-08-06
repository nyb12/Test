import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, User, Edit3, Save, X, Camera, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Role {
  id: number;
  name: string;
  description: string;
}

export default function SimpleProfile() {
  const { user, logoutMutation } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  
  // Verification states
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [isEditingInputPref, setIsEditingInputPref] = useState(false);
  const [selectedInputPreference, setSelectedInputPreference] = useState("");

  // Fetch available roles with optimized caching
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    staleTime: 10 * 60 * 1000, // 10 minutes for roles data
    gcTime: 30 * 60 * 1000, // Keep in memory for 30 minutes
  });

  // Fetch user data with better caching strategy
  const { data: userProfile, isLoading, refetch: refetchProfile } = useQuery({
    queryKey: ["/api/auth/profile"],
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes cache for profile data
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const response = await apiRequest("PATCH", "/api/auth/profile", { roleId });
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      await refetchProfile();
      setIsEditingRole(false);
      toast({
        title: "Role Updated",
        description: "Your professional role has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  // Update name mutation
  const updateNameMutation = useMutation({
    mutationFn: async (data: { firstName?: string; lastName?: string }) => {
      const response = await apiRequest("PATCH", "/api/auth/profile", data);
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      await refetchProfile();
      setIsEditingName(false);
      toast({
        title: "Name Updated",
        description: "Your name has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update name",
        variant: "destructive",
      });
    },
  });

  // Update input preference mutation
  const updateInputPreferenceMutation = useMutation({
    mutationFn: async (inputPreference: "VOICE" | "KEYBOARD") => {
      const response = await apiRequest("PATCH", "/api/auth/profile", { inputPreference });
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      await refetchProfile();
      setIsEditingInputPref(false);
      toast({
        title: "Preference Updated",
        description: "Your input preference has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update input preference",
        variant: "destructive",
      });
    },
  });

  // Upload profile photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (base64Image: string) => {
      const response = await apiRequest("PATCH", "/api/auth/profile", { profilePhoto: base64Image });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      toast({
        title: "Photo Updated",
        description: "Your profile photo has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload profile photo",
        variant: "destructive",
      });
    },
  });

  // Email verification mutation
  const verifyEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/initiate-email-verification", {});
      return response.json();
    },
    onSuccess: () => {
      setShowEmailVerification(true);
      toast({
        title: "Verification email sent",
        description: "Please enter the 6-digit verification code below",
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
      const response = await apiRequest("POST", "/api/auth/complete-email-verification", {
        verificationCode: code
      });
      return response.json();
    },
    onSuccess: async () => {
      setIsUpdatingProfile(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      await refetchProfile(); // Explicitly refetch profile data
      setShowEmailVerification(false);
      setEmailVerificationCode("");
      toast({
        title: "Success",
        description: "Email has been verified successfully",
      });
      // Reset loading state after a short delay
      setTimeout(() => setIsUpdatingProfile(false), 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  // Phone verification mutation
  const verifyPhoneMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/initiate-phone-verification", {});
      return response.json();
    },
    onSuccess: () => {
      setShowPhoneVerification(true);
      toast({
        title: "Verification SMS sent",
        description: "Please enter the 6-digit verification code below",
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

  // Update contact information mutation
  const updateContactMutation = useMutation({
    mutationFn: async (data: { email?: string; phone?: string }) => {
      const response = await apiRequest("PATCH", "/api/auth/profile", data);
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      await refetchProfile(); // Explicitly refetch profile data
      setIsEditingContact(false);
      setNewEmail("");
      setNewPhone("");
      toast({
        title: "Contact Updated",
        description: "Your contact information has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update contact information",
        variant: "destructive",
      });
    },
  });

  // Complete phone verification mutation
  const completePhoneVerificationMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/auth/complete-phone-verification", {
        verificationCode: code
      });
      return response.json();
    },
    onSuccess: async () => {
      setIsUpdatingProfile(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      await refetchProfile(); // Explicitly refetch profile data
      setShowPhoneVerification(false);
      setPhoneVerificationCode("");
      toast({
        title: "Success",
        description: "Phone number has been verified successfully",
      });
      // Reset loading state after a short delay
      setTimeout(() => setIsUpdatingProfile(false), 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  // Handle photo upload
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

  const getUserInitials = (user: any) => {
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    if (user?.phone) {
      return user.phone.slice(-2).toUpperCase();
    }
    return "U";
  };



  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        window.location.href = '/';
      }
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to view your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/onboarding">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use fresh profile data from API or fallback to auth user data
  const currentUser = userProfile || user;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        <div className="grid gap-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={(currentUser as any)?.profilePhoto} />
                      <AvatarFallback className="bg-primary text-white text-lg">
                        {getUserInitials(currentUser)}
                      </AvatarFallback>
                    </Avatar>
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
                  <div className="flex-1">
                    <CardTitle className="text-xl">Profile</CardTitle>
                    
                    {/* Name Section - Inline Editing */}
                    <div className="mt-2">
                      {isEditingName ? (
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <Input
                              placeholder="First name"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              className="text-sm"
                            />
                            <Input
                              placeholder="Last name"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                updateNameMutation.mutate({
                                  firstName: firstName.trim() || undefined,
                                  lastName: lastName.trim() || undefined
                                });
                              }}
                              disabled={updateNameMutation.isPending}
                            >
                              {updateNameMutation.isPending ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="h-3 w-3 mr-1" />
                                  Save
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsEditingName(false);
                                setFirstName((currentUser as any)?.firstName || "");
                                setLastName((currentUser as any)?.lastName || "");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-gray-100 rounded p-2 -m-2 transition-colors"
                          onClick={() => {
                            setIsEditingName(true);
                            setFirstName((currentUser as any)?.firstName || "");
                            setLastName((currentUser as any)?.lastName || "");
                          }}
                        >
                          {((currentUser as any)?.firstName || (currentUser as any)?.lastName) ? (
                            <p className="text-lg font-medium text-gray-700 flex items-center">
                              {[(currentUser as any)?.firstName, (currentUser as any)?.lastName].filter(Boolean).join(' ')}
                              <Edit3 className="h-4 w-4 ml-2 opacity-50" />
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 flex items-center">
                              Click to add your name
                              <Edit3 className="h-4 w-4 ml-2 opacity-50" />
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Information */}
              <div>
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Contact Information</h3>
                </div>
                
                {isEditingContact ? (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    {/* Only show email input if email doesn't exist or is empty */}
                    {!(currentUser as any)?.email || (currentUser as any).email.trim() === '' ? (
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter email address"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    ) : null}
                    
                    {/* Only show phone input if phone doesn't exist or is empty */}
                    {!(currentUser as any)?.phone || (currentUser as any).phone.trim() === '' ? (
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="Enter phone number"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    ) : null}
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => {
                          const updateData: { email?: string; phone?: string } = {};
                          if (newEmail !== (currentUser as any)?.email) updateData.email = newEmail;
                          if (newPhone !== (currentUser as any)?.phone) updateData.phone = newPhone;
                          if (Object.keys(updateData).length > 0) {
                            updateContactMutation.mutate(updateData);
                          }
                        }}
                        disabled={updateContactMutation.isPending}
                        size="sm"
                      >
                        {updateContactMutation.isPending ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingContact(false)}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Email Section */}
                    {(currentUser as any)?.email && (currentUser as any).email.trim() !== '' ? (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Mail className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium">{(currentUser as any).email}</div>
                            <div className="text-xs text-gray-500">
                              {isUpdatingProfile ? (
                                <Badge variant="outline" className="text-blue-700 bg-blue-50">
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Updating...
                                </Badge>
                              ) : (currentUser as any)?.isEmailVerified ? (
                                <Badge variant="secondary" className="text-green-700 bg-green-100">Verified</Badge>
                              ) : (
                                <Badge variant="outline">Not Verified</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {!(currentUser as any)?.isEmailVerified && !showEmailVerification && (
                          <Button
                            size="sm"
                            onClick={() => verifyEmailMutation.mutate()}
                            disabled={verifyEmailMutation.isPending}
                          >
                            {verifyEmailMutation.isPending ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Sending...
                              </>
                            ) : (
                              'Verify'
                            )}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Mail className="h-5 w-5 text-gray-400" />
                          <div className="text-sm text-gray-500">No email address</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingContact(true);
                            setNewEmail("");
                            setNewPhone((currentUser as any)?.phone || "");
                          }}
                        >
                          Add Email
                        </Button>
                      </div>
                    )}
                  
                    {/* Phone Section */}
                    {(currentUser as any)?.phone && (currentUser as any).phone.trim() !== '' ? (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Phone className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium">{(currentUser as any).phone}</div>
                            <div className="text-xs text-gray-500">
                              {isUpdatingProfile ? (
                                <Badge variant="outline" className="text-blue-700 bg-blue-50">
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Updating...
                                </Badge>
                              ) : (currentUser as any)?.isPhoneVerified ? (
                                <Badge variant="secondary" className="text-green-700 bg-green-100">Verified</Badge>
                              ) : (
                                <Badge variant="outline">Not Verified</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {!(currentUser as any)?.isPhoneVerified && !showPhoneVerification && (
                          <Button
                            size="sm"
                            onClick={() => verifyPhoneMutation.mutate()}
                            disabled={verifyPhoneMutation.isPending}
                          >
                            {verifyPhoneMutation.isPending ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Sending...
                              </>
                            ) : (
                              'Verify'
                            )}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Phone className="h-5 w-5 text-gray-400" />
                          <div className="text-sm text-gray-500">No phone number</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingContact(true);
                            setNewEmail((currentUser as any)?.email || "");
                            setNewPhone("");
                          }}
                        >
                          Add Phone
                        </Button>
                      </div>
                    )}

                    {/* Email Verification Section */}
                    {showEmailVerification && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">Email Verification</h4>
                        <p className="text-xs text-blue-700 mb-3">
                          Enter the verification code sent to {(currentUser as any)?.email}
                        </p>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Enter 6-digit code"
                            value={emailVerificationCode}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setEmailVerificationCode(value);
                            }}
                            maxLength={6}
                            className="flex-1 text-center text-lg tracking-widest"
                          />
                          <Button
                            size="sm"
                            onClick={() => completeEmailVerificationMutation.mutate(emailVerificationCode)}
                            disabled={completeEmailVerificationMutation.isPending || emailVerificationCode.length !== 6}
                          >
                            {completeEmailVerificationMutation.isPending ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Verifying...
                              </>
                            ) : (
                              'Verify'
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowEmailVerification(false);
                              setEmailVerificationCode("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Phone Verification Section */}
                    {showPhoneVerification && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">Phone Verification</h4>
                        <p className="text-xs text-blue-700 mb-3">
                          Enter the verification code sent to {(currentUser as any)?.phone}
                        </p>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Enter 6-digit code"
                            value={phoneVerificationCode}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setPhoneVerificationCode(value);
                            }}
                            maxLength={6}
                            className="flex-1 text-center text-lg tracking-widest"
                          />
                          <Button
                            size="sm"
                            onClick={() => completePhoneVerificationMutation.mutate(phoneVerificationCode)}
                            disabled={completePhoneVerificationMutation.isPending || phoneVerificationCode.length !== 6}
                          >
                            {completePhoneVerificationMutation.isPending ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Verifying...
                              </>
                            ) : (
                              'Verify'
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowPhoneVerification(false);
                              setPhoneVerificationCode("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Professional Role */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Professional Role</h3>
                {isEditingRole ? (
                  <div className="space-y-2">
                    <Select value={selectedRole || (currentUser as any)?.roleId?.toString() || ""} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your professional role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (selectedRole) {
                            updateRoleMutation.mutate(parseInt(selectedRole));
                          }
                        }}
                        disabled={updateRoleMutation.isPending}
                      >
                        {updateRoleMutation.isPending ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingRole(false);
                          setSelectedRole((currentUser as any)?.roleId?.toString() || "");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      setIsEditingRole(true);
                      setSelectedRole((currentUser as any)?.roleId?.toString() || "");
                    }}
                  >
                    <div className="text-sm font-medium flex items-center">
                      {roles.find(role => role.id === (currentUser as any)?.roleId)?.name || 'Click to select role'}
                      <Edit3 className="h-4 w-4 ml-2 opacity-50" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Preference */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Communication Preference</h3>
                {isEditingInputPref ? (
                  <div className="space-y-2">
                    <Select value={selectedInputPreference || (currentUser as any)?.inputPreference || ""} onValueChange={setSelectedInputPreference}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your input preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VOICE">Voice</SelectItem>
                        <SelectItem value="KEYBOARD">Keyboard</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (selectedInputPreference) {
                            updateInputPreferenceMutation.mutate(selectedInputPreference as "VOICE" | "KEYBOARD");
                          }
                        }}
                        disabled={updateInputPreferenceMutation.isPending}
                      >
                        {updateInputPreferenceMutation.isPending ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingInputPref(false);
                          setSelectedInputPreference((currentUser as any)?.inputPreference || "");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      setIsEditingInputPref(true);
                      setSelectedInputPreference((currentUser as any)?.inputPreference || "");
                    }}
                  >
                    <div className="text-sm font-medium flex items-center">
                      {(currentUser as any)?.inputPreference || 'Click to select preference'}
                      <Edit3 className="h-4 w-4 ml-2 opacity-50" />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>
                Manage your account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Sign out</div>
                  <div className="text-sm text-gray-500">Sign out of your account on this device</div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}