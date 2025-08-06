import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, Shield, ShieldCheck, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Role {
  id: number;
  name: string;
  description: string;
}

export default function ProfilePage() {
  const { user, initiateSecondaryVerificationMutation, completeVerificationMutation, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [verificationStep, setVerificationStep] = useState<"idle" | "email" | "phone" | "verify">("idle");
  const [contactInfo, setContactInfo] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [currentVerificationType, setCurrentVerificationType] = useState<"EMAIL" | "PHONE">("EMAIL");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedInputPreference, setSelectedInputPreference] = useState<string>("");
  
  // Name editing states
  const [isEditingNames, setIsEditingNames] = useState(false);
  const [firstName, setFirstName] = useState((user as any)?.firstName || "");
  const [lastName, setLastName] = useState((user as any)?.lastName || "");

  // Fetch available roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  console.log("Roles data:", roles);
  console.log("User data:", user);
  console.log("User inputPreference:", (user as any)?.inputPreference);
  console.log("Roles loading:", rolesLoading);

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const response = await apiRequest("PATCH", "/api/auth/profile", { roleId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      toast({
        title: "Success",
        description: "Your role has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update input preference",
        variant: "destructive",
      });
    },
  });

  // Update name mutation
  const updateNameMutation = useMutation({
    mutationFn: async ({ firstName, lastName }: { firstName: string; lastName: string }) => {
      const response = await apiRequest("PATCH", "/api/auth/profile", { firstName, lastName });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      setIsEditingNames(false);
      toast({
        title: "Success",
        description: "Your name has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update name",
        variant: "destructive",
      });
    },
  });
  
  const handleSaveNames = () => {
    updateNameMutation.mutate({ firstName: firstName.trim(), lastName: lastName.trim() });
  };

  const handleCancelNameEdit = () => {
    setFirstName((user as any)?.firstName || "");
    setLastName((user as any)?.lastName || "");
    setIsEditingNames(false);
  };

  const handleInitiateEmailVerification = () => {
    setVerificationStep("email");
    setCurrentVerificationType("EMAIL");
  };
  
  const handleInitiatePhoneVerification = () => {
    setVerificationStep("phone");
    setCurrentVerificationType("PHONE");
  };
  
  const handleStartVerification = () => {
    if (!contactInfo) {
      toast({
        title: "Error",
        description: `Please enter your ${currentVerificationType === "EMAIL" ? "email address" : "phone number"}`,
        variant: "destructive",
      });
      return;
    }
    
    initiateSecondaryVerificationMutation.mutate(
      {
        contactType: currentVerificationType,
        contactInfo,
      },
      {
        onSuccess: () => {
          setVerificationStep("verify");
        },
      }
    );
  };
  
  const handleVerifyCode = () => {
    if (!verificationCode) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }
    
    completeVerificationMutation.mutate(
      {
        contactInfo,
        signUpMethod: currentVerificationType,
        code: verificationCode,
      },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: `Your ${currentVerificationType === "EMAIL" ? "email" : "phone"} has been verified!`,
          });
          setVerificationStep("idle");
          setContactInfo("");
          setVerificationCode("");
        },
      }
    );
  };
  
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/auth");
      },
    });
  };
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to view your profile
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation("/auth")} className="w-full">
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl py-12 px-4 md:px-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>
      
      {/* VISIBLE TEST */}
      <div style={{backgroundColor: 'red', color: 'white', padding: '20px', margin: '20px 0', fontSize: '18px'}}>
        🚨 INPUT PREFERENCE SECTION - TEST VISIBILITY 🚨
      </div>
      
      {/* TEST: Simple Input Preference Section */}
      <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Input Preference</h2>
        <p className="text-gray-600 mb-4">Choose how you prefer to interact with the system</p>
        
        <div className="mb-4">
          <span className="text-sm font-medium">Current: </span>
          <span className="bg-gray-100 px-2 py-1 rounded text-sm">
            {(user as any)?.inputPreference || 'KEYBOARD'}
          </span>
        </div>
        
        <div className="flex gap-2">
          <Select 
            value={selectedInputPreference || (user as any)?.inputPreference || ""} 
            onValueChange={setSelectedInputPreference}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KEYBOARD">Keyboard</SelectItem>
              <SelectItem value="VOICE">Voice</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={() => {
              const preference = selectedInputPreference || "KEYBOARD";
              updateInputPreferenceMutation.mutate(preference as "VOICE" | "KEYBOARD");
            }}
            disabled={updateInputPreferenceMutation.isPending}
          >
            {updateInputPreferenceMutation.isPending ? "Updating..." : "Update"}
          </Button>
        </div>
      </div>
      
      {/* Input Preference Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Input Preference</CardTitle>
          <CardDescription>Choose how you prefer to interact with the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Current Preference</Label>
              <Badge variant="outline" className="ml-2">
                {(user as any)?.inputPreference || 'KEYBOARD'}
              </Badge>
            </div>
            <div>
              <Label>Update Preference</Label>
              <div className="flex gap-2 mt-2">
                <Select 
                  value={selectedInputPreference || (user as any)?.inputPreference || ""} 
                  onValueChange={setSelectedInputPreference}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose your input preference..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KEYBOARD">Keyboard</SelectItem>
                    <SelectItem value="VOICE">Voice</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => {
                    const preference = selectedInputPreference || "KEYBOARD";
                    updateInputPreferenceMutation.mutate(preference as "VOICE" | "KEYBOARD");
                  }}
                  disabled={updateInputPreferenceMutation.isPending}
                >
                  {updateInputPreferenceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Update'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Role Management Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Professional Role</CardTitle>
          <CardDescription>Select your professional role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Current Role</Label>
              <Badge variant="outline" className="ml-2">
                {(user as any)?.roleId ? `Role ID: ${(user as any).roleId}` : 'No Role Selected'}
              </Badge>
            </div>
            <div>
              <Label>Update Role</Label>
              <div className="flex gap-2 mt-2">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose your role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Maintenance Tech</SelectItem>
                    <SelectItem value="2">Director of Maintenance</SelectItem>
                    <SelectItem value="3">Other Maintenance Role</SelectItem>
                    <SelectItem value="4">Pilot</SelectItem>
                    <SelectItem value="5">Pilot/Operator</SelectItem>
                    <SelectItem value="6">Owner/Operator</SelectItem>
                    <SelectItem value="7">Scheduler</SelectItem>
                    <SelectItem value="8">OEM</SelectItem>
                    <SelectItem value="9">FBO Manager</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => {
                    if (selectedRole) {
                      updateRoleMutation.mutate(parseInt(selectedRole));
                    }
                  }}
                  disabled={!selectedRole || updateRoleMutation.isPending}
                >
                  {updateRoleMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Update'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input Preference Section - Always visible */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Input Preference</CardTitle>
          <CardDescription>Choose your preferred input method for interacting with the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Current Preference</Label>
              <div className="mt-2">
                <Badge variant="outline" className="px-3 py-1">
                  {(user as any)?.inputPreference || 'KEYBOARD'}
                </Badge>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Select Preference</Label>
              <div className="flex gap-2 mt-2">
                <Select 
                  value={selectedInputPreference || (user as any)?.inputPreference || ""} 
                  onValueChange={setSelectedInputPreference}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose your input preference..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KEYBOARD">Keyboard</SelectItem>
                    <SelectItem value="VOICE">Voice</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => {
                    const preference = selectedInputPreference || "KEYBOARD";
                    updateInputPreferenceMutation.mutate(preference as "VOICE" | "KEYBOARD");
                  }}
                  disabled={updateInputPreferenceMutation.isPending}
                  size="sm"
                >
                  {updateInputPreferenceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Update'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {verificationStep === "idle" ? (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Manage your account details and verification status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                <Card className="p-4 mb-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium">Name</Label>
                      {!isEditingNames && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setIsEditingNames(true)}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                    
                    {isEditingNames ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="firstName" className="text-xs text-gray-600">First Name</Label>
                            <Input
                              id="firstName"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder="Enter first name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName" className="text-xs text-gray-600">Last Name</Label>
                            <Input
                              id="lastName"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              placeholder="Enter last name"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleSaveNames}
                            disabled={updateNameMutation.isPending}
                            size="sm"
                          >
                            {updateNameMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Save'
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={handleCancelNameEdit}
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <div className="text-sm">
                          <span className="font-medium">
                            {((user as any)?.firstName || (user as any)?.lastName) 
                              ? `${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`.trim()
                              : 'No name set'
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Professional Role</h3>
                <Card className="p-4 mb-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Current Role</Label>
                      <div className="mt-2">
                        <Badge variant="outline" className="px-3 py-1">
                          {(user as any).roleId ? 'Role ID: ' + (user as any).roleId : 'No Role Selected'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Select Role</Label>
                      <div className="flex gap-2 mt-2">
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Choose your role..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Maintenance Tech</SelectItem>
                            <SelectItem value="2">Director of Maintenance</SelectItem>
                            <SelectItem value="3">Other Maintenance Role</SelectItem>
                            <SelectItem value="4">Pilot</SelectItem>
                            <SelectItem value="5">Pilot/Operator</SelectItem>
                            <SelectItem value="6">Owner/Operator</SelectItem>
                            <SelectItem value="7">Scheduler</SelectItem>
                            <SelectItem value="8">OEM</SelectItem>
                            <SelectItem value="9">FBO Manager</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={() => {
                            if (selectedRole) {
                              updateRoleMutation.mutate(parseInt(selectedRole));
                            }
                          }}
                          disabled={!selectedRole || updateRoleMutation.isPending}
                          size="sm"
                        >
                          {updateRoleMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Update'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium mb-4">Your Verification Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md flex items-center gap-2">
                          <Mail className="h-4 w-4" /> Email Address
                        </CardTitle>
                        {user.isEmailVerified ? (
                          <Badge className="bg-green-600">
                            <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Shield className="h-3 w-3 mr-1" /> Unverified
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {user.email ? (
                        <p className="text-sm">{user.email}</p>
                      ) : (
                        <p className="text-sm text-gray-500">No email address added</p>
                      )}
                    </CardContent>
                    <CardFooter>
                      {!user.isEmailVerified && (
                        <Button 
                          onClick={handleInitiateEmailVerification} 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                        >
                          {user.email ? 'Verify Email' : 'Add Email'}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md flex items-center gap-2">
                          <Phone className="h-4 w-4" /> Phone Number
                        </CardTitle>
                        {user.isPhoneVerified ? (
                          <Badge className="bg-green-600">
                            <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Shield className="h-3 w-3 mr-1" /> Unverified
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {user.phone ? (
                        <p className="text-sm">{user.phone}</p>
                      ) : (
                        <p className="text-sm text-gray-500">No phone number added</p>
                      )}
                    </CardContent>
                    <CardFooter>
                      {!user.isPhoneVerified && (
                        <Button 
                          onClick={handleInitiatePhoneVerification} 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                        >
                          {user.phone ? 'Verify Phone' : 'Add Phone'}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </div>
              </div>


              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium mb-2">Account Security</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  A more secure account has both email and phone verified. This helps with account recovery 
                  and ensures you can always access your account.
                </p>
                
                <Button onClick={handleLogout} variant="destructive">
                  Log Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : verificationStep === "email" || verificationStep === "phone" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVerificationStep("idle")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>
                  {verificationStep === "email" ? "Add Email Address" : "Add Phone Number"}
                </CardTitle>
                <CardDescription>
                  We'll send a verification code to confirm it's you
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contactInfo">
                  {verificationStep === "email" ? "Email Address" : "Phone Number"}
                </Label>
                <Input
                  id="contactInfo"
                  type={verificationStep === "email" ? "email" : "tel"}
                  placeholder={
                    verificationStep === "email" 
                      ? "Enter your email address" 
                      : "Enter your phone number with country code"
                  }
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={handleStartVerification}
                disabled={initiateSecondaryVerificationMutation.isPending}
                className="w-full"
              >
                {initiateSecondaryVerificationMutation.isPending 
                  ? "Sending Code..." 
                  : "Send Verification Code"
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : verificationStep === "verify" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => 
                  setVerificationStep(currentVerificationType === "EMAIL" ? "email" : "phone")
                }
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>Verify Your {currentVerificationType === "EMAIL" ? "Email" : "Phone"}</CardTitle>
                <CardDescription>
                  Enter the verification code sent to {contactInfo}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="Enter the verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={handleVerifyCode}
                disabled={completeVerificationMutation.isPending}
                className="w-full"
              >
                {completeVerificationMutation.isPending 
                  ? "Verifying..." 
                  : "Verify"
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}