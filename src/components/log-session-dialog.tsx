"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { logSessionAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

interface LogSessionDialogProps {
  groupId: string;
  games: Array<{ id: string; name: string }>;
  members: Array<{
    user_id: string;
    users: {
      username?: string;
      full_name?: string;
      email?: string;
    } | null;
  }>;
}

interface PlayerData {
  user_id: string;
  selected: boolean;
  team: string;
  role: string;
  outcome: string;
  score: string;
}

export function LogSessionDialog({
  groupId,
  games,
  members,
}: LogSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<Record<string, PlayerData>>(
    members.reduce(
      (acc, member) => {
        acc[member.user_id] = {
          user_id: member.user_id,
          selected: false,
          team: "",
          role: "",
          outcome: "",
          score: "",
        };
        return acc;
      },
      {} as Record<string, PlayerData>,
    ),
  );

  const updatePlayer = (
    userId: string,
    field: keyof PlayerData,
    value: string | boolean,
  ) => {
    setPlayers((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (formData: FormData) => {
    // Add selected players data to form
    const selectedPlayers = Object.values(players).filter((p) => p.selected);
    formData.append("players_data", JSON.stringify(selectedPlayers));

    await logSessionAction(formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Log Session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Game Session</DialogTitle>
          <DialogDescription>
            Record a new game session for your group.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-6">
          <input type="hidden" name="group_id" value={groupId} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="game_id">Game</Label>
              <Select name="game_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a game" />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="played_at">Date & Time</Label>
              <Input
                type="datetime-local"
                name="played_at"
                defaultValue={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>

          <div>
            <Label>Players & Results</Label>
            <div className="space-y-3 mt-2 max-h-60 overflow-y-auto">
              {members.map((member) => {
                const playerData = players[member.user_id];
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-4 p-3 border rounded-lg"
                  >
                    <Checkbox
                      checked={playerData.selected}
                      onCheckedChange={(checked) =>
                        updatePlayer(
                          member.user_id,
                          "selected",
                          checked as boolean,
                        )
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {member.users?.full_name ||
                          member.users?.username ||
                          "Unknown User"}
                      </div>
                    </div>
                    {playerData.selected && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Team"
                          value={playerData.team}
                          onChange={(e) =>
                            updatePlayer(member.user_id, "team", e.target.value)
                          }
                          className="w-20"
                        />
                        <Input
                          placeholder="Role"
                          value={playerData.role}
                          onChange={(e) =>
                            updatePlayer(member.user_id, "role", e.target.value)
                          }
                          className="w-24"
                        />
                        <Select
                          value={playerData.outcome}
                          onValueChange={(value) =>
                            updatePlayer(member.user_id, "outcome", value)
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue placeholder="Result" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="win">Win</SelectItem>
                            <SelectItem value="loss">Loss</SelectItem>
                            <SelectItem value="draw">Draw</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Score"
                          type="number"
                          value={playerData.score}
                          onChange={(e) =>
                            updatePlayer(
                              member.user_id,
                              "score",
                              e.target.value,
                            )
                          }
                          className="w-20"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              name="notes"
              placeholder="Any additional notes about this session..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton>Log Session</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
