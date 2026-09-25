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
      assessment_attempts: {
        Row: {
          athlete_id: string
          attempt_number: number
          avg_hr_bpm: number | null
          avg_pace_s_per_km: number | null
          created_at: string
          data: Json
          distance_m: number | null
          duration_s: number | null
          id: string
          limiting_factor: string | null
          load_kg: number | null
          max_hr_bpm: number | null
          measure_cm: number | null
          recorded_at: string
          reps: number | null
          result_id: string
          rpe: number | null
          side: string
          technique: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          attempt_number: number
          avg_hr_bpm?: number | null
          avg_pace_s_per_km?: number | null
          created_at?: string
          data?: Json
          distance_m?: number | null
          duration_s?: number | null
          id?: string
          limiting_factor?: string | null
          load_kg?: number | null
          max_hr_bpm?: number | null
          measure_cm?: number | null
          recorded_at?: string
          reps?: number | null
          result_id: string
          rpe?: number | null
          side?: string
          technique?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          attempt_number?: number
          avg_hr_bpm?: number | null
          avg_pace_s_per_km?: number | null
          created_at?: string
          data?: Json
          distance_m?: number | null
          duration_s?: number | null
          id?: string
          limiting_factor?: string | null
          load_kg?: number | null
          max_hr_bpm?: number | null
          measure_cm?: number | null
          recorded_at?: string
          reps?: number | null
          result_id?: string
          rpe?: number | null
          side?: string
          technique?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_result_id_athlete_id_fkey"
            columns: ["result_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id", "athlete_id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          athlete_id: string
          created_at: string
          data: Json
          id: string
          pain_location: string | null
          pain_note: string | null
          pain_reported: boolean
          protocol_version: string
          reason_code: string | null
          reason_note: string | null
          resolved_at: string | null
          session_id: string
          source: string
          source_ref: string | null
          started_at: string
          status: string
          test_key: string
          updated_at: string
          variant: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          data?: Json
          id?: string
          pain_location?: string | null
          pain_note?: string | null
          pain_reported?: boolean
          protocol_version: string
          reason_code?: string | null
          reason_note?: string | null
          resolved_at?: string | null
          session_id: string
          source?: string
          source_ref?: string | null
          started_at?: string
          status?: string
          test_key: string
          updated_at?: string
          variant?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          data?: Json
          id?: string
          pain_location?: string | null
          pain_note?: string | null
          pain_reported?: boolean
          protocol_version?: string
          reason_code?: string | null
          reason_note?: string | null
          resolved_at?: string | null
          session_id?: string
          source?: string
          source_ref?: string | null
          started_at?: string
          status?: string
          test_key?: string
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_session_id_athlete_id_fkey"
            columns: ["session_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id", "athlete_id"]
          },
          {
            foreignKeyName: "assessment_results_test_key_fkey"
            columns: ["test_key"]
            isOneToOne: false
            referencedRelation: "assessment_tests"
            referencedColumns: ["key"]
          },
        ]
      }
      assessment_sessions: {
        Row: {
          athlete_id: string
          completed_at: string | null
          created_at: string
          current_step: string | null
          current_test_key: string | null
          id: string
          kind: string
          purpose: string
          safety_acknowledged_at: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          current_test_key?: string | null
          id?: string
          kind: string
          purpose?: string
          safety_acknowledged_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          current_test_key?: string | null
          id?: string
          kind?: string
          purpose?: string
          safety_acknowledged_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sessions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_current_test_key_fkey"
            columns: ["current_test_key"]
            isOneToOne: false
            referencedRelation: "assessment_tests"
            referencedColumns: ["key"]
          },
        ]
      }
      assessment_tests: {
        Row: {
          created_at: string
          key: string
          name: string
          primary_attributes: string[]
          protocol_version: string
          required: boolean
          session_kind: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          key: string
          name: string
          primary_attributes: string[]
          protocol_version: string
          required?: boolean
          session_kind: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          key?: string
          name?: string
          primary_attributes?: string[]
          protocol_version?: string
          required?: boolean
          session_kind?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      athlete_equipment: {
        Row: {
          athlete_id: string
          created_at: string
          equipment_id: string
          id: string
          loads_kg: number[]
          note: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          equipment_id: string
          id?: string
          loads_kg?: number[]
          note?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          equipment_id?: string
          id?: string
          loads_kg?: number[]
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_equipment_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_settings: {
        Row: {
          athlete_id: string
          calibration_requested_at: string | null
          context_completed_at: string | null
          created_at: string
          data_sources: string[]
          environments: string[]
          onboarding_step: string | null
          spawn_completed_at: string | null
          spawn_started_at: string | null
          spawn_state: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          calibration_requested_at?: string | null
          context_completed_at?: string | null
          created_at?: string
          data_sources?: string[]
          environments?: string[]
          onboarding_step?: string | null
          spawn_completed_at?: string | null
          spawn_started_at?: string | null
          spawn_state?: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          calibration_requested_at?: string | null
          context_completed_at?: string | null
          created_at?: string
          data_sources?: string[]
          environments?: string[]
          onboarding_step?: string | null
          spawn_completed_at?: string | null
          spawn_started_at?: string | null
          spawn_state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_settings_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_windows: {
        Row: {
          athlete_id: string
          available: boolean
          created_at: string
          end_time: string | null
          id: string
          max_duration_min: number | null
          start_time: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          athlete_id: string
          available: boolean
          created_at?: string
          end_time?: string | null
          id?: string
          max_duration_min?: number | null
          start_time?: string | null
          updated_at?: string
          weekday: number
        }
        Update: {
          athlete_id?: string
          available?: boolean
          created_at?: string
          end_time?: string | null
          id?: string
          max_duration_min?: number | null
          start_time?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_windows_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      body_measurements: {
        Row: {
          athlete_id: string
          context: string
          created_at: string
          id: string
          kind: string
          measured_at: string
          source: string
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          athlete_id: string
          context?: string
          created_at?: string
          id?: string
          kind: string
          measured_at?: string
          source?: string
          unit: string
          updated_at?: string
          value: number
        }
        Update: {
          athlete_id?: string
          context?: string
          created_at?: string
          id?: string
          kind?: string
          measured_at?: string
          source?: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "body_measurements_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category: string
          created_at: string
          id: string
          key: string
          load_mode: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          key: string
          load_mode?: string
          name: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          key?: string
          load_mode?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      movement_flags: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          location: string | null
          note: string | null
          reported_at: string
          resolved_at: string | null
          result_id: string | null
          source: string
          status: string
          test_key: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          location?: string | null
          note?: string | null
          reported_at?: string
          resolved_at?: string | null
          result_id?: string | null
          source?: string
          status?: string
          test_key?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          location?: string | null
          note?: string | null
          reported_at?: string
          resolved_at?: string | null
          result_id?: string | null
          source?: string
          status?: string
          test_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "movement_flags_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movement_flags_result_id_athlete_id_fkey"
            columns: ["result_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id", "athlete_id"]
          },
          {
            foreignKeyName: "movement_flags_test_key_fkey"
            columns: ["test_key"]
            isOneToOne: false
            referencedRelation: "assessment_tests"
            referencedColumns: ["key"]
          },
        ]
      }
      performance_evidence: {
        Row: {
          assessment_result_id: string | null
          athlete_id: string
          created_at: string
          engine_version: string | null
          evidence_weight: number | null
          id: string
          occurred_at: string
          quality: number | null
          raw_payload: Json
          source_type: string
          test_key: string | null
        }
        Insert: {
          assessment_result_id?: string | null
          athlete_id: string
          created_at?: string
          engine_version?: string | null
          evidence_weight?: number | null
          id?: string
          occurred_at: string
          quality?: number | null
          raw_payload: Json
          source_type: string
          test_key?: string | null
        }
        Update: {
          assessment_result_id?: string | null
          athlete_id?: string
          created_at?: string
          engine_version?: string | null
          evidence_weight?: number | null
          id?: string
          occurred_at?: string
          quality?: number | null
          raw_payload?: Json
          source_type?: string
          test_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_evidence_assessment_result_id_athlete_id_fkey"
            columns: ["assessment_result_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id", "athlete_id"]
          },
          {
            foreignKeyName: "performance_evidence_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_evidence_test_key_fkey"
            columns: ["test_key"]
            isOneToOne: false
            referencedRelation: "assessment_tests"
            referencedColumns: ["key"]
          },
        ]
      }
      profiles: {
        Row: {
          biological_sex: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          height_cm: number | null
          id: string
          limitations_note: string | null
          preferred_units: string
          recent_inactivity: string | null
          sleep_time: string | null
          training_experience: string | null
          updated_at: string
          wake_time: string | null
        }
        Insert: {
          biological_sex?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          height_cm?: number | null
          id: string
          limitations_note?: string | null
          preferred_units?: string
          recent_inactivity?: string | null
          sleep_time?: string | null
          training_experience?: string | null
          updated_at?: string
          wake_time?: string | null
        }
        Update: {
          biological_sex?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          height_cm?: number | null
          id?: string
          limitations_note?: string | null
          preferred_units?: string
          recent_inactivity?: string | null
          sleep_time?: string | null
          training_experience?: string | null
          updated_at?: string
          wake_time?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dev_reset_spawn: { Args: { keep_context?: boolean }; Returns: undefined }
      spawn_state_rank: { Args: { state: string }; Returns: number }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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

