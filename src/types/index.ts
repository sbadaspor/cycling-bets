-- ============================================================
-- MIGRAÇÃO v2: correcções ao schema existente
-- Executar no SQL Editor do Supabase se já tens a BD montada
-- ============================================================

-- 1. Adicionar coluna categoria a provas (se nao existir)
ALTER TABLE provas
  ADD COLUMN IF NOT EXISTS categoria TEXT
    CHECK (categoria IN ('grande_volta', 'prova_semana', 'monumento', 'prova_dia'));

-- 2. Criar tabela ciclistas (se nao existir)
CREATE TABLE IF NOT EXISTS ciclistas (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  prova_id   UUID REFERENCES provas(id) ON DELETE CASCADE NOT NULL,
  nome       TEXT NOT NULL,
  equipa     TEXT NOT NULL,
  dorsal     INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela etapas_resultados (se nao existir)
CREATE TABLE IF NOT EXISTS etapas_resultados (
  id                        UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  prova_id                  UUID REFERENCES provas(id) ON DELETE CASCADE NOT NULL,
  numero_etapa              INTEGER NOT NULL,
  data_etapa                DATE NOT NULL,
  classificacao_geral_top20 TEXT[] NOT NULL,
  posicoes_adicionais       JSONB DEFAULT '[]',
  camisola_sprint           TEXT,
  camisola_montanha         TEXT,
  camisola_juventude        TEXT,
  is_final                  BOOLEAN DEFAULT FALSE,
  inserido_por              UUID REFERENCES perfis(id),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (prova_id, numero_etapa)
);

-- 4. Criar tabela vitorias_historicas (se nao existir)
CREATE TABLE IF NOT EXISTS vitorias_historicas (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES perfis(id) ON DELETE CASCADE NOT NULL,
  ano        INTEGER NOT NULL,
  nome_prova TEXT NOT NULL,
  categoria  TEXT CHECK (categoria IN ('grande_volta', 'prova_semana', 'monumento', 'prova_dia')) NOT NULL,
  notas      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Criar tabela push_subscriptions (se nao existir)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID REFERENCES perfis(id) ON DELETE CASCADE NOT NULL,
  endpoint     TEXT UNIQUE NOT NULL,
  subscription JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Remover CHECK hardcoded a 20 de apostas e resultados_reais
ALTER TABLE apostas DROP CONSTRAINT IF EXISTS apostas_apostas_top20_check;
ALTER TABLE resultados_reais DROP CONSTRAINT IF EXISTS resultados_reais_resultado_top20_check;

-- 7. RLS para novas tabelas
ALTER TABLE ciclistas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapas_resultados   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitorias_historicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions  ENABLE ROW LEVEL SECURITY;

-- 8. Limpar TODAS as policies existentes que vamos recriar
--    (DROP IF EXISTS evita erros se ainda nao existiam)
DROP POLICY IF EXISTS "perfis_select_own"   ON perfis;
DROP POLICY IF EXISTS "perfis_select_all"   ON perfis;
DROP POLICY IF EXISTS "perfis_select"       ON perfis;
DROP POLICY IF EXISTS "perfis_update_own"   ON perfis;

DROP POLICY IF EXISTS "provas_select"       ON provas;
DROP POLICY IF EXISTS "provas_admin_write"  ON provas;

DROP POLICY IF EXISTS "ciclistas_select"      ON ciclistas;
DROP POLICY IF EXISTS "ciclistas_admin_write" ON ciclistas;

DROP POLICY IF EXISTS "apostas_select_own"        ON apostas;
DROP POLICY IF EXISTS "apostas_select_finalizada"  ON apostas;
DROP POLICY IF EXISTS "apostas_insert_own"         ON apostas;
DROP POLICY IF EXISTS "apostas_update_own"         ON apostas;
DROP POLICY IF EXISTS "apostas_admin_all"          ON apostas;

DROP POLICY IF EXISTS "etapas_select"      ON etapas_resultados;
DROP POLICY IF EXISTS "etapas_admin_write" ON etapas_resultados;

DROP POLICY IF EXISTS "resultados_select"      ON resultados_reais;
DROP POLICY IF EXISTS "resultados_admin_write" ON resultados_reais;

DROP POLICY IF EXISTS "vitorias_select"      ON vitorias_historicas;
DROP POLICY IF EXISTS "vitorias_admin_write" ON vitorias_historicas;

DROP POLICY IF EXISTS "push_select_own" ON push_subscriptions;
DROP POLICY IF EXISTS "push_insert_own" ON push_subscriptions;
DROP POLICY IF EXISTS "push_update_own" ON push_subscriptions;
DROP POLICY IF EXISTS "push_delete_own" ON push_subscriptions;

-- 9. Recriar todas as policies limpas

-- Perfis: visíveis a todos os autenticados; cada um só edita o seu
CREATE POLICY "perfis_select"     ON perfis FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "perfis_update_own" ON perfis FOR UPDATE USING (auth.uid() = id);

-- Provas
CREATE POLICY "provas_select"      ON provas FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "provas_admin_write" ON provas FOR ALL USING (
  EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Ciclistas
CREATE POLICY "ciclistas_select"      ON ciclistas FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "ciclistas_admin_write" ON ciclistas FOR ALL USING (
  EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Apostas: cada um gere as suas + leitura pública de provas finalizadas
CREATE POLICY "apostas_select_own" ON apostas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "apostas_select_finalizada" ON apostas FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM provas WHERE id = prova_id AND status = 'finalizada')
);
CREATE POLICY "apostas_insert_own" ON apostas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "apostas_update_own" ON apostas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "apostas_admin_all"  ON apostas FOR ALL USING (
  EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Etapas
CREATE POLICY "etapas_select"      ON etapas_resultados FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "etapas_admin_write" ON etapas_resultados FOR ALL USING (
  EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Resultados reais
CREATE POLICY "resultados_select"      ON resultados_reais FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "resultados_admin_write" ON resultados_reais FOR ALL USING (
  EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Vitórias históricas
CREATE POLICY "vitorias_select"      ON vitorias_historicas FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "vitorias_admin_write" ON vitorias_historicas FOR ALL USING (
  EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Push subscriptions
CREATE POLICY "push_select_own" ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_insert_own" ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_update_own" ON push_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "push_delete_own" ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- 10. Índices para novas tabelas
CREATE INDEX IF NOT EXISTS idx_ciclistas_prova ON ciclistas(prova_id);
CREATE INDEX IF NOT EXISTS idx_etapas_prova    ON etapas_resultados(prova_id);
CREATE INDEX IF NOT EXISTS idx_vitorias_user   ON vitorias_historicas(user_id);
CREATE INDEX IF NOT EXISTS idx_push_user       ON push_subscriptions(user_id);

-- 11. Storage bucket para avatares (se nao existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 13. Adicionar coluna data_nascimento a perfis (se nao existir)
--     Usada no formulario de conta e na pagina de perfil
ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS data_nascimento DATE;
