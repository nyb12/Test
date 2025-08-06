import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  password?: string;
}

export default function Users() {
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
    mutationFn: async (newUser: { username: string; password: string }) => {
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
      setNewUsername("");
      setNewPassword("");
      
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate({ username: newUsername, password: newPassword });
  };

  return (
    <main className="flex-grow py-16 px-6 animate-in fade-in duration-500">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-semibold mb-6 text-gray-800">User Management</h1>
        
        {/* Add User Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                />
              </div>
              
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
            <CardTitle>Users from Database</CardTitle>
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
                    className="p-4 border border-gray-200 rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-medium">{user.username}</h3>
                      <p className="text-sm text-gray-500">ID: {user.id}</p>
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