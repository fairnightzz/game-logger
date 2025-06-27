import DashboardNavbar from "@/components/dashboard-navbar";
import { Plus, Users, Calendar, Trophy, UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGroupAction, joinGroupAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get user's groups with member and session counts
  const { data: userGroups } = await supabase
    .from("group_members")
    .select(
      `
      *,
      game_groups(
        id,
        name,
        created_at,
        join_code,
        invite_token
      )
    `,
    )
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  // Get member counts for each group
  const groupIds =
    userGroups?.map((ug) => ug.game_groups?.id).filter(Boolean) || [];
  const { data: memberCounts } = await supabase
    .from("group_members")
    .select("group_id")
    .in("group_id", groupIds);

  // Get session counts for each group
  const { data: sessionCounts } = await supabase
    .from("game_sessions")
    .select("group_id")
    .in("group_id", groupIds);

  // Create count maps
  const memberCountMap =
    memberCounts?.reduce(
      (acc, member) => {
        acc[member.group_id] = (acc[member.group_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ) || {};

  const sessionCountMap =
    sessionCounts?.reduce(
      (acc, session) => {
        acc[session.group_id] = (acc[session.group_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ) || {};

  // Get recent sessions across all groups
  const { data: recentSessions } = await supabase
    .from("game_sessions")
    .select(
      `
      *,
      games(name),
      game_groups(name),
      users(username, full_name),
      game_session_players(
        *,
        users(username, full_name)
      )
    `,
    )
    .in(
      "group_id",
      userGroups?.map((ug) => ug.game_groups?.id).filter(Boolean) || [],
    )
    .order("played_at", { ascending: false })
    .limit(5);

  return (
    <>
      <DashboardNavbar />
      <main className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">My Groups</h1>
              <p className="text-muted-foreground">
                Manage your game groups and track sessions
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Group</DialogTitle>
                    <DialogDescription>
                      Create a new game group to start tracking sessions with
                      your friends.
                    </DialogDescription>
                  </DialogHeader>
                  <form action={createGroupAction} className="space-y-4">
                    <div>
                      <Label htmlFor="group_name">Group Name</Label>
                      <Input
                        id="group_name"
                        name="group_name"
                        placeholder="Enter group name"
                        required
                      />
                    </div>
                    <DialogFooter>
                      <SubmitButton>Create Group</SubmitButton>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Join Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Join Group</DialogTitle>
                    <DialogDescription>
                      Enter a join code or invite link to join an existing
                      group.
                    </DialogDescription>
                  </DialogHeader>
                  <form action={joinGroupAction} className="space-y-4">
                    <div>
                      <Label htmlFor="join_code">Join Code</Label>
                      <Input
                        id="join_code"
                        name="join_code"
                        placeholder="Enter 6-character join code"
                        maxLength={6}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="invite_token">Invite Token</Label>
                      <Input
                        id="invite_token"
                        name="invite_token"
                        placeholder="Enter invite token"
                        required
                      />
                    </div>
                    <DialogFooter>
                      <SubmitButton>Join Group</SubmitButton>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Groups Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {userGroups?.map((userGroup) => {
              const group = userGroup.game_groups;
              if (!group) return null;

              return (
                <Link key={group.id} href={`/groups/${group.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {group.name}
                          </CardTitle>
                          <CardDescription>
                            Created{" "}
                            {new Date(group.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            userGroup.role === "admin" ? "default" : "secondary"
                          }
                        >
                          {userGroup.role}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{memberCountMap[group.id] || 0} Members</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{sessionCountMap[group.id] || 0} Sessions</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}

            {/* Empty state */}
            {(!userGroups || userGroups.length === 0) && (
              <Card className="col-span-full text-center py-12">
                <CardContent>
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Groups Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first group to start tracking game sessions with
                    friends.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Your First Group
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Group</DialogTitle>
                          <DialogDescription>
                            Create a new game group to start tracking sessions
                            with your friends.
                          </DialogDescription>
                        </DialogHeader>
                        <form action={createGroupAction} className="space-y-4">
                          <div>
                            <Label htmlFor="group_name">Group Name</Label>
                            <Input
                              id="group_name"
                              name="group_name"
                              placeholder="Enter group name"
                              required
                            />
                          </div>
                          <DialogFooter>
                            <SubmitButton>Create Group</SubmitButton>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Join Group
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Join Group</DialogTitle>
                          <DialogDescription>
                            Enter a join code or invite link to join an existing
                            group.
                          </DialogDescription>
                        </DialogHeader>
                        <form action={joinGroupAction} className="space-y-4">
                          <div>
                            <Label htmlFor="join_code">Join Code</Label>
                            <Input
                              id="join_code"
                              name="join_code"
                              placeholder="Enter 6-character join code"
                              maxLength={6}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="invite_token">Invite Token</Label>
                            <Input
                              id="invite_token"
                              name="invite_token"
                              placeholder="Enter invite token"
                              required
                            />
                          </div>
                          <DialogFooter>
                            <SubmitButton>Join Group</SubmitButton>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Sessions */}
          {recentSessions && recentSessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Recent Sessions
                </CardTitle>
                <CardDescription>
                  Your latest game sessions across all groups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{session.games?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {session.game_groups?.name} •{" "}
                          {new Date(session.played_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {session.game_session_players?.length || 0} players
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
