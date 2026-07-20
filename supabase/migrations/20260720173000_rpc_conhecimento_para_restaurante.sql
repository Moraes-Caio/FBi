-- Busca de conhecimento para uso interno das edge functions (service role).
-- Recebe o restaurante explicitamente e devolve os trechos DELE + os globais.
-- Nao e exposta ao cliente: execucao revogada de anon/authenticated.
create or replace function public.buscar_conhecimento_para(
  consulta_embedding vector(384),
  p_restaurante_id bigint,
  consulta_texto text default '',
  limite integer default 8
)
returns table (conteudo text, titulo text, escopo text, url text, similaridade float)
language sql
stable
security definer
set search_path to 'public'
as $$
  with consulta as (
    select nullif(replace(plainto_tsquery('portuguese', consulta_texto)::text, ' & ', ' | '), '')::tsquery as q
  ),
  candidatos as (
    select t.id, t.conteudo, t.documento_id, t.embedding, t.tsv
    from documento_trechos t
    where t.embedding is not null
      and (t.restaurante_id = p_restaurante_id or t.restaurante_id is null)
  ),
  vetorial as (
    select id, conteudo, documento_id, 1 - (embedding <=> consulta_embedding) as sim
    from candidatos
    order by embedding <=> consulta_embedding
    limit 30
  ),
  textual as (
    select c.id, c.conteudo, c.documento_id, ts_rank(c.tsv, q.q) as sim
    from candidatos c, consulta q
    where q.q is not null and c.tsv @@ q.q
    order by ts_rank(c.tsv, q.q) desc
    limit 30
  ),
  lim as (
    select (select min(sim) from vetorial) v_min, (select max(sim) from vetorial) v_max,
           (select min(sim) from textual) x_min, (select max(sim) from textual) x_max
  ),
  juntos as (
    select coalesce(v.id, x.id) id,
           coalesce(v.conteudo, x.conteudo) conteudo,
           coalesce(v.documento_id, x.documento_id) documento_id,
           coalesce(v.sim, 0) sim_v,
           1.0 * coalesce((v.sim - l.v_min)/nullif(l.v_max - l.v_min,0), 0)
             + 2.5 * coalesce((x.sim - l.x_min)/nullif(l.x_max - l.x_min,0), 0)
             + case when x.id is not null then 0.8 else 0 end as pontos
    from vetorial v full outer join textual x on x.id = v.id cross join lim l
  )
  select j.conteudo, d.titulo, d.escopo, d.url, j.sim_v
  from juntos j join documentos_ia d on d.id = j.documento_id
  order by j.pontos desc
  limit limite;
$$;

revoke execute on function public.buscar_conhecimento_para(vector, bigint, text, integer) from public, anon, authenticated;
