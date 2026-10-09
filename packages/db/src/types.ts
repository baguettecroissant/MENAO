// PROVISOIRE : sera remplacé par la sortie de `pnpm db:types` (vérifié en CI).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
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
        Insert: never;
        Update: never;
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
          notification_preferences: Json;
          phone: string | null;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: never;
        Update: {
          avatar_path?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          marketing_opt_in?: boolean;
          notification_preferences?: Json;
          phone?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      app_role: "particulier" | "artisan" | "artisan_en_attente" | "admin" | "support";
      legal_document: "cgu" | "confidentialite";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
