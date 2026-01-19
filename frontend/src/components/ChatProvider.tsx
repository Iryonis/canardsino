"use client";

import { useAuth } from "@/hooks/useAuth";
import { FloatingChat } from "./FloatingChat";
import { useEffect, useState } from "react";

export function ChatProvider() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Attend le montage et que useAuth soit complètement prêt
  if (!isMounted || isLoading) {
    return null;
  }

  // Ne rendre le chat que si authentifié ET user est complètement chargé
  if (!isAuthenticated || !user) {
    return null;
  }

  return <FloatingChat />;
}
