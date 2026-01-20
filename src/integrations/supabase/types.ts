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
      blockchain_transactions: {
        Row: {
          created_at: string
          data: Json
          escrow_id: string | null
          hash: string
          id: string
          status: string
          transaction_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          escrow_id?: string | null
          hash: string
          id?: string
          status?: string
          transaction_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          escrow_id?: string | null
          hash?: string
          id?: string
          status?: string
          transaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blockchain_transactions_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      crops: {
        Row: {
          actual_harvest_date: string | null
          actual_yield_kg: number | null
          area_hectares: number | null
          created_at: string
          crop_type: Database["public"]["Enums"]["crop_type"]
          expected_harvest_date: string | null
          expected_yield_kg: number | null
          field_id: string
          id: string
          metadata: Json | null
          name: string
          notes: string | null
          sowing_date: string | null
          status: Database["public"]["Enums"]["crop_status"]
          updated_at: string
          user_id: string
          variety: string | null
        }
        Insert: {
          actual_harvest_date?: string | null
          actual_yield_kg?: number | null
          area_hectares?: number | null
          created_at?: string
          crop_type?: Database["public"]["Enums"]["crop_type"]
          expected_harvest_date?: string | null
          expected_yield_kg?: number | null
          field_id: string
          id?: string
          metadata?: Json | null
          name: string
          notes?: string | null
          sowing_date?: string | null
          status?: Database["public"]["Enums"]["crop_status"]
          updated_at?: string
          user_id: string
          variety?: string | null
        }
        Update: {
          actual_harvest_date?: string | null
          actual_yield_kg?: number | null
          area_hectares?: number | null
          created_at?: string
          crop_type?: Database["public"]["Enums"]["crop_type"]
          expected_harvest_date?: string | null
          expected_yield_kg?: number | null
          field_id?: string
          id?: string
          metadata?: Json | null
          name?: string
          notes?: string | null
          sowing_date?: string | null
          status?: Database["public"]["Enums"]["crop_status"]
          updated_at?: string
          user_id?: string
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crops_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      device_data: {
        Row: {
          device_id: string
          id: string
          metric: string
          recorded_at: string
          unit: string | null
          value: number
        }
        Insert: {
          device_id: string
          id?: string
          metric: string
          recorded_at?: string
          unit?: string | null
          value: number
        }
        Update: {
          device_id?: string
          id?: string
          metric?: string
          recorded_at?: string
          unit?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "device_data_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "iot_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_messages: {
        Row: {
          attachments: string[] | null
          created_at: string
          dispute_id: string
          id: string
          is_admin_message: boolean | null
          message: string
          sender_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          dispute_id: string
          id?: string
          is_admin_message?: boolean | null
          message: string
          sender_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          dispute_id?: string
          id?: string
          is_admin_message?: boolean | null
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "escrow_disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_contracts: {
        Row: {
          amount: number
          auto_release_after_days: number
          blockchain_hash: string
          buyer_id: string
          created_at: string
          currency: string
          delivery_confirmed_at: string | null
          dispute_opened_at: string | null
          dispute_resolved_at: string | null
          dispute_status: string | null
          dispute_window_days: number
          fees: number
          funded_at: string | null
          id: string
          listing_id: string | null
          metadata: Json | null
          offer_id: string | null
          refunded_at: string | null
          released_at: string | null
          require_delivery_confirmation: boolean
          seller_id: string
          status: string
          total_amount: number
          transaction_id: string
        }
        Insert: {
          amount: number
          auto_release_after_days?: number
          blockchain_hash: string
          buyer_id: string
          created_at?: string
          currency?: string
          delivery_confirmed_at?: string | null
          dispute_opened_at?: string | null
          dispute_resolved_at?: string | null
          dispute_status?: string | null
          dispute_window_days?: number
          fees?: number
          funded_at?: string | null
          id?: string
          listing_id?: string | null
          metadata?: Json | null
          offer_id?: string | null
          refunded_at?: string | null
          released_at?: string | null
          require_delivery_confirmation?: boolean
          seller_id: string
          status?: string
          total_amount: number
          transaction_id: string
        }
        Update: {
          amount?: number
          auto_release_after_days?: number
          blockchain_hash?: string
          buyer_id?: string
          created_at?: string
          currency?: string
          delivery_confirmed_at?: string | null
          dispute_opened_at?: string | null
          dispute_resolved_at?: string | null
          dispute_status?: string | null
          dispute_window_days?: number
          fees?: number
          funded_at?: string | null
          id?: string
          listing_id?: string | null
          metadata?: Json | null
          offer_id?: string | null
          refunded_at?: string | null
          released_at?: string | null
          require_delivery_confirmation?: boolean
          seller_id?: string
          status?: string
          total_amount?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_contracts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_contracts_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "marketplace_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_disputes: {
        Row: {
          admin_decision: string | null
          admin_id: string | null
          admin_notes: string | null
          buyer_refund_percent: number | null
          created_at: string
          description: string | null
          escrow_id: string
          evidence_urls: string[] | null
          id: string
          opened_by: string
          reason: string
          resolution_type: string | null
          resolved_at: string | null
          seller_payment_percent: number | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_decision?: string | null
          admin_id?: string | null
          admin_notes?: string | null
          buyer_refund_percent?: number | null
          created_at?: string
          description?: string | null
          escrow_id: string
          evidence_urls?: string[] | null
          id?: string
          opened_by: string
          reason: string
          resolution_type?: string | null
          resolved_at?: string | null
          seller_payment_percent?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_decision?: string | null
          admin_id?: string | null
          admin_notes?: string | null
          buyer_refund_percent?: number | null
          created_at?: string
          description?: string | null
          escrow_id?: string
          evidence_urls?: string[] | null
          id?: string
          opened_by?: string
          reason?: string
          resolution_type?: string | null
          resolved_at?: string | null
          seller_payment_percent?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_disputes_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_events: {
        Row: {
          actor_id: string
          created_at: string
          details: string | null
          escrow_id: string
          event_type: string
          hash: string
          id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          details?: string | null
          escrow_id: string
          event_type: string
          hash: string
          id?: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          details?: string | null
          escrow_id?: string
          event_type?: string
          hash?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_events_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      fields: {
        Row: {
          area_hectares: number
          created_at: string
          description: string | null
          geometry: Json | null
          id: string
          irrigation_system: string | null
          location_gps: unknown
          metadata: Json | null
          name: string
          soil_type: Database["public"]["Enums"]["soil_type"]
          status: Database["public"]["Enums"]["field_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_hectares: number
          created_at?: string
          description?: string | null
          geometry?: Json | null
          id?: string
          irrigation_system?: string | null
          location_gps?: unknown
          metadata?: Json | null
          name: string
          soil_type?: Database["public"]["Enums"]["soil_type"]
          status?: Database["public"]["Enums"]["field_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_hectares?: number
          created_at?: string
          description?: string | null
          geometry?: Json | null
          id?: string
          irrigation_system?: string | null
          location_gps?: unknown
          metadata?: Json | null
          name?: string
          soil_type?: Database["public"]["Enums"]["soil_type"]
          status?: Database["public"]["Enums"]["field_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      harvest_records: {
        Row: {
          created_at: string
          crop_id: string
          harvest_date: string
          id: string
          notes: string | null
          quality_grade: string | null
          quantity_kg: number
          user_id: string
        }
        Insert: {
          created_at?: string
          crop_id: string
          harvest_date: string
          id?: string
          notes?: string | null
          quality_grade?: string | null
          quantity_kg: number
          user_id: string
        }
        Update: {
          created_at?: string
          crop_id?: string
          harvest_date?: string
          id?: string
          notes?: string | null
          quality_grade?: string | null
          quantity_kg?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "harvest_records_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_opportunities: {
        Row: {
          created_at: string
          crop_id: string | null
          current_amount: number | null
          description: string | null
          expected_harvest_date: string | null
          expected_return_percent: number | null
          farmer_id: string
          field_id: string | null
          id: string
          images: string[] | null
          location: string | null
          metadata: Json | null
          risk_level: string | null
          start_date: string | null
          status: string
          target_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          crop_id?: string | null
          current_amount?: number | null
          description?: string | null
          expected_harvest_date?: string | null
          expected_return_percent?: number | null
          farmer_id: string
          field_id?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          metadata?: Json | null
          risk_level?: string | null
          start_date?: string | null
          status?: string
          target_amount: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          crop_id?: string | null
          current_amount?: number | null
          description?: string | null
          expected_harvest_date?: string | null
          expected_return_percent?: number | null
          farmer_id?: string
          field_id?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          metadata?: Json | null
          risk_level?: string | null
          start_date?: string | null
          status?: string
          target_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_opportunities_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_opportunities_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          actual_return_amount: number | null
          actual_return_date: string | null
          amount_invested: number
          created_at: string
          crop_id: string | null
          description: string | null
          expected_harvest_date: string | null
          expected_return_percent: number | null
          farmer_id: string
          field_id: string | null
          id: string
          investment_date: string
          investor_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_return_amount?: number | null
          actual_return_date?: string | null
          amount_invested: number
          created_at?: string
          crop_id?: string | null
          description?: string | null
          expected_harvest_date?: string | null
          expected_return_percent?: number | null
          farmer_id: string
          field_id?: string | null
          id?: string
          investment_date?: string
          investor_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_return_amount?: number | null
          actual_return_date?: string | null
          amount_invested?: number
          created_at?: string
          crop_id?: string | null
          description?: string | null
          expected_harvest_date?: string | null
          expected_return_percent?: number | null
          farmer_id?: string
          field_id?: string | null
          id?: string
          investment_date?: string
          investor_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investments_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      iot_alert_configs: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          is_enabled: boolean | null
          max_value: number | null
          metric: string
          min_value: number | null
          notification_push: boolean | null
          notification_sms: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          is_enabled?: boolean | null
          max_value?: number | null
          metric: string
          min_value?: number | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          is_enabled?: boolean | null
          max_value?: number | null
          metric?: string
          min_value?: number | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iot_alert_configs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "iot_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      iot_alerts: {
        Row: {
          created_at: string
          current_value: number | null
          device_id: string
          id: string
          is_resolved: boolean | null
          message: string
          metric: string
          resolved_at: string | null
          severity: string | null
          threshold_max: number | null
          threshold_min: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          device_id: string
          id?: string
          is_resolved?: boolean | null
          message: string
          metric: string
          resolved_at?: string | null
          severity?: string | null
          threshold_max?: number | null
          threshold_min?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          device_id?: string
          id?: string
          is_resolved?: boolean | null
          message?: string
          metric?: string
          resolved_at?: string | null
          severity?: string | null
          threshold_max?: number | null
          threshold_min?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iot_alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "iot_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      iot_devices: {
        Row: {
          created_at: string
          device_token: string
          device_type: string
          field_id: string | null
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          metadata: Json | null
          name: string | null
          owner_id: string
        }
        Insert: {
          created_at?: string
          device_token: string
          device_type: string
          field_id?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner_id: string
        }
        Update: {
          created_at?: string
          device_token?: string
          device_type?: string
          field_id?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iot_devices_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      livestock: {
        Row: {
          acquisition_date: string | null
          acquisition_price: number | null
          birth_date: string | null
          breed: string | null
          created_at: string
          health_status: Database["public"]["Enums"]["livestock_health_status"]
          id: string
          identifier: string
          metadata: Json | null
          notes: string | null
          species: Database["public"]["Enums"]["livestock_species"]
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          acquisition_date?: string | null
          acquisition_price?: number | null
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          health_status?: Database["public"]["Enums"]["livestock_health_status"]
          id?: string
          identifier: string
          metadata?: Json | null
          notes?: string | null
          species?: Database["public"]["Enums"]["livestock_species"]
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          acquisition_date?: string | null
          acquisition_price?: number | null
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          health_status?: Database["public"]["Enums"]["livestock_health_status"]
          id?: string
          identifier?: string
          metadata?: Json | null
          notes?: string | null
          species?: Database["public"]["Enums"]["livestock_species"]
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      marketplace_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          listing_id: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          listing_id?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          listing_id?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_inputs: {
        Row: {
          available: boolean | null
          category: Database["public"]["Enums"]["input_category"]
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          location: string | null
          location_gps: unknown
          name: string
          price: number
          stock_quantity: number | null
          supplier_name: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available?: boolean | null
          category: Database["public"]["Enums"]["input_category"]
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          location_gps?: unknown
          name: string
          price: number
          stock_quantity?: number | null
          supplier_name: string
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available?: boolean | null
          category?: Database["public"]["Enums"]["input_category"]
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          location_gps?: unknown
          name?: string
          price?: number
          stock_quantity?: number | null
          supplier_name?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          available_from: string | null
          available_until: string | null
          category: string | null
          created_at: string
          crop_id: string | null
          delivery_available: boolean | null
          delivery_regions: string[] | null
          description: string | null
          field_id: string | null
          harvest_record_id: string | null
          id: string
          images: string[] | null
          input_category: Database["public"]["Enums"]["input_category"] | null
          is_verified: boolean | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          livestock_id: string | null
          location: string | null
          location_gps: unknown
          metadata: Json | null
          price: number | null
          price_negotiable: boolean | null
          quantity: string | null
          quantity_kg: number | null
          service_category:
            | Database["public"]["Enums"]["service_category"]
            | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          traceability_qr: string | null
          unit: string | null
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          category?: string | null
          created_at?: string
          crop_id?: string | null
          delivery_available?: boolean | null
          delivery_regions?: string[] | null
          description?: string | null
          field_id?: string | null
          harvest_record_id?: string | null
          id?: string
          images?: string[] | null
          input_category?: Database["public"]["Enums"]["input_category"] | null
          is_verified?: boolean | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          livestock_id?: string | null
          location?: string | null
          location_gps?: unknown
          metadata?: Json | null
          price?: number | null
          price_negotiable?: boolean | null
          quantity?: string | null
          quantity_kg?: number | null
          service_category?:
            | Database["public"]["Enums"]["service_category"]
            | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          traceability_qr?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          category?: string | null
          created_at?: string
          crop_id?: string | null
          delivery_available?: boolean | null
          delivery_regions?: string[] | null
          description?: string | null
          field_id?: string | null
          harvest_record_id?: string | null
          id?: string
          images?: string[] | null
          input_category?: Database["public"]["Enums"]["input_category"] | null
          is_verified?: boolean | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          livestock_id?: string | null
          location?: string | null
          location_gps?: unknown
          metadata?: Json | null
          price?: number | null
          price_negotiable?: boolean | null
          quantity?: string | null
          quantity_kg?: number | null
          service_category?:
            | Database["public"]["Enums"]["service_category"]
            | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          traceability_qr?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_harvest_record_id_fkey"
            columns: ["harvest_record_id"]
            isOneToOne: false
            referencedRelation: "harvest_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_livestock_id_fkey"
            columns: ["livestock_id"]
            isOneToOne: false
            referencedRelation: "livestock"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_messages: {
        Row: {
          attachments: string[] | null
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          offer_id: string | null
          recipient_id: string
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          offer_id?: string | null
          recipient_id: string
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          offer_id?: string | null
          recipient_id?: string
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "marketplace_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_messages_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "marketplace_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "marketplace_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_offers: {
        Row: {
          buyer_id: string
          counter_offer_message: string | null
          counter_offer_price: number | null
          created_at: string
          delivery_date: string | null
          expires_at: string | null
          id: string
          listing_id: string
          message: string | null
          payment_method: string | null
          payment_status: string | null
          proposed_price: number
          proposed_quantity: string | null
          responded_at: string | null
          seller_id: string
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
        }
        Insert: {
          buyer_id: string
          counter_offer_message?: string | null
          counter_offer_price?: number | null
          created_at?: string
          delivery_date?: string | null
          expires_at?: string | null
          id?: string
          listing_id: string
          message?: string | null
          payment_method?: string | null
          payment_status?: string | null
          proposed_price: number
          proposed_quantity?: string | null
          responded_at?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          counter_offer_message?: string | null
          counter_offer_price?: number | null
          created_at?: string
          delivery_date?: string | null
          expires_at?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          payment_method?: string | null
          payment_status?: string | null
          proposed_price?: number
          proposed_quantity?: string | null
          responded_at?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          offer_id: string | null
          rating: number
          target_id: string
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          offer_id?: string | null
          rating: number
          target_id: string
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          offer_id?: string | null
          rating?: number
          target_id?: string
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reviews_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "marketplace_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          location_gps: unknown
          phone: string | null
          preferred_language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          location_gps?: unknown
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          location_gps?: unknown
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scan_history: {
        Row: {
          analysis_data: Json
          confidence: number | null
          created_at: string
          disease_name: string | null
          id: string
          image_url: string | null
          notes: string | null
          related_crop_id: string | null
          related_field_id: string | null
          related_livestock_id: string | null
          scan_type: string
          severity: string | null
          treatment: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_data?: Json
          confidence?: number | null
          created_at?: string
          disease_name?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          related_crop_id?: string | null
          related_field_id?: string | null
          related_livestock_id?: string | null
          scan_type: string
          severity?: string | null
          treatment?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_data?: Json
          confidence?: number | null
          created_at?: string
          disease_name?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          related_crop_id?: string | null
          related_field_id?: string | null
          related_livestock_id?: string | null
          scan_type?: string
          severity?: string | null
          treatment?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_history_related_crop_id_fkey"
            columns: ["related_crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_history_related_field_id_fkey"
            columns: ["related_field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_history_related_livestock_id_fkey"
            columns: ["related_livestock_id"]
            isOneToOne: false
            referencedRelation: "livestock"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          duration_hours: number | null
          id: string
          notes: string | null
          payment_status: string | null
          price: number | null
          provider_id: string
          rating: number | null
          review: string | null
          scheduled_date: string
          scheduled_time: string | null
          service_type: string
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          price?: number | null
          provider_id: string
          rating?: number | null
          review?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          service_type: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          price?: number | null
          provider_id?: string
          rating?: number | null
          review?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          service_type?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          availability: Json | null
          business_name: string
          certifications: string[] | null
          created_at: string
          description: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          location: string | null
          location_gps: unknown
          metadata: Json | null
          phone: string | null
          rating: number | null
          reviews_count: number | null
          service_areas: string[] | null
          service_category: Database["public"]["Enums"]["service_category"]
          specializations: string[] | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          availability?: Json | null
          business_name: string
          certifications?: string[] | null
          created_at?: string
          description?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          location_gps?: unknown
          metadata?: Json | null
          phone?: string | null
          rating?: number | null
          reviews_count?: number | null
          service_areas?: string[] | null
          service_category: Database["public"]["Enums"]["service_category"]
          specializations?: string[] | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          availability?: Json | null
          business_name?: string
          certifications?: string[] | null
          created_at?: string
          description?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          location_gps?: unknown
          metadata?: Json | null
          phone?: string | null
          rating?: number | null
          reviews_count?: number | null
          service_areas?: string[] | null
          service_category?: Database["public"]["Enums"]["service_category"]
          specializations?: string[] | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          id: string
          is_typing: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_typing?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_typing?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "marketplace_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veterinary_records: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          id: string
          livestock_id: string
          next_appointment: string | null
          record_type: string
          recorded_at: string
          treatment: string | null
          user_id: string
          veterinarian_name: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          livestock_id: string
          next_appointment?: string | null
          record_type: string
          recorded_at?: string
          treatment?: string | null
          user_id: string
          veterinarian_name?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          livestock_id?: string
          next_appointment?: string | null
          record_type?: string
          recorded_at?: string
          treatment?: string | null
          user_id?: string
          veterinarian_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veterinary_records_livestock_id_fkey"
            columns: ["livestock_id"]
            isOneToOne: false
            referencedRelation: "livestock"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_conversations: {
        Row: {
          created_at: string
          id: string
          language: string | null
          messages: Json
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalculate_opportunity_amount: {
        Args: { opp_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "agriculteur"
        | "veterinaire"
        | "acheteur"
        | "admin"
        | "investisseur"
      crop_status:
        | "planifie"
        | "seme"
        | "en_croissance"
        | "floraison"
        | "maturation"
        | "recolte"
        | "termine"
      crop_type:
        | "cereale"
        | "legumineuse"
        | "oleagineux"
        | "tubercule"
        | "maraicher"
        | "fruitier"
        | "fourrage"
        | "autre"
      field_status: "active" | "en_jachère" | "en_préparation" | "inactive"
      input_category:
        | "engrais"
        | "semences"
        | "materiel"
        | "irrigation"
        | "phytosanitaire"
        | "autre"
      listing_status:
        | "brouillon"
        | "publie"
        | "consulte"
        | "negociation"
        | "reserve"
        | "vendu"
        | "archive"
      listing_type: "produit" | "service" | "intrant" | "investissement"
      livestock_health_status:
        | "sain"
        | "malade"
        | "traitement"
        | "quarantaine"
        | "decede"
      livestock_species:
        | "bovin"
        | "ovin"
        | "caprin"
        | "volaille"
        | "porcin"
        | "equin"
        | "autre"
      offer_status:
        | "en_attente"
        | "acceptee"
        | "refusee"
        | "contre_offre"
        | "expiree"
      service_category:
        | "veterinaire"
        | "technicien_iot"
        | "transporteur"
        | "conseiller"
        | "cooperative"
        | "autre"
      soil_type:
        | "argileux"
        | "sableux"
        | "limoneux"
        | "calcaire"
        | "humifere"
        | "mixte"
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
      app_role: [
        "agriculteur",
        "veterinaire",
        "acheteur",
        "admin",
        "investisseur",
      ],
      crop_status: [
        "planifie",
        "seme",
        "en_croissance",
        "floraison",
        "maturation",
        "recolte",
        "termine",
      ],
      crop_type: [
        "cereale",
        "legumineuse",
        "oleagineux",
        "tubercule",
        "maraicher",
        "fruitier",
        "fourrage",
        "autre",
      ],
      field_status: ["active", "en_jachère", "en_préparation", "inactive"],
      input_category: [
        "engrais",
        "semences",
        "materiel",
        "irrigation",
        "phytosanitaire",
        "autre",
      ],
      listing_status: [
        "brouillon",
        "publie",
        "consulte",
        "negociation",
        "reserve",
        "vendu",
        "archive",
      ],
      listing_type: ["produit", "service", "intrant", "investissement"],
      livestock_health_status: [
        "sain",
        "malade",
        "traitement",
        "quarantaine",
        "decede",
      ],
      livestock_species: [
        "bovin",
        "ovin",
        "caprin",
        "volaille",
        "porcin",
        "equin",
        "autre",
      ],
      offer_status: [
        "en_attente",
        "acceptee",
        "refusee",
        "contre_offre",
        "expiree",
      ],
      service_category: [
        "veterinaire",
        "technicien_iot",
        "transporteur",
        "conseiller",
        "cooperative",
        "autre",
      ],
      soil_type: [
        "argileux",
        "sableux",
        "limoneux",
        "calcaire",
        "humifere",
        "mixte",
      ],
    },
  },
} as const
