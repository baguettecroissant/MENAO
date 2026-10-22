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
      artisan_badges: {
        Row: {
          artisan_id: string;
          badge_code: string;
          seen_at: string | null;
          unlocked_at: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          badge_code: string;
          seen_at?: string | null;
          unlocked_at?: string;
        };
        Update: {
          artisan_id?: string;
          badge_code?: string;
          seen_at?: string | null;
          unlocked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_badges_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artisan_badges_badge_code_fkey";
            columns: ["badge_code"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["code"];
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
      artisan_charter_acceptances: {
        Row: {
          accepted_at: string;
          artisan_id: string;
          company: string;
          created_at: string;
          engagement_version: string | null;
          id: string;
          rules_count: number;
          signature_path: string;
          signer_ip: unknown;
          signer_name: string;
          siret: string;
          version: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string;
          artisan_id: string;
          company: string;
          created_at?: string;
          engagement_version?: string | null;
          id?: string;
          rules_count: number;
          signature_path: string;
          signer_ip?: unknown;
          signer_name: string;
          siret: string;
          version: string;
        };
        Update: {
          accepted_at?: string;
          artisan_id?: string;
          company?: string;
          created_at?: string;
          engagement_version?: string | null;
          id?: string;
          rules_count?: number;
          signature_path?: string;
          signer_ip?: unknown;
          signer_name?: string;
          siret?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_charter_acceptances_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
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
          covered_trades: string[] | null;
          created_at: string;
          date_emission: string | null;
          date_fin: string | null;
          id: string;
          mime_type: string;
          numero: string | null;
          refusal_code: string | null;
          refusal_reason: string | null;
          renewal_reminder_days: number | null;
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
          covered_trades?: string[] | null;
          created_at?: string;
          date_emission?: string | null;
          date_fin?: string | null;
          id?: string;
          mime_type: string;
          numero?: string | null;
          refusal_code?: string | null;
          refusal_reason?: string | null;
          renewal_reminder_days?: number | null;
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
          covered_trades?: string[] | null;
          created_at?: string;
          date_emission?: string | null;
          date_fin?: string | null;
          id?: string;
          mime_type?: string;
          numero?: string | null;
          refusal_code?: string | null;
          refusal_reason?: string | null;
          renewal_reminder_days?: number | null;
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
      artisan_free_months: {
        Row: {
          applied_at: string | null;
          artisan_id: string;
          created_at: string;
          id: string;
          reason: Database["public"]["Enums"]["free_month_reason"];
          referral_id: string | null;
          status: Database["public"]["Enums"]["free_month_status"];
          stripe_subscription_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          applied_at?: string | null;
          artisan_id: string;
          created_at?: string;
          id?: string;
          reason?: Database["public"]["Enums"]["free_month_reason"];
          referral_id?: string | null;
          status?: Database["public"]["Enums"]["free_month_status"];
          stripe_subscription_id?: string | null;
        };
        Update: {
          applied_at?: string | null;
          artisan_id?: string;
          created_at?: string;
          id?: string;
          reason?: Database["public"]["Enums"]["free_month_reason"];
          referral_id?: string | null;
          status?: Database["public"]["Enums"]["free_month_status"];
          stripe_subscription_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_free_months_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artisan_free_months_referral_id_fkey";
            columns: ["referral_id"];
            isOneToOne: false;
            referencedRelation: "artisan_referrals";
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
      artisan_referral_codes: {
        Row: {
          artisan_id: string;
          code: string;
          created_at: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          code: string;
          created_at?: string;
        };
        Update: {
          artisan_id?: string;
          code?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_referral_codes_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: true;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
      };
      artisan_referrals: {
        Row: {
          cancel_reason: string | null;
          created_at: string;
          id: string;
          referred_artisan_id: string;
          referrer_artisan_id: string;
          rewarded_at: string | null;
          status: Database["public"]["Enums"]["referral_status"];
        };
        ComputedFields: never;
        Insert: {
          cancel_reason?: string | null;
          created_at?: string;
          id?: string;
          referred_artisan_id: string;
          referrer_artisan_id: string;
          rewarded_at?: string | null;
          status?: Database["public"]["Enums"]["referral_status"];
        };
        Update: {
          cancel_reason?: string | null;
          created_at?: string;
          id?: string;
          referred_artisan_id?: string;
          referrer_artisan_id?: string;
          rewarded_at?: string | null;
          status?: Database["public"]["Enums"]["referral_status"];
        };
        Relationships: [
          {
            foreignKeyName: "artisan_referrals_referred_artisan_id_fkey";
            columns: ["referred_artisan_id"];
            isOneToOne: true;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artisan_referrals_referrer_artisan_id_fkey";
            columns: ["referrer_artisan_id"];
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
      artisan_rge_qualifications: {
        Row: {
          artisan_id: string;
          code_qualification: string;
          created_at: string;
          date_debut: string | null;
          date_fin: string;
          domaine: string;
          id: string;
          meta_domaine: string | null;
          nom_certificat: string | null;
          nom_qualification: string;
          organisme: string;
          particulier: boolean | null;
          url_certificat: string | null;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          code_qualification: string;
          created_at?: string;
          date_debut?: string | null;
          date_fin: string;
          domaine: string;
          id?: string;
          meta_domaine?: string | null;
          nom_certificat?: string | null;
          nom_qualification: string;
          organisme: string;
          particulier?: boolean | null;
          url_certificat?: string | null;
        };
        Update: {
          artisan_id?: string;
          code_qualification?: string;
          created_at?: string;
          date_debut?: string | null;
          date_fin?: string;
          domaine?: string;
          id?: string;
          meta_domaine?: string | null;
          nom_certificat?: string | null;
          nom_qualification?: string;
          organisme?: string;
          particulier?: boolean | null;
          url_certificat?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_rge_qualifications_artisan_id_fkey";
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
      artisan_spot_checks: {
        Row: {
          artisan_id: string;
          checked_at: string | null;
          checked_by: string | null;
          created_at: string;
          drawn_at: string;
          id: string;
          insurer_called: boolean;
          note: string | null;
          period: string;
          result: string | null;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          checked_at?: string | null;
          checked_by?: string | null;
          created_at?: string;
          drawn_at?: string;
          id?: string;
          insurer_called?: boolean;
          note?: string | null;
          period: string;
          result?: string | null;
        };
        Update: {
          artisan_id?: string;
          checked_at?: string | null;
          checked_by?: string | null;
          created_at?: string;
          drawn_at?: string;
          id?: string;
          insurer_called?: boolean;
          note?: string | null;
          period?: string;
          result?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_spot_checks_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
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
      artisan_welcome_gifts: {
        Row: {
          adresse_code_postal: string | null;
          adresse_commune: string | null;
          adresse_ligne: string | null;
          artisan_id: string;
          chosen_at: string | null;
          created_at: string;
          item: Database["public"]["Enums"]["welcome_gift_item"] | null;
          recipient: string | null;
          referral_id: string | null;
          size: string | null;
          ticket_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          adresse_code_postal?: string | null;
          adresse_commune?: string | null;
          adresse_ligne?: string | null;
          artisan_id: string;
          chosen_at?: string | null;
          created_at?: string;
          item?: Database["public"]["Enums"]["welcome_gift_item"] | null;
          recipient?: string | null;
          referral_id?: string | null;
          size?: string | null;
          ticket_id?: string | null;
        };
        Update: {
          adresse_code_postal?: string | null;
          adresse_commune?: string | null;
          adresse_ligne?: string | null;
          artisan_id?: string;
          chosen_at?: string | null;
          created_at?: string;
          item?: Database["public"]["Enums"]["welcome_gift_item"] | null;
          recipient?: string | null;
          referral_id?: string | null;
          size?: string | null;
          ticket_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "artisan_welcome_gifts_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: true;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artisan_welcome_gifts_referral_id_fkey";
            columns: ["referral_id"];
            isOneToOne: false;
            referencedRelation: "artisan_referrals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artisan_welcome_gifts_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
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
          connect_disabled_reason: string | null;
          connect_payouts_enabled: boolean;
          connect_requirements_deadline: string | null;
          connect_requirements_due: string[];
          connect_requirements_pending: string[];
          connect_updated_at: string | null;
          created_at: string;
          date_creation_entreprise: string | null;
          decennale_non_soumis: boolean;
          default_deposit_percent: number;
          diplome_metier: Database["public"]["Enums"]["diplome_metier"] | null;
          experience_years: number | null;
          forme_juridique_code: string | null;
          google_checked_at: string | null;
          google_rating: number | null;
          google_review_count: number | null;
          google_url: string | null;
          id: string;
          indexable: boolean;
          is_dirigeant: boolean | null;
          logo_path: string | null;
          nom_commercial: string | null;
          paused: boolean;
          planning_updated_at: string | null;
          presentation: string | null;
          radiated_at: string | null;
          radiation_reason: string | null;
          radius_km: number | null;
          raison_sociale: string | null;
          refusal_reason: string | null;
          rge_checked_at: string | null;
          siren: string | null;
          sirene_active: boolean | null;
          sirene_checked_at: string | null;
          sirene_partial: boolean;
          siret: string | null;
          slug: string | null;
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
          connect_disabled_reason?: string | null;
          connect_payouts_enabled?: boolean;
          connect_requirements_deadline?: string | null;
          connect_requirements_due?: string[];
          connect_requirements_pending?: string[];
          connect_updated_at?: string | null;
          created_at?: string;
          date_creation_entreprise?: string | null;
          decennale_non_soumis?: boolean;
          default_deposit_percent?: number;
          diplome_metier?: Database["public"]["Enums"]["diplome_metier"] | null;
          experience_years?: number | null;
          forme_juridique_code?: string | null;
          google_checked_at?: string | null;
          google_rating?: number | null;
          google_review_count?: number | null;
          google_url?: string | null;
          id?: string;
          indexable?: boolean;
          is_dirigeant?: boolean | null;
          logo_path?: string | null;
          nom_commercial?: string | null;
          paused?: boolean;
          planning_updated_at?: string | null;
          presentation?: string | null;
          radiated_at?: string | null;
          radiation_reason?: string | null;
          radius_km?: number | null;
          raison_sociale?: string | null;
          refusal_reason?: string | null;
          rge_checked_at?: string | null;
          siren?: never;
          sirene_active?: boolean | null;
          sirene_checked_at?: string | null;
          sirene_partial?: boolean;
          siret?: string | null;
          slug?: string | null;
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
          connect_disabled_reason?: string | null;
          connect_payouts_enabled?: boolean;
          connect_requirements_deadline?: string | null;
          connect_requirements_due?: string[];
          connect_requirements_pending?: string[];
          connect_updated_at?: string | null;
          created_at?: string;
          date_creation_entreprise?: string | null;
          decennale_non_soumis?: boolean;
          default_deposit_percent?: number;
          diplome_metier?: Database["public"]["Enums"]["diplome_metier"] | null;
          experience_years?: number | null;
          forme_juridique_code?: string | null;
          google_checked_at?: string | null;
          google_rating?: number | null;
          google_review_count?: number | null;
          google_url?: string | null;
          id?: string;
          indexable?: boolean;
          is_dirigeant?: boolean | null;
          logo_path?: string | null;
          nom_commercial?: string | null;
          paused?: boolean;
          planning_updated_at?: string | null;
          presentation?: string | null;
          radiated_at?: string | null;
          radiation_reason?: string | null;
          radius_km?: number | null;
          raison_sociale?: string | null;
          refusal_reason?: string | null;
          rge_checked_at?: string | null;
          siren?: never;
          sirene_active?: boolean | null;
          sirene_checked_at?: string | null;
          sirene_partial?: boolean;
          siret?: string | null;
          slug?: string | null;
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
      badges: {
        Row: {
          active: boolean;
          code: string;
          description: string;
          label: string;
          metric: string;
          position: number;
          target: number;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          code: string;
          description: string;
          label: string;
          metric: string;
          position?: number;
          target: number;
        };
        Update: {
          active?: boolean;
          code?: string;
          description?: string;
          label?: string;
          metric?: string;
          position?: number;
          target?: number;
        };
        Relationships: [];
      };
      blocked_identities: {
        Row: {
          artisan_id: string | null;
          created_at: string;
          id: string;
          kind: string;
          value: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_id?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          value: string;
        };
        Update: {
          artisan_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocked_identities_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
        ];
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
      chantier_reports: {
        Row: {
          artisan_id: string;
          chantier_id: string;
          created_at: string;
          kind: Database["public"]["Enums"]["artisan_report_kind"];
          project_id: string;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          chantier_id: string;
          created_at?: string;
          kind: Database["public"]["Enums"]["artisan_report_kind"];
          project_id: string;
        };
        Update: {
          artisan_id?: string;
          chantier_id?: string;
          created_at?: string;
          kind?: Database["public"]["Enums"]["artisan_report_kind"];
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chantier_reports_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chantier_reports_chantier_id_fkey";
            columns: ["chantier_id"];
            isOneToOne: true;
            referencedRelation: "chantiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chantier_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
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
      client_ratings: {
        Row: {
          artisan_id: string;
          chantier_id: string;
          clarity: number;
          comment: string;
          created_at: string;
          id: string;
          particulier_id: string;
          payment: number;
          welcome: number;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          chantier_id: string;
          clarity: number;
          comment: string;
          created_at?: string;
          id?: string;
          particulier_id: string;
          payment: number;
          welcome: number;
        };
        Update: {
          artisan_id?: string;
          chantier_id?: string;
          clarity?: number;
          comment?: string;
          created_at?: string;
          id?: string;
          particulier_id?: string;
          payment?: number;
          welcome?: number;
        };
        Relationships: [
          {
            foreignKeyName: "client_ratings_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_ratings_chantier_id_fkey";
            columns: ["chantier_id"];
            isOneToOne: true;
            referencedRelation: "chantiers";
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
      gamification_levels: {
        Row: {
          level: number;
          reward: string | null;
          reward_detail: string | null;
          xp_min: number;
        };
        ComputedFields: never;
        Insert: {
          level: number;
          reward?: string | null;
          reward_detail?: string | null;
          xp_min: number;
        };
        Update: {
          level?: number;
          reward?: string | null;
          reward_detail?: string | null;
          xp_min?: number;
        };
        Relationships: [];
      };
      gamification_objectives: {
        Row: {
          active: boolean;
          code: string;
          description: string;
          metric: string;
          position: number;
          target: number;
          title: string;
          xp: number;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          code: string;
          description: string;
          metric: string;
          position?: number;
          target: number;
          title: string;
          xp: number;
        };
        Update: {
          active?: boolean;
          code?: string;
          description?: string;
          metric?: string;
          position?: number;
          target?: number;
          title?: string;
          xp?: number;
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
          push_attempts: number;
          push_locked_at: string | null;
          push_status: Database["public"]["Enums"]["notification_status"] | null;
          pushed_at: string | null;
          read_at: string | null;
          send_after: string;
          sent_at: string | null;
          status: Database["public"]["Enums"]["notification_status"];
          ticket_id: string | null;
          type: Database["public"]["Enums"]["notification_type"];
          updated_at: string;
          user_id: string | null;
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
          push_attempts?: number;
          push_locked_at?: string | null;
          push_status?: Database["public"]["Enums"]["notification_status"] | null;
          pushed_at?: string | null;
          read_at?: string | null;
          send_after?: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["notification_status"];
          ticket_id?: string | null;
          type: Database["public"]["Enums"]["notification_type"];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          attempts?: number;
          channel?: Database["public"]["Enums"]["notification_channel"];
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          last_error?: string | null;
          locked_at?: string | null;
          push_attempts?: number;
          push_locked_at?: string | null;
          push_status?: Database["public"]["Enums"]["notification_status"] | null;
          pushed_at?: string | null;
          read_at?: string | null;
          send_after?: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["notification_status"];
          ticket_id?: string | null;
          type?: Database["public"]["Enums"]["notification_type"];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_attributions: {
        Row: {
          artisan_id: string | null;
          created_at: string;
          id: string;
          partner_id: string;
          project_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          artisan_id?: string | null;
          created_at?: string;
          id?: string;
          partner_id: string;
          project_id?: string | null;
        };
        Update: {
          artisan_id?: string | null;
          created_at?: string;
          id?: string;
          partner_id?: string;
          project_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "partner_attributions_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: true;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_attributions_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_attributions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_commissions: {
        Row: {
          amount_cents: number;
          artisan_id: string | null;
          cancel_reason: string | null;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["partner_commission_kind"];
          paid_at: string | null;
          partner_id: string;
          payout_reference: string | null;
          project_id: string | null;
          review_reason: string | null;
          status: Database["public"]["Enums"]["partner_commission_status"];
          updated_at: string;
          validate_after: string;
          validated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          artisan_id?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["partner_commission_kind"];
          paid_at?: string | null;
          partner_id: string;
          payout_reference?: string | null;
          project_id?: string | null;
          review_reason?: string | null;
          status?: Database["public"]["Enums"]["partner_commission_status"];
          updated_at?: string;
          validate_after: string;
          validated_at?: string | null;
        };
        Update: {
          amount_cents?: number;
          artisan_id?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["partner_commission_kind"];
          paid_at?: string | null;
          partner_id?: string;
          payout_reference?: string | null;
          project_id?: string | null;
          review_reason?: string | null;
          status?: Database["public"]["Enums"]["partner_commission_status"];
          updated_at?: string;
          validate_after?: string;
          validated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "partner_commissions_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_commissions_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_commissions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_settings: {
        Row: {
          delai_validation_jours: number;
          id: boolean;
          montant_abonne_centimes: number | null;
          montant_demande_centimes: number | null;
          plafond_demandes_mois: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          delai_validation_jours?: number;
          id?: boolean;
          montant_abonne_centimes?: number | null;
          montant_demande_centimes?: number | null;
          plafond_demandes_mois?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          delai_validation_jours?: number;
          id?: boolean;
          montant_abonne_centimes?: number | null;
          montant_demande_centimes?: number | null;
          plafond_demandes_mois?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      partners: {
        Row: {
          code: string;
          contact_email: string;
          contact_phone: string | null;
          created_at: string;
          created_by: string | null;
          dashboard_token: string | null;
          id: string;
          montant_abonne_centimes: number | null;
          montant_demande_centimes: number | null;
          nom: string;
          notes: string | null;
          page_message: string | null;
          page_publique: boolean;
          plafond_demandes_mois: number | null;
          siret: string;
          status: Database["public"]["Enums"]["partner_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          contact_email: string;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          dashboard_token?: string | null;
          id?: string;
          montant_abonne_centimes?: number | null;
          montant_demande_centimes?: number | null;
          nom: string;
          notes?: string | null;
          page_message?: string | null;
          page_publique?: boolean;
          plafond_demandes_mois?: number | null;
          siret: string;
          status?: Database["public"]["Enums"]["partner_status"];
          updated_at?: string;
        };
        Update: {
          code?: string;
          contact_email?: string;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          dashboard_token?: string | null;
          id?: string;
          montant_abonne_centimes?: number | null;
          montant_demande_centimes?: number | null;
          nom?: string;
          notes?: string | null;
          page_message?: string | null;
          page_publique?: boolean;
          plafond_demandes_mois?: number | null;
          siret?: string;
          status?: Database["public"]["Enums"]["partner_status"];
          updated_at?: string;
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
      platform_settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
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
          marketing_updated_at: string | null;
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
          marketing_updated_at?: string | null;
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
          marketing_updated_at?: string | null;
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
          preferred_artisan_id: string | null;
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
          preferred_artisan_id?: string | null;
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
          preferred_artisan_id?: string | null;
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
            foreignKeyName: "projects_preferred_artisan_id_fkey";
            columns: ["preferred_artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_trade_code_fkey";
            columns: ["trade_code"];
            isOneToOne: false;
            referencedRelation: "trades";
            referencedColumns: ["code"];
          },
        ];
      };
      push_tokens: {
        Row: {
          created_at: string;
          id: string;
          last_seen_at: string;
          platform: Database["public"]["Enums"]["push_platform"];
          token: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          last_seen_at?: string;
          platform: Database["public"]["Enums"]["push_platform"];
          token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_seen_at?: string;
          platform?: Database["public"]["Enums"]["push_platform"];
          token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
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
          cancellation_comment: string | null;
          cancellation_reason: Database["public"]["Enums"]["client_cancel_reason"] | null;
          cancelled_at: string | null;
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
          cancellation_comment?: string | null;
          cancellation_reason?: Database["public"]["Enums"]["client_cancel_reason"] | null;
          cancelled_at?: string | null;
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
          cancellation_comment?: string | null;
          cancellation_reason?: Database["public"]["Enums"]["client_cancel_reason"] | null;
          cancelled_at?: string | null;
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
          cleanliness: number | null;
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
          cleanliness?: number | null;
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
          cleanliness?: number | null;
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
      reward_claims: {
        Row: {
          address: string;
          artisan_id: string;
          city: string;
          country: string;
          created_at: string;
          id: string;
          jacket_size: string;
          level: number;
          pants_size: string;
          phone: string;
          ticket_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          address: string;
          artisan_id: string;
          city: string;
          country: string;
          created_at?: string;
          id?: string;
          jacket_size: string;
          level: number;
          pants_size: string;
          phone: string;
          ticket_id?: string | null;
        };
        Update: {
          address?: string;
          artisan_id?: string;
          city?: string;
          country?: string;
          created_at?: string;
          id?: string;
          jacket_size?: string;
          level?: number;
          pants_size?: string;
          phone?: string;
          ticket_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reward_claims_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reward_claims_level_fkey";
            columns: ["level"];
            isOneToOne: false;
            referencedRelation: "gamification_levels";
            referencedColumns: ["level"];
          },
          {
            foreignKeyName: "reward_claims_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
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
          ended_at: string | null;
          first_paid_at: string | null;
          id: string;
          past_due_since: string | null;
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
          ended_at?: string | null;
          first_paid_at?: string | null;
          id?: string;
          past_due_since?: string | null;
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
          ended_at?: string | null;
          first_paid_at?: string | null;
          id?: string;
          past_due_since?: string | null;
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
      ticket_notes: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          id: string;
          ticket_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          ticket_id: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          ticket_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_notes_ticket_id_fkey";
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
          overdue_notified_at: string | null;
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
          overdue_notified_at?: string | null;
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
          overdue_notified_at?: string | null;
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
          failed_at: string | null;
          failures: number;
          id: string;
          last_error: string | null;
          processed_at: string | null;
          received_at: string;
          source: string;
          type: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          failed_at?: string | null;
          failures?: number;
          id: string;
          last_error?: string | null;
          processed_at?: string | null;
          received_at?: string;
          source?: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          failed_at?: string | null;
          failures?: number;
          id?: string;
          last_error?: string | null;
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
      xp_events: {
        Row: {
          artisan_id: string;
          created_at: string;
          id: string;
          objective_code: string;
          xp: number;
        };
        ComputedFields: never;
        Insert: {
          artisan_id: string;
          created_at?: string;
          id?: string;
          objective_code: string;
          xp: number;
        };
        Update: {
          artisan_id?: string;
          created_at?: string;
          id?: string;
          objective_code?: string;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: "xp_events_artisan_id_fkey";
            columns: ["artisan_id"];
            isOneToOne: false;
            referencedRelation: "artisans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "xp_events_objective_code_fkey";
            columns: ["objective_code"];
            isOneToOne: false;
            referencedRelation: "gamification_objectives";
            referencedColumns: ["code"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_artisan_charter: {
        Args: {
          p_company: string;
          p_engagement_version?: string;
          p_ip?: string;
          p_rules_count: number;
          p_signature_path: string;
          p_signer_name: string;
          p_siret: string;
          p_version: string;
        };
        Returns: string;
      };
      add_artisan_absence: {
        Args: { p_ends_on: string; p_label?: string; p_starts_on: string };
        Returns: string;
      };
      add_artisan_blocked_slot: {
        Args: { p_date: string; p_end: string; p_label?: string; p_start: string };
        Returns: string;
      };
      add_ticket_message: { Args: { p_body: string; p_ticket_id: string }; Returns: string };
      admin_activity: {
        Args: { p_kinds?: string[]; p_limit?: number; p_offset?: number };
        Returns: {
          details: Json;
          kind: string;
          occurred_at: string;
        }[];
      };
      admin_add_reference: {
        Args: { p_code: string; p_kind: string; p_label: string; p_trade_code?: string };
        Returns: undefined;
      };
      admin_ai_summary: { Args: { p_days?: number }; Returns: Json };
      admin_artisan_activity: { Args: { p_artisan_id: string }; Returns: Json };
      admin_artisan_menao_score: { Args: { p_artisan_id: string }; Returns: Json };
      admin_artisan_referral: { Args: { p_artisan_id: string }; Returns: Json };
      admin_audit_counts: { Args: { p_query?: string }; Returns: Json };
      admin_audit_log: {
        Args: { p_filter?: string; p_limit?: number; p_offset?: number; p_query?: string };
        Returns: {
          acteur: string;
          action: string;
          automatique: boolean;
          categorie: string;
          cible: string;
          created_at: string;
          data: Json;
          lien_id: string;
          lien_type: string;
          log_id: string;
          target_type: string;
          total: number;
        }[];
      };
      admin_cancel_partner_commission: {
        Args: { p_id: string; p_reason: string };
        Returns: undefined;
      };
      admin_cancel_referral: { Args: { p_id: string; p_reason: string }; Returns: undefined };
      admin_chantier_counts: { Args: { p_query?: string }; Returns: Json };
      admin_chantiers: {
        Args: {
          p_limit?: number;
          p_offset?: number;
          p_query?: string;
          p_statuses?: Database["public"]["Enums"]["chantier_status"][];
        };
        Returns: {
          artisan: string;
          artisan_id: string;
          chantier_id: string;
          client: string;
          created_at: string;
          derniere_activite: string;
          devis_ttc_cents: number;
          paye_cents: number;
          status: Database["public"]["Enums"]["chantier_status"];
          title: string;
          total: number;
          ville: string;
        }[];
      };
      admin_clear_commission_review: { Args: { p_id: string }; Returns: undefined };
      admin_close_dispute: {
        Args: { p_message: string; p_outcome: string; p_ticket_id: string };
        Returns: undefined;
      };
      admin_complete_spot_check: {
        Args: { p_id: string; p_insurer_called?: boolean; p_note?: string; p_result: string };
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
      admin_draw_spot_checks: { Args: Record<PropertyKey, never>; Returns: number };
      admin_log_account_action: {
        Args: { p_action: string; p_user_id: string };
        Returns: undefined;
      };
      admin_mark_commissions_paid: {
        Args: { p_ids: string[]; p_reference: string };
        Returns: number;
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
      admin_move_reference: {
        Args: { p_code: string; p_kind: string; p_up: boolean };
        Returns: undefined;
      };
      admin_new_artisans: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_overview: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_partner_funnel: { Args: { p_partner_id: string }; Returns: Json };
      admin_partners: {
        Args: Record<PropertyKey, never>;
        Returns: {
          artisans: number;
          code: string;
          created_at: string;
          id: string;
          nom: string;
          paid_cents: number;
          paying: number;
          pending_cents: number;
          projects: number;
          qualified: number;
          status: Database["public"]["Enums"]["partner_status"];
          validated_cents: number;
        }[];
      };
      admin_payment_counts: { Args: { p_query?: string }; Returns: Json };
      admin_payment_summary: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_payments: {
        Args: { p_filter?: string; p_limit?: number; p_offset?: number; p_query?: string };
        Returns: {
          amount_cents: number;
          artisan: string;
          artisan_id: string;
          chantier: string;
          chantier_id: string;
          client: string;
          created_at: string;
          devis: string;
          kind: string;
          paid_at: string;
          payment_id: string;
          status: string;
          total: number;
        }[];
      };
      admin_people: {
        Args: { p_limit?: number; p_offset?: number; p_query?: string; p_role?: string };
        Returns: {
          artisan_id: string;
          created_at: string;
          email: string;
          last_sign_in_at: string;
          name: string;
          phone: string;
          role: string;
          total: number;
          user_id: string;
        }[];
      };
      admin_people_counts: { Args: { p_query?: string }; Returns: Json };
      admin_project_counts: { Args: { p_query?: string }; Returns: Json };
      admin_projects: {
        Args: { p_filter?: string; p_limit?: number; p_offset?: number; p_query?: string };
        Returns: {
          acceptees: number;
          chantier_id: string;
          client: string;
          created_at: string;
          demandes: number;
          en_attente: number;
          etape: string;
          metier: string;
          prochaine_echeance: string;
          project_id: string;
          total: number;
          ville: string;
        }[];
      };
      admin_radiate_artisan: {
        Args: { p_artisan_id: string; p_reason: string };
        Returns: undefined;
      };
      admin_reactivate_account: { Args: { p_user_id: string }; Returns: undefined };
      admin_reactivate_artisan: { Args: { p_artisan_id: string }; Returns: undefined };
      admin_references: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_referral_summary: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_referrals: {
        Args: { p_filter?: string };
        Returns: {
          cancel_reason: string;
          created_at: string;
          gift: string;
          id: string;
          referred: string;
          referred_id: string;
          referred_month: Database["public"]["Enums"]["free_month_status"];
          referrer: string;
          referrer_id: string;
          referrer_month: Database["public"]["Enums"]["free_month_status"];
          rewarded_at: string;
          status: Database["public"]["Enums"]["referral_status"];
        }[];
      };
      admin_rename_reference: {
        Args: { p_code: string; p_kind: string; p_label: string };
        Returns: undefined;
      };
      admin_renew_partner_dashboard: { Args: { p_id: string }; Returns: string };
      admin_review_document: {
        Args: {
          p_code?: string;
          p_document_id: string;
          p_reason?: string;
          p_status: Database["public"]["Enums"]["document_status"];
        };
        Returns: undefined;
      };
      admin_save_partner: {
        Args: {
          p_code: string;
          p_contact_email: string;
          p_contact_phone?: string;
          p_id?: string;
          p_montant_abonne_centimes?: number;
          p_montant_demande_centimes?: number;
          p_nom: string;
          p_notes?: string;
          p_plafond_demandes_mois?: number;
          p_siret: string;
          p_status: Database["public"]["Enums"]["partner_status"];
        };
        Returns: string;
      };
      admin_save_partner_page: {
        Args: { p_id: string; p_message?: string; p_publique: boolean };
        Returns: undefined;
      };
      admin_save_partner_settings: {
        Args: {
          p_delai_validation_jours: number;
          p_montant_abonne_centimes?: number;
          p_montant_demande_centimes?: number;
          p_plafond_demandes_mois?: number;
        };
        Returns: undefined;
      };
      admin_search: {
        Args: { p_limit?: number; p_query: string };
        Returns: {
          detail: string;
          id: string;
          kind: string;
          label: string;
          tag: string;
        }[];
      };
      admin_set_google_reviews: {
        Args: { p_artisan_id: string; p_count: number; p_rating: number; p_url: string };
        Returns: undefined;
      };
      admin_set_platform_setting: { Args: { p_key: string; p_value: Json }; Returns: undefined };
      admin_set_reference_active: {
        Args: { p_active: boolean; p_code: string; p_kind: string };
        Returns: undefined;
      };
      admin_subscription_counts: { Args: { p_query?: string }; Returns: Json };
      admin_subscription_summary: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_subscriptions: {
        Args: { p_filter?: string; p_limit?: number; p_offset?: number; p_query?: string };
        Returns: {
          artisan: string;
          artisan_id: string;
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string;
          ended_at: string;
          formule: string;
          prix_cents: number;
          siret: string;
          situation: string;
          status: string;
          total: number;
          trial_end: string;
        }[];
      };
      admin_suspend_account: { Args: { p_reason: string; p_user_id: string }; Returns: undefined };
      admin_suspend_artisan: {
        Args: { p_artisan_id: string; p_reason: string };
        Returns: undefined;
      };
      admin_user_account: { Args: { p_user_id: string }; Returns: Json };
      admin_user_emails: {
        Args: { p_user_ids: string[] };
        Returns: {
          email: string;
          user_id: string;
        }[];
      };
      admin_verify_certification: {
        Args: { p_certification_id: string; p_verified: boolean };
        Returns: undefined;
      };
      admin_webhook_counts: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_webhook_events: {
        Args: { p_filter?: string; p_limit?: number; p_offset?: number };
        Returns: {
          etat: string;
          event_id: string;
          failed_at: string;
          failures: number;
          last_error: string;
          processed_at: string;
          received_at: string;
          source: string;
          total: number;
          type: string;
        }[];
      };
      artisan_add_chantier_message: {
        Args: { p_chantier_id: string; p_message: string };
        Returns: string;
      };
      artisan_calendar_events: {
        Args: { p_token: string };
        Returns: {
          chantier_id: string;
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
        Args: {
          p_chantier_id: string;
          p_reason: string;
          p_report?: Database["public"]["Enums"]["artisan_report_kind"];
        };
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
      artisan_claim_reward: {
        Args: {
          p_address: string;
          p_city: string;
          p_country: string;
          p_jacket_size: string;
          p_level: number;
          p_pants_size: string;
          p_phone: string;
        };
        Returns: string;
      };
      artisan_confirm_planning: { Args: Record<PropertyKey, never>; Returns: string };
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
      artisan_grade: { Args: Record<PropertyKey, never>; Returns: Json };
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
      artisan_mark_badges_seen: { Args: Record<PropertyKey, never>; Returns: undefined };
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
      artisan_public_page: { Args: { p_slug: string }; Returns: Json };
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
      artisan_rate_client: {
        Args: {
          p_chantier_id: string;
          p_clarity: number;
          p_comment: string;
          p_payment: number;
          p_welcome: number;
        };
        Returns: string;
      };
      artisan_remove_logo: { Args: Record<PropertyKey, never>; Returns: string };
      artisan_reply_review: { Args: { p_reply: string; p_review_id: string }; Returns: undefined };
      artisan_report_expertise: {
        Args: { p_message: string; p_request_id: string; p_trade_code: string };
        Returns: string;
      };
      artisan_report_fake_client: {
        Args: { p_detail?: string; p_request_id: string };
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
      attribute_project_partner: {
        Args: { p_code: string; p_project_id: string };
        Returns: boolean;
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
      choose_welcome_gift: {
        Args: {
          p_adresse_code_postal: string;
          p_adresse_commune: string;
          p_adresse_ligne: string;
          p_item: string;
          p_recipient: string;
          p_size: string;
        };
        Returns: undefined;
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
      claim_push_notifications: {
        Args: { p_limit?: number };
        Returns: {
          data: Json;
          id: string;
          tokens: string[];
          type: Database["public"]["Enums"]["notification_type"];
        }[];
      };
      client_ratings_visible: { Args: Record<PropertyKey, never>; Returns: boolean };
      client_reputation: {
        Args: { p_request_id: string };
        Returns: {
          clarity: number;
          payment: number;
          ratings: number;
          welcome: number;
        }[];
      };
      complete_artisan_oauth_signup: {
        Args: {
          p_first_name: string;
          p_last_name: string;
          p_legal: Json;
          p_marketing_opt_in: boolean;
          p_phone: string;
          p_signup: Json;
          p_siret: string;
        };
        Returns: undefined;
      };
      complete_notification: {
        Args: { p_error?: string; p_id: string; p_retry?: boolean; p_sent: boolean };
        Returns: undefined;
      };
      complete_oauth_signup: {
        Args: {
          p_first_name: string;
          p_last_name: string;
          p_legal: Json;
          p_marketing_opt_in: boolean;
          p_phone: string;
        };
        Returns: undefined;
      };
      complete_push_notification: {
        Args: { p_id: string; p_retry: boolean; p_sent: boolean };
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
      forget_push_tokens: { Args: { p_tokens: string[] }; Returns: undefined };
      free_month_candidates: {
        Args: { p_stripe_subscription_id: string };
        Returns: {
          grant_id: string;
          stripe_subscription_id: string;
        }[];
      };
      grant_starter_month: {
        Args: { p_now?: string; p_stripe_subscription_id: string };
        Returns: boolean;
      };
      invoice_document: { Args: { p_invoice_id: string }; Returns: Json };
      mark_conversation_read: { Args: { p_chantier_id: string }; Returns: number };
      mark_free_month_applied: {
        Args: { p_grant_id: string; p_stripe_subscription_id: string };
        Returns: undefined;
      };
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
          menao_score: number;
          specialties: Json;
          verified: boolean;
          zone_city: string;
          zone_communes: string[];
          zone_mode: Database["public"]["Enums"]["zone_mode"];
          zone_radius_km: number;
        }[];
      };
      my_artisan_base_point: {
        Args: Record<PropertyKey, never>;
        Returns: {
          lat: number;
          lon: number;
        }[];
      };
      my_charter_score: {
        Args: Record<PropertyKey, never>;
        Returns: {
          anciennete: number;
          chantiers_termines: number;
          delai72h: number;
          notes: number;
          planning: number;
          planning_updated_at: string;
          reactivite: number;
          score: number;
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
      my_menao_score: { Args: Record<PropertyKey, never>; Returns: Json };
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
      my_public_profile: { Args: Record<PropertyKey, never>; Returns: Json };
      my_referral: { Args: Record<PropertyKey, never>; Returns: Json };
      my_referrals: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          etape: string;
          id: string;
          nom: string;
        }[];
      };
      my_response_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          minutes: number;
          responses: number;
        }[];
      };
      my_unread_messages: { Args: Record<PropertyKey, never>; Returns: number };
      my_unread_notifications: { Args: Record<PropertyKey, never>; Returns: number };
      my_welcome_gift: { Args: Record<PropertyKey, never>; Returns: Json };
      particulier_cancel_chantier: {
        Args: {
          p_chantier_id: string;
          p_comment?: string;
          p_reason: Database["public"]["Enums"]["client_cancel_reason"];
        };
        Returns: undefined;
      };
      particulier_cancel_request: {
        Args: {
          p_comment?: string;
          p_reason: Database["public"]["Enums"]["client_cancel_reason"];
          p_request_id: string;
        };
        Returns: undefined;
      };
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
          p_cleanliness: number;
          p_comment: string;
          p_communication: number;
          p_delays: number;
          p_quality: number;
          p_value: Database["public"]["Enums"]["value_for_money"];
        };
        Returns: string;
      };
      partner_dashboard: { Args: { p_token: string }; Returns: Json };
      partner_page: { Args: { p_code: string }; Returns: Json };
      public_artisan_pages: {
        Args: Record<PropertyKey, never>;
        Returns: {
          artisan_id: string;
          indexable: boolean;
          slug: string;
          updated_at: string;
        }[];
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
          verified: boolean;
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
      record_rge_qualifications: { Args: { p_artisan_id: string; p_rows: Json }; Returns: number };
      record_sirene_result: {
        Args: { p_artisan_id: string; p_result: Json; p_siret: string };
        Returns: undefined;
      };
      record_subscription_payment: { Args: { p_stripe_subscription_id: string }; Returns: boolean };
      record_ticket_photo: {
        Args: { p_storage_path: string; p_ticket_id: string; p_user_id: string };
        Returns: string;
      };
      record_webhook_failure: { Args: { p_error: string; p_event_id: string }; Returns: undefined };
      register_push_token: {
        Args: { p_platform: Database["public"]["Enums"]["push_platform"]; p_token: string };
        Returns: undefined;
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
      request_account_deletion: { Args: { p_message?: string }; Returns: string };
      rge_refresh_candidates: {
        Args: { p_limit?: number };
        Returns: {
          artisan_id: string;
          siret: string;
        }[];
      };
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
      set_artisan_available_from: { Args: { p_date?: string }; Returns: undefined };
      set_artisan_diploma: { Args: { p_diplome: string }; Returns: undefined };
      set_artisan_hours: { Args: { p_hours: Json }; Returns: undefined };
      set_artisan_paused: { Args: { p_paused: boolean }; Returns: undefined };
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
      set_decennale_non_soumis: { Args: { p_value: boolean }; Returns: undefined };
      set_notification_preferences: {
        Args: { p_activite: boolean; p_rappels: boolean };
        Returns: undefined;
      };
      staff_review_held_requests: {
        Args: { p_project_id: string; p_reason?: string; p_release: boolean };
        Returns: number;
      };
      staff_set_ticket_status: {
        Args: { p_status: Database["public"]["Enums"]["ticket_status"]; p_ticket_id: string };
        Returns: undefined;
      };
      staff_take_ticket: { Args: { p_take?: boolean; p_ticket_id: string }; Returns: undefined };
      staff_ticket_counts: { Args: { p_query?: string }; Returns: Json };
      staff_tickets: {
        Args: { p_filter?: string; p_limit?: number; p_offset?: number; p_query?: string };
        Returns: {
          chantier_title: string;
          contact_email: string;
          created_at: string;
          declarant: string;
          due_at: string;
          handled_by: string;
          handler: string;
          notes: number;
          status: string;
          subject: string;
          ticket_id: string;
          total: number;
          type: string;
        }[];
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
      unregister_push_token: { Args: { p_token: string }; Returns: undefined };
      validate_project_criteria: { Args: { p_project_id: string }; Returns: undefined };
    };
    Enums: {
      app_role: "particulier" | "artisan" | "artisan_en_attente" | "admin" | "support";
      appointment_status: "planifie" | "annule";
      artisan_report_kind: "client_injoignable" | "client_absent" | "fausse_demande";
      artisan_status: "brouillon" | "en_verification" | "valide" | "refuse" | "suspendu" | "radie";
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
      client_cancel_reason: "plus_besoin" | "autre_artisan" | "delai" | "budget" | "autre";
      diplome_metier:
        "cap" | "bep" | "bac_pro" | "bp" | "bts" | "brevet_maitrise" | "titre_pro" | "autre";
      dispute_category: "retard" | "malfacon" | "comportement" | "paiement" | "autre";
      document_status: "en_attente" | "valide" | "refuse" | "remplace";
      document_type: "kbis" | "decennale" | "rc_pro" | "identite" | "urssaf";
      free_month_reason: "parrainage" | "demarrage";
      free_month_status: "a_appliquer" | "applique";
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
        | "reponse_support"
        | "dossier_valide"
        | "dossier_refuse"
        | "dossier_complement"
        | "document_refuse"
        | "document_a_renouveler"
        | "document_a_renouveler_equipe"
        | "compte_suspendu"
        | "compte_reactive"
        | "demande_annulee"
        | "acces_suspendu"
        | "acces_retabli"
        | "equipe_nouveau_ticket"
        | "equipe_dossier_a_verifier"
        | "equipe_ticket_en_retard"
        | "acompte_relance"
        | "badge_debloque"
        | "niveau_atteint"
        | "planning_relance"
        | "inscription_relance"
        | "compte_radie"
        | "reponse_contact"
        | "demande_relance"
        | "demande_sans_reponse"
        | "abonnement_impaye"
        | "parrainage_suggestion";
      partner_commission_kind: "demande_qualifiee" | "abonne_payant";
      partner_commission_status: "en_attente" | "validee" | "payee" | "annulee";
      partner_status: "actif" | "suspendu";
      payment_kind: "acompte" | "solde";
      payment_status: "en_attente" | "en_cours" | "paye" | "echoue" | "annule";
      project_date_mode: "des_que_possible" | "date" | "inconnue";
      project_lieu_type: "appartement" | "maison" | "jardin" | "entreprise";
      project_status: "brouillon" | "criteres_valides" | "demande_envoyee";
      project_surface: "moins_10" | "10_20" | "20_50" | "plus_50";
      push_platform: "ios" | "android";
      quote_line_type: "materiel" | "main_oeuvre" | "autre";
      quote_refusal_reason: "trop_cher" | "autre_artisan" | "projet_reporte" | "autre";
      quote_status: "brouillon" | "envoye" | "signe" | "refuse" | "revision_demandee" | "remplace";
      quote_unit: "u" | "h" | "jour" | "m" | "ml" | "m2" | "m3" | "kg" | "l" | "forfait";
      reception_status: "en_signature" | "signe";
      referral_status: "en_attente" | "recompense" | "annule";
      refusal_reason: "planning_complet" | "hors_expertise" | "hors_zone" | "autre";
      request_status: "envoyee" | "acceptee" | "refusee" | "expiree" | "annulee" | "a_verifier";
      review_decision: "valide" | "refuse" | "complement";
      review_status: "publie" | "masque";
      signature_request_status: "en_attente" | "signee" | "abandonnee";
      ticket_status: "ouvert" | "en_cours" | "resolu";
      ticket_type:
        | "dossier_recherche"
        | "contact"
        | "expertise"
        | "reserves"
        | "avis"
        | "message"
        | "litige"
        | "suppression_compte"
        | "recompense"
        | "demande_sans_reponse"
        | "particulier_a_verifier"
        | "faux_particulier"
        | "accompagnement";
      value_for_money: "excellent" | "convenable" | "trop_cher";
      welcome_gift_item: "tshirt" | "casquette";
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
      artisan_report_kind: ["client_injoignable", "client_absent", "fausse_demande"],
      artisan_status: ["brouillon", "en_verification", "valide", "refuse", "suspendu", "radie"],
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
      client_cancel_reason: ["plus_besoin", "autre_artisan", "delai", "budget", "autre"],
      diplome_metier: [
        "cap",
        "bep",
        "bac_pro",
        "bp",
        "bts",
        "brevet_maitrise",
        "titre_pro",
        "autre",
      ],
      dispute_category: ["retard", "malfacon", "comportement", "paiement", "autre"],
      document_status: ["en_attente", "valide", "refuse", "remplace"],
      document_type: ["kbis", "decennale", "rc_pro", "identite", "urssaf"],
      free_month_reason: ["parrainage", "demarrage"],
      free_month_status: ["a_appliquer", "applique"],
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
        "dossier_valide",
        "dossier_refuse",
        "dossier_complement",
        "document_refuse",
        "document_a_renouveler",
        "document_a_renouveler_equipe",
        "compte_suspendu",
        "compte_reactive",
        "demande_annulee",
        "acces_suspendu",
        "acces_retabli",
        "equipe_nouveau_ticket",
        "equipe_dossier_a_verifier",
        "equipe_ticket_en_retard",
        "acompte_relance",
        "badge_debloque",
        "niveau_atteint",
        "planning_relance",
        "inscription_relance",
        "compte_radie",
        "reponse_contact",
        "demande_relance",
        "demande_sans_reponse",
        "abonnement_impaye",
        "parrainage_suggestion",
      ],
      partner_commission_kind: ["demande_qualifiee", "abonne_payant"],
      partner_commission_status: ["en_attente", "validee", "payee", "annulee"],
      partner_status: ["actif", "suspendu"],
      payment_kind: ["acompte", "solde"],
      payment_status: ["en_attente", "en_cours", "paye", "echoue", "annule"],
      project_date_mode: ["des_que_possible", "date", "inconnue"],
      project_lieu_type: ["appartement", "maison", "jardin", "entreprise"],
      project_status: ["brouillon", "criteres_valides", "demande_envoyee"],
      project_surface: ["moins_10", "10_20", "20_50", "plus_50"],
      push_platform: ["ios", "android"],
      quote_line_type: ["materiel", "main_oeuvre", "autre"],
      quote_refusal_reason: ["trop_cher", "autre_artisan", "projet_reporte", "autre"],
      quote_status: ["brouillon", "envoye", "signe", "refuse", "revision_demandee", "remplace"],
      quote_unit: ["u", "h", "jour", "m", "ml", "m2", "m3", "kg", "l", "forfait"],
      reception_status: ["en_signature", "signe"],
      referral_status: ["en_attente", "recompense", "annule"],
      refusal_reason: ["planning_complet", "hors_expertise", "hors_zone", "autre"],
      request_status: ["envoyee", "acceptee", "refusee", "expiree", "annulee", "a_verifier"],
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
        "suppression_compte",
        "recompense",
        "demande_sans_reponse",
        "particulier_a_verifier",
        "faux_particulier",
        "accompagnement",
      ],
      value_for_money: ["excellent", "convenable", "trop_cher"],
      welcome_gift_item: ["tshirt", "casquette"],
      zone_mode: ["rayon", "communes"],
    },
  },
} as const;
