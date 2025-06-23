import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, AlertCircle } from "lucide-react";
import Link from "next/link";

interface JoinPageProps {
  params: Promise<{ join_code: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function JoinPage({
  params,
  searchParams,
}: JoinPageProps) {
  const { join_code } = await params;
  const { token } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect(
      `/sign-in?redirect_to=/join/${join_code}${token ? `?token=${token}` : ""}`,
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <CardTitle>Invalid Invite Link</CardTitle>
            <CardDescription>
              This invite link is missing required information. Please check the
              link and try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Find group by join code and token
  const { data: group, error: groupError } = await supabase
    .from("game_groups")
    .select(
      `
      *,
      group_members(
        user_id,
        users(username, full_name)
      )
    `,
    )
    .eq("join_code", join_code)
    .eq("invite_token", token)
    .single();

  if (groupError || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <CardTitle>Invalid or Expired Invite</CardTitle>
            <CardDescription>
              This invite link is no longer valid or has expired. Please ask for
              a new invite link.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("group_id", group.id)
    .single();

  if (existingMember) {
    return redirect(`/groups/${group.id}`);
  }

  // Auto-join the user to the group
  const { error: joinError } = await supabase.from("group_members").insert({
    user_id: user.id,
    group_id: group.id,
    role: "member",
  });

  if (joinError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <CardTitle>Failed to Join Group</CardTitle>
            <CardDescription>
              There was an error joining the group. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success - redirect to group
  return redirect(`/groups/${group.id}`);
}
