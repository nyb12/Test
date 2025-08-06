import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// User type that matches our Prisma schema
interface User {
  id: string;
  email: string | null;
  phone: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  signUpMethod: "EMAIL" | "PHONE";
}

export default function PrismaUsers() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [signUpMethod, setSignUpMethod] = useState<"EMAIL" | "PHONE">("EMAIL");

  // Fetch users
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (newUser: { email?: string; phone?: string; signUpMethod: "EMAIL" | "PHONE" }) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Reset form
      setEmail("");
      setPhone("");
      
      // Invalidate the users query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      // Show success toast
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Verify email mutation
  const verifyEmailMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}/verify-email`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to verify email");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Email verified successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to verify email",
        variant: "destructive",
      });
    },
  });

  // Verify phone mutation
  const verifyPhoneMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}/verify-phone`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to verify phone");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Phone verified successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to verify phone",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create payload based on sign-up method
    const userData: { email?: string; phone?: string; signUpMethod: "EMAIL" | "PHONE" } = {
      signUpMethod
    };
    
    if (signUpMethod === "EMAIL") {
      userData.email = email;
    } else {
      userData.phone = phone;
    }
    
    createUserMutation.mutate(userData);
  };

  return (
    <main className="flex-grow py-16 px-6 animate-in fade-in duration-500">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-semibold mb-6 text-gray-800">Prisma User Management</h1>
        
        {/* Add User Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sign-up Method Selection */}
              <div className="space-y-3">
                <Label>Sign-up Method</Label>
                <RadioGroup 
                  defaultValue="EMAIL" 
                  value={signUpMethod}
                  onValueChange={(value) => setSignUpMethod(value as "EMAIL" | "PHONE")}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="EMAIL" id="email-method" />
                    <Label htmlFor="email-method">Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PHONE" id="phone-method" />
                    <Label htmlFor="phone-method">Phone</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Conditional Input Fields */}
              {signUpMethod === "EMAIL" ? (
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter email address"
                    className="mt-1"
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="Enter phone number"
                    className="mt-1"
                  />
                </div>
              )}
              
              <Button
                type="submit"
                disabled={createUserMutation.isPending}
                className="w-full"
              >
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Users from Prisma Database</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading users...</p>
            ) : error ? (
              <p className="text-red-500">Error loading users: {(error as Error).message}</p>
            ) : users && users.length > 0 ? (
              <div className="space-y-4">
                {users.map((user: User) => (
                  <div 
                    key={user.id} 
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <Badge className="mb-2">{user.signUpMethod}</Badge>
                        {user.email && (
                          <div className="flex items-center space-x-2">
                            <p className="text-sm">
                              <span className="font-medium">Email:</span> {user.email}
                            </p>
                            <Badge variant={user.isEmailVerified ? "default" : "outline"}>
                              {user.isEmailVerified ? "Verified" : "Unverified"}
                            </Badge>
                            {!user.isEmailVerified && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => verifyEmailMutation.mutate(user.id)}
                                disabled={verifyEmailMutation.isPending}
                              >
                                Verify
                              </Button>
                            )}
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center space-x-2">
                            <p className="text-sm">
                              <span className="font-medium">Phone:</span> {user.phone}
                            </p>
                            <Badge variant={user.isPhoneVerified ? "default" : "outline"}>
                              {user.isPhoneVerified ? "Verified" : "Unverified"}
                            </Badge>
                            {!user.isPhoneVerified && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => verifyPhoneMutation.mutate(user.id)}
                                disabled={verifyPhoneMutation.isPending}
                              >
                                Verify
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          ID: {user.id.substring(0, 8)}...
                        </p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No users found. Add one above!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}