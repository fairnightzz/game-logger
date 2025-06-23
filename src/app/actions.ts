"use server";

import { encodedRedirect } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../supabase/server";
import { revalidatePath } from "next/cache";

export const signInWithGoogleAction = async () => {
  const supabase = await createClient();
  const origin = headers().get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect(data.url);
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

export const createGroupAction = async (formData: FormData) => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return encodedRedirect(
      "error",
      "/dashboard",
      "You must be logged in to create a group",
    );
  }

  const groupName = formData.get("group_name")?.toString();

  if (!groupName) {
    return encodedRedirect("error", "/dashboard", "Group name is required");
  }

  let groupId: string;

  try {
    // Check if user exists in public.users table
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingUser) {
      return encodedRedirect(
        "error",
        "/dashboard",
        "User profile not found. Please try signing out and back in.",
      );
    }

    // Generate unique join code and invite token
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const inviteToken = crypto.randomUUID();

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from("game_groups")
      .insert({
        name: groupName,
        join_code: joinCode,
        invite_token: inviteToken,
        created_by: user.id,
      })
      .select()
      .single();

    if (groupError || !group) {
      console.error("Group creation error:", groupError);
      return encodedRedirect("error", "/dashboard", "Failed to create group");
    }

    // Add creator as admin member
    const { error: memberError } = await supabase.from("group_members").insert({
      user_id: user.id,
      group_id: group.id,
      role: "admin",
    });

    if (memberError) {
      console.error("Member creation error:", memberError);
      return encodedRedirect(
        "error",
        "/dashboard",
        "Failed to add you as group admin",
      );
    }

    groupId = group.id;
  } catch (error) {
    console.error("Error creating group:", error);
    return encodedRedirect("error", "/dashboard", "Failed to create group");
  }

  // Redirect outside of try-catch block
  revalidatePath("/dashboard");
  redirect(`/groups/${groupId}`);
};

export const logSessionAction = async (formData: FormData) => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return encodedRedirect(
      "error",
      "/dashboard",
      "You must be logged in to log a session",
    );
  }

  const groupId = formData.get("group_id")?.toString();
  const gameId = formData.get("game_id")?.toString();
  const playedAt = formData.get("played_at")?.toString();
  const notes = formData.get("notes")?.toString() || null;
  const playersData = formData.get("players_data")?.toString();

  if (!groupId || !gameId || !playedAt) {
    return encodedRedirect(
      "error",
      `/groups/${groupId}`,
      "Missing required fields",
    );
  }

  try {
    // Verify user is a member of the group
    const { data: membership } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return encodedRedirect(
        "error",
        "/dashboard",
        "You are not a member of this group",
      );
    }

    // Create the game session
    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .insert({
        group_id: groupId,
        game_id: gameId,
        played_at: playedAt,
        notes: notes,
        created_by: user.id,
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error("Session creation error:", sessionError);
      return encodedRedirect(
        "error",
        `/groups/${groupId}`,
        "Failed to create session",
      );
    }

    // Parse and insert player data if provided
    if (playersData) {
      try {
        const players = JSON.parse(playersData);

        if (Array.isArray(players) && players.length > 0) {
          const playerInserts = players.map((player: any) => ({
            session_id: session.id,
            user_id: player.user_id,
            team: player.team || null,
            role: player.role || null,
            outcome: player.outcome || null,
            score: player.score ? parseInt(player.score) : null,
          }));

          const { error: playersError } = await supabase
            .from("game_session_players")
            .insert(playerInserts);

          if (playersError) {
            console.error("Players insertion error:", playersError);
            // Don't fail the whole operation, just log the error
          }
        }
      } catch (parseError) {
        console.error("Error parsing players data:", parseError);
      }
    }
  } catch (error) {
    console.error("Error logging session:", error);
    return encodedRedirect(
      "error",
      `/groups/${groupId}`,
      "Failed to log session",
    );
  }

  // Redirect outside of try-catch block
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
};

export const joinGroupAction = async (formData: FormData) => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return encodedRedirect(
      "error",
      "/dashboard",
      "You must be logged in to join a group",
    );
  }

  const joinCode = formData.get("join_code")?.toString()?.toUpperCase();

  if (!joinCode) {
    return encodedRedirect("error", "/dashboard", "Join code is required");
  }

  let groupId: string;

  try {
    // Check if user exists in public.users table
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingUser) {
      return encodedRedirect(
        "error",
        "/dashboard",
        "User profile not found. Please try signing out and back in.",
      );
    }

    // Find the group by join code
    const { data: group, error: groupError } = await supabase
      .from("game_groups")
      .select("id")
      .eq("join_code", joinCode)
      .single();

    if (groupError || !group) {
      return encodedRedirect(
        "error",
        "/dashboard",
        "Invalid join code. Please check and try again.",
      );
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .single();

    if (existingMembership) {
      return encodedRedirect(
        "error",
        "/dashboard",
        "You are already a member of this group",
      );
    }

    // Add user as member
    const { error: memberError } = await supabase.from("group_members").insert({
      user_id: user.id,
      group_id: group.id,
      role: "member",
    });

    if (memberError) {
      console.error("Member creation error:", memberError);
      return encodedRedirect(
        "error",
        "/dashboard",
        "Failed to join group. Please try again.",
      );
    }

    groupId = group.id;
  } catch (error) {
    console.error("Error joining group:", error);
    return encodedRedirect("error", "/dashboard", "Failed to join group");
  }

  // Redirect outside of try-catch block
  revalidatePath("/dashboard");
  redirect(`/groups/${groupId}`);
};
