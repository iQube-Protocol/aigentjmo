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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      conversation_summaries: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          summary_text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          summary_text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          summary_text?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_batches: {
        Row: {
          batch_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          emails_failed: number | null
          emails_sent: number | null
          id: string
          started_at: string | null
          status: string
          total_emails: number
          updated_at: string | null
        }
        Insert: {
          batch_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          emails_failed?: number | null
          emails_sent?: number | null
          id?: string
          started_at?: string | null
          status?: string
          total_emails?: number
          updated_at?: string | null
        }
        Update: {
          batch_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          emails_failed?: number | null
          emails_sent?: number | null
          id?: string
          started_at?: string | null
          status?: string
          total_emails?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      invited_users: {
        Row: {
          batch_id: string | null
          completed_at: string | null
          created_at: string | null
          email: string
          email_sent: boolean | null
          email_sent_at: string | null
          expires_at: string | null
          id: string
          invitation_code: string | null
          invited_at: string | null
          invited_by: string | null
          persona_data: Json | null
          persona_type: string | null
          send_attempts: number | null
          signup_completed: boolean | null
          used_at: string | null
        }
        Insert: {
          batch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          email: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          invitation_code?: string | null
          invited_at?: string | null
          invited_by?: string | null
          persona_data?: Json | null
          persona_type?: string | null
          send_attempts?: number | null
          signup_completed?: boolean | null
          used_at?: string | null
        }
        Update: {
          batch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          email?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          invitation_code?: string | null
          invited_at?: string | null
          invited_by?: string | null
          persona_data?: Json | null
          persona_type?: string | null
          send_attempts?: number | null
          signup_completed?: boolean | null
          used_at?: string | null
        }
        Relationships: []
      }
      knyt_personas: {
        Row: {
          created_at: string | null
          display_name: string | null
          Email: string | null
          "First-Name": string | null
          id: string
          "Last-Name": string | null
          profile_image_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          Email?: string | null
          "First-Name"?: string | null
          id?: string
          "Last-Name"?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          Email?: string | null
          "First-Name"?: string | null
          id?: string
          "Last-Name"?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qripto_personas: {
        Row: {
          created_at: string | null
          display_name: string | null
          Email: string | null
          "First-Name": string | null
          id: string
          "Last-Name": string | null
          profile_image_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          Email?: string | null
          "First-Name"?: string | null
          id?: string
          "Last-Name"?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          Email?: string | null
          "First-Name"?: string | null
          id?: string
          "Last-Name"?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reit_kb_approval_queue: {
        Row: {
          approval_status: string
          change_type: string
          created_at: string | null
          id: string
          local_record_id: string
          original_data: Json | null
          proposed_data: Json
          qubebase_doc_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          submitted_at: string
          submitted_by: string
          updated_at: string | null
        }
        Insert: {
          approval_status?: string
          change_type: string
          created_at?: string | null
          id?: string
          local_record_id: string
          original_data?: Json | null
          proposed_data: Json
          qubebase_doc_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          submitted_at?: string
          submitted_by: string
          updated_at?: string | null
        }
        Update: {
          approval_status?: string
          change_type?: string
          created_at?: string | null
          id?: string
          local_record_id?: string
          original_data?: Json | null
          proposed_data?: Json
          qubebase_doc_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          submitted_at?: string
          submitted_by?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reit_kb_approval_queue_local_record_id_fkey"
            columns: ["local_record_id"]
            isOneToOne: false
            referencedRelation: "reit_knowledge_items"
            referencedColumns: ["id"]
          },
        ]
      }
      reit_knowledge_items: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          category: string
          connections: string[] | null
          content: string
          created_at: string | null
          created_by: string | null
          cross_tags: string[] | null
          id: string
          is_active: boolean | null
          is_seed_record: boolean | null
          keywords: string[] | null
          last_synced_at: string | null
          pending_approval_id: string | null
          qubebase_doc_id: string | null
          reit_id: string
          section: string
          source: string
          timestamp: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category: string
          connections?: string[] | null
          content: string
          created_at?: string | null
          created_by?: string | null
          cross_tags?: string[] | null
          id?: string
          is_active?: boolean | null
          is_seed_record?: boolean | null
          keywords?: string[] | null
          last_synced_at?: string | null
          pending_approval_id?: string | null
          qubebase_doc_id?: string | null
          reit_id: string
          section: string
          source: string
          timestamp?: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          connections?: string[] | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          cross_tags?: string[] | null
          id?: string
          is_active?: boolean | null
          is_seed_record?: boolean | null
          keywords?: string[] | null
          last_synced_at?: string | null
          pending_approval_id?: string | null
          qubebase_doc_id?: string | null
          reit_id?: string
          section?: string
          source?: string
          timestamp?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reit_knowledge_items_pending_approval_id_fkey"
            columns: ["pending_approval_id"]
            isOneToOne: false
            referencedRelation: "reit_kb_approval_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      user_connections: {
        Row: {
          connection_data: Json | null
          created_at: string | null
          id: string
          service: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          connection_data?: Json | null
          created_at?: string | null
          id?: string
          service: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          connection_data?: Json | null
          created_at?: string | null
          id?: string
          service?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          created_at: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          query: string | null
          response: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          query?: string | null
          response?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          query?: string | null
          response?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_name_preferences: {
        Row: {
          created_at: string | null
          id: string
          linkedin_first_name: string | null
          linkedin_last_name: string | null
          name_source: string | null
          persona_type: string
          preferred_first_name: string | null
          preferred_last_name: string | null
          twitter_username: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          linkedin_first_name?: string | null
          linkedin_last_name?: string | null
          name_source?: string | null
          persona_type: string
          preferred_first_name?: string | null
          preferred_last_name?: string | null
          twitter_username?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          linkedin_first_name?: string | null
          linkedin_last_name?: string | null
          name_source?: string | null
          persona_type?: string
          preferred_first_name?: string | null
          preferred_last_name?: string | null
          twitter_username?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_direct_signups: { Args: never; Returns: number }
      extend_invitation_expiration: {
        Args: { email_list: string[]; extend_days: number }
        Returns: Json
      }
      get_expiring_invitations: {
        Args: { days_ahead?: number }
        Returns: {
          created_at: string
          days_until_expiry: number
          email: string
          expires_at: string
          id: string
          persona_type: string
        }[]
      }
      get_invitation_expiration_stats: {
        Args: never
        Returns: {
          expiring_soon_3_days: number
          expiring_soon_7_days: number
          expiring_today: number
          total_active: number
          total_expired: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin" | "uber_admin"
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
      app_role: ["admin", "moderator", "user", "super_admin", "uber_admin"],
    },
  },
} as const
