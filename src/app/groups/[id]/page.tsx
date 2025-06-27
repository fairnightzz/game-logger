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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Calendar,
  Trophy,
  Settings,
  Users,
  Share2,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import { LogSessionForm } from "@/components/log-session-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";
import { ShareDialog } from "@/components/share-dialog";
import { GameSessionPlayer, GameSession, GroupMember } from "@/types/supabase";

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

  // Fetch sessions with detailed player information
  const { data: sessions } = await supabase
    .from("game_sessions")
    .select(
      `
      *,
      games (
        name
      ),
      users:created_by (
        full_name,
        email
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
    .order("played_at", { ascending: false });

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="w-full">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-bold">{group.name}</h1>
                <p className="text-muted-foreground">
                  {members?.length || 0} members • Created{" "}
                  {new Date(group.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Log Session
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Log New Session</DialogTitle>
                    <DialogDescription>
                      Record a new game session for your group
                    </DialogDescription>
                  </DialogHeader>
                  <LogSessionForm
                    groupId={params.id}
                    games={games || []}
                    members={members || []}
                  />
                </DialogContent>
              </Dialog>
              <ShareDialog group={group} />
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="sessions" className="space-y-6">
            <TabsList>
              <TabsTrigger value="sessions">
                <Calendar className="w-4 h-4 mr-2" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="stats">
                <Trophy className="w-4 h-4 mr-2" />
                Stats
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="space-y-6">
              <div className="space-y-4">
                {sessions?.length ? (
                  sessions.map((session) => (
                    <Card key={session.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {session.games?.name || "Unknown Game"}
                            </CardTitle>
                            <CardDescription>
                              {new Date(session.played_at).toLocaleDateString()}{" "}
                              • Logged by{" "}
                              {session.users?.full_name ||
                                session.users?.email ||
                                "Unknown"}
                            </CardDescription>
                          </div>
                          <Badge variant="outline">
                            {session.game_session_players?.length || 0} players
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {["win", "loss", "draw"].map((outcome) => {
                            const players =
                              session.game_session_players?.filter(
                                (p: GameSessionPlayer) => p.outcome === outcome,
                              ) || [];
                            if (!players.length) return null;

                            return (
                              <div key={outcome}>
                                <h4 className="font-medium mb-2 capitalize">
                                  {outcome}
                                </h4>
                                <div className="space-y-1">
                                  {players.map((player: GameSessionPlayer, idx: number) => (
                                    <div key={idx} className="text-sm">
                                      {player.users?.full_name ||
                                        player.users?.email ||
                                        "Unknown"}
                                      {player.role && (
                                        <span className="text-muted-foreground">
                                          {" "}
                                          ({player.role})
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {session.notes && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                              {session.notes}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No Sessions Yet
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Start tracking your game sessions with this group.
                      </p>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Log Your First Session
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Log New Session</DialogTitle>
                            <DialogDescription>
                              Record a new game session for your group
                            </DialogDescription>
                          </DialogHeader>
                          <LogSessionForm
                            groupId={params.id}
                            games={games || []}
                            members={members || []}
                          />
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Win Rates</CardTitle>
                    <CardDescription>Win percentage by player</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {members?.map((member, idx) => {
                        // Calculate win rate for this member
                        const memberSessions =
                          sessions?.filter((session) =>
                            session.game_session_players?.some(
                              (p: GameSessionPlayer) => p.user_id === member.user_id,
                            ),
                          )?.length || 0;
                        const wins =
                          sessions?.filter((session) =>
                            session.game_session_players?.some(
                              (p: GameSessionPlayer) =>
                                p.user_id === member.user_id &&
                                p.outcome === "win",
                            ),
                          )?.length || 0;
                        const winRate =
                          memberSessions > 0
                            ? Math.round((wins / memberSessions) * 100)
                            : 0;

                        return (
                          <div
                            key={member.id}
                            className="flex justify-between items-center"
                          >
                            <span className="text-sm">
                              {member.users?.full_name ||
                                member.users?.email ||
                                "Unknown"}
                            </span>
                            <Badge variant="outline">{winRate}%</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Games Played</CardTitle>
                    <CardDescription>Total sessions per player</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {members?.map((member) => {
                        const memberSessions =
                          sessions?.filter((session) =>
                            session.game_session_players?.some(
                              (p: GameSessionPlayer) => p.user_id === member.user_id,
                            ),
                          )?.length || 0;

                        return (
                          <div
                            key={member.id}
                            className="flex justify-between items-center"
                          >
                            <span className="text-sm">
                              {member.users?.full_name ||
                                member.users?.email ||
                                "Unknown"}
                            </span>
                            <Badge variant="outline">{memberSessions}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Most Played Games</CardTitle>
                    <CardDescription>
                      Popular games in your group
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const gameStats: Record<string, number> =
                          sessions?.reduce(
                            (acc: Record<string, number>, session) => {
                              const gameName =
                                session.games?.name || "Unknown Game";
                              acc[gameName] = (acc[gameName] || 0) + 1;
                              return acc;
                            },
                            {},
                          ) || {};

                        return Object.entries(gameStats)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 3)
                          .map(([game, count]) => (
                            <div
                              key={game}
                              className="flex justify-between items-center"
                            >
                              <span className="text-sm">{game}</span>
                              <Badge variant="outline">{count} sessions</Badge>
                            </div>
                          ));
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Group Members</CardTitle>
                  <CardDescription>
                    Manage who can access this group
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {members?.map((member) => (
                      <div
                        key={member.id}
                        className="flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">
                            {member.users?.full_name || "Unknown"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.users?.email || "No email"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              member.role === "admin" ? "default" : "secondary"
                            }
                          >
                            {member.role}
                          </Badge>
                          {member.role !== "admin" &&
                            membership?.role === "admin" && (
                              <Button variant="outline" size="sm">
                                Remove
                              </Button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
