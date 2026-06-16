// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      acoes_operacionais: {
        Row: {
          categoria: string | null
          client_id: string | null
          created_at: string
          feedback_id: number | null
          id: number
          ordem: number
          plano_detalhado: string | null
          prioridade: string | null
          restaurante_id: number | null
          status: string | null
          texto: string | null
          titulo_acao: string | null
        }
        Insert: {
          categoria?: string | null
          client_id?: string | null
          created_at?: string
          feedback_id?: number | null
          id?: number
          ordem?: number
          plano_detalhado?: string | null
          prioridade?: string | null
          restaurante_id?: number | null
          status?: string | null
          texto?: string | null
          titulo_acao?: string | null
        }
        Update: {
          categoria?: string | null
          client_id?: string | null
          created_at?: string
          feedback_id?: number | null
          id?: number
          ordem?: number
          plano_detalhado?: string | null
          prioridade?: string | null
          restaurante_id?: number | null
          status?: string | null
          texto?: string | null
          titulo_acao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'acoes_operacionais_restaurante_id_fkey'
            columns: ['restaurante_id']
            isOneToOne: false
            referencedRelation: 'config_restaurantes'
            referencedColumns: ['id']
          },
        ]
      }
      buffer_mensagens: {
        Row: {
          chat_id: string | null
          created_at: string
          id: number
          processado: boolean | null
          texto: string | null
        }
        Insert: {
          chat_id?: string | null
          created_at?: string
          id?: number
          processado?: boolean | null
          texto?: string | null
        }
        Update: {
          chat_id?: string | null
          created_at?: string
          id?: number
          processado?: boolean | null
          texto?: string | null
        }
        Relationships: []
      }
      categorias: {
        Row: {
          ativa: boolean | null
          created_at: string | null
          id: string
          nome: string
          restaurante_id: number | null
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          restaurante_id?: number | null
        }
        Update: {
          ativa?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          restaurante_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'categorias_restaurante_id_fkey'
            columns: ['restaurante_id']
            isOneToOne: false
            referencedRelation: 'config_restaurantes'
            referencedColumns: ['id']
          },
        ]
      }
      config_restaurantes: {
        Row: {
          ativo: boolean | null
          config_insights: Json | null
          created_at: string
          detalhes: string | null
          é_pagante: boolean | null
          id: number
          logo_url: string | null
          mascote_config: Json | null
          nome_restaurante: string | null
          numero_whatsapp: string | null
          prompt_sistema: string | null
          texto_banner: string | null
          ultima_analise_insights: string | null
          ultima_atualizacao_banner: string | null
          url_api: string | null
          whatsapp_instancia: string | null
          whatsapp_token: string | null
        }
        Insert: {
          ativo?: boolean | null
          config_insights?: Json | null
          created_at?: string
          detalhes?: string | null
          é_pagante?: boolean | null
          id?: number
          logo_url?: string | null
          mascote_config?: Json | null
          nome_restaurante?: string | null
          numero_whatsapp?: string | null
          prompt_sistema?: string | null
          texto_banner?: string | null
          ultima_analise_insights?: string | null
          ultima_atualizacao_banner?: string | null
          url_api?: string | null
          whatsapp_instancia?: string | null
          whatsapp_token?: string | null
        }
        Update: {
          ativo?: boolean | null
          config_insights?: Json | null
          created_at?: string
          detalhes?: string | null
          é_pagante?: boolean | null
          id?: number
          logo_url?: string | null
          mascote_config?: Json | null
          nome_restaurante?: string | null
          numero_whatsapp?: string | null
          prompt_sistema?: string | null
          texto_banner?: string | null
          ultima_analise_insights?: string | null
          ultima_atualizacao_banner?: string | null
          url_api?: string | null
          whatsapp_instancia?: string | null
          whatsapp_token?: string | null
        }
        Relationships: []
      }
      feedbacks_restaurante: {
        Row: {
          categoria: string | null
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string
          garcom_id: string | null
          id: number
          restaurante_id: number | null
          resumo: string | null
          sentimento: string | null
          telefone_cliente: string | null
          texto_original: string | null
        }
        Insert: {
          categoria?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          garcom_id?: string | null
          id?: number
          restaurante_id?: number | null
          resumo?: string | null
          sentimento?: string | null
          telefone_cliente?: string | null
          texto_original?: string | null
        }
        Update: {
          categoria?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          garcom_id?: string | null
          id?: number
          restaurante_id?: number | null
          resumo?: string | null
          sentimento?: string | null
          telefone_cliente?: string | null
          texto_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'feedbacks_restaurante_restaurante_id_fkey'
            columns: ['restaurante_id']
            isOneToOne: false
            referencedRelation: 'config_restaurantes'
            referencedColumns: ['id']
          },
        ]
      }
      garcons: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: number
          nome_garcon: string | null
          restaurante_id: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: number
          nome_garcon?: string | null
          restaurante_id?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: number
          nome_garcon?: string | null
          restaurante_id?: number | null
        }
        Relationships: []
      }
      insights: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string | null
          descricao: string | null
          feedbacks_relacionados: number | null
          gerado_por: string | null
          id: string
          prioridade: string
          restaurante_id: number | null
          sugestao: string | null
          titulo: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          feedbacks_relacionados?: number | null
          gerado_por?: string | null
          id?: string
          prioridade: string
          restaurante_id?: number | null
          sugestao?: string | null
          titulo: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          feedbacks_relacionados?: number | null
          gerado_por?: string | null
          id?: string
          prioridade?: string
          restaurante_id?: number | null
          sugestao?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'insights_restaurante_id_fkey'
            columns: ['restaurante_id']
            isOneToOne: false
            referencedRelation: 'config_restaurantes'
            referencedColumns: ['id']
          },
        ]
      }
      mensagens_chat: {
        Row: {
          contexto_dados: Json | null
          contexto_pagina: string | null
          created_at: string | null
          id: string
          mensagem: string
          papel: string
          sessao_id: string
          usuario_id: string | null
        }
        Insert: {
          contexto_dados?: Json | null
          contexto_pagina?: string | null
          created_at?: string | null
          id?: string
          mensagem: string
          papel: string
          sessao_id: string
          usuario_id?: string | null
        }
        Update: {
          contexto_dados?: Json | null
          contexto_pagina?: string | null
          created_at?: string | null
          id?: string
          mensagem?: string
          papel?: string
          sessao_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'mensagens_chat_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
        ]
      }
      message_buffer: {
        Row: {
          created_at: string | null
          id: number
          message_content: string | null
          message_data: Json
          message_json: Json | null
          processed: boolean | null
          remote_id: string
        }
        Insert: {
          created_at?: string | null
          id: number
          message_content?: string | null
          message_data: Json
          message_json?: Json | null
          processed?: boolean | null
          remote_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          message_content?: string | null
          message_data?: Json
          message_json?: Json | null
          processed?: boolean | null
          remote_id?: string
        }
        Relationships: []
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string | null
          id: string
          lida: boolean | null
          mensagem: string
          restaurante_id: number | null
          tipo: string | null
          titulo: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          mensagem: string
          restaurante_id?: number | null
          tipo?: string | null
          titulo: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string
          restaurante_id?: number | null
          tipo?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notificacoes_restaurante_id_fkey'
            columns: ['restaurante_id']
            isOneToOne: false
            referencedRelation: 'config_restaurantes'
            referencedColumns: ['id']
          },
        ]
      }
      perguntas_direcionadas: {
        Row: {
          acao_id: number | null
          ativa: boolean | null
          created_at: string | null
          id: string
          pergunta: string
        }
        Insert: {
          acao_id?: number | null
          ativa?: boolean | null
          created_at?: string | null
          id?: string
          pergunta: string
        }
        Update: {
          acao_id?: number | null
          ativa?: boolean | null
          created_at?: string | null
          id?: string
          pergunta?: string
        }
        Relationships: [
          {
            foreignKeyName: 'perguntas_direcionadas_acao_id_fkey'
            columns: ['acao_id']
            isOneToOne: false
            referencedRelation: 'acoes_operacionais'
            referencedColumns: ['id']
          },
        ]
      }
      preferencias_notificacao: {
        Row: {
          canal_email: boolean | null
          canal_push: boolean | null
          canal_whatsapp: boolean | null
          created_at: string | null
          feedback_negativo: boolean | null
          id: string
          insight_urgente: boolean | null
          resumo_diario: boolean | null
          usuario_id: string | null
        }
        Insert: {
          canal_email?: boolean | null
          canal_push?: boolean | null
          canal_whatsapp?: boolean | null
          created_at?: string | null
          feedback_negativo?: boolean | null
          id?: string
          insight_urgente?: boolean | null
          resumo_diario?: boolean | null
          usuario_id?: string | null
        }
        Update: {
          canal_email?: boolean | null
          canal_push?: boolean | null
          canal_whatsapp?: boolean | null
          created_at?: string | null
          feedback_negativo?: boolean | null
          id?: string
          insight_urgente?: boolean | null
          resumo_diario?: boolean | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'preferencias_notificacao_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
        ]
      }
      qr_codes: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: number
          papel_fundo: string | null
          restaurante_id: number
          slug: string
          total_scans: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: number
          papel_fundo?: string | null
          restaurante_id: number
          slug: string
          total_scans?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: number
          papel_fundo?: string | null
          restaurante_id?: number
          slug?: string
          total_scans?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'qr_codes_restaurante_id_fkey'
            columns: ['restaurante_id']
            isOneToOne: false
            referencedRelation: 'config_restaurantes'
            referencedColumns: ['id']
          },
        ]
      }
      qr_scans: {
        Row: {
          id: string
          ip_hash: string | null
          qr_code_id: number
          scanned_at: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_hash?: string | null
          qr_code_id: number
          scanned_at?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_hash?: string | null
          qr_code_id?: number
          scanned_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'qr_scans_qr_code_id_fkey'
            columns: ['qr_code_id']
            isOneToOne: false
            referencedRelation: 'qr_codes'
            referencedColumns: ['id']
          },
        ]
      }
      relatorios: {
        Row: {
          created_at: string | null
          dados_json: Json | null
          id: string
          periodo: string
          restaurante_id: number | null
          resumo_executivo: string | null
          url_pdf: string | null
        }
        Insert: {
          created_at?: string | null
          dados_json?: Json | null
          id?: string
          periodo: string
          restaurante_id?: number | null
          resumo_executivo?: string | null
          url_pdf?: string | null
        }
        Update: {
          created_at?: string | null
          dados_json?: Json | null
          id?: string
          periodo?: string
          restaurante_id?: number | null
          resumo_executivo?: string | null
          url_pdf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'relatorios_restaurante_id_fkey'
            columns: ['restaurante_id']
            isOneToOne: false
            referencedRelation: 'config_restaurantes'
            referencedColumns: ['id']
          },
        ]
      }
      transcricoes: {
        Row: {
          created_at: string | null
          data: string
          id: string
          link_tldv: string
          nome: string
          participantes: Json | null
          texto_completo: string
        }
        Insert: {
          created_at?: string | null
          data: string
          id?: string
          link_tldv: string
          nome: string
          participantes?: Json | null
          texto_completo: string
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: string
          link_tldv?: string
          nome?: string
          participantes?: Json | null
          texto_completo?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          configuracoes: Json | null
          created_at: string | null
          email: string
          id: string
          nome: string | null
          onboarding_completo: boolean | null
          restaurante_id: number | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          configuracoes?: Json | null
          created_at?: string | null
          email: string
          id?: string
          nome?: string | null
          onboarding_completo?: boolean | null
          restaurante_id?: number | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          configuracoes?: Json | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string | null
          onboarding_completo?: boolean | null
          restaurante_id?: number | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'usuarios_restaurante_id_fkey'
            columns: ['restaurante_id']
            isOneToOne: false
            referencedRelation: 'config_restaurantes'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_restaurante_id: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ====== DATABASE EXTENDED CONTEXT (auto-generated) ======
// This section contains actual PostgreSQL column types, constraints, RLS policies,
// functions, triggers, indexes and materialized views not present in the type definitions above.
// IMPORTANT: The TypeScript types above map UUID, TEXT, VARCHAR all to "string".
// Use the COLUMN TYPES section below to know the real PostgreSQL type for each column.
// Always use the correct PostgreSQL type when writing SQL migrations.

// --- COLUMN TYPES (actual PostgreSQL types) ---
// Use this to know the real database type when writing migrations.
// "string" in TypeScript types above may be uuid, text, varchar, timestamptz, etc.
// Table: acoes_operacionais
//   id: bigint (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   prioridade: text (nullable)
//   titulo_acao: text (nullable)
//   plano_detalhado: text (nullable)
//   status: text (nullable)
//   feedback_id: bigint (nullable)
//   categoria: text (nullable)
//   texto: text (nullable)
//   client_id: text (nullable)
//   restaurante_id: bigint (nullable)
//   ordem: integer (not null, default: 0)
// Table: buffer_mensagens
//   id: bigint (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   chat_id: text (nullable)
//   texto: text (nullable)
//   processado: boolean (nullable)
// Table: categorias
//   id: uuid (not null, default: gen_random_uuid())
//   restaurante_id: bigint (nullable)
//   nome: text (not null)
//   ativa: boolean (nullable, default: true)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: config_restaurantes
//   id: bigint (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   nome_restaurante: text (nullable)
//   whatsapp_instancia: text (nullable)
//   whatsapp_token: text (nullable)
//   prompt_sistema: text (nullable)
//   ativo: boolean (nullable)
//   config_insights: jsonb (nullable, default: '{"max_importantes": 5, "max_observacoes": 3, "horas_entre_analises": 24, "feedbacks_por_analise": 10, "max_sugestoes_acoes_por_ciclo": 3}'::jsonb)
//   mascote_config: jsonb (nullable, default: '{"nome": "Chef Pepê", "personalidade": "profissional_amigavel"}'::jsonb)
//   ultima_analise_insights: timestamp with time zone (nullable)
//   ultima_atualizacao_banner: timestamp with time zone (nullable)
//   texto_banner: text (nullable)
//   url_api: text (nullable)
//   numero_whatsapp: text (nullable)
//   é_pagante: boolean (nullable)
//   logo_url: text (nullable)
//   detalhes: text (nullable)
// Table: feedbacks_restaurante
//   id: bigint (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   texto_original: text (nullable)
//   categoria: text (nullable)
//   sentimento: text (nullable)
//   resumo: text (nullable)
//   cliente_id: text (nullable)
//   cliente_nome: text (nullable)
//   garcom_id: uuid (nullable)
//   telefone_cliente: text (nullable)
//   restaurante_id: bigint (nullable)
// Table: garcons
//   id: bigint (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   nome_garcon: text (nullable)
//   ativo: boolean (nullable)
//   restaurante_id: bigint (nullable)
// Table: insights
//   id: uuid (not null, default: gen_random_uuid())
//   restaurante_id: bigint (nullable)
//   prioridade: text (not null)
//   categoria: text (nullable)
//   titulo: text (not null)
//   descricao: text (nullable)
//   sugestao: text (nullable)
//   feedbacks_relacionados: integer (nullable, default: 0)
//   gerado_por: text (nullable, default: 'ia'::text)
//   ativo: boolean (nullable, default: true)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: mensagens_chat
//   id: uuid (not null, default: gen_random_uuid())
//   usuario_id: uuid (nullable)
//   sessao_id: text (not null)
//   mensagem: text (not null)
//   papel: text (not null)
//   contexto_pagina: text (nullable)
//   contexto_dados: jsonb (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: message_buffer
//   id: bigint (not null)
//   remote_id: text (not null)
//   message_data: jsonb (not null)
//   created_at: timestamp with time zone (nullable, default: now())
//   processed: boolean (nullable, default: false)
//   message_content: text (nullable)
//   message_json: jsonb (nullable)
// Table: n8n_chat_histories
//   id: integer (not null, default: nextval('n8n_chat_histories_id_seq'::regclass))
//   session_id: character varying (not null)
//   message: jsonb (not null)
// Table: notificacoes
//   id: uuid (not null, default: gen_random_uuid())
//   restaurante_id: bigint (nullable)
//   titulo: text (not null)
//   mensagem: text (not null)
//   lida: boolean (nullable, default: false)
//   tipo: text (nullable, default: 'info'::text)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: perguntas_direcionadas
//   id: uuid (not null, default: gen_random_uuid())
//   acao_id: bigint (nullable)
//   pergunta: text (not null)
//   ativa: boolean (nullable, default: true)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: preferencias_notificacao
//   id: uuid (not null, default: gen_random_uuid())
//   usuario_id: uuid (nullable)
//   feedback_negativo: boolean (nullable, default: true)
//   insight_urgente: boolean (nullable, default: true)
//   resumo_diario: boolean (nullable, default: false)
//   canal_email: boolean (nullable, default: true)
//   canal_push: boolean (nullable, default: false)
//   canal_whatsapp: boolean (nullable, default: false)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: qr_codes
//   id: bigint (not null)
//   restaurante_id: bigint (not null)
//   slug: text (not null)
//   total_scans: integer (nullable, default: 0)
//   papel_fundo: text (nullable, default: 'padrao'::text)
//   ativo: boolean (nullable, default: true)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: qr_scans
//   id: uuid (not null, default: gen_random_uuid())
//   qr_code_id: bigint (not null)
//   scanned_at: timestamp with time zone (nullable, default: now())
//   user_agent: text (nullable)
//   ip_hash: text (nullable)
// Table: relatorios
//   id: uuid (not null, default: gen_random_uuid())
//   restaurante_id: bigint (nullable)
//   periodo: text (not null)
//   dados_json: jsonb (nullable)
//   resumo_executivo: text (nullable)
//   url_pdf: text (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: transcricoes
//   id: uuid (not null, default: gen_random_uuid())
//   nome: text (not null)
//   data: timestamp with time zone (not null)
//   link_tldv: text (not null)
//   texto_completo: text (not null)
//   participantes: jsonb (nullable, default: '[]'::jsonb)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: usuarios
//   id: uuid (not null, default: gen_random_uuid())
//   email: text (not null)
//   nome: text (nullable)
//   restaurante_id: bigint (nullable)
//   cargo: text (nullable, default: 'gerente'::text)
//   onboarding_completo: boolean (nullable, default: false)
//   created_at: timestamp with time zone (nullable, default: now())
//   configuracoes: jsonb (nullable, default: '{}'::jsonb)
//   avatar_url: text (nullable)
//   username: text (nullable)

// --- CONSTRAINTS ---
// Table: acoes_operacionais
//   FOREIGN KEY acoes_operacionais_restaurante_id_fkey: FOREIGN KEY (restaurante_id) REFERENCES config_restaurantes(id)
//   CHECK acoes_operacionais_status_check: CHECK ((status = ANY (ARRAY['SUGERIDA'::text, 'PENDENTE'::text, 'EM_ANDAMENTO'::text, 'CONCLUIDO'::text]))) NOT VALID
//   PRIMARY KEY ações_feedbacks_pkey: PRIMARY KEY (id)
// Table: buffer_mensagens
//   PRIMARY KEY buffer_mensagens_pkey: PRIMARY KEY (id)
// Table: categorias
//   PRIMARY KEY categorias_pkey: PRIMARY KEY (id)
//   FOREIGN KEY categorias_restaurante_id_fkey: FOREIGN KEY (restaurante_id) REFERENCES config_restaurantes(id)
// Table: config_restaurantes
//   PRIMARY KEY config_clientes_pkey: PRIMARY KEY (id)
// Table: feedbacks_restaurante
//   PRIMARY KEY feedbacks_restaurante_pkey: PRIMARY KEY (id)
//   FOREIGN KEY feedbacks_restaurante_restaurante_id_fkey: FOREIGN KEY (restaurante_id) REFERENCES config_restaurantes(id)
// Table: garcons
//   PRIMARY KEY garcon_pkey: PRIMARY KEY (id)
// Table: insights
//   CHECK insights_gerado_por_check: CHECK ((gerado_por = ANY (ARRAY['ia'::text, 'manual'::text])))
//   PRIMARY KEY insights_pkey: PRIMARY KEY (id)
//   CHECK insights_prioridade_check: CHECK ((prioridade = ANY (ARRAY['URGENTE'::text, 'IMPORTANTE'::text, 'OBSERVACAO'::text])))
//   FOREIGN KEY insights_restaurante_id_fkey: FOREIGN KEY (restaurante_id) REFERENCES config_restaurantes(id)
// Table: mensagens_chat
//   CHECK mensagens_chat_papel_check: CHECK ((papel = ANY (ARRAY['usuario'::text, 'assistente'::text])))
//   PRIMARY KEY mensagens_chat_pkey: PRIMARY KEY (id)
//   FOREIGN KEY mensagens_chat_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
// Table: message_buffer
//   PRIMARY KEY message_buffer_pkey: PRIMARY KEY (id)
// Table: n8n_chat_histories
//   PRIMARY KEY n8n_chat_histories_pkey: PRIMARY KEY (id)
// Table: notificacoes
//   PRIMARY KEY notificacoes_pkey: PRIMARY KEY (id)
//   FOREIGN KEY notificacoes_restaurante_id_fkey: FOREIGN KEY (restaurante_id) REFERENCES config_restaurantes(id)
// Table: perguntas_direcionadas
//   FOREIGN KEY perguntas_direcionadas_acao_id_fkey: FOREIGN KEY (acao_id) REFERENCES acoes_operacionais(id) ON DELETE CASCADE
//   PRIMARY KEY perguntas_direcionadas_pkey: PRIMARY KEY (id)
// Table: preferencias_notificacao
//   PRIMARY KEY preferencias_notificacao_pkey: PRIMARY KEY (id)
//   FOREIGN KEY preferencias_notificacao_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
// Table: qr_codes
//   CHECK qr_codes_papel_fundo_check: CHECK ((papel_fundo = ANY (ARRAY['padrao'::text, 'rustico'::text, 'moderno'::text])))
//   PRIMARY KEY qr_codes_pkey: PRIMARY KEY (id)
//   FOREIGN KEY qr_codes_restaurante_id_fkey: FOREIGN KEY (restaurante_id) REFERENCES config_restaurantes(id) ON DELETE CASCADE
//   UNIQUE qr_codes_slug_key: UNIQUE (slug)
// Table: qr_scans
//   PRIMARY KEY qr_scans_pkey: PRIMARY KEY (id)
//   FOREIGN KEY qr_scans_qr_code_id_fkey: FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE CASCADE
// Table: relatorios
//   PRIMARY KEY relatorios_pkey: PRIMARY KEY (id)
//   FOREIGN KEY relatorios_restaurante_id_fkey: FOREIGN KEY (restaurante_id) REFERENCES config_restaurantes(id)
// Table: transcricoes
//   PRIMARY KEY transcricoes_pkey: PRIMARY KEY (id)
// Table: usuarios
//   CHECK usuarios_cargo_check: CHECK ((cargo = ANY (ARRAY['admin'::text, 'gerente'::text, 'visualizador'::text])))
//   UNIQUE usuarios_email_key: UNIQUE (email)
//   PRIMARY KEY usuarios_pkey: PRIMARY KEY (id)
//   FOREIGN KEY usuarios_restaurante_id_fkey: FOREIGN KEY (restaurante_id) REFERENCES config_restaurantes(id)
//   UNIQUE usuarios_username_key: UNIQUE (username)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: acoes_operacionais
//   Policy "tenant_isolation_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
// Table: categorias
//   Policy "authenticated_delete_categorias" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_categorias" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_categorias" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_update_categorias" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "tenant_isolation_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
// Table: config_restaurantes
//   Policy "tenant_isolation_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (id = get_user_restaurante_id())
//   Policy "tenant_isolation_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (id = get_user_restaurante_id())
//     WITH CHECK: (id = get_user_restaurante_id())
// Table: feedbacks_restaurante
//   Policy "tenant_isolation_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
// Table: garcons
//   Policy "tenant_isolation_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
// Table: insights
//   Policy "authenticated_delete_insights" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_insights" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_insights" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_update_insights" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "tenant_isolation_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
// Table: mensagens_chat
//   Policy "authenticated_delete_mensagens_chat" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_mensagens_chat" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_mensagens_chat" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_update_mensagens_chat" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: message_buffer
//   Policy "message_buffer_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: notificacoes
//   Policy "tenant_isolation_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
// Table: perguntas_direcionadas
//   Policy "authenticated_delete_perguntas_direcionadas" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_perguntas_direcionadas" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_perguntas_direcionadas" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_update_perguntas_direcionadas" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "tenant_isolation_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (acao_id IN ( SELECT acoes_operacionais.id    FROM acoes_operacionais   WHERE (acoes_operacionais.restaurante_id = get_user_restaurante_id())))
//   Policy "tenant_isolation_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (acao_id IN ( SELECT acoes_operacionais.id    FROM acoes_operacionais   WHERE (acoes_operacionais.restaurante_id = get_user_restaurante_id())))
//   Policy "tenant_isolation_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (acao_id IN ( SELECT acoes_operacionais.id    FROM acoes_operacionais   WHERE (acoes_operacionais.restaurante_id = get_user_restaurante_id())))
//   Policy "tenant_isolation_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (acao_id IN ( SELECT acoes_operacionais.id    FROM acoes_operacionais   WHERE (acoes_operacionais.restaurante_id = get_user_restaurante_id())))
//     WITH CHECK: (acao_id IN ( SELECT acoes_operacionais.id    FROM acoes_operacionais   WHERE (acoes_operacionais.restaurante_id = get_user_restaurante_id())))
// Table: preferencias_notificacao
//   Policy "authenticated_delete_preferencias_notificacao" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_preferencias_notificacao" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_preferencias_notificacao" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_update_preferencias_notificacao" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: qr_codes
//   Policy "authenticated_delete_qr_codes" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = ( SELECT usuarios.restaurante_id    FROM usuarios   WHERE (usuarios.id = auth.uid())  LIMIT 1))
//   Policy "authenticated_insert_qr_codes" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (restaurante_id = ( SELECT usuarios.restaurante_id    FROM usuarios   WHERE (usuarios.id = auth.uid())  LIMIT 1))
//   Policy "authenticated_select_qr_codes" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = ( SELECT usuarios.restaurante_id    FROM usuarios   WHERE (usuarios.id = auth.uid())  LIMIT 1))
//   Policy "authenticated_update_qr_codes" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = ( SELECT usuarios.restaurante_id    FROM usuarios   WHERE (usuarios.id = auth.uid())  LIMIT 1))
//     WITH CHECK: (restaurante_id = ( SELECT usuarios.restaurante_id    FROM usuarios   WHERE (usuarios.id = auth.uid())  LIMIT 1))
//   Policy "tenant_isolation_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
// Table: qr_scans
//   Policy "allow_insert_qr_scans" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: true
//   Policy "authenticated_select_qr_scans" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (qr_code_id IN ( SELECT qr_codes.id    FROM qr_codes   WHERE (qr_codes.restaurante_id = ( SELECT usuarios.restaurante_id            FROM usuarios           WHERE (usuarios.id = auth.uid())          LIMIT 1))))
// Table: relatorios
//   Policy "authenticated_delete_relatorios" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_relatorios" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_relatorios" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_update_relatorios" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "tenant_isolation_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//   Policy "tenant_isolation_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (restaurante_id = get_user_restaurante_id())
//     WITH CHECK: (restaurante_id = get_user_restaurante_id())
// Table: transcricoes
//   Policy "Permitir atualização" (UPDATE, PERMISSIVE) roles={public}
//     USING: true
//   Policy "Permitir inserção" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: true
//   Policy "Permitir leitura" (SELECT, PERMISSIVE) roles={public}
//     USING: true
// Table: usuarios
//   Policy "authenticated_delete_usuarios" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_insert_usuarios" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "authenticated_select_usuarios" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "authenticated_update_usuarios" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "usuarios_select_own" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "usuarios_update_own" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (id = auth.uid())
//     WITH CHECK: (id = auth.uid())

// --- DATABASE FUNCTIONS ---
// FUNCTION get_user_restaurante_id()
//   CREATE OR REPLACE FUNCTION public.get_user_restaurante_id()
//    RETURNS bigint
//    LANGUAGE sql
//    SECURITY DEFINER
//   AS $function$
//     SELECT restaurante_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
//   $function$
//
// FUNCTION set_updated_at()
//   CREATE OR REPLACE FUNCTION public.set_updated_at()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   begin
//     new.updated_at = now();
//     return new;
//   end;
//   $function$
//
// FUNCTION trg_call_gerar_perguntas()
//   CREATE OR REPLACE FUNCTION public.trg_call_gerar_perguntas()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     IF (TG_OP = 'INSERT' AND NEW.status = 'PENDENTE') OR
//        (TG_OP = 'UPDATE' AND OLD.status = 'SUGERIDA' AND NEW.status = 'PENDENTE') THEN
//
//       -- Chama a Edge Function para gerar perguntas
//       PERFORM net.http_post(
//         url := 'https://lixrcruilisncfhfhndo.supabase.co/functions/v1/gerar-perguntas-direcionadas',
//         headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpeHJjcnVpbGlzbmNmaGZobmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzkyNTcsImV4cCI6MjA3ODUxNTI1N30.dm3PN80PogMaEHK5ZxHhEyacMbb3PMUoHCUwaDbePmM"}'::jsonb,
//         body := jsonb_build_object('acao_id', NEW.id)
//       );
//     END IF;
//
//     IF (TG_OP = 'UPDATE' AND OLD.status != 'CONCLUIDO' AND NEW.status = 'CONCLUIDO') THEN
//       -- Desativa as perguntas associadas
//       UPDATE public.perguntas_direcionadas SET ativa = false WHERE acao_id = NEW.id;
//     END IF;
//
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION trg_check_sugestoes_acoes()
//   CREATE OR REPLACE FUNCTION public.trg_check_sugestoes_acoes()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_count INT;
//   BEGIN
//     -- Check if we are transitioning away from 'SUGERIDA'
//     -- OR if it's a DELETE of a 'SUGERIDA'
//
//     IF TG_OP = 'UPDATE' THEN
//       IF OLD.status = 'SUGERIDA' AND NEW.status != 'SUGERIDA' THEN
//         SELECT COUNT(*) INTO v_count FROM public.acoes_operacionais WHERE status = 'SUGERIDA';
//         IF v_count = 0 THEN
//           -- Trigger HTTP to run the suggestion cycle again automatically
//           PERFORM net.http_post(
//             url := 'https://lixrcruilisncfhfhndo.supabase.co/functions/v1/sugerir-acoes',
//             headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpeHJjcnVpbGlzbmNmaGZobmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzkyNTcsImV4cCI6MjA3ODUxNTI1N30.dm3PN80PogMaEHK5ZxHhEyacMbb3PMUoHCUwaDbePmM"}'::jsonb,
//             body := '{"trigger": "db_empty_queue"}'::jsonb
//           );
//         END IF;
//       END IF;
//     ELSIF TG_OP = 'DELETE' THEN
//       IF OLD.status = 'SUGERIDA' THEN
//         SELECT COUNT(*) INTO v_count FROM public.acoes_operacionais WHERE status = 'SUGERIDA';
//         IF v_count = 0 THEN
//           PERFORM net.http_post(
//             url := 'https://lixrcruilisncfhfhndo.supabase.co/functions/v1/sugerir-acoes',
//             headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpeHJjcnVpbGlzbmNmaGZobmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzkyNTcsImV4cCI6MjA3ODUxNTI1N30.dm3PN80PogMaEHK5ZxHhEyacMbb3PMUoHCUwaDbePmM"}'::jsonb,
//             body := '{"trigger": "db_empty_queue"}'::jsonb
//           );
//         END IF;
//       END IF;
//     END IF;
//
//     RETURN NULL;
//   END;
//   $function$
//

// --- TRIGGERS ---
// Table: acoes_operacionais
//   Status_feedback: CREATE TRIGGER "Status_feedback" AFTER UPDATE ON public.acoes_operacionais FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://n8n-n8n-main.tikvpg.easypanel.host/webhook-test/status_açoes', 'POST', '{"Content-type":"application/json"}', '{}', '5000')
//   trg_acoes_operacionais_perguntas: CREATE TRIGGER trg_acoes_operacionais_perguntas AFTER INSERT OR UPDATE ON public.acoes_operacionais FOR EACH ROW EXECUTE FUNCTION trg_call_gerar_perguntas()
//   trg_acoes_operacionais_sugestoes: CREATE TRIGGER trg_acoes_operacionais_sugestoes AFTER DELETE OR UPDATE ON public.acoes_operacionais FOR EACH ROW EXECUTE FUNCTION trg_check_sugestoes_acoes()

// --- INDEXES ---
// Table: qr_codes
//   CREATE UNIQUE INDEX qr_codes_slug_key ON public.qr_codes USING btree (slug)
//   CREATE UNIQUE INDEX unique_active_qr_code_per_restaurante ON public.qr_codes USING btree (restaurante_id) WHERE (ativo = true)
// Table: transcricoes
//   CREATE INDEX idx_transcricoes_data ON public.transcricoes USING btree (data DESC)
// Table: usuarios
//   CREATE UNIQUE INDEX usuarios_email_key ON public.usuarios USING btree (email)
//   CREATE UNIQUE INDEX usuarios_username_key ON public.usuarios USING btree (username)
