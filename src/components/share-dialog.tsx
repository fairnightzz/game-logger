"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Copy, Check, RefreshCw } from "lucide-react";
import { regenerateInviteToken } from "@/app/actions";

interface ShareDialogProps {
  group: {
    id: string;
    join_code: string;
    invite_token: string;
    invite_token_expires_at?: string;
  };
}

export function ShareDialog({ group }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [currentGroup, setCurrentGroup] = useState(group);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      setInviteUrl(
        `${baseUrl}/join/${currentGroup.join_code}?token=${currentGroup.invite_token}`,
      );
    }
  }, [currentGroup.join_code, currentGroup.invite_token]);

  // Check if invite token is expired
  const isTokenExpired = () => {
    if (!currentGroup.invite_token_expires_at) return false;
    const now = new Date();
    const expiresAt = new Date(currentGroup.invite_token_expires_at);
    return now > expiresAt;
  };

  const handleRegenerateToken = async () => {
    setIsRegenerating(true);
    try {
      const result = await regenerateInviteToken(currentGroup.id);
      if (result.success && result.group) {
        setCurrentGroup({
          ...currentGroup,
          invite_token: result.group.invite_token,
          invite_token_expires_at: result.group.invite_token_expires_at,
        });
        router.refresh(); // Refresh the page to update server-side data
      } else {
        console.error("Failed to regenerate token:", result.error);
      }
    } catch (error) {
      console.error("Error regenerating token:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const copyToClipboard = async (text: string, type: "code" | "url") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "code") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Group</DialogTitle>
          <DialogDescription>
            Share this join code with friends to invite them to your group.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="join_code">Join Code</Label>
            <div className="flex gap-2">
              <Input
                id="join_code"
                value={currentGroup.join_code}
                readOnly
                className="font-mono text-center text-lg tracking-wider"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(currentGroup.join_code, "code")}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="invite_token">Invite Token</Label>
              {isTokenExpired() && (
                <span className="text-xs text-red-500 font-medium">
                  Expired
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                id="invite_token"
                value={currentGroup.invite_token}
                readOnly
                className={`font-mono text-xs ${
                  isTokenExpired() ? "border-red-300 bg-red-50" : ""
                }`}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRegenerateToken}
                disabled={isRegenerating}
                title="Regenerate invite token"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            {currentGroup.invite_token_expires_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Expires:{" "}
                {new Date(
                  currentGroup.invite_token_expires_at,
                ).toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="invite_url">Invite URL</Label>
            <div className="flex gap-2">
              <Input
                id="invite_url"
                value={inviteUrl}
                readOnly
                className="text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(inviteUrl, "url")}
              >
                {copiedUrl ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Option 1:</strong> Share the invite URL directly with
              friends.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Option 2:</strong> Friends can manually enter the join
              code and invite token in the "Join Group" dialog on their
              dashboard.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
