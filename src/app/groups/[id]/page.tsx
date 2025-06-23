import { createClient } from "../../../../supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Trophy } from "lucide-react";
import { LogSessionForm } from "@/components/log-session-form";

interface GroupPageProps {
  params: {
    id: string;
  };
}

export default async function GroupPage({ params }: GroupPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch group details
  const { data: group, error: groupError } = await supabase
    .from("game_groups")
    .select("*")
    .eq("id", params.id)
    .single();

  if (groupError || !group) {
    redirect("/dashboard");
  }

  // Check if user is a member of this group
  const { data: membership } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    redirect("/dashboard");
  }

  // Fetch group members
  const { data: members } = await supabase
    .from("group_members")
    .select(
      `
      *,
      users:user_id (
        id,
        email,
        full_name
      )
    `,
    )
    .eq("group_id", params.id);

  // Fetch all games for the form
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .order("name");

  // Fetch recent sessions
  const { data: sessions } = await supabase
    .from("game_sessions")
    .select(
      `
      *,
      games (
        name
      ),
      game_session_players (
        *,
        users:user_id (
          id,
          email,
          full_name
        )
      )
    `,
    )
    .eq("group_id", params.id)
    .order("played_at", { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Group Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{group.name}</h1>
            <p className="text-muted-foreground mt-1">
              Created {new Date(group.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {members?.length || 0} members
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Log Session Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Log New Session
                </CardTitle>
                <CardDescription>
                  Record a new game session for your group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LogSessionForm
                  groupId={params.id}
                  games={games || []}
                  members={members || []}
                />
              </CardContent>
            </Card>
          </div>

          {/* Group Info Sidebar */}
          <div className="space-y-6">
            {/* Members Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {members?.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">
                          {member.users?.full_name ||
                            member.users?.email ||
                            "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.role === "admin" ? "Admin" : "Member"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sessions?.length ? (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">
                            {session.games?.name || "Unknown Game"}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {new Date(session.played_at).toLocaleDateString()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {session.game_session_players?.length || 0} players
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No sessions yet. Log your first game!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
