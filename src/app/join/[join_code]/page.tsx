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

  // Verify join code and token, then join group using the function (bypasses RLS)
  const { data: joinResult, error: joinError } = await supabase
    .rpc('verify_and_join_group', {
      join_code_param: join_code,
      token_param: token
    });

  console.log("joinResult ", joinResult);
  console.log("joinError ", joinError);

  if (joinError || !joinResult || joinResult.length === 0) {
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

  const result = joinResult[0];

  if (!result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <CardTitle>Invalid or Expired Invite</CardTitle>
            <CardDescription>
              {result.error_message || "This invite link is no longer valid or has expired. Please ask for a new invite link."}
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

  // If already a member, redirect to group
  if (result.error_message === 'Already a member') {
    return redirect(`/groups/${result.group_id}`);
  }

  // Success - redirect to group
  return redirect(`/groups/${result.group_id}`);
}
