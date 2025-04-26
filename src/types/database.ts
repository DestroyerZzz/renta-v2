export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          cover_image_url: string | null
          updated_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          cover_image_url?: string | null
          updated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          cover_image_url?: string | null
          updated_at?: string | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          created_at: string
          user_id: string
          title: string | null
          image_url: string | null
          description: string | null
          tag: string | null
          display_section: 'left' | 'right'
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          title?: string | null
          image_url?: string | null
          description?: string | null
          tag?: string | null
          display_section: 'left' | 'right'
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          title?: string | null
          image_url?: string | null
          description?: string | null
          tag?: string | null
          display_section?: 'left' | 'right'
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}