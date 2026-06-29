export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auth_telegram_used_init_data: {
        Row: {
          init_data_hash: string
          used_at: string
        }
        Insert: {
          init_data_hash: string
          used_at?: string
        }
        Update: {
          init_data_hash?: string
          used_at?: string
        }
        Relationships: []
      }
      event_wishes: {
        Row: {
          event_id: string
          wish_id: string
        }
        Insert: {
          event_id: string
          wish_id: string
        }
        Update: {
          event_id?: string
          wish_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_wishes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_wishes_wish_id_fkey"
            columns: ["wish_id"]
            isOneToOne: false
            referencedRelation: "wishes"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_date: string | null
          id: string
          is_archived: boolean
          is_recurring_yearly: boolean
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_date?: string | null
          id?: string
          is_archived?: boolean
          is_recurring_yearly?: boolean
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_date?: string | null
          id?: string
          is_archived?: boolean
          is_recurring_yearly?: boolean
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_events: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          payload: Json
          subject_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          payload?: Json
          subject_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          payload?: Json
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_events_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "wishes"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          is_premium: boolean
          language_code: string | null
          last_name: string | null
          photo_url: string | null
          telegram_id: number
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          first_name: string
          id: string
          is_premium?: boolean
          language_code?: string | null
          last_name?: string | null
          photo_url?: string | null
          telegram_id: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          is_premium?: boolean
          language_code?: string | null
          last_name?: string | null
          photo_url?: string | null
          telegram_id?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      user_list_members: {
        Row: {
          created_at: string
          list_id: string
          member_id: string
        }
        Insert: {
          created_at?: string
          list_id: string
          member_id: string
        }
        Update: {
          created_at?: string
          list_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "user_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_list_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wish_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          parent_id: string | null
          updated_at: string
          visible_to_owner_thread: boolean
          wish_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          visible_to_owner_thread?: boolean
          wish_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          visible_to_owner_thread?: boolean
          wish_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wish_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wish_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "wish_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wish_comments_wish_id_fkey"
            columns: ["wish_id"]
            isOneToOne: false
            referencedRelation: "wishes"
            referencedColumns: ["id"]
          },
        ]
      }
      wish_likes: {
        Row: {
          created_at: string
          user_id: string
          wish_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          wish_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          wish_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wish_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wish_likes_wish_id_fkey"
            columns: ["wish_id"]
            isOneToOne: false
            referencedRelation: "wishes"
            referencedColumns: ["id"]
          },
        ]
      }
      wish_slots: {
        Row: {
          booked_by: string
          cancelled_at: string | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["wish_slot_status"]
          wish_id: string
        }
        Insert: {
          booked_by: string
          cancelled_at?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["wish_slot_status"]
          wish_id: string
        }
        Update: {
          booked_by?: string
          cancelled_at?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["wish_slot_status"]
          wish_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wish_slots_booked_by_fkey"
            columns: ["booked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wish_slots_wish_id_fkey"
            columns: ["wish_id"]
            isOneToOne: false
            referencedRelation: "wishes"
            referencedColumns: ["id"]
          },
        ]
      }
      wish_visibility_lists: {
        Row: {
          list_id: string
          wish_id: string
        }
        Insert: {
          list_id: string
          wish_id: string
        }
        Update: {
          list_id?: string
          wish_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wish_visibility_lists_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "user_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wish_visibility_lists_wish_id_fkey"
            columns: ["wish_id"]
            isOneToOne: false
            referencedRelation: "wishes"
            referencedColumns: ["id"]
          },
        ]
      }
      wishes: {
        Row: {
          comments_count: number
          copy_lines: Json | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          is_archived: boolean
          is_collaborative: boolean
          likes_count: number
          link: string | null
          max_slots: number | null
          owner_id: string
          photo_storage_path: string | null
          price: number | null
          reposted_from_id: string | null
          reposts_count: number
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["wish_visibility"]
        }
        Insert: {
          comments_count?: number
          copy_lines?: Json | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_collaborative?: boolean
          likes_count?: number
          link?: string | null
          max_slots?: number | null
          owner_id: string
          photo_storage_path?: string | null
          price?: number | null
          reposted_from_id?: string | null
          reposts_count?: number
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["wish_visibility"]
        }
        Update: {
          comments_count?: number
          copy_lines?: Json | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_collaborative?: boolean
          likes_count?: number
          link?: string | null
          max_slots?: number | null
          owner_id?: string
          photo_storage_path?: string | null
          price?: number | null
          reposted_from_id?: string | null
          reposts_count?: number
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["wish_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "wishes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishes_reposted_from_id_fkey"
            columns: ["reposted_from_id"]
            isOneToOne: false
            referencedRelation: "wishes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_feed_event: {
        Args: { p_actor_id: string; p_payload: Json; p_subject_id: string }
        Returns: undefined
      }
      book_wish_slots: {
        Args: { p_count: number; p_wish_id: string }
        Returns: {
          booked_by: string
          cancelled_at: string | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["wish_slot_status"]
          wish_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "wish_slots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      can_view_wish: {
        Args: { p_viewer: string; p_wish_id: string }
        Returns: boolean
      }
      check_wish_comment_parent_visible: {
        Args: {
          p_parent_id: string
          p_user_id: string
          p_wish_owner_id: string
        }
        Returns: boolean
      }
      wish_slots_effective_cap: { Args: { p_wish_id: string }; Returns: number }
      wishes_copy_lines_is_valid: { Args: { lines: Json }; Returns: boolean }
    }
    Enums: {
      wish_slot_status: "active" | "cancelled"
      wish_visibility: "public" | "followers" | "lists"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      wish_slot_status: ["active", "cancelled"],
      wish_visibility: ["public", "followers", "lists"],
    },
  },
} as const
