"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/ImageUpload";
import { useUser } from "@/hooks/useUser";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, error: userError } = useUser();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.avatarUrl) {
      setLocalAvatarUrl(user.avatarUrl);
    }
  }, [user?.avatarUrl]);

  useEffect(() => {
    // Get auth token from document cookies or localStorage
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
    };

    const authToken = getCookie("ACCESS_TOKEN_COOKIE") || localStorage.getItem("access_token");
    setToken(authToken || null);
  }, []);

  const handleAvatarUpload = (avatarUrl: string) => {
    setLocalAvatarUrl(avatarUrl);
    setSuccessMessage("Avatar uploaded successfully!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7FC] p-8 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5A42DE]"></div>
      </div>
    );
  }

  if (userError && !user) {
    return (
      <div className="min-h-screen bg-[#F7F7FC] p-8 flex flex-col items-center justify-center text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[#18181B]">Access Denied</h1>
          <p className="text-[#717182] max-w-md mx-auto">
            Please log in to access account settings.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#5A42DE] text-white rounded-xl font-medium hover:bg-[#4b35e5] transition-all shadow-lg shadow-[#5A42DE]/20"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7FC] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 text-[#5A42DE] hover:bg-[#E4EFFD]/50 rounded-lg transition-colors mb-6"
          >
            <ChevronLeft size={20} />
            Back
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-[#18181B]">
            Account Settings
          </h1>
          <p className="text-[#717182] mt-2">
            Manage your profile and preferences
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E1E1E5]">
          <h2 className="text-xl md:text-2xl font-bold text-[#18181B] mb-6">
            Profile Picture
          </h2>

          {/* Current Avatar Preview */}
          {(localAvatarUrl || user?.avatarUrl) && (
            <div className="mb-6">
              <p className="text-sm font-medium text-[#717182] mb-3">
                Current Avatar
              </p>
              <div className="w-24 h-24 rounded-xl overflow-hidden border border-[#E1E1E5] bg-[#F7F7FC]">
                <Image
                  src={localAvatarUrl || user?.avatarUrl || ""}
                  alt="Current avatar"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div className="mb-6">
            <p className="text-sm font-medium text-[#717182] mb-3">
              Upload New Picture
            </p>
            <ImageUpload
              onUpload={handleAvatarUpload}
              authToken={token || undefined}
              className="max-w-sm"
            />
          </div>

          {/* Info */}
          <div className="p-4 bg-[#F7F7FC] rounded-lg border border-[#E1E1E5]">
            <p className="text-xs md:text-sm text-[#717182]">
              <strong>Supported formats:</strong> JPEG, PNG
            </p>
            <p className="text-xs md:text-sm text-[#717182] mt-1">
              <strong>Max file size:</strong> 10MB
            </p>
            <p className="text-xs md:text-sm text-[#717182] mt-1">
              Your profile picture will be updated across the application
            </p>
          </div>
        </div>

        {/* User Info Section */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E1E1E5] mt-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#18181B] mb-6">
            Account Information
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-[#717182]">Email</p>
              <p className="text-[#18181B] font-medium">{user?.email}</p>
            </div>
            {user?.name && (
              <div>
                <p className="text-sm font-medium text-[#717182]">Name</p>
                <p className="text-[#18181B] font-medium">{user.name}</p>
              </div>
            )}
            {user?.username && (
              <div>
                <p className="text-sm font-medium text-[#717182]">Username</p>
                <p className="text-[#18181B] font-medium">@{user.username}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-[#717182]">Account Status</p>
              <p className="text-[#18181B] font-medium capitalize">
                {user?.status}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
