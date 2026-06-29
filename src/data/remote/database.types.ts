export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      campaign_teams: {
        Row: {
          description_en: string | null
          description_es: string | null
          description_pt: string | null
          difficulty: number
          finish: string
          host_country: string
          id: number
          team: string
          year: number
        }
        Insert: {
          description_en?: string | null
          description_es?: string | null
          description_pt?: string | null
          difficulty: number
          finish: string
          host_country: string
          id?: never
          team: string
          year: number
        }
        Update: {
          description_en?: string | null
          description_es?: string | null
          description_pt?: string | null
          difficulty?: number
          finish?: string
          host_country?: string
          id?: never
          team?: string
          year?: number
        }
        Relationships: []
      }
      mp_engine_state: {
        Row: {
          engine_state: Json
          room_id: string
          updated_at: string
        }
        Insert: {
          engine_state: Json
          room_id: string
          updated_at?: string
        }
        Update: {
          engine_state?: Json
          room_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_engine_state_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "mp_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_player_state: {
        Row: {
          id: string
          pending_commit: Json | null
          player_index: number
          private_view: Json | null
          room_id: string
          uid: string
          updated_at: string
        }
        Insert: {
          id?: string
          pending_commit?: Json | null
          player_index: number
          private_view?: Json | null
          room_id: string
          uid: string
          updated_at?: string
        }
        Update: {
          id?: string
          pending_commit?: Json | null
          player_index?: number
          private_view?: Json | null
          room_id?: string
          uid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_player_state_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "mp_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_rooms: {
        Row: {
          code: string
          created_at: string
          id: string
          plan_deadline: string | null
          player0_uid: string
          player1_uid: string | null
          public_state: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          plan_deadline?: string | null
          player0_uid: string
          player1_uid?: string | null
          public_state?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          plan_deadline?: string | null
          player0_uid?: string
          player1_uid?: string | null
          public_state?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_ratings: {
        Row: {
          attack: number
          base_overall: number
          defense: number
          era_boost: number | null
          id: number
          overall: number
          player: string
          player_id: string | null
          podium_finish: string | null
          position_code: string | null
          rating_source: string | null
          season: number
          team: string
        }
        Insert: {
          attack: number
          base_overall: number
          defense: number
          era_boost?: number | null
          id?: never
          overall: number
          player: string
          player_id?: string | null
          podium_finish?: string | null
          position_code?: string | null
          rating_source?: string | null
          season: number
          team: string
        }
        Update: {
          attack?: number
          base_overall?: number
          defense?: number
          era_boost?: number | null
          id?: never
          overall?: number
          player?: string
          player_id?: string | null
          podium_finish?: string | null
          position_code?: string | null
          rating_source?: string | null
          season?: number
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_ratings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
        ]
      }
      players: {
        Row: {
          family_name: string
          given_name: string
          player_id: string
        }
        Insert: {
          family_name: string
          given_name: string
          player_id: string
        }
        Update: {
          family_name?: string
          given_name?: string
          player_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          champions_boxes_since_legendary: number
          created_at: string
          favorite_team: string | null
          games_played: number
          games_won: number
          level: number
          prestige: number
          user_id: string
          username: string
          welcome_done: boolean
          xp: number
        }
        Insert: {
          champions_boxes_since_legendary?: number
          created_at?: string
          favorite_team?: string | null
          games_played?: number
          games_won?: number
          level?: number
          prestige?: number
          user_id: string
          username: string
          welcome_done?: boolean
          xp?: number
        }
        Update: {
          champions_boxes_since_legendary?: number
          created_at?: string
          favorite_team?: string | null
          games_played?: number
          games_won?: number
          level?: number
          prestige?: number
          user_id?: string
          username?: string
          welcome_done?: boolean
          xp?: number
        }
        Relationships: []
      }
      squad_members: {
        Row: {
          id: number
          player_id: string
          position_code: string
          position_name: string
          shirt_number: number | null
          team_id: string
          tournament_id: string
        }
        Insert: {
          id?: never
          player_id: string
          position_code: string
          position_name: string
          shirt_number?: number | null
          team_id: string
          tournament_id: string
        }
        Update: {
          id?: never
          player_id?: string
          position_code?: string
          position_name?: string
          shirt_number?: number | null
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "squad_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "squad_members_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["tournament_id"]
          },
        ]
      }
      teams: {
        Row: {
          team_code: string
          team_id: string
          team_name: string
        }
        Insert: {
          team_code: string
          team_id: string
          team_name: string
        }
        Update: {
          team_code?: string
          team_id?: string
          team_name?: string
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          is_womens: boolean
          tournament_id: string
          tournament_name: string
          year: number
        }
        Insert: {
          is_womens?: boolean
          tournament_id: string
          tournament_name: string
          year: number
        }
        Update: {
          is_womens?: boolean
          tournament_id?: string
          tournament_name?: string
          year?: number
        }
        Relationships: []
      }
      user_boxes: {
        Row: {
          created_at: string
          id: number
          opened: boolean
          opened_at: string | null
          source: string
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          opened?: boolean
          opened_at?: string | null
          source: string
          tier: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          opened?: boolean
          opened_at?: string | null
          source?: string
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      user_cards: {
        Row: {
          card_id: number
          count: number
          first_acquired_at: string
          user_id: string
        }
        Insert: {
          card_id: number
          count?: number
          first_acquired_at?: string
          user_id: string
        }
        Update: {
          card_id?: number
          count?: number
          first_acquired_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "player_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_xp: { Args: { p_amount: number }; Returns: Json }
      open_box: {
        Args: { p_box_id: number; p_card_ids: number[] }
        Returns: undefined
      }
      prestige_account: {
        Args: never
        Returns: {
          champions_boxes_since_legendary: number
          created_at: string
          favorite_team: string | null
          games_played: number
          games_won: number
          level: number
          prestige: number
          user_id: string
          username: string
          welcome_done: boolean
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_match: { Args: { p_won: boolean }; Returns: undefined }
      register_account: {
        Args: { p_username: string }
        Returns: {
          champions_boxes_since_legendary: number
          created_at: string
          favorite_team: string | null
          games_played: number
          games_won: number
          level: number
          prestige: number
          user_id: string
          username: string
          welcome_done: boolean
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      username_available: { Args: { p_username: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

