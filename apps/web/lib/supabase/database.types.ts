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
      athlete_path_configuration_items: {
        Row: {
          athlete_id: string
          configuration_id: string
          path_key: string
          priority: string
        }
        Insert: {
          athlete_id: string
          configuration_id: string
          path_key: string
          priority: string
        }
        Update: {
          athlete_id?: string
          configuration_id?: string
          path_key?: string
          priority?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_path_configuration_ite_configuration_id_athlete_id_fkey"
            columns: ["configuration_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_path_configurations"
            referencedColumns: ["id", "athlete_id"]
          },
          {
            foreignKeyName: "athlete_path_configuration_ite_configuration_id_athlete_id_fkey"
            columns: ["configuration_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_path_history"
            referencedColumns: ["configuration_id", "athlete_id"]
          },
          {
            foreignKeyName: "athlete_path_configuration_ite_configuration_id_athlete_id_fkey"
            columns: ["configuration_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "current_athlete_paths"
            referencedColumns: ["configuration_id", "athlete_id"]
          },
          {
            foreignKeyName: "athlete_path_configuration_items_path_key_fkey"
            columns: ["path_key"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["key"]
          },
        ]
      }
      athlete_path_configurations: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          revision: number
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          revision: number
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "athlete_path_configurations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      calculation_evidence: {
        Row: {
          calculation_id: string
          evidence_id: string
        }
        Insert: {
          calculation_id: string
          evidence_id: string
        }
        Update: {
          calculation_id?: string
          evidence_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculation_evidence_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "stat_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculation_evidence_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "performance_evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      engine_config: {
        Row: {
          created_at: string
          engine_version: string
          section: string
          value: Json
        }
        Insert: {
          created_at?: string
          engine_version: string
          section: string
          value: Json
        }
        Update: {
          created_at?: string
          engine_version?: string
          section?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "engine_config_engine_version_fkey"
            columns: ["engine_version"]
            isOneToOne: false
            referencedRelation: "engine_versions"
            referencedColumns: ["version"]
          },
        ]
      }
      engine_versions: {
        Row: {
          calibration_status: string
          config: Json
          config_hash: string
          registered_at: string
          version: string
        }
        Insert: {
          calibration_status: string
          config: Json
          config_hash: string
          registered_at?: string
          version: string
        }
        Update: {
          calibration_status?: string
          config?: Json
          config_hash?: string
          registered_at?: string
          version?: string
        }
        Relationships: []
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
      overall_snapshots: {
        Row: {
          athlete_id: string
          calculated_at: string
          calculation_id: string
          confidence: number
          current: number | null
          engine_version: string
          id: string
          participating: string[]
          status: string
          trace: Json
        }
        Insert: {
          athlete_id: string
          calculated_at?: string
          calculation_id: string
          confidence: number
          current?: number | null
          engine_version: string
          id?: string
          participating?: string[]
          status: string
          trace: Json
        }
        Update: {
          athlete_id?: string
          calculated_at?: string
          calculation_id?: string
          confidence?: number
          current?: number | null
          engine_version?: string
          id?: string
          participating?: string[]
          status?: string
          trace?: Json
        }
        Relationships: [
          {
            foreignKeyName: "overall_snapshots_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overall_snapshots_calculation_id_athlete_id_fkey"
            columns: ["calculation_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "stat_calculations"
            referencedColumns: ["id", "athlete_id"]
          },
          {
            foreignKeyName: "overall_snapshots_engine_version_fkey"
            columns: ["engine_version"]
            isOneToOne: false
            referencedRelation: "engine_versions"
            referencedColumns: ["version"]
          },
        ]
      }
      paths: {
        Row: {
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          key: string
          label: string
          sort_order: number
        }
        Update: {
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
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
      scoring_curves: {
        Row: {
          body_mass_mode: string | null
          calibration_status: string
          created_at: string
          curve_key: string
          definition: Json
          direction: string | null
          engine_version: string
          feature: string
          id: string
          kind: string
          test_key: string
        }
        Insert: {
          body_mass_mode?: string | null
          calibration_status: string
          created_at?: string
          curve_key: string
          definition: Json
          direction?: string | null
          engine_version: string
          feature: string
          id?: string
          kind: string
          test_key: string
        }
        Update: {
          body_mass_mode?: string | null
          calibration_status?: string
          created_at?: string
          curve_key?: string
          definition?: Json
          direction?: string | null
          engine_version?: string
          feature?: string
          id?: string
          kind?: string
          test_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "scoring_curves_engine_version_fkey"
            columns: ["engine_version"]
            isOneToOne: false
            referencedRelation: "engine_versions"
            referencedColumns: ["version"]
          },
          {
            foreignKeyName: "scoring_curves_test_key_fkey"
            columns: ["test_key"]
            isOneToOne: false
            referencedRelation: "assessment_tests"
            referencedColumns: ["key"]
          },
        ]
      }
      stat_calculations: {
        Row: {
          as_of: string
          athlete_id: string
          config_hash: string
          created_at: string
          engine_version: string
          gaps: Json
          id: string
          input_hash: string
          reason: string
        }
        Insert: {
          as_of: string
          athlete_id: string
          config_hash: string
          created_at?: string
          engine_version: string
          gaps?: Json
          id?: string
          input_hash: string
          reason: string
        }
        Update: {
          as_of?: string
          athlete_id?: string
          config_hash?: string
          created_at?: string
          engine_version?: string
          gaps?: Json
          id?: string
          input_hash?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "stat_calculations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stat_calculations_engine_version_fkey"
            columns: ["engine_version"]
            isOneToOne: false
            referencedRelation: "engine_versions"
            referencedColumns: ["version"]
          },
        ]
      }
      stat_snapshots: {
        Row: {
          athlete_id: string
          attribute: string
          calculated_at: string
          calculation_id: string
          confidence: number
          coverage: number
          current: number | null
          engine_version: string
          evidence_ids: string[]
          id: string
          provisional_peak: number | null
          status: string
          trace: Json
          verified_peak: number | null
          verified_peak_updated: boolean
        }
        Insert: {
          athlete_id: string
          attribute: string
          calculated_at?: string
          calculation_id: string
          confidence: number
          coverage: number
          current?: number | null
          engine_version: string
          evidence_ids?: string[]
          id?: string
          provisional_peak?: number | null
          status: string
          trace: Json
          verified_peak?: number | null
          verified_peak_updated?: boolean
        }
        Update: {
          athlete_id?: string
          attribute?: string
          calculated_at?: string
          calculation_id?: string
          confidence?: number
          coverage?: number
          current?: number | null
          engine_version?: string
          evidence_ids?: string[]
          id?: string
          provisional_peak?: number | null
          status?: string
          trace?: Json
          verified_peak?: number | null
          verified_peak_updated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "stat_snapshots_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stat_snapshots_calculation_id_athlete_id_fkey"
            columns: ["calculation_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "stat_calculations"
            referencedColumns: ["id", "athlete_id"]
          },
          {
            foreignKeyName: "stat_snapshots_engine_version_fkey"
            columns: ["engine_version"]
            isOneToOne: false
            referencedRelation: "engine_versions"
            referencedColumns: ["version"]
          },
        ]
      }
    }
    Views: {
      athlete_path_history: {
        Row: {
          athlete_id: string | null
          configuration_id: string | null
          paths: Json | null
          revision: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_path_configurations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      current_athlete_paths: {
        Row: {
          active_since: string | null
          athlete_id: string | null
          configuration_id: string | null
          path_key: string | null
          priority: string | null
          revision: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_path_configuration_items_path_key_fkey"
            columns: ["path_key"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "athlete_path_configurations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      dev_reset_spawn: { Args: { keep_context?: boolean }; Returns: undefined }
      engine_record_calculation: {
        Args: {
          p_athlete_id: string
          p_engine: Json
          p_reason: string
          p_result: Json
        }
        Returns: string
      }
      set_athlete_paths: {
        Args: { p_primary: string; p_secondary?: string[] }
        Returns: string
      }
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

