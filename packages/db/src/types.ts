export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ai_runs: {
        Row: {
          audio_seconds: number | null;
          confidence: number | null;
          created_at: string;
          function_name: string;
          id: string;
          input_tokens: number | null;
          latency_ms: number;
          model: string;
          outcome: string;
          output_tokens: number | null;
          project_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          audio_seconds?: number | null;
          confidence?: number | null;
          created_at?: string;
          function_name: string;
          id?: string;
          input_tokens?: number | null;
          latency_ms: number;
          model: string;
          outcome: string;
          output_tokens?: number | null;
          project_id?: string | null;
        };
        Update: {
          audio_seconds?: number | null;
          confidence?: number | null;
          created_at?: string;
          function_name?: string;
          id?: string;
          input_tokens?: number | null;
          latency_ms?: number;
          model?: string;
          outcome?: string;
          output_tokens?: number | null;
          project_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_runs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      ape_codes_btp: {
        Row: {
          code_prefix: string;
          created_at: string;
          id: string;
          label: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          code_prefix: string;
          created_at?: string;
          id?: string;
          label: string;
          updated_at?: string;
        };
        Update: {
          code_prefix?: string;
          created_at?: string;
          id?: string;
          label?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          artisan_notes: string | null;
          chantier_id: string;
          created_at: string;
          id: string;
          reminder_sent_at: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_notes?: string | null;
          chantier_id: string;
          created_at?: string;
          id?: string;
          reminder_sent_at?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          updated_at?: string;
        };
        Update: {
          artisan_notes?: string | null;
          chantier_id?: string;
          created_at?: string;
          id?: string;
          reminder_sent_at?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_chantier_id_fkey";
            columns: ["chantier_id"];
            isOneToOne: false;
            referencedRelation: "chantiers";
            referencedColumns: ["id"];
          },
        ];
      };
      artisan_absences: {
        Row: {
          artisan_id: string;
          created_at: string;
          ends_on: string;
          id: string;
          label: string | null;
          starts_on: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          created_at?: string;
          ends_on: string;
          id?: string;
          label?: string | null;
          starts_on: string;
          updated_at?: string;
        };
        Update: {
          artisan_id?: string;
          created_at?: string;
          ends_on?: string;
          id?: string;
          label?: string | null;
          starts_on?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_absences_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
      };
      artisan_blocked_slots: {
        Row: {
          artisan_id: string;
          created_at: string;
          ends_at: string;
          id: string;
          label: string | null;
          starts_at: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          created_at?: string;
          ends_at: string;
          id?: string;
          label?: string | null;
          starts_at: string;
          updated_at?: string;
        };
        Update: {
          artisan_id?: string;
          created_at?: string;
          ends_at?: string;
          id?: string;
          label?: string | null;
          starts_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_blocked_slots_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
      };
      artisan_calendar_feeds: {
        Row: {
          artisan_id: string;
          created_at: string;
          id: string;
          last_read_at: string | null;
          token: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          created_at?: string;
          id?: string;
          last_read_at?: string | null;
          token: string;
          updated_at?: string;
        };
        Update: {
          artisan_id?: string;
          created_at?: string;
          id?: string;
          last_read_at?: string | null;
          token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_calendar_feeds_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: true;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
      };
      artisan_documents: {
        Row: {
          artisan_id: string;
          assureur: string | null;
          couverture: string | null;
          created_at: string;
          date_emission: string | null;
          date_fin: string | null;
          id: string;
          mime_type: string;
          numero: string | null;
          refusal_reason: string | null;
          size_bytes: number;
          status: Database["public"]["Enums"]["document_status"];
          storage_path: string;
          type: Database["public"]["Enums"]["document_type"];
          updated_at: string;
          verified_at: string | null;
          verified_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          assureur?: string | null;
          couverture?: string | null;
          created_at?: string;
          date_emission?: string | null;
          date_fin?: string | null;
          id?: string;
          mime_type: string;
          numero?: string | null;
          refusal_reason?: string | null;
          size_bytes: number;
          status?: Database["public"]["Enums"]["document_status"];
          storage_path: string;
          type: Database["public"]["Enums"]["document_type"];
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          artisan_id?: string;
          assureur?: string | null;
          couverture?: string | null;
          created_at?: string;
          date_emission?: string | null;
          date_fin?: string | null;
          id?: string;
          mime_type?: string;
          numero?: string | null;
          refusal_reason?: string | null;
          size_bytes?: number;
          status?: Database["public"]["Enums"]["document_status"];
          storage_path?: string;
          type?: Database["public"]["Enums"]["document_type"];
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_documents_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
      };
      artisan_hours: {
        Row: {
          artisan_id: string;
          created_at: string;
          end_time: string;
          id: string;
          start_time: string;
          updated_at: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          created_at?: string;
          end_time: string;
          id?: string;
          start_time: string;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          artisan_id?: string;
          created_at?: string;
          end_time?: string;
          id?: string;
          start_time?: string;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_hours_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
      };
      artisan_photos: {
        Row: {
          artisan_id: string;
          created_at: string;
          id: string;
          sort_order: number;
          storage_path: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          storage_path: string;
          updated_at?: string;
        };
        Update: {
          artisan_id?: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          storage_path?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_photos_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
      };
      artisan_reviews: {
        Row: {
          admin_id: string | null;
          artisan_id: string;
          created_at: string;
          decision: Database["public"]["Enums"]["review_decision"];
          id: string;
          message: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          admin_id?: string | null;
          artisan_id: string;
          created_at?: string;
          decision: Database["public"]["Enums"]["review_decision"];
          id?: string;
          message?: string | null;
          updated_at?: string;
        };
        Update: {
          admin_id?: string | null;
          artisan_id?: string;
          created_at?: string;
          decision?: Database["public"]["Enums"]["review_decision"];
          id?: string;
          message?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_reviews_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
      };
      artisan_scores: {
        Row: {
          artisan_id: string;
          communication: number;
          delays: number;
          global_score: number;
          quality: number;
          review_count: number;
          updated_at: string;
          value_for_money: number;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          communication: number;
          delays: number;
          global_score: number;
          quality: number;
          review_count: number;
          updated_at?: string;
          value_for_money: number;
        };
        Update: {
          artisan_id?: string;
          communication?: number;
          delays?: number;
          global_score?: number;
          quality?: number;
          review_count?: number;
          updated_at?: string;
          value_for_money?: number;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_scores_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: true;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
      };
      artisan_trades: {
        Row: {
          artisan_id: string;
          created_at: string;
          id: string;
          trade_code: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          created_at?: string;
          id?: string;
          trade_code: string;
          updated_at?: string;
        };
        Update: {
          artisan_id?: string;
          created_at?: string;
          id?: string;
          trade_code?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_trades_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artisan_trades_trade_code_fkey";
            columns: ["trade_code"];
            isOneToOne: false;
            referencedRelation: "trades";
            referencedColumns: ["code"];
          },
        ];
      };
      artisan_work_types: {
        Row: {
          artisan_id: string;
          created_at: string;
          id: string;
          updated_at: string;
          work_type_code: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          work_type_code: string;
        };
        Update: {
          artisan_id?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          work_type_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_work_types_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artisan_work_types_work_type_code_fkey";
            columns: ["work_type_code"];
            isOneToOne: false;
            referencedRelation: "work_types";
            referencedColumns: ["code"];
          },
        ];
      };
      artisan_zones: {
        Row: {
          artisan_id: string;
          code_insee: string;
          created_at: string;
          id: string;
          nom: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          code_insee: string;
          created_at?: string;
          id?: string;
          nom: string;
          updated_at?: string;
        };
        Update: {
          artisan_id?: string;
          code_insee?: string;
          created_at?: string;
          id?: string;
          nom?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_zones_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
      };
      artisans: {
        Row: {
          adresse_code_insee: string | null;
          adresse_code_postal: string | null;
          adresse_commune: string | null;
          adresse_ligne: string | null;
          ape_code: string | null;
          ape_eligible: boolean | null;
          assujetti_tva: boolean | null;
          available_from: string | null;
          base_code_insee: string | null;
          base_label: string | null;
          base_location: unknown;
          connect_charges_enabled: boolean;
          connect_details_submitted: boolean;
          connect_payouts_enabled: boolean;
          connect_updated_at: string | null;
          created_at: string;
          default_deposit_percent: number;
          experience_years: number | null;
          forme_juridique_code: string | null;
          id: string;
          nom_commercial: string | null;
          paused: boolean;
          presentation: string | null;
          radius_km: number | null;
          raison_sociale: string | null;
          refusal_reason: string | null;
          siren: string | null;
          sirene_active: boolean | null;
          sirene_checked_at: string | null;
          sirene_partial: boolean;
          siret: string | null;
          status: Database["public"]["Enums"]["artisan_status"];
          stripe_account_id: string | null;
          stripe_customer_id: string | null;
          submitted_at: string | null;
          suspension_reason: string | null;
          tva_intracom: string | null;
          updated_at: string;
          user_id: string;
          zone_mode: Database["public"]["Enums"]["zone_mode"] | null;
        };
        ComputedFields: never;
        Insert: {
          adresse_code_insee?: string | null;
          adresse_code_postal?: string | null;
          adresse_commune?: string | null;
          adresse_ligne?: string | null;
          ape_code?: string | null;
          ape_eligible?: boolean | null;
          assujetti_tva?: boolean | null;
          available_from?: string | null;
          base_code_insee?: string | null;
          base_label?: string | null;
          base_location?: unknown;
          connect_charges_enabled?: boolean;
          connect_details_submitted?: boolean;
          connect_payouts_enabled?: boolean;
          connect_updated_at?: string | null;
          created_at?: string;
          default_deposit_percent?: number;
          experience_years?: number | null;
          forme_juridique_code?: string | null;
          id?: string;
          nom_commercial?: string | null;
          paused?: boolean;
          presentation?: string | null;
          radius_km?: number | null;
          raison_sociale?: string | null;
          refusal_reason?: string | null;
          siren?: never;
          sirene_active?: boolean | null;
          sirene_checked_at?: string | null;
          sirene_partial?: boolean;
          siret?: string | null;
          status?: Database["public"]["Enums"]["artisan_status"];
          stripe_account_id?: string | null;
          stripe_customer_id?: string | null;
          submitted_at?: string | null;
          suspension_reason?: string | null;
          tva_intracom?: never;
          updated_at?: string;
          user_id: string;
          zone_mode?: Database["public"]["Enums"]["zone_mode"] | null;
        };
        Update: {
          adresse_code_insee?: string | null;
          adresse_code_postal?: string | null;
          adresse_commune?: string | null;
          adresse_ligne?: string | null;
          ape_code?: string | null;
          ape_eligible?: boolean | null;
          assujetti_tva?: boolean | null;
          available_from?: string | null;
          base_code_insee?: string | null;
          base_label?: string | null;
          base_location?: unknown;
          connect_charges_enabled?: boolean;
          connect_details_submitted?: boolean;
          connect_payouts_enabled?: boolean;
          connect_updated_at?: string | null;
          created_at?: string;
          default_deposit_percent?: number;
          experience_years?: number | null;
          forme_juridique_code?: string | null;
          id?: string;
          nom_commercial?: string | null;
          paused?: boolean;
          presentation?: string | null;
          radius_km?: number | null;
          raison_sociale?: string | null;
          refusal_reason?: string | null;
          siren?: never;
          sirene_active?: boolean | null;
          sirene_checked_at?: string | null;
          sirene_partial?: boolean;
          siret?: string | null;
          status?: Database["public"]["Enums"]["artisan_status"];
          stripe_account_id?: string | null;
          stripe_customer_id?: string | null;
          submitted_at?: string | null;
          suspension_reason?: string | null;
          tva_intracom?: never;
          updated_at?: string;
          user_id?: string;
          zone_mode?: Database["public"]["Enums"]["zone_mode"] | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          data: NonNullable<Json>;
          id: string;
          target_id: string | null;
          target_type: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          target_id?: string | null;
          target_type: string;
          updated_at?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          target_id?: string | null;
          target_type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      certifications: {
        Row: {
          artisan_id: string;
          created_at: string;
          date_fin: string;
          id: string;
          numero: string;
          type: Database["public"]["Enums"]["certification_type"];
          updated_at: string;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          created_at?: string;
          date_fin: string;
          id?: string;
          numero: string;
          type: Database["public"]["Enums"]["certification_type"];
          updated_at?: string;
          verified_at?: string | null;
        };
        Update: {
          artisan_id?: string;
          created_at?: string;
          date_fin?: string;
          id?: string;
          numero?: string;
          type?: Database["public"]["Enums"]["certification_type"];
          updated_at?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "certifications_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
      };
      chantier_events: {
        Row: {
          actor_id: string | null;
          actor_role: string;
          chantier_id: string;
          created_at: string;
          details: NonNullable<Json>;
          event: Database["public"]["Enums"]["chantier_event"];
          from_status: Database["public"]["Enums"]["chantier_status"];
          id: string;
          to_status: Database["public"]["Enums"]["chantier_status"];
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          actor_role: string;
          chantier_id: string;
          created_at?: string;
          details?: NonNullable<Json>;
          event: Database["public"]["Enums"]["chantier_event"];
          from_status: Database["public"]["Enums"]["chantier_status"];
          id?: string;
          to_status: Database["public"]["Enums"]["chantier_status"];
        };
        Update: {
          actor_id?: string | null;
          actor_role?: string;
          chantier_id?: string;
          created_at?: string;
          details?: NonNullable<Json>;
          event?: Database["public"]["Enums"]["chantier_event"];
          from_status?: Database["public"]["Enums"]["chantier_status"];
          id?: string;
          to_status?: Database["public"]["Enums"]["chantier_status"];
        };
        Relationships: [
          {
            foreignKeyName: "chantier_events_chantier_id_fkey";
            columns: ["chantier_id"];
            isOneToOne: false;
            referencedRelation: "chantiers";
            referencedColumns: ["id"];
          },
        ];
      };
      chantier_transitions: {
        Row: {
          event: Database["public"]["Enums"]["chantier_event"];
          from_status: Database["public"]["Enums"]["chantier_status"];
          to_status: Database["public"]["Enums"]["chantier_status"];
        };
        ComputedFields: never;
        Insert: {
          event: Database["public"]["Enums"]["chantier_event"];
          from_status: Database["public"]["Enums"]["chantier_status"];
          to_status: Database["public"]["Enums"]["chantier_status"];
        };
        Update: {
          event?: Database["public"]["Enums"]["chantier_event"];
          from_status?: Database["public"]["Enums"]["chantier_status"];
          to_status?: Database["public"]["Enums"]["chantier_status"];
        };
        Relationships: [];
      };
      chantier_updates: {
        Row: {
          author_id: string | null;
          chantier_id: string;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["chantier_update_kind"];
          message: string | null;
          storage_path: string | null;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          chantier_id: string;
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["chantier_update_kind"];
          message?: string | null;
          storage_path?: string | null;
        };
        Update: {
          author_id?: string | null;
          chantier_id?: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["chantier_update_kind"];
          message?: string | null;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chantier_updates_chantier_id_fkey";
            columns: ["chantier_id"];
            isOneToOne: false;
            referencedRelation: "chantiers";
            referencedColumns: ["id"];
          },
        ];
      };
      chantiers: {
        Row: {
          adresse: string | null;
          artisan_id: string;
          code_postal: string | null;
          created_at: string;
          id: string;
          particulier_id: string;
          project_id: string;
          request_id: string;
          review_reminded_at: string | null;
          start_at: string | null;
          status: Database["public"]["Enums"]["chantier_status"];
          title: string;
          updated_at: string;
          ville_nom: string | null;
        };
        ComputedFields: never;
        Insert: {
          adresse?: string | null;
          artisan_id: string;
          code_postal?: string | null;
          created_at?: string;
          id?: string;
          particulier_id: string;
          project_id: string;
          request_id: string;
          review_reminded_at?: string | null;
          start_at?: string | null;
          status?: Database["public"]["Enums"]["chantier_status"];
          title: string;
          updated_at?: string;
          ville_nom?: string | null;
        };
        Update: {
          adresse?: string | null;
          artisan_id?: string;
          code_postal?: string | null;
          created_at?: string;
          id?: string;
          particulier_id?: string;
          project_id?: string;
          request_id?: string;
          review_reminded_at?: string | null;
          start_at?: string | null;
          status?: Database["public"]["Enums"]["chantier_status"];
          title?: string;
          updated_at?: string;
          ville_nom?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chantiers_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chantiers_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chantiers_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: true;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
        ];
      };
      communes: {
        Row: {
          code_insee: string;
          created_at: string;
          departement: string;
          location: unknown;
          nom: string;
          ordre: number;
          pilote: boolean;
          slug: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          code_insee: string;
          created_at?: string;
          departement: string;
          location: unknown;
          nom: string;
          ordre?: number;
          pilote?: boolean;
          slug: string;
          updated_at?: string;
        };
        Update: {
          code_insee?: string;
          created_at?: string;
          departement?: string;
          location?: unknown;
          nom?: string;
          ordre?: number;
          pilote?: boolean;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoice_number_counters: {
        Row: {
          artisan_id: string;
          created_at: string;
          last_number: number;
          updated_at: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          created_at?: string;
          last_number: number;
          updated_at?: string;
          year: number;
        };
        Update: {
          artisan_id?: string;
          created_at?: string;
          last_number?: number;
          updated_at?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_number_counters_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          artisan_id: string;
          chantier_id: string;
          created_at: string;
          document: NonNullable<Json>;
          id: string;
          issued_on: string;
          kind: Database["public"]["Enums"]["payment_kind"];
          numero: string;
          payment_id: string;
          pdf_path: string | null;
          quote_id: string;
          total_ht_cents: number;
          total_ttc_cents: number;
          total_tva_cents: number;
          updated_at: string;
          vat_breakdown: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          chantier_id: string;
          created_at?: string;
          document: NonNullable<Json>;
          id?: string;
          issued_on: string;
          kind: Database["public"]["Enums"]["payment_kind"];
          numero: string;
          payment_id: string;
          pdf_path?: string | null;
          quote_id: string;
          total_ht_cents: number;
          total_ttc_cents: number;
          total_tva_cents: number;
          updated_at?: string;
          vat_breakdown: NonNullable<Json>;
        };
        Update: {
          artisan_id?: string;
          chantier_id?: string;
          created_at?: string;
          document?: NonNullable<Json>;
          id?: string;
          issued_on?: string;
          kind?: Database["public"]["Enums"]["payment_kind"];
          numero?: string;
          payment_id?: string;
          pdf_path?: string | null;
          quote_id?: string;
          total_ht_cents?: number;
          total_ttc_cents?: number;
          total_tva_cents?: number;
          updated_at?: string;
          vat_breakdown?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_chantier_id_fkey";
            columns: ["chantier_id"];
            isOneToOne: false;
            referencedRelation: "chantiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: true;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      legal_acceptances: {
        Row: {
          accepted_at: string;
          created_at: string;
          document: Database["public"]["Enums"]["legal_document"];
          id: string;
          ip: unknown;
          updated_at: string;
          user_id: string;
          version: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string;
          created_at?: string;
          document: Database["public"]["Enums"]["legal_document"];
          id?: string;
          ip?: unknown;
          updated_at?: string;
          user_id: string;
          version: string;
        };
        Update: {
          accepted_at?: string;
          created_at?: string;
          document?: Database["public"]["Enums"]["legal_document"];
          id?: string;
          ip?: unknown;
          updated_at?: string;
          user_id?: string;
          version?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          author_id: string | null;
          body: string | null;
          chantier_id: string;
          created_at: string;
          hidden_at: string | null;
          id: string;
          kind: Database["public"]["Enums"]["message_kind"];
          moderated_by: string | null;
          moderation_reason: string | null;
          read_at: string | null;
          storage_path: string | null;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          body?: string | null;
          chantier_id: string;
          created_at?: string;
          hidden_at?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["message_kind"];
          moderated_by?: string | null;
          moderation_reason?: string | null;
          read_at?: string | null;
          storage_path?: string | null;
        };
        Update: {
          author_id?: string | null;
          body?: string | null;
          chantier_id?: string;
          created_at?: string;
          hidden_at?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["message_kind"];
          moderated_by?: string | null;
          moderation_reason?: string | null;
          read_at?: string | null;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_chantier_id_fkey";
            columns: ["chantier_id"];
            isOneToOne: false;
            referencedRelation: "chantiers";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          attempts: number;
          channel: Database["public"]["Enums"]["notification_channel"];
          created_at: string;
          data: NonNullable<Json>;
          id: string;
          last_error: string | null;
          locked_at: string | null;
          read_at: string | null;
          send_after: string;
          sent_at: string | null;
          status: Database["public"]["Enums"]["notification_status"];
          type: Database["public"]["Enums"]["notification_type"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          channel?: Database["public"]["Enums"]["notification_channel"];
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          last_error?: string | null;
          locked_at?: string | null;
          read_at?: string | null;
          send_after?: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["notification_status"];
          type: Database["public"]["Enums"]["notification_type"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          channel?: Database["public"]["Enums"]["notification_channel"];
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          last_error?: string | null;
          locked_at?: string | null;
          read_at?: string | null;
          send_after?: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["notification_status"];
          type?: Database["public"]["Enums"]["notification_type"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount_cents: number;
          artisan_id: string;
          chantier_id: string;
          created_at: string;
          currency: string;
          id: string;
          kind: Database["public"]["Enums"]["payment_kind"];
          paid_at: string | null;
          quote_id: string;
          status: Database["public"]["Enums"]["payment_status"];
          stripe_account_id: string;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          artisan_id: string;
          chantier_id: string;
          created_at?: string;
          currency?: string;
          id?: string;
          kind: Database["public"]["Enums"]["payment_kind"];
          paid_at?: string | null;
          quote_id: string;
          status?: Database["public"]["Enums"]["payment_status"];
          stripe_account_id: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          artisan_id?: string;
          chantier_id?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["payment_kind"];
          paid_at?: string | null;
          quote_id?: string;
          status?: Database["public"]["Enums"]["payment_status"];
          stripe_account_id?: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_chantier_id_fkey";
            columns: ["chantier_id"];
            isOneToOne: false;
            referencedRelation: "chantiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          avantages: NonNullable<Json>;
          code: string;
          created_at: string;
          id: string;
          limites: NonNullable<Json>;
          nom: string;
          ordre: number;
          ouverte: boolean;
          prix_mensuel_ht_centimes: number;
          stripe_lookup_key: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avantages?: NonNullable<Json>;
          code: string;
          created_at?: string;
          id?: string;
          limites?: NonNullable<Json>;
          nom: string;
          ordre?: number;
          ouverte?: boolean;
          prix_mensuel_ht_centimes: number;
          stripe_lookup_key: string;
          updated_at?: string;
        };
        Update: {
          avantages?: NonNullable<Json>;
          code?: string;
          created_at?: string;
          id?: string;
          limites?: NonNullable<Json>;
          nom?: string;
          ordre?: number;
          ouverte?: boolean;
          prix_mensuel_ht_centimes?: number;
          stripe_lookup_key?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          marketing_opt_in: boolean;
          notification_preferences: NonNullable<Json>;
          phone: string | null;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          marketing_opt_in?: boolean;
          notification_preferences?: NonNullable<Json>;
          phone?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          marketing_opt_in?: boolean;
          notification_preferences?: NonNullable<Json>;
          phone?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      project_photos: {
        Row: {
          created_at: string;
          id: string;
          project_id: string;
          sort_order: number;
          storage_path: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          project_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          project_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_photos_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_transfers: {
        Row: {
          created_at: string;
          expires_at: string;
          from_user_id: string;
          id: string;
          project_id: string;
          token_hash: string;
          used_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expires_at?: string;
          from_user_id: string;
          id?: string;
          project_id: string;
          token_hash: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          from_user_id?: string;
          id?: string;
          project_id?: string;
          token_hash?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_transfers_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          adresse: string | null;
          ai_analysis: Json | null;
          ai_confidence: number | null;
          ai_model: string | null;
          analyzed_at: string | null;
          code_postal: string | null;
          created_at: string;
          criteria_validated_at: string | null;
          date_mode: Database["public"]["Enums"]["project_date_mode"];
          date_souhaitee: string | null;
          description: string;
          id: string;
          lieu_type: Database["public"]["Enums"]["project_lieu_type"] | null;
          location: unknown;
          room_codes: string[];
          status: Database["public"]["Enums"]["project_status"];
          summary: string | null;
          surface: Database["public"]["Enums"]["project_surface"] | null;
          trade_code: string | null;
          updated_at: string;
          urgence: boolean;
          user_id: string;
          ville_code_insee: string | null;
          ville_location: unknown;
          ville_nom: string | null;
          work_type_codes: string[];
        };
        ComputedFields: never;
        Insert: {
          adresse?: string | null;
          ai_analysis?: Json | null;
          ai_confidence?: number | null;
          ai_model?: string | null;
          analyzed_at?: string | null;
          code_postal?: string | null;
          created_at?: string;
          criteria_validated_at?: string | null;
          date_mode?: Database["public"]["Enums"]["project_date_mode"];
          date_souhaitee?: string | null;
          description: string;
          id?: string;
          lieu_type?: Database["public"]["Enums"]["project_lieu_type"] | null;
          location?: unknown;
          room_codes?: string[];
          status?: Database["public"]["Enums"]["project_status"];
          summary?: string | null;
          surface?: Database["public"]["Enums"]["project_surface"] | null;
          trade_code?: string | null;
          updated_at?: string;
          urgence?: boolean;
          user_id: string;
          ville_code_insee?: string | null;
          ville_location?: unknown;
          ville_nom?: string | null;
          work_type_codes?: string[];
        };
        Update: {
          adresse?: string | null;
          ai_analysis?: Json | null;
          ai_confidence?: number | null;
          ai_model?: string | null;
          analyzed_at?: string | null;
          code_postal?: string | null;
          created_at?: string;
          criteria_validated_at?: string | null;
          date_mode?: Database["public"]["Enums"]["project_date_mode"];
          date_souhaitee?: string | null;
          description?: string;
          id?: string;
          lieu_type?: Database["public"]["Enums"]["project_lieu_type"] | null;
          location?: unknown;
          room_codes?: string[];
          status?: Database["public"]["Enums"]["project_status"];
          summary?: string | null;
          surface?: Database["public"]["Enums"]["project_surface"] | null;
          trade_code?: string | null;
          updated_at?: string;
          urgence?: boolean;
          user_id?: string;
          ville_code_insee?: string | null;
          ville_location?: unknown;
          ville_nom?: string | null;
          work_type_codes?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "projects_trade_code_fkey";
            columns: ["trade_code"];
            isOneToOne: false;
            referencedRelation: "trades";
            referencedColumns: ["code"];
          },
        ];
      };
      quote_dictations: {
        Row: {
          artisan_id: string;
          chantier_id: string;
          created_at: string;
          id: string;
          transcript: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          chantier_id: string;
          created_at?: string;
          id?: string;
          transcript: string;
          updated_at?: string;
        };
        Update: {
          artisan_id?: string;
          chantier_id?: string;
          created_at?: string;
          id?: string;
          transcript?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quote_dictations_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_dictations_chantier_id_fkey";
            columns: ["chantier_id"];
            isOneToOne: true;
            referencedRelation: "chantiers";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_lines: {
        Row: {
          created_at: string;
          description: string | null;
          designation: string;
          id: string;
          position: number;
          quantity_milli: number;
          quote_id: string;
          total_ht_cents: number;
          type: Database["public"]["Enums"]["quote_line_type"];
          unit: Database["public"]["Enums"]["quote_unit"];
          unit_price_ht_cents: number;
          updated_at: string;
          vat_rate_bp: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          designation: string;
          id?: string;
          position: number;
          quantity_milli: number;
          quote_id: string;
          total_ht_cents: number;
          type: Database["public"]["Enums"]["quote_line_type"];
          unit: Database["public"]["Enums"]["quote_unit"];
          unit_price_ht_cents: number;
          updated_at?: string;
          vat_rate_bp: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          designation?: string;
          id?: string;
          position?: number;
          quantity_milli?: number;
          quote_id?: string;
          total_ht_cents?: number;
          type?: Database["public"]["Enums"]["quote_line_type"];
          unit?: Database["public"]["Enums"]["quote_unit"];
          unit_price_ht_cents?: number;
          updated_at?: string;
          vat_rate_bp?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quote_lines_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_number_counters: {
        Row: {
          artisan_id: string;
          created_at: string;
          last_number: number;
          updated_at: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          created_at?: string;
          last_number: number;
          updated_at?: string;
          year: number;
        };
        Update: {
          artisan_id?: string;
          created_at?: string;
          last_number?: number;
          updated_at?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quote_number_counters_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          artisan_id: string;
          chantier_id: string;
          client_message: string | null;
          created_at: string;
          document: Json | null;
          duration_days: number | null;
          id: string;
          numero: string | null;
          payment_schedule: Json | null;
          refusal_reason: Database["public"]["Enums"]["quote_refusal_reason"] | null;
          responded_at: string | null;
          sent_at: string | null;
          signature_proof_path: string | null;
          signed_at: string | null;
          signed_pdf_path: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["quote_status"];
          supersedes_id: string | null;
          total_ht_cents: number;
          total_ttc_cents: number;
          total_tva_cents: number;
          updated_at: string;
          valid_until: string | null;
          vat_breakdown: NonNullable<Json>;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          chantier_id: string;
          client_message?: string | null;
          created_at?: string;
          document?: Json | null;
          duration_days?: number | null;
          id?: string;
          numero?: string | null;
          payment_schedule?: Json | null;
          refusal_reason?: Database["public"]["Enums"]["quote_refusal_reason"] | null;
          responded_at?: string | null;
          sent_at?: string | null;
          signature_proof_path?: string | null;
          signed_at?: string | null;
          signed_pdf_path?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["quote_status"];
          supersedes_id?: string | null;
          total_ht_cents?: number;
          total_ttc_cents?: number;
          total_tva_cents?: number;
          updated_at?: string;
          valid_until?: string | null;
          vat_breakdown?: NonNullable<Json>;
          version?: number;
        };
        Update: {
          artisan_id?: string;
          chantier_id?: string;
          client_message?: string | null;
          created_at?: string;
          document?: Json | null;
          duration_days?: number | null;
          id?: string;
          numero?: string | null;
          payment_schedule?: Json | null;
          refusal_reason?: Database["public"]["Enums"]["quote_refusal_reason"] | null;
          responded_at?: string | null;
          sent_at?: string | null;
          signature_proof_path?: string | null;
          signed_at?: string | null;
          signed_pdf_path?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["quote_status"];
          supersedes_id?: string | null;
          total_ht_cents?: number;
          total_ttc_cents?: number;
          total_tva_cents?: number;
          updated_at?: string;
          valid_until?: string | null;
          vat_breakdown?: NonNullable<Json>;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_chantier_id_fkey";
            columns: ["chantier_id"];
            isOneToOne: false;
            referencedRelation: "chantiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_supersedes_id_fkey";
            columns: ["supersedes_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limits: {
        Row: {
          created_at: string;
          hits: number;
          id: string;
          key: string;
          updated_at: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          hits?: number;
          id?: string;
          key: string;
          updated_at?: string;
          window_start: string;
        };
        Update: {
          created_at?: string;
          hits?: number;
          id?: string;
          key?: string;
          updated_at?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      reception_number_counters: {
        Row: {
          artisan_id: string;
          created_at: string;
          last_number: number;
          updated_at: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          created_at?: string;
          last_number: number;
          updated_at?: string;
          year: number;
        };
        Update: {
          artisan_id?: string;
          created_at?: string;
          last_number?: number;
          updated_at?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reception_number_counters_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
      };
      receptions: {
        Row: {
          artisan_id: string;
          chantier_id: string;
          created_at: string;
          document: NonNullable<Json>;
          id: string;
          issued_on: string;
          lift_escalated_at: string | null;
          lift_message: string | null;
          lift_reminded_at: string | null;
          lift_signaled_at: string | null;
          lifted_at: string | null;
          numero: string;
          quote_id: string;
          reserves: string | null;
          signature_proof_path: string | null;
          signed_at: string | null;
          signed_pdf_path: string | null;
          status: Database["public"]["Enums"]["reception_status"];
          updated_at: string;
          with_reserves: boolean;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          chantier_id: string;
          created_at?: string;
          document: NonNullable<Json>;
          id?: string;
          issued_on: string;
          lift_escalated_at?: string | null;
          lift_message?: string | null;
          lift_reminded_at?: string | null;
          lift_signaled_at?: string | null;
          lifted_at?: string | null;
          numero: string;
          quote_id: string;
          reserves?: string | null;
          signature_proof_path?: string | null;
          signed_at?: string | null;
          signed_pdf_path?: string | null;
          status?: Database["public"]["Enums"]["reception_status"];
          updated_at?: string;
          with_reserves: boolean;
        };
        Update: {
          artisan_id?: string;
          chantier_id?: string;
          created_at?: string;
          document?: NonNullable<Json>;
          id?: string;
          issued_on?: string;
          lift_escalated_at?: string | null;
          lift_message?: string | null;
          lift_reminded_at?: string | null;
          lift_signaled_at?: string | null;
          lifted_at?: string | null;
          numero?: string;
          quote_id?: string;
          reserves?: string | null;
          signature_proof_path?: string | null;
          signed_at?: string | null;
          signed_pdf_path?: string | null;
          status?: Database["public"]["Enums"]["reception_status"];
          updated_at?: string;
          with_reserves?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "receptions_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receptions_chantier_id_fkey";
            columns: ["chantier_id"];
            isOneToOne: true;
            referencedRelation: "chantiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receptions_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      requests: {
        Row: {
          artisan_id: string;
          callback_from: string | null;
          callback_mode: Database["public"]["Enums"]["callback_mode"];
          callback_to: string | null;
          contact_phone: string;
          created_at: string;
          expires_at: string;
          id: string;
          message: string | null;
          particulier_id: string;
          project_id: string;
          refusal_detail: string | null;
          refusal_reason: Database["public"]["Enums"]["refusal_reason"] | null;
          responded_at: string | null;
          status: Database["public"]["Enums"]["request_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          callback_from?: string | null;
          callback_mode?: Database["public"]["Enums"]["callback_mode"];
          callback_to?: string | null;
          contact_phone: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          message?: string | null;
          particulier_id: string;
          project_id: string;
          refusal_detail?: string | null;
          refusal_reason?: Database["public"]["Enums"]["refusal_reason"] | null;
          responded_at?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          updated_at?: string;
        };
        Update: {
          artisan_id?: string;
          callback_from?: string | null;
          callback_mode?: Database["public"]["Enums"]["callback_mode"];
          callback_to?: string | null;
          contact_phone?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          message?: string | null;
          particulier_id?: string;
          project_id?: string;
          refusal_detail?: string | null;
          refusal_reason?: Database["public"]["Enums"]["refusal_reason"] | null;
          responded_at?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "requests_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requests_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          artisan_id: string;
          author_name: string;
          chantier_id: string;
          comment: string;
          communication: number;
          created_at: string;
          delays: number;
          experience_on: string;
          id: string;
          moderated_at: string | null;
          moderated_by: string | null;
          moderation_reason: string | null;
          particulier_id: string;
          quality: number;
          replied_at: string | null;
          reply: string | null;
          score: number;
          status: Database["public"]["Enums"]["review_status"];
          updated_at: string;
          value_for_money: Database["public"]["Enums"]["value_for_money"];
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          author_name: string;
          chantier_id: string;
          comment: string;
          communication: number;
          created_at?: string;
          delays: number;
          experience_on: string;
          id?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_reason?: string | null;
          particulier_id: string;
          quality: number;
          replied_at?: string | null;
          reply?: string | null;
          score: number;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
          value_for_money: Database["public"]["Enums"]["value_for_money"];
        };
        Update: {
          artisan_id?: string;
          author_name?: string;
          chantier_id?: string;
          comment?: string;
          communication?: number;
          created_at?: string;
          delays?: number;
          experience_on?: string;
          id?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_reason?: string | null;
          particulier_id?: string;
          quality?: number;
          replied_at?: string | null;
          reply?: string | null;
          score?: number;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
          value_for_money?: Database["public"]["Enums"]["value_for_money"];
        };
        Relationships: [
          {
            foreignKeyName: "reviews_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_chantier_id_fkey";
            columns: ["chantier_id"];
            isOneToOne: true;
            referencedRelation: "chantiers";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          id: string;
          label: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          id?: string;
          label: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          id?: string;
          label?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      signature_requests: {
        Row: {
          completed_at: string | null;
          consents: NonNullable<Json>;
          created_at: string;
          external_submission_id: string | null;
          external_submitter_id: string | null;
          id: string;
          provider: string;
          quote_id: string | null;
          reception_id: string | null;
          signing_url: string | null;
          status: Database["public"]["Enums"]["signature_request_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          consents: NonNullable<Json>;
          created_at?: string;
          external_submission_id?: string | null;
          external_submitter_id?: string | null;
          id?: string;
          provider?: string;
          quote_id?: string | null;
          reception_id?: string | null;
          signing_url?: string | null;
          status?: Database["public"]["Enums"]["signature_request_status"];
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          consents?: NonNullable<Json>;
          created_at?: string;
          external_submission_id?: string | null;
          external_submitter_id?: string | null;
          id?: string;
          provider?: string;
          quote_id?: string | null;
          reception_id?: string | null;
          signing_url?: string | null;
          status?: Database["public"]["Enums"]["signature_request_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "signature_requests_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "signature_requests_reception_id_fkey";
            columns: ["reception_id"];
            isOneToOne: false;
            referencedRelation: "receptions";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          artisan_id: string;
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          id: string;
          plan_code: string | null;
          status: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          trial_end: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan_code?: string | null;
          status: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          trial_end?: string | null;
          updated_at?: string;
        };
        Update: {
          artisan_id?: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan_code?: string | null;
          status?: string;
          stripe_customer_id?: string;
          stripe_subscription_id?: string;
          trial_end?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: true;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_plan_code_fkey";
            columns: ["plan_code"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["code"];
          },
        ];
      };
      ticket_messages: {
        Row: {
          author_id: string | null;
          body: string | null;
          created_at: string;
          from_staff: boolean;
          id: string;
          storage_path: string | null;
          ticket_id: string;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          body?: string | null;
          created_at?: string;
          from_staff: boolean;
          id?: string;
          storage_path?: string | null;
          ticket_id: string;
        };
        Update: {
          author_id?: string | null;
          body?: string | null;
          created_at?: string;
          from_staff?: boolean;
          id?: string;
          storage_path?: string | null;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      tickets: {
        Row: {
          category: Database["public"]["Enums"]["dispute_category"] | null;
          chantier_id: string | null;
          contact_email: string;
          created_at: string;
          due_at: string;
          handled_by: string | null;
          id: string;
          message: string | null;
          message_id: string | null;
          project_id: string | null;
          resolved_at: string | null;
          review_id: string | null;
          status: Database["public"]["Enums"]["ticket_status"];
          subject: string | null;
          type: Database["public"]["Enums"]["ticket_type"];
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          category?: Database["public"]["Enums"]["dispute_category"] | null;
          chantier_id?: string | null;
          contact_email: string;
          created_at?: string;
          due_at?: string;
          handled_by?: string | null;
          id?: string;
          message?: string | null;
          message_id?: string | null;
          project_id?: string | null;
          resolved_at?: string | null;
          review_id?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          subject?: string | null;
          type: Database["public"]["Enums"]["ticket_type"];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          category?: Database["public"]["Enums"]["dispute_category"] | null;
          chantier_id?: string | null;
          contact_email?: string;
          created_at?: string;
          due_at?: string;
          handled_by?: string | null;
          id?: string;
          message?: string | null;
          message_id?: string | null;
          project_id?: string | null;
          resolved_at?: string | null;
          review_id?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          subject?: string | null;
          type?: Database["public"]["Enums"]["ticket_type"];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_chantier_id_fkey";
            columns: ["chantier_id"];
            isOneToOne: false;
            referencedRelation: "chantiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      trades: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          id: string;
          label: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          id?: string;
          label: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          id?: string;
          label?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          created_at: string;
          id: string;
          processed_at: string | null;
          received_at: string;
          source: string;
          type: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id: string;
          processed_at?: string | null;
          received_at?: string;
          source?: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          processed_at?: string | null;
          received_at?: string;
          source?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      work_types: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          id: string;
          label: string;
          sort_order: number;
          trade_code: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          id?: string;
          label: string;
          sort_order?: number;
          trade_code: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          id?: string;
          label?: string;
          sort_order?: number;
          trade_code?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_types_trade_code_fkey";
            columns: ["trade_code"];
            isOneToOne: false;
            referencedRelation: "trades";
            referencedColumns: ["code"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_artisan_absence: {
        Args: { p_ends_on: string; p_label?: string; p_starts_on: string };
        Returns: string;
      };
      add_artisan_blocked_slot: {
        Args: { p_date: string; p_end: string; p_label?: string; p_start: string };
        Returns: string;
      };
      add_ticket_message: { Args: { p_body: string; p_ticket_id: string }; Returns: string };
      admin_close_dispute: {
        Args: { p_message: string; p_outcome: string; p_ticket_id: string };
        Returns: undefined;
      };
      admin_decide_artisan: {
        Args: {
          p_artisan_id: string;
          p_decision: Database["public"]["Enums"]["review_decision"];
          p_message?: string;
        };
        Returns: undefined;
      };
      admin_moderate_message: {
        Args: { p_hide: boolean; p_message_id: string; p_reason: string };
        Returns: undefined;
      };
      admin_moderate_review: {
        Args: {
          p_reason: string;
          p_review_id: string;
          p_status: Database["public"]["Enums"]["review_status"];
        };
        Returns: undefined;
      };
      admin_review_document: {
        Args: {
          p_document_id: string;
          p_reason?: string;
          p_status: Database["public"]["Enums"]["document_status"];
        };
        Returns: undefined;
      };
      admin_verify_certification: {
        Args: { p_certification_id: string; p_verified: boolean };
        Returns: undefined;
      };
      artisan_add_chantier_message: {
        Args: { p_chantier_id: string; p_message: string };
        Returns: string;
      };
      artisan_calendar_events: {
        Args: { p_token: string };
        Returns: {
          ends_at: string;
          ends_on: string;
          item_id: string;
          kind: string;
          place: string;
          starts_at: string;
          starts_on: string;
          title: string;
        }[];
      };
      artisan_cancel_chantier: {
        Args: { p_chantier_id: string; p_reason: string };
        Returns: undefined;
      };
      artisan_chantier_detail: { Args: { p_chantier_id: string }; Returns: Json };
      artisan_chantiers: {
        Args: Record<PropertyKey, never>;
        Returns: {
          adresse: string;
          appointment_at: string;
          chantier_id: string;
          client_first_name: string;
          client_last_name: string;
          code_postal: string;
          created_at: string;
          particulier_id: string;
          request_id: string;
          start_at: string;
          status: Database["public"]["Enums"]["chantier_status"];
          title: string;
          ville_nom: string;
        }[];
      };
      artisan_confirm_start: {
        Args: { p_chantier_id: string; p_date: string; p_time: string };
        Returns: undefined;
      };
      artisan_declare_finished: { Args: { p_chantier_id: string }; Returns: undefined };
      artisan_delete_dictation: { Args: { p_chantier_id: string }; Returns: undefined };
      artisan_fix_appointment: {
        Args: { p_date: string; p_request_id: string; p_time: string };
        Returns: string;
      };
      artisan_inbox: {
        Args: Record<PropertyKey, never>;
        Returns: {
          client_first_name: string;
          code_postal: string;
          created_at: string;
          date_mode: Database["public"]["Enums"]["project_date_mode"];
          date_souhaitee: string;
          expires_at: string;
          photo_path: string;
          request_id: string;
          status: Database["public"]["Enums"]["request_status"];
          summary: string;
          trade_label: string;
          urgence: boolean;
          ville_nom: string;
        }[];
      };
      artisan_previous_lines: {
        Args: { p_query: string };
        Returns: {
          description: string;
          designation: string;
          type: Database["public"]["Enums"]["quote_line_type"];
          unit: Database["public"]["Enums"]["quote_unit"];
          unit_price_ht_cents: number;
          vat_rate_bp: number;
        }[];
      };
      artisan_public_profile: { Args: { p_artisan_id: string }; Returns: Json };
      artisan_public_reviews: {
        Args: { p_artisan_id: string; p_limit?: number };
        Returns: {
          author_name: string;
          comment: string;
          created_at: string;
          experience_on: string;
          replied_at: string;
          reply: string;
          review_id: string;
          score: number;
        }[];
      };
      artisan_quotes: {
        Args: Record<PropertyKey, never>;
        Returns: {
          appointment_at: string;
          chantier_id: string;
          client_name: string;
          line_count: number;
          numero: string;
          quote_id: string;
          sent_at: string;
          status: Database["public"]["Enums"]["quote_status"];
          title: string;
          total_ttc_cents: number;
          updated_at: string;
          version: number;
        }[];
      };
      artisan_reply_review: { Args: { p_reply: string; p_review_id: string }; Returns: undefined };
      artisan_report_expertise: {
        Args: { p_message: string; p_request_id: string; p_trade_code: string };
        Returns: string;
      };
      artisan_request_detail: { Args: { p_request_id: string }; Returns: Json };
      artisan_reschedule_appointment: {
        Args: { p_chantier_id: string; p_date: string; p_time: string };
        Returns: undefined;
      };
      artisan_respond_request: {
        Args: {
          p_accept: boolean;
          p_detail?: string;
          p_reason?: Database["public"]["Enums"]["refusal_reason"];
          p_request_id: string;
        };
        Returns: undefined;
      };
      artisan_save_appointment_notes: {
        Args: { p_chantier_id: string; p_notes: string };
        Returns: undefined;
      };
      artisan_save_dictation: {
        Args: { p_chantier_id: string; p_transcript: string };
        Returns: undefined;
      };
      artisan_save_quote_draft: { Args: { p_chantier_id: string; p_lines: Json }; Returns: string };
      artisan_send_quote: {
        Args: {
          p_deposit_percent: number;
          p_duration_days: number;
          p_quote_id: string;
          p_save_default?: boolean;
          p_start_date: string;
        };
        Returns: string;
      };
      artisan_signal_reserves_lifted: {
        Args: { p_chantier_id: string; p_message: string };
        Returns: undefined;
      };
      chantier_appointment: {
        Args: { p_chantier_id: string };
        Returns: {
          adresse: string;
          artisan_name: string;
          client_name: string;
          code_postal: string;
          kind: string;
          starts_at: string;
          title: string;
          ville_nom: string;
        }[];
      };
      chantier_messages: {
        Args: { p_chantier_id: string };
        Returns: {
          body: string;
          created_at: string;
          hidden: boolean;
          kind: Database["public"]["Enums"]["message_kind"];
          message_id: string;
          mine: boolean;
          read_at: string;
          storage_path: string;
        }[];
      };
      claim_notifications: {
        Args: { p_limit?: number };
        Returns: {
          data: Json;
          email: string;
          first_name: string;
          id: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        }[];
      };
      claim_project: { Args: { p_token: string }; Returns: string };
      complete_notification: {
        Args: { p_error?: string; p_id: string; p_retry?: boolean; p_sent: boolean };
        Returns: undefined;
      };
      consume_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
      create_project_transfer: { Args: { p_project_id: string }; Returns: string };
      delete_artisan_absence: { Args: { p_id: string }; Returns: undefined };
      delete_artisan_blocked_slot: { Args: { p_id: string }; Returns: undefined };
      disable_artisan_calendar_feed: { Args: Record<PropertyKey, never>; Returns: undefined };
      invoice_document: { Args: { p_invoice_id: string }; Returns: Json };
      mark_conversation_read: { Args: { p_chantier_id: string }; Returns: number };
      mark_notifications_read: { Args: { p_ids?: string[] }; Returns: number };
      match_artisans: {
        Args: { p_limit?: number; p_project_id: string };
        Returns: {
          artisan_id: string;
          available_from: string;
          available_now: boolean;
          avatar_path: string;
          display_name: string;
          distance_km: number;
          experience_years: number;
          specialties: Json;
          zone_city: string;
          zone_communes: string[];
          zone_mode: Database["public"]["Enums"]["zone_mode"];
          zone_radius_km: number;
        }[];
      };
      my_conversations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          chantier_id: string;
          closed: boolean;
          last_at: string;
          last_body: string;
          last_hidden: boolean;
          last_kind: Database["public"]["Enums"]["message_kind"];
          last_mine: boolean;
          other_avatar_path: string;
          other_name: string;
          title: string;
          unread: number;
        }[];
      };
      my_notifications: {
        Args: { p_limit?: number };
        Returns: {
          created_at: string;
          data: Json;
          notification_id: string;
          read_at: string;
          type: Database["public"]["Enums"]["notification_type"];
        }[];
      };
      my_unread_messages: { Args: Record<PropertyKey, never>; Returns: number };
      my_unread_notifications: { Args: Record<PropertyKey, never>; Returns: number };
      particulier_chantiers: {
        Args: { p_chantier_id?: string };
        Returns: {
          adresse: string;
          appointment_at: string;
          artisan_avatar_path: string;
          artisan_id: string;
          artisan_name: string;
          artisan_phone: string;
          balance_cents: number;
          balance_status: Database["public"]["Enums"]["payment_status"];
          chantier_id: string;
          closed_at: string;
          code_postal: string;
          created_at: string;
          deposit_cents: number;
          deposit_status: Database["public"]["Enums"]["payment_status"];
          description: string;
          finished_at: string;
          photo_path: string;
          project_id: string;
          quote_id: string;
          quote_status: Database["public"]["Enums"]["quote_status"];
          quote_total_ttc_cents: number;
          received_at: string;
          start_at: string;
          status: Database["public"]["Enums"]["chantier_status"];
          title: string;
          trade_label: string;
          ville_nom: string;
        }[];
      };
      particulier_confirm_reserves_lifted: { Args: { p_chantier_id: string }; Returns: undefined };
      particulier_refuse_quote: {
        Args: {
          p_comment?: string;
          p_quote_id: string;
          p_reason: Database["public"]["Enums"]["quote_refusal_reason"];
        };
        Returns: undefined;
      };
      particulier_request_quote_revision: {
        Args: { p_message: string; p_quote_id: string };
        Returns: string;
      };
      particulier_requests: {
        Args: Record<PropertyKey, never>;
        Returns: {
          appointment_at: string;
          artisan_avatar_path: string;
          artisan_email: string;
          artisan_id: string;
          artisan_name: string;
          artisan_phone: string;
          chantier_id: string;
          chantier_start_at: string;
          chantier_status: Database["public"]["Enums"]["chantier_status"];
          created_at: string;
          expires_at: string;
          project_id: string;
          refusal_reason: Database["public"]["Enums"]["refusal_reason"];
          request_id: string;
          status: Database["public"]["Enums"]["request_status"];
          summary: string;
          trade_label: string;
          ville_nom: string;
        }[];
      };
      particulier_start_balance: { Args: { p_chantier_id: string }; Returns: Json };
      particulier_start_deposit: { Args: { p_quote_id: string }; Returns: Json };
      particulier_start_reception: {
        Args: { p_chantier_id: string; p_consents: Json; p_reserves: string };
        Returns: Json;
      };
      particulier_start_signature: {
        Args: { p_consents: Json; p_quote_id: string };
        Returns: Json;
      };
      particulier_submit_review: {
        Args: {
          p_chantier_id: string;
          p_comment: string;
          p_communication: number;
          p_delays: number;
          p_quality: number;
          p_value: Database["public"]["Enums"]["value_for_money"];
        };
        Returns: string;
      };
      public_artisans_for_commune: {
        Args: { p_code_insee: string; p_limit?: number; p_trade_code: string };
        Returns: {
          artisan_id: string;
          available_from: string;
          available_now: boolean;
          avatar_path: string;
          display_name: string;
          experience_years: number;
          specialties: Json;
          zone_city: string;
          zone_communes: string[];
          zone_mode: Database["public"]["Enums"]["zone_mode"];
          zone_radius_km: number;
        }[];
      };
      public_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      quote_document: { Args: { p_quote_id: string }; Returns: Json };
      reception_document: { Args: { p_reception_id: string }; Returns: Json };
      record_chantier_photo: {
        Args: { p_chantier_id: string; p_storage_path: string; p_user_id: string };
        Returns: string;
      };
      record_message_attachment: {
        Args: {
          p_chantier_id: string;
          p_kind: Database["public"]["Enums"]["message_kind"];
          p_storage_path: string;
          p_user_id: string;
        };
        Returns: string;
      };
      record_payment: {
        Args: {
          p_amount_cents: number;
          p_kind: Database["public"]["Enums"]["payment_kind"];
          p_payment_intent_id: string;
          p_quote_id: string;
          p_session_id: string;
          p_status: Database["public"]["Enums"]["payment_status"];
          p_stripe_account_id: string;
        };
        Returns: string;
      };
      record_quote_signature: {
        Args: {
          p_proof_path: string;
          p_request_id: string;
          p_signed_at: string;
          p_signed_pdf_path: string;
        };
        Returns: string;
      };
      record_reception_signature: {
        Args: {
          p_proof_path: string;
          p_request_id: string;
          p_signed_at: string;
          p_signed_pdf_path: string;
        };
        Returns: string;
      };
      record_sirene_result: {
        Args: { p_artisan_id: string; p_result: Json; p_siret: string };
        Returns: undefined;
      };
      record_ticket_photo: {
        Args: { p_storage_path: string; p_ticket_id: string; p_user_id: string };
        Returns: string;
      };
      renew_artisan_calendar_feed: { Args: Record<PropertyKey, never>; Returns: string };
      report_chantier_problem: {
        Args: {
          p_category: Database["public"]["Enums"]["dispute_category"];
          p_chantier_id: string;
          p_description: string;
        };
        Returns: string;
      };
      report_message: { Args: { p_message_id: string; p_reason: string }; Returns: string };
      report_review: { Args: { p_reason: string; p_review_id: string }; Returns: string };
      save_project_criteria: {
        Args: {
          p_adresse: string;
          p_code_postal: string;
          p_date_mode: Database["public"]["Enums"]["project_date_mode"];
          p_date_souhaitee: string;
          p_lat: number;
          p_lieu_type: Database["public"]["Enums"]["project_lieu_type"];
          p_lon: number;
          p_project_id: string;
          p_room_codes: string[];
          p_surface: Database["public"]["Enums"]["project_surface"];
          p_trade_code: string;
          p_ville_code_insee: string;
          p_ville_lat: number;
          p_ville_lon: number;
          p_ville_nom: string;
          p_work_type_codes: string[];
        };
        Returns: undefined;
      };
      send_contact_message: {
        Args: { p_email: string; p_message: string; p_subject: string };
        Returns: undefined;
      };
      send_message: { Args: { p_body: string; p_chantier_id: string }; Returns: string };
      send_project_requests: {
        Args: {
          p_artisan_ids: string[];
          p_callback_from: string;
          p_callback_mode: Database["public"]["Enums"]["callback_mode"];
          p_callback_to: string;
          p_message: string;
          p_phone: string;
          p_project_id: string;
        };
        Returns: number;
      };
      send_project_to_menao: {
        Args: { p_contact_email: string; p_message: string; p_project_id: string };
        Returns: string;
      };
      set_artisan_availability: {
        Args: { p_available_from: string; p_paused: boolean };
        Returns: undefined;
      };
      set_artisan_hours: { Args: { p_hours: Json }; Returns: undefined };
      set_artisan_trades: {
        Args: { p_experience_years: number; p_trade_codes: string[]; p_work_type_codes: string[] };
        Returns: undefined;
      };
      set_artisan_zone: {
        Args: {
          p_base_code_insee?: string;
          p_base_label?: string;
          p_communes?: Json;
          p_lat?: number;
          p_lon?: number;
          p_mode: Database["public"]["Enums"]["zone_mode"];
          p_radius_km?: number;
        };
        Returns: undefined;
      };
      set_notification_preferences: {
        Args: { p_activite: boolean; p_rappels: boolean };
        Returns: undefined;
      };
      staff_set_ticket_status: {
        Args: { p_status: Database["public"]["Enums"]["ticket_status"]; p_ticket_id: string };
        Returns: undefined;
      };
      submit_artisan_onboarding: { Args: Record<PropertyKey, never>; Returns: undefined };
      transition_chantier: {
        Args: {
          p_chantier_id: string;
          p_details?: Json;
          p_event: Database["public"]["Enums"]["chantier_event"];
        };
        Returns: Database["public"]["Enums"]["chantier_status"];
      };
      validate_project_criteria: { Args: { p_project_id: string }; Returns: undefined };
    };
    Enums: {
      app_role: "particulier" | "artisan" | "artisan_en_attente" | "admin" | "support";
      appointment_status: "planifie" | "annule";
      artisan_status: "brouillon" | "en_verification" | "valide" | "refuse" | "suspendu";
      callback_mode: "des_que_possible" | "plage";
      certification_type:
        | "rge"
        | "qualifelec"
        | "qualibat"
        | "qualipac"
        | "qualipv"
        | "qualisol"
        | "qualibois"
        | "autre";
      chantier_event:
        | "rdv_fixe"
        | "devis_envoye"
        | "revision_demandee"
        | "devis_refuse"
        | "devis_signe"
        | "acompte_paye"
        | "date_confirmee"
        | "demarrage"
        | "fin_declaree"
        | "pv_sans_reserves"
        | "pv_avec_reserves"
        | "reserves_levees"
        | "solde_paye"
        | "litige_ouvert"
        | "litige_resolu"
        | "litige_annule"
        | "annulation";
      chantier_status:
        | "demande_envoyee"
        | "rdv_planifie"
        | "devis_envoye"
        | "devis_en_revision"
        | "devis_refuse"
        | "devis_signe"
        | "acompte_paye"
        | "planifie"
        | "en_cours"
        | "travaux_termines"
        | "reserves_a_lever"
        | "receptionne"
        | "cloture"
        | "en_litige"
        | "annule";
      chantier_update_kind: "message" | "photo";
      dispute_category: "retard" | "malfacon" | "comportement" | "paiement" | "autre";
      document_status: "en_attente" | "valide" | "refuse" | "remplace";
      document_type: "kbis" | "decennale" | "rc_pro" | "identite";
      legal_document: "cgu" | "confidentialite" | "cgv_artisan";
      message_kind: "texte" | "photo" | "fichier";
      notification_channel: "email" | "sms" | "push";
      notification_status: "a_envoyer" | "en_cours" | "envoyee" | "echec" | "ignoree";
      notification_type:
        | "nouvelle_demande"
        | "rdv_fixe"
        | "rdv_modifie"
        | "rdv_rappel"
        | "chantier_annule"
        | "devis_recu"
        | "devis_refuse"
        | "devis_modification"
        | "devis_signe"
        | "acompte_paye"
        | "chantier_planifie"
        | "demarrage_modifie"
        | "travaux_termines"
        | "chantier_nouveautes"
        | "pv_signe"
        | "reserves_emises"
        | "levee_signalee"
        | "levee_confirmee"
        | "levee_relance"
        | "solde_paye"
        | "avis_recu"
        | "avis_relance"
        | "nouveaux_messages"
        | "litige_ouvert"
        | "litige_clos"
        | "reponse_support";
      payment_kind: "acompte" | "solde";
      payment_status: "en_attente" | "en_cours" | "paye" | "echoue" | "annule";
      project_date_mode: "des_que_possible" | "date" | "inconnue";
      project_lieu_type: "appartement" | "maison" | "jardin" | "entreprise";
      project_status: "brouillon" | "criteres_valides" | "demande_envoyee";
      project_surface: "moins_10" | "10_20" | "20_50" | "plus_50";
      quote_line_type: "materiel" | "main_oeuvre" | "autre";
      quote_refusal_reason: "trop_cher" | "autre_artisan" | "projet_reporte" | "autre";
      quote_status: "brouillon" | "envoye" | "signe" | "refuse" | "revision_demandee" | "remplace";
      quote_unit: "u" | "h" | "jour" | "m" | "ml" | "m2" | "m3" | "kg" | "l" | "forfait";
      reception_status: "en_signature" | "signe";
      refusal_reason: "planning_complet" | "hors_expertise" | "hors_zone" | "autre";
      request_status: "envoyee" | "acceptee" | "refusee" | "expiree" | "annulee";
      review_decision: "valide" | "refuse" | "complement";
      review_status: "publie" | "masque";
      signature_request_status: "en_attente" | "signee" | "abandonnee";
      ticket_status: "ouvert" | "en_cours" | "resolu";
      ticket_type:
        "dossier_recherche" | "contact" | "expertise" | "reserves" | "avis" | "message" | "litige";
      value_for_money: "excellent" | "convenable" | "trop_cher";
      zone_mode: "rayon" | "communes";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["particulier", "artisan", "artisan_en_attente", "admin", "support"],
      appointment_status: ["planifie", "annule"],
      artisan_status: ["brouillon", "en_verification", "valide", "refuse", "suspendu"],
      callback_mode: ["des_que_possible", "plage"],
      certification_type: [
        "rge",
        "qualifelec",
        "qualibat",
        "qualipac",
        "qualipv",
        "qualisol",
        "qualibois",
        "autre",
      ],
      chantier_event: [
        "rdv_fixe",
        "devis_envoye",
        "revision_demandee",
        "devis_refuse",
        "devis_signe",
        "acompte_paye",
        "date_confirmee",
        "demarrage",
        "fin_declaree",
        "pv_sans_reserves",
        "pv_avec_reserves",
        "reserves_levees",
        "solde_paye",
        "litige_ouvert",
        "litige_resolu",
        "litige_annule",
        "annulation",
      ],
      chantier_status: [
        "demande_envoyee",
        "rdv_planifie",
        "devis_envoye",
        "devis_en_revision",
        "devis_refuse",
        "devis_signe",
        "acompte_paye",
        "planifie",
        "en_cours",
        "travaux_termines",
        "reserves_a_lever",
        "receptionne",
        "cloture",
        "en_litige",
        "annule",
      ],
      chantier_update_kind: ["message", "photo"],
      dispute_category: ["retard", "malfacon", "comportement", "paiement", "autre"],
      document_status: ["en_attente", "valide", "refuse", "remplace"],
      document_type: ["kbis", "decennale", "rc_pro", "identite"],
      legal_document: ["cgu", "confidentialite", "cgv_artisan"],
      message_kind: ["texte", "photo", "fichier"],
      notification_channel: ["email", "sms", "push"],
      notification_status: ["a_envoyer", "en_cours", "envoyee", "echec", "ignoree"],
      notification_type: [
        "nouvelle_demande",
        "rdv_fixe",
        "rdv_modifie",
        "rdv_rappel",
        "chantier_annule",
        "devis_recu",
        "devis_refuse",
        "devis_modification",
        "devis_signe",
        "acompte_paye",
        "chantier_planifie",
        "demarrage_modifie",
        "travaux_termines",
        "chantier_nouveautes",
        "pv_signe",
        "reserves_emises",
        "levee_signalee",
        "levee_confirmee",
        "levee_relance",
        "solde_paye",
        "avis_recu",
        "avis_relance",
        "nouveaux_messages",
        "litige_ouvert",
        "litige_clos",
        "reponse_support",
      ],
      payment_kind: ["acompte", "solde"],
      payment_status: ["en_attente", "en_cours", "paye", "echoue", "annule"],
      project_date_mode: ["des_que_possible", "date", "inconnue"],
      project_lieu_type: ["appartement", "maison", "jardin", "entreprise"],
      project_status: ["brouillon", "criteres_valides", "demande_envoyee"],
      project_surface: ["moins_10", "10_20", "20_50", "plus_50"],
      quote_line_type: ["materiel", "main_oeuvre", "autre"],
      quote_refusal_reason: ["trop_cher", "autre_artisan", "projet_reporte", "autre"],
      quote_status: ["brouillon", "envoye", "signe", "refuse", "revision_demandee", "remplace"],
      quote_unit: ["u", "h", "jour", "m", "ml", "m2", "m3", "kg", "l", "forfait"],
      reception_status: ["en_signature", "signe"],
      refusal_reason: ["planning_complet", "hors_expertise", "hors_zone", "autre"],
      request_status: ["envoyee", "acceptee", "refusee", "expiree", "annulee"],
      review_decision: ["valide", "refuse", "complement"],
      review_status: ["publie", "masque"],
      signature_request_status: ["en_attente", "signee", "abandonnee"],
      ticket_status: ["ouvert", "en_cours", "resolu"],
      ticket_type: [
        "dossier_recherche",
        "contact",
        "expertise",
        "reserves",
        "avis",
        "message",
        "litige",
      ],
      value_for_money: ["excellent", "convenable", "trop_cher"],
      zone_mode: ["rayon", "communes"],
    },
  },
} as const;
