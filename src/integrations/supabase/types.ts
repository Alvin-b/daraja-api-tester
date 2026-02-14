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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      mikrotik_settings: {
        Row: {
          api_password: string
          api_port: number
          api_username: string
          created_at: string
          dns_name: string | null
          hotspot_server: string
          id: string
          is_connected: boolean
          last_connected_at: string | null
          portal_url: string | null
          router_ip: string
          router_name: string
          updated_at: string
        }
        Insert: {
          api_password?: string
          api_port?: number
          api_username?: string
          created_at?: string
          dns_name?: string | null
          hotspot_server?: string
          id?: string
          is_connected?: boolean
          last_connected_at?: string | null
          portal_url?: string | null
          router_ip: string
          router_name?: string
          updated_at?: string
        }
        Update: {
          api_password?: string
          api_port?: number
          api_username?: string
          created_at?: string
          dns_name?: string | null
          hotspot_server?: string
          id?: string
          is_connected?: boolean
          last_connected_at?: string | null
          portal_url?: string | null
          router_ip?: string
          router_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      route_schedules: {
        Row: {
          available_seats: number
          created_at: string
          departure_time: string
          direction: string
          id: string
          route_id: string
          total_seats: number
          travel_date: string
          updated_at: string
        }
        Insert: {
          available_seats?: number
          created_at?: string
          departure_time: string
          direction: string
          id?: string
          route_id: string
          total_seats?: number
          travel_date: string
          updated_at?: string
        }
        Update: {
          available_seats?: number
          created_at?: string
          departure_time?: string
          direction?: string
          id?: string
          route_id?: string
          total_seats?: number
          travel_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_schedules_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          buses_per_day: number
          created_at: string
          departure_times: string[]
          id: string
          is_active: boolean
          price: number
          route_name: string
          stops: string[]
          total_seats_per_bus: number
          updated_at: string
        }
        Insert: {
          buses_per_day?: number
          created_at?: string
          departure_times: string[]
          id?: string
          is_active?: boolean
          price: number
          route_name: string
          stops?: string[]
          total_seats_per_bus?: number
          updated_at?: string
        }
        Update: {
          buses_per_day?: number
          created_at?: string
          departure_times?: string[]
          id?: string
          is_active?: boolean
          price?: number
          route_name?: string
          stops?: string[]
          total_seats_per_bus?: number
          updated_at?: string
        }
        Relationships: []
      }
      wifi_packages: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number
          speed_limit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          speed_limit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          speed_limit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wifi_sessions: {
        Row: {
          bytes_in: number | null
          bytes_out: number | null
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          mac_address: string | null
          started_at: string
          updated_at: string
          username: string
          voucher_id: string
        }
        Insert: {
          bytes_in?: number | null
          bytes_out?: number | null
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          mac_address?: string | null
          started_at?: string
          updated_at?: string
          username: string
          voucher_id: string
        }
        Update: {
          bytes_in?: number | null
          bytes_out?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          mac_address?: string | null
          started_at?: string
          updated_at?: string
          username?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wifi_sessions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "wifi_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      wifi_vouchers: {
        Row: {
          activated_at: string | null
          amount_paid: number
          checkout_request_id: string | null
          code: string
          created_at: string
          duration_minutes: number
          expires_at: string | null
          id: string
          mpesa_receipt: string | null
          package_id: string
          phone_number: string
          status: string
        }
        Insert: {
          activated_at?: string | null
          amount_paid: number
          checkout_request_id?: string | null
          code: string
          created_at?: string
          duration_minutes: number
          expires_at?: string | null
          id?: string
          mpesa_receipt?: string | null
          package_id: string
          phone_number: string
          status?: string
        }
        Update: {
          activated_at?: string | null
          amount_paid?: number
          checkout_request_id?: string | null
          code?: string
          created_at?: string
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          mpesa_receipt?: string | null
          package_id?: string
          phone_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "wifi_vouchers_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "wifi_packages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_seats: {
        Args: {
          p_departure_time: string
          p_direction?: string
          p_num_seats?: number
          p_route_id: string
          p_travel_date: string
        }
        Returns: {
          available: number
          message: string
          success: boolean
        }[]
      }
      check_availability: {
        Args: {
          p_departure_time?: string
          p_direction?: string
          p_route_name: string
          p_travel_date: string
        }
        Returns: {
          available_seats: number
          departure_time: string
          direction: string
          price: number
          route_id: string
          route_name: string
          total_seats: number
        }[]
      }
      get_or_create_schedule: {
        Args: {
          p_departure_time: string
          p_direction?: string
          p_route_id: string
          p_travel_date: string
        }
        Returns: {
          available_seats: number
          created_at: string
          departure_time: string
          direction: string
          id: string
          route_id: string
          total_seats: number
          travel_date: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "route_schedules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
  public: {
    Enums: {},
  },
} as const
