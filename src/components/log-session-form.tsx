"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/submit-button";
import { logSessionAction } from "@/app/actions";

interface LogSessionFormProps {
  groupId: string;
  games: any[];
  members: any[];
}

export function LogSessionForm({
  groupId,
  games,
  members,
}: LogSessionFormProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(
    new Set(),
  );
  const [playerData, setPlayerData] = useState<Record<string, any>>({});

  const handlePlayerToggle = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedPlayers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
      const newPlayerData = { ...playerData };
      delete newPlayerData[userId];
      setPlayerData(newPlayerData);
    }
    setSelectedPlayers(newSelected);
  };

  const handlePlayerDataChange = (
    userId: string,
    field: string,
    value: string,
  ) => {
    setPlayerData((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
        user_id: userId,
      },
    }));
  };

  const handleSubmit = async (formData: FormData) => {
    // Add selected players data to form
    const playersArray = Array.from(selectedPlayers).map((userId) => ({
      user_id: userId,
      ...playerData[userId],
    }));

    formData.append("players_data", JSON.stringify(playersArray));

    return logSessionAction(formData);
  };

  return (
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
        <div className="space-y-3 mt-2">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center gap-4 p-3 border rounded-lg"
            >
              <Checkbox
                checked={selectedPlayers.has(member.user_id)}
                onCheckedChange={(checked) =>
                  handlePlayerToggle(member.user_id, checked as boolean)
                }
              />
              <div className="flex-1">
                <div className="font-medium">{member.users?.full_name}</div>
              </div>
              {selectedPlayers.has(member.user_id) && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Team"
                    className="w-20"
                    value={playerData[member.user_id]?.team || ""}
                    onChange={(e) =>
                      handlePlayerDataChange(
                        member.user_id,
                        "team",
                        e.target.value,
                      )
                    }
                  />
                  <Input
                    placeholder="Role"
                    className="w-24"
                    value={playerData[member.user_id]?.role || ""}
                    onChange={(e) =>
                      handlePlayerDataChange(
                        member.user_id,
                        "role",
                        e.target.value,
                      )
                    }
                  />
                  <Select
                    value={playerData[member.user_id]?.outcome || ""}
                    onValueChange={(value) =>
                      handlePlayerDataChange(member.user_id, "outcome", value)
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
                    className="w-20"
                    value={playerData[member.user_id]?.score || ""}
                    onChange={(e) =>
                      handlePlayerDataChange(
                        member.user_id,
                        "score",
                        e.target.value,
                      )
                    }
                  />
                </div>
              )}
            </div>
          ))}
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
        <SubmitButton>Log Session</SubmitButton>
      </DialogFooter>
    </form>
  );
}
