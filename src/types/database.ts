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
          bio: string | null
          updated_at: string | null
          created_at: string
          username: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          cover_image_url?: string | null
          bio?: string | null
          updated_at?: string | null
          created_at?: string
          username?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          cover_image_url?: string | null
          bio?: string | null
          updated_at?: string | null
          created_at?: string
          username?: string | null
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          receiver_id: string
          sender_id: string
          type: string
          content: string | null
          entity_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          receiver_id: string
          sender_id: string
          type: string
          content?: string | null
          entity_id?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          receiver_id?: string
          sender_id?: string
          type?: string
          content?: string | null
          entity_id?: string | null
          read?: boolean
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
      posts: {
        Row: {
          id: string
          user_id: string
          content: string
          image_url: string | null
          created_at: string
          updated_at: string
          original_post_id: string | null
          is_shared: boolean | null
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
          original_post_id?: string | null
          is_shared?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
          original_post_id?: string | null
          is_shared?: boolean | null
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