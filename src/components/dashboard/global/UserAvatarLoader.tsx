"use client";

import Image from "next/image";
import { useUser } from "@/hooks/useUser";
import UserProfile from "@/assets/images/user.png";
import Link from "next/link";

export const UserAvatarLoader = () => {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="size-8 bg-[#F7F7F8] rounded-full animate-pulse"></div>
    );
  }

  const avatarUrl = user?.avatarUrl;
  const fallbackAvatar = UserProfile;

  return (
    <Link href="/settings" className="size-8 bg-[#F7F7F8] rounded-full hover:opacity-80 transition-opacity">
      <Image
        src={avatarUrl || fallbackAvatar}
        alt="User Profile"
        width={32}
        height={32}
        className="rounded-full object-cover w-full h-full"
        priority
      />
    </Link>
  );
};
