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
          base_code_insee: string | null;
          base_label: string | null;
          base_location: unknown;
          created_at: string;
          experience_years: number | null;
          forme_juridique_code: string | null;
          id: string;
          nom_commercial: string | null;
          radius_km: number | null;
          raison_sociale: string | null;
          refusal_reason: string | null;
          siren: string | null;
          sirene_active: boolean | null;
          sirene_checked_at: string | null;
          sirene_partial: boolean;
          siret: string | null;
          status: Database["public"]["Enums"]["artisan_status"];
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
          base_code_insee?: string | null;
          base_label?: string | null;
          base_location?: unknown;
          created_at?: string;
          experience_years?: number | null;
          forme_juridique_code?: string | null;
          id?: string;
          nom_commercial?: string | null;
          radius_km?: number | null;
          raison_sociale?: string | null;
          refusal_reason?: string | null;
          siren?: never;
          sirene_active?: boolean | null;
          sirene_checked_at?: string | null;
          sirene_partial?: boolean;
          siret?: string | null;
          status?: Database["public"]["Enums"]["artisan_status"];
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
          base_code_insee?: string | null;
          base_label?: string | null;
          base_location?: unknown;
          created_at?: string;
          experience_years?: number | null;
          forme_juridique_code?: string | null;
          id?: string;
          nom_commercial?: string | null;
          radius_km?: number | null;
          raison_sociale?: string | null;
          refusal_reason?: string | null;
          siren?: never;
          sirene_active?: boolean | null;
          sirene_checked_at?: string | null;
          sirene_partial?: boolean;
          siret?: string | null;
          status?: Database["public"]["Enums"]["artisan_status"];
          tva_intracom?: never;
          updated_at?: string;
          user_id?: string;
          zone_mode?: Database["public"]["Enums"]["zone_mode"] | null;
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
      consume_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
      record_sirene_result: {
        Args: { p_artisan_id: string; p_result: Json; p_siret: string };
        Returns: undefined;
      };
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
    };
    Enums: {
      app_role: "particulier" | "artisan" | "artisan_en_attente" | "admin" | "support";
      artisan_status: "brouillon" | "en_verification" | "valide" | "refuse" | "suspendu";
      certification_type:
        | "rge"
        | "qualifelec"
        | "qualibat"
        | "qualipac"
        | "qualipv"
        | "qualisol"
        | "qualibois"
        | "autre";
      legal_document: "cgu" | "confidentialite" | "cgv_artisan";
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
      artisan_status: ["brouillon", "en_verification", "valide", "refuse", "suspendu"],
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
      legal_document: ["cgu", "confidentialite", "cgv_artisan"],
      zone_mode: ["rayon", "communes"],
    },
  },
} as const;
